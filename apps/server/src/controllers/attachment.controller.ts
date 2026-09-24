import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { ENV } from '../config/env';

// Ensure upload directory exists
if (!fs.existsSync(ENV.UPLOAD_DIR)) {
  fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });
}

// Disallowed extensions for security
const DISALLOWED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.js', '.jar', '.com', '.scr', '.ps1'
]);

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ENV.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, safeName);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: ENV.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (DISALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error('File type is not permitted for security reasons.'));
    }
    cb(null, true);
  },
});

export async function uploadAttachment(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded.', statusCode: 400 });
    return;
  }

  const file = req.file;
  const isImage = file.mimetype.startsWith('image/');

  const attachmentData = {
    url: `/api/attachments/${file.filename}`,
    name: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
    isImage,
  };

  res.status(201).json({
    success: true,
    data: attachmentData,
  });
}

export async function serveAttachment(req: Request, res: Response): Promise<void> {
  const { filename } = req.params;

  // Prevent path traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(ENV.UPLOAD_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, error: 'File not found.', statusCode: 404 });
    return;
  }

  res.sendFile(filePath);
}
