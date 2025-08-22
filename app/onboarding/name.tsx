import { router } from 'expo-router';
import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { auth, database } from '@/config/firebase';
import { FirebaseGroupService } from '@/services/firebaseGroupService';

export default function NameOnboardingScreen() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/auth/phone');
      return;
    }
    const userRef = ref(database, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val() as { displayName?: string };
        const existing = (val.displayName || '').trim();
        if (existing.length > 0) {
          router.replace('/(tabs)');
          return;
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter your name to continue');
      return;
    }
    try {
      setSaving(true);
      await FirebaseGroupService.updateCurrentUserDisplayName(trimmed);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.message || 'Failed to save name. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <ActivityIndicator color="#fff" />
        <Text className="mt-3 text-gray-300">Preparing…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center bg-gray-900 px-6">
      <Text className="mb-6 text-center text-2xl font-bold text-white">
        Your Name
      </Text>
      <TextInput
        className="mb-4 rounded-lg border border-gray-700 bg-gray-800 p-4 text-lg text-white"
        placeholder="Enter your name"
        placeholderTextColor="#9CA3AF"
        value={name}
        onChangeText={setName}
        autoFocus
      />
      <TouchableOpacity
        className={`rounded-lg p-4 ${saving ? 'bg-gray-600' : 'bg-blue-600'}`}
        onPress={handleSave}
        disabled={saving}
      >
        <Text className="text-center font-semibold text-white">
          {saving ? 'Saving…' : 'Continue'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
