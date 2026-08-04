import api from './api';
import { requestNotificationPermission } from '../utils/requestNotificationPermission';

export const notificationService = {
  /**
   * Send the generated FCM Token to backend PATCH /api/notifications/fcm-token
   */
  updateFcmToken: async (fcmToken: string): Promise<{ success: boolean; message?: string }> => {
    const response = await api.patch<{ success: boolean; message?: string }>('/notifications/fcm-token', { fcmToken });
    return response.data;
  },

  /**
   * Helper function triggered after successful authentication / session restoration:
   * Requests FCM token from browser & sends it to backend.
   */
  syncFcmTokenAfterLogin: async (): Promise<void> => {
    try {
      const token = await requestNotificationPermission();
      if (token) {
        await notificationService.updateFcmToken(token);
        console.log('FCM token successfully registered with backend server.');
      }
    } catch (error) {
      console.error('Failed to sync FCM token with backend server:', error);
    }
  }
};

export default notificationService;
