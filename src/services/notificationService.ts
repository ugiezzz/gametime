import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { ref, update } from 'firebase/database';

import { auth, database } from '@/config/firebase';

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
        projectId ? { projectId } : (undefined as any),
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

      const { currentUser } = auth;
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
}
