import { Stack, router } from 'expo-router';
import { NativeWindStyleSheet } from 'nativewind';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { NotificationService } from '@/services/notificationService';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

NativeWindStyleSheet.setOutput({
  default: 'native',
});

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function Layout() {
  useEffect(() => {
    // Set up notification listeners
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    // Register device push token for the signed-in user
    NotificationService.registerPushTokenAsync().catch(() => {});

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor="#333333" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#333333',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ),
          contentStyle: {
            backgroundColor: '#333333',
          },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            headerShown: false,
            title: 'GameTime'
          }} 
        />
        <Stack.Screen 
          name="auth" 
          options={{ 
            headerShown: false,
            title: 'Authentication'
          }} 
        />
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false,
            title: 'Main App'
          }} 
        />
      </Stack>
    </>
  );
}
