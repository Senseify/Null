import { Router } from 'express';
import { uploadMiddleware, uploadAttachment, serveAttachment } from '../controllers/attachment.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/upload', requireAuth, uploadMiddleware.single('file'), uploadAttachment);
router.get('/:filename', serveAttachment);

export default router;
