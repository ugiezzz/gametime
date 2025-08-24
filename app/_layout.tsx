import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';

import { NotificationService } from '@/services/notificationService';
import { TimeService } from '@/services/timeService';

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
        
        // Handle different notification types with local time formatting
        const data = notification.request.content.data as any;
        
        if (data?.type === 'ping' && data?.scheduledAtMs) {
          // Original ping notification
          try {
            const creatorName = notification.request.content.body?.split(' start playing')[0] || 'Someone';
            const localTimeBody = TimeService.formatNotificationTime(data.scheduledAtMs, creatorName);
            
            // Update notification content for display
            (notification.request.content as any).body = localTimeBody;
          } catch (error) {
            console.log('Error updating ping notification time:', error);
          }
        } else if (data?.type === 'ping_response' && data?.selectedTimeMs) {
          // Ping response notification
          try {
            const responderName = notification.request.content.body?.split(' would love to join')[0] || 'Someone';
            const localTime = TimeService.formatLocalTime(data.selectedTimeMs);
            const localTimeBody = `${responderName} would love to join at ${localTime}`;
            
            // Update notification content for display
            (notification.request.content as any).body = localTimeBody;
          } catch (error) {
            console.log('Error updating response notification time:', error);
          }
        }
      },
    );

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
