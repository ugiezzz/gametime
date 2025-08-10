// app/index.tsx
import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { CustomAuthService } from '@/services/customAuthService';
import { NotificationService } from '@/services/notificationService';

export default function Index() {
  useEffect(() => {
    // Navigate after Firebase rehydrates auth (persistent session)
    const unsubscribe = CustomAuthService.onAuthStateChanged((user) => {
      router.replace(user ? '/(tabs)' : '/auth/phone');
    });

    // Best-effort push token registration early
    NotificationService.registerPushTokenAsync().catch(() => {});

    return unsubscribe;
  }, []);

  return (
    <View className="flex-1 justify-center items-center bg-gray-900">
      <Text className="text-white text-2xl font-bold mb-4">GameTime</Text>
      <Text className="text-gray-400">Loading...</Text>
    </View>
  );
}
