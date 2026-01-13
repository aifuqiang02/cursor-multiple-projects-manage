import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { jwtConfig } from '../config/database.js';
import { ResponseUtil } from '../lib/response.js';
const router = express.Router();
// JWT middleware
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
// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'notification-sounds');
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with user ID and timestamp
        const userId = req.userId;
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const filename = `${userId}_${timestamp}_${file.fieldname}${ext}`;
        cb(null, filename);
    }
});
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Only allow MP3 files
        if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
            cb(null, true);
        }
        else {
            cb(new Error('只允许上传MP3音频文件'));
        }
    }
});
// Upload notification sound
router.post('/notification-sound', authenticateToken, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json(ResponseUtil.badRequest('未找到上传的文件'));
        }
        // Return the relative file path
        const relativePath = path.relative(process.cwd(), req.file.path);
        const filePath = relativePath.replace(/\\/g, '/'); // Normalize path separators
        res.json(ResponseUtil.success({
            filePath,
            filename: req.file.filename,
            size: req.file.size
        }, '文件上传成功'));
    }
    catch (error) {
        console.error('Upload notification sound error:', error);
        res.status(500).json(ResponseUtil.internalError('文件上传失败'));
    }
});
export default router;
//# sourceMappingURL=upload.js.map