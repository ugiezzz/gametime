import { ScrollView, Text, View } from 'react-native';

import DatabaseTest from '@/components/DatabaseTest';

export default function TestDatabase() {
  return (
    <ScrollView className="flex-1 bg-gray-900">
      <View className="p-4">
        <Text className="mb-4 text-center text-2xl font-bold text-white">
          Firebase Database Test
        </Text>

        <Text className="mb-4 text-center text-gray-400">
          This screen tests the Firebase Realtime Database connection. Make sure
          you've updated the Firebase config with your actual credentials.
        </Text>

        <DatabaseTest />

        <View className="mt-4 rounded-lg bg-gray-800 p-4">
          <Text className="mb-2 font-bold text-white">Instructions:</Text>
          <Text className="text-sm text-gray-300">
            1. Update src/config/firebase.ts with your actual Firebase
            credentials{'\n'}
            2. Enable Realtime Database in Firebase Console{'\n'}
            3. Press "Test Connection" to verify the setup{'\n'}
            4. Check Firebase Console to see the test data
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
