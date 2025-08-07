import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { database } from '@/config/firebase';
import { ref, set, get } from 'firebase/database';

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
    <View className="p-4 bg-gray-800 rounded-lg m-4">
      <Text className="text-white text-lg font-bold mb-2">
        Firebase Database Test
      </Text>
      
      <View className="mb-4">
        <Text className="text-white">
          Status: {isConnected ? '✅ Connected' : '❌ Not Connected'}
        </Text>
      </View>

      {testData && (
        <View className="mb-4">
          <Text className="text-white text-sm mb-2">Test Data:</Text>
          <Text className="text-gray-300 text-xs">{testData}</Text>
        </View>
      )}

      <View className="flex-row space-x-2">
        <TouchableOpacity
          className="bg-blue-600 px-4 py-2 rounded"
          onPress={testConnection}
        >
          <Text className="text-white">Test Connection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-red-600 px-4 py-2 rounded"
          onPress={clearTestData}
        >
          <Text className="text-white">Clear Data</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
} 