import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import DatabaseTest from '@/components/DatabaseTest';

export default function TestDatabase() {
  return (
    <ScrollView className="flex-1 bg-gray-900">
      <View className="p-4">
        <Text className="text-white text-2xl font-bold mb-4 text-center">
          Firebase Database Test
        </Text>
        
        <Text className="text-gray-400 mb-4 text-center">
          This screen tests the Firebase Realtime Database connection.
          Make sure you've updated the Firebase config with your actual credentials.
        </Text>

        <DatabaseTest />
        
        <View className="mt-4 p-4 bg-gray-800 rounded-lg">
          <Text className="text-white font-bold mb-2">Instructions:</Text>
          <Text className="text-gray-300 text-sm">
            1. Update src/config/firebase.ts with your actual Firebase credentials{'\n'}
            2. Enable Realtime Database in Firebase Console{'\n'}
            3. Press "Test Connection" to verify the setup{'\n'}
            4. Check Firebase Console to see the test data
          </Text>
        </View>
      </View>
    </ScrollView>
  );
} 