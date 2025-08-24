import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';

import { NotificationService } from '@/services/notificationService';

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
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    // Set up notification listeners
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      },
    );

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        try {
          const data: any = response.notification.request.content.data || {};
          if (data.groupId) {
            router.push(`/group/${data.groupId}` as any);
            return;
          }
          if (data.route && typeof data.route === 'string') {
            router.push(data.route as any);
            return;
          }
        } catch {}
        console.log('Notification response:', response);
      });

    // Register device push token for the signed-in user
    NotificationService.registerPushTokenAsync().catch(() => {});

    // Handle deep links
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url);
      
      // Parse the URL to extract token for join links
      const parsedUrl = Linking.parse(url);
      
      if (parsedUrl.path === '/join' && parsedUrl.queryParams?.token) {
        const token = parsedUrl.queryParams.token as string;
        router.push(`/join?token=${encodeURIComponent(token)}`);
      }
    };

    // Handle initial URL if app was opened from a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URLs when app is already running
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
      linkingSubscription.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#333333' }}>
        <Text style={{ color: '#FFFFFF' }}>Loading...</Text>
      </View>
    );
  }

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
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
            >
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
            title: 'GameTime',
          }}
        />
        <Stack.Screen
          name="auth"
          options={{
            headerShown: false,
            title: 'Authentication',
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            title: 'Main App',
          }}
        />
      </Stack>
    </>
  );
}
