import express from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { jwtConfig } from '../config/database.js'
import { ResponseUtil } from '../lib/response.js'
import { emitWebSocketEvent } from '../lib/websocket.js'
import { PortAllocator, PortAllocationError } from '../lib/portAllocator.js'
import type { AllocatedPort } from '../lib/portAllocator.js'
import { portConfig } from '../config/ports.js'

const router = express.Router()

// Common include for project queries
const projectInclude = {
  _count: {
    select: {
      tasks: true,
    },
  },
}

// Middleware to verify JWT
const authenticateToken = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json(ResponseUtil.noToken())
  }

  if (!jwtConfig.secret) {
    console.error('JWT_SECRET not configured')
    return res.status(500).json(ResponseUtil.internalError())
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as any
    if (!decoded.userId) {
      return res.status(401).json(ResponseUtil.invalidToken())
    }
    req.userId = decoded.userId
    next()
  } catch (error) {
    res.status(401).json(ResponseUtil.invalidToken())
  }
}

// Get all projects for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        userId: req.userId,
        status: {
          not: 'deleted',
        },
      },
      include: projectInclude,
      orderBy: { updatedAt: 'desc' },
    })

    res.json(ResponseUtil.success(projects))
  } catch (error) {
    console.error('Get projects error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Create project
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, cursorKey, description, status } = req.body

    const project = await prisma.project.create({
      data: {
        name,
        cursorKey,
        description,
        status: status || 'active', // 默认为active
        userId: req.userId,
      },
      include: projectInclude,
    })

    res.status(201).json(ResponseUtil.success(project, '项目创建成功'))
  } catch (error) {
    console.error('Create project error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Delete project
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    if (!id) {
      return res
        .status(400)
        .json(ResponseUtil.badRequest('Project ID is required'))
    }

    // Check if project belongs to user
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    })

    if (!existingProject) {
      return res.status(404).json(ResponseUtil.projectNotFound())
    }

    await prisma.project.update({
      where: { id },
      data: { status: 'deleted' },
    })

    res.json(ResponseUtil.success(null, '项目删除成功'))
  } catch (error) {
    console.error('Delete project error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Get project with tasks
router.get('/:id/details', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    if (!id) {
      return res
        .status(400)
        .json(ResponseUtil.badRequest('Project ID is required'))
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: req.userId,
      },
      include: {
        tasks: {
          orderBy: [
            { priority: 'asc' },
            { order: 'asc' },
            { createdAt: 'desc' },
          ],
        },
      },
    })

    if (!project) {
      return res.status(404).json(ResponseUtil.projectNotFound())
    }

    res.json(ResponseUtil.success(project, '项目更新成功'))
  } catch (error) {
    console.error('Get project details error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Helper function to update AI status for a project
async function updateProjectAIStatus(
  projectId: string,
  updateData: any,
  req: any,
  res: any,
  successMessage: string
) {
  try {
    // Check if project exists
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
      },
    })

    if (!existingProject) {
      res.status(404).json(ResponseUtil.projectNotFound())
      return false
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
    })

    // Send WebSocket notification to update frontend
    emitWebSocketEvent('ai-status-updated', {
      projectId,
      ...updateData,
    })

    res.json(ResponseUtil.success('', successMessage))
    return true
  } catch (error) {
    console.error('Update AI status error:', error)
    res.status(500).json(ResponseUtil.internalError())
    return false
  }
}

// Update AI execution status for a project
router.put('/:id/ai-status', authenticateToken, async (req, res) => {
  const { id } = req.params
  if (!id) {
    return res
      .status(400)
      .json(ResponseUtil.badRequest('Project ID is required'))
  }
  const { status, command, result, duration } = req.body

  const updateData: any = { aiStatus: status }

  if (command !== undefined) updateData.aiCommand = command
  if (result !== undefined) updateData.aiResult = result
  if (duration !== undefined) updateData.aiDuration = duration

  // Set timestamps based on status
  if (status === 'running') {
    updateData.aiStartedAt = new Date()
    updateData.aiCompletedAt = null
  } else if (status !== 'idle') {
    updateData.aiCompletedAt = new Date()
  }

  await updateProjectAIStatus(id, updateData, req, res, '项目更新成功')
})

// Start AI execution for a project
router.post('/:id/ai-status-start', async (req, res) => {
  const { id } = req.params
  if (!id) {
    return res
      .status(400)
      .json(ResponseUtil.badRequest('Project ID is required'))
  }

  // Check if project exists and get user ID
  const existingProject = await prisma.project.findFirst({
    where: { id },
    select: { userId: true },
  })

  if (!existingProject) {
    return res.status(404).json(ResponseUtil.projectNotFound())
  }

  // Delete all existing todos for this project
  await prisma.userTodo.deleteMany({
    where: {
      projectId: id,
      userId: existingProject.userId,
    },
  })

  const updateData = {
    aiStatus: 'running' as const,
    aiStartedAt: new Date(),
    aiCompletedAt: null,
  }

  await updateProjectAIStatus(id, updateData, req, res, 'AI执行已启动')

  // Send WebSocket notification about AI execution started
  emitWebSocketEvent('ai-execution-started', {
    projectId: id,
    userId: existingProject.userId,
    message: 'AI执行已开始',
  })
})

