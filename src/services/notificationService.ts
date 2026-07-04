import { getFirebaseMessaging } from '../config/firebase';
import { logger } from '../config/logger';
import { User } from '../models/User';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Sends a push to every registered device of a user via FCM.
 * No-ops (with a log line) when Firebase isn't configured. Dead tokens
 * returned by FCM are pruned from the user document automatically.
 */
export const notificationService = {
  async sendToUser(userId: string, payload: PushPayload): Promise<{ sent: number }> {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      logger.info(`[push skipped — Firebase not configured] ${payload.title}: ${payload.body}`);
      return { sent: 0 };
    }

    const user = await User.findById(userId).exec();
    if (!user || user.fcmTokens.length === 0) return { sent: 0 };

    const response = await messaging.sendEachForMulticast({
      tokens: user.fcmTokens,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });

    // Prune tokens FCM reports as invalid/unregistered
    const deadTokens = response.responses
      .map((r, i) => (!r.success && r.error?.code.includes('registration-token') ? user.fcmTokens[i] : null))
      .filter((t): t is string => t !== null);

    if (deadTokens.length > 0) {
      await User.updateOne({ _id: userId }, { $pull: { fcmTokens: { $in: deadTokens } } }).exec();
    }

    return { sent: response.successCount };
  },
};
