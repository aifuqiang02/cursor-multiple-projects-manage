import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { jwtConfig } from '../config/database.js';
import { ResponseUtil } from '../lib/response.js';

const router = express.Router();

// Middleware to verify JWT
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json(ResponseUtil.noToken());
  }

  if (!jwtConfig.secret) {
    console.error('JWT_SECRET not configured');
    return res.status(500).json(ResponseUtil.internalError());
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as any;
    if (!decoded.userId) {
      return res.status(401).json(ResponseUtil.invalidToken());
    }
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json(ResponseUtil.invalidToken());
  }
};

// Get tasks for a project
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json(ResponseUtil.badRequest('Project ID is required'));
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: req.userId
      }
    });

    if (!project) {
      return res.status(404).json(ResponseUtil.projectNotFound());
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: [
        { priority: 'asc' },
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(ResponseUtil.success(tasks));
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json(ResponseUtil.internalError());
  }
});

// Create task
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, projectId, priority = 3 } = req.body;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: req.userId
      }
    });

    if (!project) {
      return res.status(404).json(ResponseUtil.projectNotFound());
    }

    const task = await prisma.task.create({
      data: {
        title,
        projectId,
        priority
      }
    });

    res.status(201).json(ResponseUtil.success(task, '任务创建成功'));
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json(ResponseUtil.internalError());
  }
});

// Update task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json(ResponseUtil.badRequest('Task ID is required'));
    }
    const { title, status, priority, order } = req.body;

    // Find task and verify ownership through project
    const task = await prisma.task.findFirst({
      where: { id },
      include: {
        project: true
      }
    });

    if (!task || task.project.userId !== req.userId) {
      return res.status(404).json(ResponseUtil.taskNotFound());
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title,
        status,
        priority,
        order
      }
    });

    res.json(ResponseUtil.success(updatedTask, '任务更新成功'));
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json(ResponseUtil.internalError());
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json(ResponseUtil.badRequest('Task ID is required'));
    }

    // Find task and verify ownership through project
    const task = await prisma.task.findFirst({
      where: { id },
      include: {
        project: true
      }
    });

    if (!task || task.project.userId !== req.userId) {
      return res.status(404).json(ResponseUtil.taskNotFound());
    }

    await prisma.task.delete({
      where: { id }
    });

    res.json(ResponseUtil.success(null, '任务删除成功'));
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json(ResponseUtil.internalError());
  }
});

// Update task order (for drag and drop)
router.put('/:id/order', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json(ResponseUtil.badRequest('Task ID is required'));
    }
    const { order } = req.body;

    // Find task and verify ownership through project
    const task = await prisma.task.findFirst({
      where: { id },
      include: {
        project: true
      }
    });

    if (!task || task.project.userId !== req.userId) {
      return res.status(404).json(ResponseUtil.taskNotFound());
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { order }
    });

    res.json(ResponseUtil.success(updatedTask, '任务更新成功'));
  } catch (error) {
    console.error('Update task order error:', error);
    res.status(500).json(ResponseUtil.internalError());
  }
});

// Get all active tasks (not completed) for all user's projects
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const activeTasks = await prisma.task.findMany({
      where: {
        status: {
          not: 'completed'
        },
        project: {
          userId: req.userId
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(ResponseUtil.success(activeTasks));
  } catch (error) {
    console.error('Get active tasks error:', error);
    res.status(500).json(ResponseUtil.internalError());
  }
});

export default router;
