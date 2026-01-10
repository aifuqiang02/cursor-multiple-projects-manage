import { PrismaClient } from '@prisma/client'
import { portConfig } from '../config/ports.js'

export interface AllocatedPort {
  port: number
  remark: string
  allocatedAt: Date
}

/**
 * 端口分配错误类
 */
export class PortAllocationError extends Error {
  constructor(
    message: string,
    public code: string,
    public availablePorts?: number
  ) {
    super(message)
    this.name = 'PortAllocationError'
  }
}

/**
 * 端口分配器服务
 */
export class PortAllocator {
  constructor(private prisma: PrismaClient) {}

  /**
   * 为项目分配指定数量的端口
   * @param projectId 项目ID
   * @param count 要分配的端口数量
   * @returns 分配的端口数组
   */
  async allocatePorts(projectId: string, count: number): Promise<AllocatedPort[]> {
    // 验证参数
    if (count <= 0) {
      throw new PortAllocationError('端口数量必须大于0', 'INVALID_COUNT')
    }

    if (count > portConfig.maxPerProject) {
      throw new PortAllocationError(
        `单个项目最多只能分配${portConfig.maxPerProject}个端口`,
        'EXCEED_MAX_PER_PROJECT'
      )
    }

    // 检查项目是否已经分配过端口
    const existingProject = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ports: true, name: true }
    })

    if (!existingProject) {
      throw new PortAllocationError('项目不存在', 'PROJECT_NOT_FOUND')
    }

    if (existingProject.ports) {
      throw new PortAllocationError(
        `项目"${existingProject.name}"已经分配过端口，无法重复分配`,
        'PORTS_ALREADY_ALLOCATED'
      )
    }

    // 使用重试机制处理并发冲突
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= portConfig.maxRetries; attempt++) {
      try {
        return await this.performAllocation(projectId, count)
      } catch (error) {
        lastError = error as Error

        // 如果是唯一约束冲突且还有重试次数，继续重试
        if (error instanceof Error &&
            error.message.includes('Unique constraint failed') &&
            attempt < portConfig.maxRetries) {
          console.warn(`端口分配冲突，第${attempt + 1}次重试`)
          await this.delay(portConfig.retryDelayMs)
          continue
        }

        // 其他错误直接抛出
        throw error
      }
    }

    throw lastError || new PortAllocationError('端口分配失败', 'ALLOCATION_FAILED')
  }

  /**
   * 执行端口分配（在事务中）
   */
  private async performAllocation(projectId: string, count: number): Promise<AllocatedPort[]> {
    return await this.prisma.$transaction(async (tx) => {
      const now = new Date()

      // 1. 查询已分配的端口
      const usedPorts = await tx.portAllocation.findMany({
        where: {
          port: {
            gte: portConfig.minPort,
            lte: portConfig.maxPort
          }
        },
        select: { port: true }
      })

      // 2. 创建已分配端口的集合用于快速查找
      const usedPortSet = new Set(usedPorts.map(p => p.port))

      // 3. 找到指定数量的可用端口
      const availablePorts: number[] = []
      for (let port = portConfig.minPort; port <= portConfig.maxPort && availablePorts.length < count; port++) {
        if (!usedPortSet.has(port)) {
          availablePorts.push(port)
        }
      }

      // 4. 检查是否有足够的可用端口
      if (availablePorts.length < count) {
        throw new PortAllocationError(
          `可用端口不足，需要${count}个，当前仅剩余${availablePorts.length}个端口`,
          'INSUFFICIENT_PORTS',
          availablePorts.length
        )
      }

      // 5. 批量创建端口分配记录
      const portAllocations = availablePorts.map(port => ({
        port,
        projectId,
        allocatedAt: now
      }))

      await tx.portAllocation.createMany({
        data: portAllocations
      })

      // 6. 构建返回结果
      const allocatedPorts: AllocatedPort[] = availablePorts.map(port => ({
        port,
        remark: '',
        allocatedAt: now
      }))

      // 7. 更新项目的端口信息
      await tx.project.update({
        where: { id: projectId },
        data: {
          ports: JSON.parse(JSON.stringify(allocatedPorts))
        }
      })

      return allocatedPorts
    })
  }

  /**
   * 获取项目已分配的端口
   */
  async getAllocatedPorts(projectId: string): Promise<AllocatedPort[] | null> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ports: true }
    })

    return project?.ports as AllocatedPort[] | null
  }

  /**
   * 更新端口备注
   */
  async updatePortRemarks(projectId: string, updatedPorts: AllocatedPort[]): Promise<void> {
    // 验证端口是否属于该项目
    const currentPorts = await this.getAllocatedPorts(projectId)
    if (!currentPorts) {
      throw new PortAllocationError('项目未分配端口', 'NO_PORTS_ALLOCATED')
    }

    // 验证更新数据：确保端口属于该项目
    const currentPortMap = new Map(currentPorts.map(p => [p.port, p]))

    for (const updatedPort of updatedPorts) {
      const currentPort = currentPortMap.get(updatedPort.port)
      if (!currentPort) {
        throw new PortAllocationError(
          `端口${updatedPort.port}不属于该项目`,
          'INVALID_PORT_UPDATE'
        )
      }

      // 检查端口号是否被修改
      if (updatedPort.port !== currentPort.port) {
        throw new PortAllocationError(
          '不能修改端口号',
          'INVALID_PORT_MODIFICATION'
        )
      }
    }

    // 更新项目端口信息，只保留端口号、备注和原始分配时间
    const portsToUpdate = updatedPorts.map(updatedPort => {
      const currentPort = currentPortMap.get(updatedPort.port)!
      return {
        port: currentPort.port,
        remark: updatedPort.remark, // 只更新备注
        allocatedAt: currentPort.allocatedAt // 保持原始分配时间
      }
    })

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ports: portsToUpdate
      }
    })
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
