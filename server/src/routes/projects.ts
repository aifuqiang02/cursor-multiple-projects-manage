import express from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { jwtConfig } from '../config/database.js'
import { ResponseUtil } from '../lib/response.js'
import { emitWebSocketEvent } from '../lib/websocket.js'

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
      where: { userId: req.userId },
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

// Update project
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    if (!id) {
      return res
        .status(400)
        .json(ResponseUtil.badRequest('Project ID is required'))
    }
    const { name, cursorKey, description, status } = req.body

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

    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        cursorKey,
        description,
        status,
      },
      include: projectInclude,
    })

    res.json(ResponseUtil.success(project, '项目更新成功'))
  } catch (error) {
    console.error('Update project error:', error)
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

    await prisma.project.delete({
      where: { id },
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
      return res.status(404).json(ResponseUtil.projectNotFound())
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
  } catch (error) {
    console.error('Update AI status error:', error)
    res.status(500).json(ResponseUtil.internalError())
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

  const updateData = {
    aiStatus: 'running' as const,
    aiStartedAt: new Date(),
    aiCompletedAt: null,
  }

  await updateProjectAIStatus(id, updateData, req, res, 'AI执行已启动')
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

  await updateProjectAIStatus(id, updateData, req, res, 'AI执行已停止')
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

export default router
