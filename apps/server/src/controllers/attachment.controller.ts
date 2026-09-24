import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { ENV } from '../config/env';
import { storageService } from '../services/storage.service';

// Disallowed extensions for security
const DISALLOWED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.js', '.jar', '.com', '.scr', '.ps1'
]);

// Memory storage keeps file buffers in memory for streaming to persistent storage
const storage = multer.memoryStorage();

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
  const ext = path.extname(file.originalname).toLowerCase();
  const safeFilename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

  try {
    const fileUrl = await storageService.upload(safeFilename, file.buffer, file.mimetype);

    const attachmentData = {
      url: fileUrl,
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      isImage,
    };

    res.status(201).json({
      success: true,
      data: attachmentData,
    });
  } catch (err: any) {
    console.error('[Upload Error]', err);
    res.status(500).json({ success: false, error: 'Failed to store attachment.', statusCode: 500 });
  }
}

export async function serveAttachment(req: Request, res: Response): Promise<void> {
  const { filename } = req.params;

  // Prevent path traversal
  const safeFilename = path.basename(filename);

  try {
    const fileData = await storageService.get(safeFilename);

    if (!fileData) {
      res.status(404).json({ success: false, error: 'File not found.', statusCode: 404 });
      return;
    }

    res.setHeader('Content-Type', fileData.mimeType);
    if (fileData.size) {
      res.setHeader('Content-Length', fileData.size.toString());
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // Force browser direct download for zip archives or download query
    const isZip = safeFilename.endsWith('.zip') || fileData.mimeType.includes('zip');
    if (req.query.download === 'true' || isZip) {
      const downloadName = (req.query.name as string) || (isZip ? 'NULL_Complete_Package.zip' : safeFilename);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    }

    fileData.stream.pipe(res);
  } catch (err: any) {
    console.error('[Serve Error]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve attachment.', statusCode: 500 });
  }
}
