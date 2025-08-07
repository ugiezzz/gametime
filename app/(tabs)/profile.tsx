import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement Firebase logout
            router.replace('/auth/phone');
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-900 p-4">
      <View className="bg-gray-800 rounded-lg p-6 mb-6">
        <View className="items-center mb-4">
          <View className="w-20 h-20 bg-blue-600 rounded-full items-center justify-center mb-4">
            <Ionicons name="person" size={40} color="white" />
          </View>
          <Text className="text-white text-xl font-bold">User Name</Text>
          <Text className="text-gray-400">+1 234 567 8900</Text>
        </View>
      </View>

      <View className="bg-gray-800 rounded-lg p-4 mb-6">
        <Text className="text-white text-lg font-bold mb-4">Settings</Text>
        
        <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-700">
          <Ionicons name="notifications-outline" size={20} color="#9CA3AF" />
          <Text className="text-white ml-3 flex-1">Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        
        <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-700">
          <Ionicons name="people-outline" size={20} color="#9CA3AF" />
          <Text className="text-white ml-3 flex-1">Contacts</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        
        <TouchableOpacity className="flex-row items-center py-3">
          <Ionicons name="information-circle-outline" size={20} color="#9CA3AF" />
          <Text className="text-white ml-3 flex-1">About</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className="bg-red-600 p-4 rounded-lg flex-row items-center justify-center"
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color="white" />
        <Text className="text-white font-bold ml-2">Logout</Text>
      </TouchableOpacity>
    </View>
  );
} 