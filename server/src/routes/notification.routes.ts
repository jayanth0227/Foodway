import { Router } from 'express';
import { updateFcmToken } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// PATCH /api/notifications/fcm-token
router.patch('/fcm-token', authenticate, updateFcmToken);

export default router;
