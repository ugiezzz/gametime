import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { auth, database } from '@/config/firebase';
import { ref, get, update } from 'firebase/database';

export class NotificationService {
  static async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  static getProjectId(): string | undefined {
    // Prefer eas.projectId in production; fall back to expoConfig in dev
    const easProjectId = (Constants as any)?.easConfig?.projectId;
    const expoProjectId = (Constants as any)?.expoConfig?.extra?.eas?.projectId;
    return easProjectId || expoProjectId;
  }

  static async getExpoPushToken() {
    try {
      const projectId = this.getProjectId();
      const { data: token } = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined as any
      );
      return token;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  static async registerPushTokenAsync(): Promise<string | null> {
    try {
      const granted = await this.requestPermissions();
      if (!granted) return null;

      const token = await this.getExpoPushToken();
      if (!token) return null;

      const currentUser = auth.currentUser;
      if (!currentUser) return token;

      const userRef = ref(database, `users/${currentUser.uid}`);
      await update(userRef, {
        expoPushToken: token,
        expoPushTokenUpdatedAt: new Date().toISOString(),
      });
      return token;
    } catch (error) {
      console.error('Failed to register push token:', error);
      return null;
    }
  }

  private static async getTokensForUsers(userIds: string[]): Promise<string[]> {
    const tokens: string[] = [];
    for (const userId of userIds) {
      try {
        const snapshot = await get(ref(database, `users/${userId}/expoPushToken`));
        if (snapshot.exists()) {
          const token = snapshot.val();
          if (typeof token === 'string' && token.startsWith('ExponentPushToken')) {
            tokens.push(token);
          }
        }
      } catch (e) {
        // continue
      }
    }
    return tokens;
  }

  static async sendPingNotification(groupName: string, userIds: string[]) {
    try {
      // Gather tokens for recipients
      const tokens = await this.getTokensForUsers(userIds);

      if (tokens.length === 0) {
        // Fallback to local notification for the sender only
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${groupName} Ping`,
            body: `You've received a ping`,
            data: { groupName, type: 'ping' },
          },
          trigger: null,
        });
        return;
      }

      const messages = tokens.map((token) => ({
        to: token,
        title: `${groupName} Ping`,
        body: `You've received a ping`,
        sound: 'default',
        data: { groupName, type: 'ping' },
        priority: 'high',
      }));

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(messages),
      });
    } catch (error) {
      console.error('Failed to send push notifications:', error);
    }
  }

  // Resolve recipients from membersByUid map
  static async sendPingToGroup(groupId: string, groupName: string): Promise<void> {
    try {
      const membersRef = ref(database, `groups/${groupId}/membersByUid`);
      const snap = await get(membersRef);
      const uids = snap.exists() ? Object.keys(snap.val() || {}) : [];
      if (uids.length === 0) return;
      await this.sendPingNotification(groupName, uids);
    } catch (e) {
      console.error('Failed to send group ping:', e);
    }
  }
} 