// Stop AI execution for a project
router.post('/:id/ai-status-stop', async (req, res) => {
  const { id } = req.params
  if (!id) {
    return res
      .status(400)
      .json(ResponseUtil.badRequest('Project ID is required'))
  }
  const { status } = req.body // "completed" | "aborted" | "error"

  // Validate status
  if (!['completed', 'aborted', 'error'].includes(status)) {
    return res.status(400).json(ResponseUtil.badRequest('无效的执行结果状态'))
  }

  const updateData = {
    aiStatus: status,
    aiCompletedAt: new Date(),
  }

  const result = await updateProjectAIStatus(
    id,
    updateData,
    req,
    res,
    'AI执行已停止'
  )

  // If AI execution completed successfully, create a user todo
  if (status === 'completed' && result) {
    try {
      // Get the project details to include in the todo
      const project = await prisma.project.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          aiCommand: true,
          aiResult: true,
          userId: true,
        },
      })

      if (project) {
        // Delete existing todos for this project
        await prisma.userTodo.deleteMany({
          where: {
            projectId: project.id,
            userId: project.userId,
          },
        })

        // Create a todo task for the user based on the AI execution result
        const todoTitle = `AI执行完成 - ${project.name}`
        const todoDescription = `项目"${project.name}"的AI执行已完成。请检查执行结果并进行后续处理。`

        await prisma.userTodo.create({
          data: {
            title: todoTitle,
            description: todoDescription,
            priority: 2, // Medium priority
            projectId: project.id,
            aiCommand: project.aiCommand,
            aiResult: project.aiResult,
            userId: project.userId,
          },
        })

        // Send WebSocket notification about new todo
        emitWebSocketEvent('user-todo-created', {
          userId: project.userId,
          message: 'AI执行完成后创建了新的待办任务',
          projectId: project.id,
        })
      }
    } catch (todoError) {
      console.error(
        'Failed to create user todo after AI completion:',
        todoError
      )
      // Don't fail the main request if todo creation fails
    }
  }
})

// Get running AI executions for current user
router.get('/ai-status/running', authenticateToken, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        userId: req.userId,
        aiStatus: 'running',
      },
      select: {
        id: true,
        name: true,
        aiStatus: true,
        aiCommand: true,
        aiStartedAt: true,
      },
    })

    res.json(ResponseUtil.success(projects))
  } catch (error) {
    console.error('Get running AI status error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Allocate ports for a project
router.post('/:id/allocate-ports', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    if (!id) {
      return res.status(400).json(ResponseUtil.badRequest('项目ID是必需的'))
    }

    // Check if project belongs to user
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    })

    if (!existingProject) {
      return res.status(404).json(ResponseUtil.projectNotFound())
    }

    // Get allocation count from request body, default to config
    const { count = portConfig.defaultCount } = req.body

    // Validate count
    if (typeof count !== 'number' || count <= 0) {
      return res
        .status(400)
        .json(ResponseUtil.badRequest('端口数量必须是正整数'))
    }

    const portAllocator = new PortAllocator(prisma)

    try {
      const allocatedPorts = await portAllocator.allocatePorts(id, count)
      res.json(
        ResponseUtil.success(
          allocatedPorts,
          `成功分配${allocatedPorts.length}个端口`
        )
      )
    } catch (error) {
      if (error instanceof PortAllocationError) {
        let statusCode = 400
        if (error.code === 'INSUFFICIENT_PORTS') {
          statusCode = 409 // Conflict
        } else if (error.code === 'PROJECT_NOT_FOUND') {
          statusCode = 404
        }

        return res
          .status(statusCode)
          .json(ResponseUtil.badRequest(error.message))
      }
      throw error
    }
  } catch (error) {
    console.error('Allocate ports error:', error)
    res.status(500).json(ResponseUtil.internalError('端口分配失败'))
  }
})

// Update project order
router.put('/order', authenticateToken, async (req, res) => {
  try {
    const { projectIds } = req.body

    if (!Array.isArray(projectIds)) {
      return res
        .status(400)
        .json(ResponseUtil.badRequest('projectIds必须是数组'))
    }

    // Update order for each project
    const updatePromises = projectIds.map((projectId: string, index: number) =>
      prisma.project.update({
        where: { id: projectId, userId: req.userId },
        data: { order: index },
      })
    )

    await Promise.all(updatePromises)

    res.json(ResponseUtil.success(null, '项目排序更新成功'))
  } catch (error) {
    console.error('Update project order error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Update project
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params

  const project = await prisma.project.update({
    where: { id: id! },
    data: req.body,
    include: projectInclude,
  })

  res.json(ResponseUtil.success(project, '项目更新成功'))
})

export default router
