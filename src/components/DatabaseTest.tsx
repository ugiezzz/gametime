import { get, ref, set } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

import { database } from '@/config/firebase';

export default function DatabaseTest() {
  const [isConnected, setIsConnected] = useState(false);
  const [testData, setTestData] = useState('');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      // Test write
      const testRef = ref(database, 'test');
      await set(testRef, {
        message: 'Hello from GameTime!',
        timestamp: new Date().toISOString(),
      });

      // Test read
      const snapshot = await get(testRef);
      if (snapshot.exists()) {
        setIsConnected(true);
        setTestData(JSON.stringify(snapshot.val(), null, 2));
      }
    } catch (error) {
      console.error('Database connection test failed:', error);
      setIsConnected(false);
    }
  };

  const clearTestData = async () => {
    try {
      const testRef = ref(database, 'test');
      await set(testRef, null);
      setTestData('');
      Alert.alert('Success', 'Test data cleared!');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear test data');
    }
  };

  return (
    <View className="m-4 rounded-lg bg-gray-800 p-4">
      <Text className="mb-2 text-lg font-bold text-white">
        Firebase Database Test
      </Text>

      <View className="mb-4">
        <Text className="text-white">
          Status: {isConnected ? '✅ Connected' : '❌ Not Connected'}
        </Text>
      </View>

      {testData && (
        <View className="mb-4">
          <Text className="mb-2 text-sm text-white">Test Data:</Text>
          <Text className="text-xs text-gray-300">{testData}</Text>
        </View>
      )}

      <View className="flex-row space-x-2">
        <TouchableOpacity
          className="rounded bg-blue-600 px-4 py-2"
          onPress={testConnection}
        >
          <Text className="text-white">Test Connection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="rounded bg-red-600 px-4 py-2"
          onPress={clearTestData}
        >
          <Text className="text-white">Clear Data</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
