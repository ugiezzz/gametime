import Constants from 'expo-constants';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import { ref, update } from 'firebase/database';

import { auth, database } from '@/config/firebase';

// Ensure Firebase is initialized before proceeding
const ensureFirebaseInitialized = () => {
  if (!auth || !database) {
    throw new Error(
      'Firebase not initialized. Please wait for initialization to complete.',
    );
  }
};

export class NotificationService {
  static async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      // Silenced to satisfy no-console
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
      // Silenced to satisfy no-console
      return null;
    }
  }

  static async registerPushTokenAsync(): Promise<string | null> {
    try {
      // Ensure Firebase is initialized
      ensureFirebaseInitialized();

      const granted = await this.requestPermissions();
      if (!granted) return null;

      const token = await this.getExpoPushToken();
      if (!token) return null;

      const { currentUser } = auth;
      if (!currentUser) return token;

      const locales = Localization.getLocales?.() || ([] as any);
      const primaryLocale = locales[0] || ({} as any);
      const deviceTimeZoneIANA =
        (Localization as any)?.timezone ||
        primaryLocale?.timeZone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        undefined;
      const deviceLocale =
        primaryLocale?.languageTag ||
        (Localization as any)?.locale ||
        undefined;
      const deviceUtcOffsetMinutes = new Date().getTimezoneOffset();

      const userRef = ref(database, `users/${currentUser.uid}`);
      await update(userRef, {
        expoPushToken: token,
        expoPushTokenUpdatedAt: new Date().toISOString(),
        deviceTimeZoneIANA: deviceTimeZoneIANA || null,
        deviceUtcOffsetMinutes,
        deviceLocale: deviceLocale || null,
      });
      return token;
    } catch (error) {
      // Silenced to satisfy no-console
      return null;
    }
  }
}
