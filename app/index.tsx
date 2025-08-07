// app/index.tsx
import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';

export default function Index() {
  useEffect(() => {
    // Redirect to auth flow
    const timer = setTimeout(() => {
      router.push('/auth/phone');
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 justify-center items-center bg-gray-900">
      <Text className="text-white text-2xl font-bold mb-4">GameTime</Text>
      <Text className="text-gray-400">Loading...</Text>
    </View>
  );
}
