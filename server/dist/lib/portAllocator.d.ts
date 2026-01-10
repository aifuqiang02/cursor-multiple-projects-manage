import { PrismaClient } from '@prisma/client';
export interface AllocatedPort {
    port: number;
    remark: string;
    allocatedAt: Date;
}
/**
 * 端口分配错误类
 */
export declare class PortAllocationError extends Error {
    code: string;
    availablePorts?: number | undefined;
    constructor(message: string, code: string, availablePorts?: number | undefined);
}
/**
 * 端口分配器服务
 */
export declare class PortAllocator {
    private prisma;
    constructor(prisma: PrismaClient);
    /**
     * 为项目分配指定数量的端口
     * @param projectId 项目ID
     * @param count 要分配的端口数量
     * @returns 分配的端口数组
     */
    allocatePorts(projectId: string, count: number): Promise<AllocatedPort[]>;
    /**
     * 执行端口分配（在事务中）
     */
    private performAllocation;
    /**
     * 获取项目已分配的端口
     */
    getAllocatedPorts(projectId: string): Promise<AllocatedPort[] | null>;
    /**
     * 更新端口备注
     */
    updatePortRemarks(projectId: string, updatedPorts: AllocatedPort[]): Promise<void>;
    /**
     * 延迟函数
     */
    private delay;
}
//# sourceMappingURL=portAllocator.d.ts.map