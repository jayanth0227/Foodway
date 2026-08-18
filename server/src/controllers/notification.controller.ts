import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import notificationService from '../services/notification.service';

export const updateFcmToken = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken || typeof fcmToken !== 'string' || !fcmToken.trim()) {
      return res.status(400).json({
        success: false,
        error: 'fcmToken is required and must be a non-empty string.',
        code: 'INVALID_INPUT'
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        code: 'UNAUTHORIZED'
      });
    }

    const result = await notificationService.saveFcmToken(
      req.user,
      fcmToken.trim()
    );

    return res.json({
      success: true,
      message: 'FCM token updated successfully.',
      data: result
    });

  } catch (error: any) {
    console.error("FCM API ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update FCM token.',
      code: 'SERVER_ERROR'
    });
  }
};