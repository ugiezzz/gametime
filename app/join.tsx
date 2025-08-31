import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { joinGroupViaLink } from '@/config/firebase';
import { CustomAuthService } from '@/services/customAuthService';

function JoinBackButton() {
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{ paddingHorizontal: 8, paddingVertical: 4 }}
    >
      <Ionicons name="chevron-back" size={24} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

export default function JoinScreen() {
  const { token } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [groupName] = useState<string>('');

  useEffect(() => {
    // If user is not authenticated, redirect to auth first
    if (!CustomAuthService.isAuthenticated()) {
      Alert.alert('Sign In Required', 'You need to sign in to join a group.', [
        {
          text: 'Sign In',
          onPress: () => router.replace('/auth/phone'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => router.back(),
        },
      ]);
    }
  }, []);

  const handleJoinGroup = async () => {
    if (!token || typeof token !== 'string') {
      Alert.alert('Error', 'Invalid invite link');
      return;
    }

    setLoading(true);
    try {
      const result = await joinGroupViaLink({ token });
      const data = result.data as {
        success: boolean;
        groupId: string;
        message?: string;
      };
      const { success, groupId, message } = data;

      if (success) {
        Alert.alert(
          'Success!',
          message || 'You have joined the group successfully!',
          [
            {
              text: 'View Group',
              onPress: () => router.replace(`/group/${groupId}`),
            },
          ],
        );
      }
    } catch (error: any) {
      let errorMessage = 'Failed to join group';

      if (error?.message?.includes('expired')) {
        errorMessage = 'This invite link has expired';
      } else if (error?.message?.includes('Invalid')) {
        errorMessage = 'Invalid invite link';
      } else if (error?.message?.includes('not found')) {
        errorMessage = 'Group not found or has been deleted';
      } else if (error?.message?.includes('already a member')) {
        errorMessage = 'You are already a member of this group';
      }

      Alert.alert('Error', errorMessage, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!CustomAuthService.isAuthenticated()) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900">
        <Stack.Screen
          options={{
            headerTitle: 'Join Group',
            headerStyle: { backgroundColor: '#111827' },
            headerTintColor: '#E5E7EB',
          }}
        />
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="lock-closed" size={64} color="#9CA3AF" />
          <Text className="mt-4 text-center text-lg text-white">
            Sign in required
          </Text>
          <Text className="mt-2 text-center text-gray-400">
            You need to sign in to join a group
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      <Stack.Screen
        options={{
          headerTitle: 'Join Group',
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#E5E7EB',
          headerLeft: JoinBackButton,
        }}
      />

      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="people" size={64} color="#3B82F6" />

        <Text className="mt-6 text-center text-xl font-semibold text-white">
          Join Group Invitation
        </Text>

        <Text className="mt-2 text-center text-gray-400">
          You&apos;ve been invited to join a GameTime group!
        </Text>

        {groupName && (
          <Text className="mt-4 text-center text-lg font-medium text-blue-400">
            {groupName}
          </Text>
        )}

        <View className="mt-8 w-full space-y-4">
          <TouchableOpacity
            className="w-full rounded-lg bg-blue-600 py-4"
            onPress={handleJoinGroup}
            disabled={loading}
          >
            <Text className="text-center text-lg font-semibold text-white">
              {loading ? 'Joining...' : 'Join Group'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-full rounded-lg border border-gray-600 py-4"
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text className="text-center text-lg font-semibold text-gray-300">
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
