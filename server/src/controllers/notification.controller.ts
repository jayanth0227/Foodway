import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import notificationService from '../services/notification.service';

export const updateFcmToken = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    console.log("========== FCM API HIT ==========");
    console.log("User:", req.user);
    console.log("Body:", req.body);

    const { fcmToken } = req.body;

    if (!fcmToken || typeof fcmToken !== 'string' || !fcmToken.trim()) {
      console.log("Invalid FCM Token");

      return res.status(400).json({
        success: false,
        error: 'fcmToken is required and must be a non-empty string.',
        code: 'INVALID_INPUT'
      });
    }

    if (!req.user) {
      console.log("No authenticated user");

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

    console.log("FCM Saved Successfully");
    console.log(result);

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