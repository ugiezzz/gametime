import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseGroupService, Group } from '@/services/firebaseGroupService';
import { FirebaseAuthService } from '@/services/firebaseAuthService';
import { useFocusEffect } from '@react-navigation/native';

export default function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
      return () => {};
    }, [])
  );

  const loadGroups = async () => {
    try {
      // Check if user is authenticated
      if (!FirebaseAuthService.isAuthenticated()) {
        console.log('User not authenticated, redirecting to auth');
        router.replace('/auth/phone');
        return;
      }

      const loadedGroups = await FirebaseGroupService.getUserGroups();
      setGroups(loadedGroups);
    } catch (error) {
      console.error('Failed to load groups:', error);
      Alert.alert('Error', 'Failed to load groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = () => {
    router.push('/create-group');
  };

  const handleGroupPress = (groupId: string) => {
    router.push(`/group/${groupId}`);
  };

  const formatLastPing = (date: Date | undefined) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const renderGroupItem = ({ item }: { item: Group }) => {
    const memberCount = item.membersByUid
      ? Object.keys(item.membersByUid).length
      : Array.isArray((item as any).members)
      ? ((item as any).members as any[]).length
      : 0;
    return (
      <TouchableOpacity
        className="bg-gray-800 p-4 rounded-lg mb-3 mx-4"
        onPress={() => handleGroupPress(item.id)}
      >
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-white text-lg font-bold">{item.name}</Text>
            <Text className="text-gray-400 text-sm">{memberCount} members</Text>
          </View>
          <View className="items-end">
            <Text className="text-gray-400 text-sm">{formatLastPing(item.lastPing)}</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900 px-6">
        <Text className="text-white text-lg mb-6">Loading groups...</Text>
        <View className="w-full">
          <TouchableOpacity
            className="bg-blue-600 p-4 rounded-lg mb-3"
            onPress={handleCreateGroup}
          >
            <Text className="text-white text-center font-bold">Create Group</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-gray-700 p-4 rounded-lg"
            onPress={loadGroups}
          >
            <Text className="text-white text-center font-bold">Retry Loading</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      {groups.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="people-outline" size={64} color="#9CA3AF" />
          <Text className="text-white text-xl font-bold mt-4 mb-2">
            No Groups Yet
          </Text>
          <Text className="text-gray-400 text-center mb-8">
            Create your first group to start pinging friends for games
          </Text>
          <TouchableOpacity
            className="bg-blue-600 px-6 py-3 rounded-lg"
            onPress={handleCreateGroup}
          >
            <Text className="text-white font-bold">Create Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View className="p-4">
            <TouchableOpacity
              className="bg-blue-600 p-3 rounded-lg flex-row items-center justify-center"
              onPress={handleCreateGroup}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-bold ml-2">Create New Group</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={groups}
            renderItem={renderGroupItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={loadGroups}
          />
        </>
      )}
    </View>
  );
} 