import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CustomAuthService } from '@/services/customAuthService';
import { auth, database } from '@/config/firebase';
import { ref, onValue, get } from 'firebase/database';
import { FirebaseGroupService } from '@/services/firebaseGroupService';

export default function ProfileScreen() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [debugOutput, setDebugOutput] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = ref(database, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val() as { displayName?: string; phoneNumber?: string };
        setDisplayName(val.displayName || null);
        setPhoneNumber(val.phoneNumber || null);
        if (!editing) setNameInput(val.displayName || '');
      }
    });

    return () => unsubscribe();
  }, []);

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
          onPress: async () => {
            try {
              await CustomAuthService.signOut();
            } finally {
              router.replace('/auth/phone');
            }
          },
        },
      ]
    );
  };

  const isOwner = phoneNumber === '+972502525177';

  const startEdit = () => {
    setNameInput(displayName || '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setNameInput(displayName || '');
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert('Invalid name', 'Name cannot be empty');
      return;
    }
    try {
      setSaving(true);
      await FirebaseGroupService.updateCurrentUserDisplayName(trimmed);
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Failed to save', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const runMembershipDiagnostics = async () => {
    try {
      setDebugOutput('Running diagnostics...');
      const me = auth.currentUser?.uid || '';
      // Read user's index first to avoid permission errors on groups root
      const idxSnap = await get(ref(database, `userGroups/${me}`));
      if (!idxSnap.exists()) {
        setDebugOutput('No userGroups index for current user. Create a group or wait for indexer.');
        return;
      }
      const groupIds: string[] = Object.keys(idxSnap.val() || {});
      const lines: string[] = [];
      for (const gid of groupIds) {
        const groupSnap = await get(ref(database, `groups/${gid}`));
        if (!groupSnap.exists()) continue;
        const group = groupSnap.val();
        const membersByUid = group.membersByUid ? Object.keys(group.membersByUid) : [];
        const hasMe = me ? membersByUid.includes(me) : false;
        const hasIndex = true; // we already read from userGroups/{me}
        lines.push(`${gid} • member=${hasMe} • userGroupsIndex=${hasIndex}`);
      }
      setDebugOutput(lines.join('\n'));
    } catch (e: any) {
      setDebugOutput(`Error: ${e?.message || e}`);
    }
  };

  return (
    <View className="flex-1 bg-gray-900 p-4">
      <View className="bg-gray-800 rounded-lg p-6 mb-6">
        <View className="items-center mb-2">
          <Text className="text-white text-xl font-bold">{displayName || phoneNumber || '—'}</Text>
          <Text className="text-gray-400 mt-1">{phoneNumber || '—'}</Text>
        </View>
        {!editing ? (
          <TouchableOpacity className="mt-3 self-center bg-blue-600 px-4 py-2 rounded" onPress={startEdit}>
            <Text className="text-white font-semibold">Edit name</Text>
          </TouchableOpacity>
        ) : (
          <View className="mt-4">
            <Text className="text-gray-300 mb-2">Display name</Text>
            <TextInput
              className="bg-gray-900 text-white p-3 rounded border border-gray-700"
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
              value={nameInput}
              onChangeText={setNameInput}
              editable={!saving}
            />
            <View className="flex-row mt-3">
              <TouchableOpacity className="bg-gray-700 px-4 py-2 rounded mr-3" onPress={cancelEdit} disabled={saving}>
                <Text className="text-white">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity className="bg-green-600 px-4 py-2 rounded flex-row items-center" onPress={saveName} disabled={saving}>
                {saving && <ActivityIndicator size="small" color="#fff" className="mr-2" />}
                <Text className="text-white font-semibold">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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

      {isOwner && (
        <View className="bg-gray-800 rounded-lg p-4 mb-6">
          <Text className="text-white text-lg font-bold mb-3">Test scripts</Text>
          <TouchableOpacity className="bg-blue-600 p-3 rounded mb-3" onPress={runMembershipDiagnostics}>
            <Text className="text-white text-center font-semibold">Membership index diagnostics</Text>
          </TouchableOpacity>
          {!!debugOutput && (
            <View className="bg-gray-900 p-3 rounded">
              <Text className="text-gray-300 text-xs" selectable>{debugOutput}</Text>
            </View>
          )}
        </View>
      )}

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