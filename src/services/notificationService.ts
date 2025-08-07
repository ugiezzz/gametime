import * as Notifications from 'expo-notifications';

export class NotificationService {
  static async sendPingNotification(groupName: string, gameName: string, userIds: string[]) {
    try {
      // TODO: Send to Firebase Cloud Messaging for real notifications
      // For now, we'll schedule a local notification for testing
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${groupName} Ping`,
          body: `Ready to play ${gameName}?`,
          data: { groupName, gameName, type: 'ping' },
        },
        trigger: null, // Send immediately
      });

      console.log(`Ping notification sent for ${gameName} in ${groupName}`);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  static async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  static async getExpoPushToken() {
    try {
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // TODO: Add your Expo project ID
      });
      return token;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }
} 