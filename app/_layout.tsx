import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { NotificationService } from '@/services/notificationService';

function BackButton() {
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{ paddingHorizontal: 8, paddingVertical: 4 }}
    >
      <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

export default function Layout() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    // Set up notification listeners
    const subscription = Notifications.addNotificationReceivedListener(() => {
      // No mutation: server now sends localized text in body and raw timestamps in data
      // We rely on navigation handling only
    });

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        try {
          const data: any = response.notification.request.content.data || {};

          // Handle both ping and ping_response notifications - both navigate to group
          if (data.groupId) {
            router.push(`/group/${data.groupId}` as any);
            return;
          }

          // Fallback route handling
          if (data.route && typeof data.route === 'string') {
            router.push(data.route as any);
          }
        } catch {
          // Silently handle errors
        }
      });

    // Register device push token for the signed-in user
    NotificationService.registerPushTokenAsync().catch(() => {
      // Silently handle push token registration errors
    });

    // Handle deep links
    const handleDeepLink = (url: string) => {
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
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#333333',
        }}
      >
        <Text style={{ color: '#FFFFFF' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      {/* eslint-disable-next-line react/style-prop-object */}
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
          headerLeft: BackButton,
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
