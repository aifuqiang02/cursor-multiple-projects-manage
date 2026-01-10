import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { jwtConfig } from '../config/database.js';
import { ResponseUtil } from '../lib/response.js';
import { emitWebSocketEvent } from '../lib/websocket.js';
const router = express.Router();
// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json(ResponseUtil.noToken());
    }
    if (!jwtConfig.secret) {
        console.error('JWT_SECRET not configured');
        return res.status(500).json(ResponseUtil.internalError());
    }
    try {
        const decoded = jwt.verify(token, jwtConfig.secret);
        if (!decoded.userId) {
            return res.status(401).json(ResponseUtil.invalidToken());
        }
        req.userId = decoded.userId;
        next();
    }
    catch (error) {
        res.status(401).json(ResponseUtil.invalidToken());
    }
};
// Get all user todos
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status } = req.query;
        const whereClause = { userId: req.userId };
        if (status && ['pending', 'in_progress', 'completed'].includes(status)) {
            whereClause.status = status;
        }
        const userTodos = await prisma.userTodo.findMany({
            where: whereClause,
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
                { createdAt: 'desc' }
            ]
        });
        res.json(ResponseUtil.success(userTodos));
    }
    catch (error) {
        console.error('Get user todos error:', error);
        res.status(500).json(ResponseUtil.internalError());
    }
});
// Create user todo
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, description, priority = 3, projectId, aiCommand, aiResult } = req.body;
        if (!title) {
            return res.status(400).json(ResponseUtil.badRequest('待办任务标题不能为空'));
        }
        // If projectId is provided, verify ownership
        if (projectId) {
            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    userId: req.userId
                }
            });
            if (!project) {
                return res.status(404).json(ResponseUtil.badRequest('项目不存在或无权限访问'));
            }
        }
        const userTodo = await prisma.userTodo.create({
            data: {
                title,
                description,
                priority,
                projectId,
                aiCommand,
                aiResult,
                userId: req.userId
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        // Send WebSocket notification
        emitWebSocketEvent('user-todo-created', {
            userId: req.userId,
            userTodo
        });
        res.status(201).json(ResponseUtil.success(userTodo, '待办任务创建成功'));
    }
    catch (error) {
        console.error('Create user todo error:', error);
        res.status(500).json(ResponseUtil.internalError());
    }
});
// Update user todo
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json(ResponseUtil.badRequest('待办任务ID不能为空'));
        }
        const { title, description, status, priority } = req.body;
        // Find todo and verify ownership
        const existingTodo = await prisma.userTodo.findFirst({
            where: { id, userId: req.userId }
        });
        if (!existingTodo) {
            return res.status(404).json(ResponseUtil.badRequest('待办任务不存在'));
        }
        const updatedTodo = await prisma.userTodo.update({
            where: { id },
            data: {
                title,
                description,
                status,
                priority
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        // Send WebSocket notification
        emitWebSocketEvent('user-todo-updated', {
            userId: req.userId,
            userTodo: updatedTodo
        });
        res.json(ResponseUtil.success(updatedTodo, '待办任务更新成功'));
    }
    catch (error) {
        console.error('Update user todo error:', error);
        res.status(500).json(ResponseUtil.internalError());
    }
});
// Delete user todo
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json(ResponseUtil.badRequest('待办任务ID不能为空'));
        }
        // Find todo and verify ownership
        const existingTodo = await prisma.userTodo.findFirst({
            where: { id, userId: req.userId }
        });
        if (!existingTodo) {
            return res.status(404).json(ResponseUtil.badRequest('待办任务不存在'));
        }
        await prisma.userTodo.delete({
            where: { id }
        });
        // Send WebSocket notification
        emitWebSocketEvent('user-todo-deleted', {
            userId: req.userId,
            todoId: id
        });
        res.json(ResponseUtil.success(null, '待办任务删除成功'));
    }
    catch (error) {
        console.error('Delete user todo error:', error);
        res.status(500).json(ResponseUtil.internalError());
    }
});
// Complete user todo
router.post('/:id/complete', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json(ResponseUtil.badRequest('待办任务ID不能为空'));
        }
        // Find todo and verify ownership
        const existingTodo = await prisma.userTodo.findFirst({
            where: { id, userId: req.userId }
        });
        if (!existingTodo) {
            return res.status(404).json(ResponseUtil.badRequest('待办任务不存在'));
        }
        const updatedTodo = await prisma.userTodo.update({
            where: { id },
            data: { status: 'completed' },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        // Send WebSocket notification
        emitWebSocketEvent('user-todo-completed', {
            userId: req.userId,
            userTodo: updatedTodo
        });
        res.json(ResponseUtil.success(updatedTodo, '待办任务已完成'));
    }
    catch (error) {
        console.error('Complete user todo error:', error);
        res.status(500).json(ResponseUtil.internalError());
    }
});
export default router;
//# sourceMappingURL=usertodos.js.map