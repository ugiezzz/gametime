import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { get, ref } from 'firebase/database';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';

import { database } from '@/config/firebase';
import { CustomAuthService } from '@/services/customAuthService';
import type { Group } from '@/services/firebaseGroupService';
import { FirebaseGroupService } from '@/services/firebaseGroupService';

export default function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupIdToNames, setGroupIdToNames] = useState<
    Record<string, string[]>
  >({});

  useEffect(() => {
    loadGroups();
  }, []);

  // Resolve member display names when groups list changes
  useEffect(() => {
    const resolveNames = async () => {
      const mapping: Record<string, string[]> = {};
      await Promise.all(
        groups.map(async (g) => {
          // Prefer legacy display list if present
          const legacyNames = Array.isArray((g as any).members)
            ? ((g as any).members as any[])
                .map((m: any) => m?.name)
                .filter(Boolean)
            : [];
          if (legacyNames.length > 0) {
            mapping[g.id] = legacyNames as string[];
            return;
          }
          const uids = g.membersByUid ? Object.keys(g.membersByUid) : [];
          if (uids.length === 0) {
            mapping[g.id] = [];
            return;
          }
          const names: string[] = [];
          await Promise.all(
            uids.map(async (uid) => {
              try {
                const snap = await get(ref(database, `users/${uid}`));
                if (snap.exists()) {
                  const val = snap.val() as { displayName?: string };
                  if (val?.displayName) names.push(val.displayName);
                }
              } catch {
                // ignore best-effort
              }
            }),
          );
          mapping[g.id] = names;
        }),
      );
      setGroupIdToNames(mapping);
    };
    if (groups.length > 0) resolveNames();
    else setGroupIdToNames({});
  }, [groups]);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
      return () => {};
    }, []),
  );

  const loadGroups = async () => {
    try {
      // Check if user is authenticated
      if (!CustomAuthService.isAuthenticated()) {
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
    const names = groupIdToNames[item.id] || [];
    return (
      <TouchableOpacity
        className="mx-4 mb-3 rounded-lg bg-gray-800 p-4"
        onPress={() => handleGroupPress(item.id)}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-lg font-bold text-white">{item.name}</Text>
            <Text
              className="text-sm text-gray-400"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {names.length > 0
                ? names.join(', ')
                : `${memberCount} member${memberCount === 1 ? '' : 's'}`}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-sm text-gray-400">
              {formatLastPing(item.lastPing)}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900 px-6">
        <Text className="mb-6 text-lg text-white">Loading groups...</Text>
        <View className="w-full">
          <TouchableOpacity
            className="mb-3 rounded-lg bg-blue-600 p-4"
            onPress={handleCreateGroup}
          >
            <Text className="text-center font-bold text-white">
              Create Group
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="rounded-lg bg-gray-700 p-4"
            onPress={loadGroups}
          >
            <Text className="text-center font-bold text-white">
              Retry Loading
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      {groups.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="people-outline" size={64} color="#9CA3AF" />
          <Text className="mb-2 mt-4 text-xl font-bold text-white">
            No Groups Yet
          </Text>
          <Text className="mb-8 text-center text-gray-400">
            Create your first group to start pinging friends for games
          </Text>
          <TouchableOpacity
            className="rounded-lg bg-blue-600 px-6 py-3"
            onPress={handleCreateGroup}
          >
            <Text className="font-bold text-white">Create Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View className="p-4">
            <TouchableOpacity
              className="flex-row items-center justify-center rounded-lg bg-blue-600 p-3"
              onPress={handleCreateGroup}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="ml-2 font-bold text-white">
                Create New Group
              </Text>
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
