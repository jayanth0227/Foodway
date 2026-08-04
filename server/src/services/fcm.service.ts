import { getMessaging, Message } from "firebase-admin/messaging";

export interface SendNotificationParams {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  link?: string;
  icon?: string;
  badge?: string;
}

/**
 * Send high-priority FCM push notification with sound, vibration, lockscreen visibility, and deep-link payload.
 * Supports both object options and legacy positional arguments.
 * NEVER throws an exception so business transactions are never blocked.
 */
export async function sendNotification(
  tokenOrOptions: string | SendNotificationParams,
  title?: string,
  body?: string,
  data: Record<string, string> = {}
): Promise<string | null> {
  try {
    let params: SendNotificationParams;

    if (typeof tokenOrOptions === 'object') {
      params = tokenOrOptions;
    } else {
      params = {
        token: tokenOrOptions,
        title: title || '',
        body: body || '',
        data,
      };
    }

    const {
      token,
      title: notifTitle,
      body: notifBody,
      data: extraData = {},
      link = '/restaurant/dashboard',
      icon = '/favicon.ico',
      badge = '/favicon.ico'
    } = params;

    if (!token || typeof token !== 'string' || !token.trim()) {
      console.warn('⚠️ FCM Warning: Skipping push notification because recipient token is empty.');
      return null;
    }

    const payloadData: Record<string, string> = {
      ...extraData,
      click_action: link,
      url: link,
      timestamp: new Date().toISOString(),
    };

    const message: Message = {
      token: token.trim(),
      notification: {
        title: notifTitle,
        body: notifBody,
      },
      data: payloadData,
      android: {
        priority: 'high',
        notification: {
          title: notifTitle,
          body: notifBody,
          sound: 'default',
          channelId: 'orders_channel',
          clickAction: link,
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            alert: {
              title: notifTitle,
              body: notifBody,
            },
            sound: 'default',
            contentAvailable: true,
          },
        },
      },
      webpush: {
        headers: {
          Urgency: 'high',
        },
        notification: {
          title: notifTitle,
          body: notifBody,
          icon,
          badge,
          vibrate: [200, 100, 200, 100, 200],
          requireInteraction: true,
          data: payloadData,
        },
        fcmOptions: {
          link,
        },
      },
    };

   console.log("\n========== SEND NOTIFICATION ==========");
console.log("Token:", token);
console.log("Title:", notifTitle);
console.log("Body:", notifBody);
console.log("Data:", payloadData);

const response = await getMessaging().send(message);

console.log("========== FIREBASE RESPONSE ==========");
console.log(response);
console.log("=======================================");

return response;
 } catch (error: any) {
  console.error("========== FCM ERROR ==========");
  console.error(error);
  console.error("===============================");
  return null;
}
}

export default sendNotification;