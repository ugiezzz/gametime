import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { auth, database } from '@/config/firebase';
import { ref, onValue } from 'firebase/database';
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
      Alert.alert('Error', e?.message || 'Failed to save name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-900 justify-center items-center">
        <ActivityIndicator color="#fff" />
        <Text className="text-gray-300 mt-3">Preparing…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900 justify-center px-6">
      <Text className="text-white text-2xl font-bold mb-6 text-center">Your Name</Text>
      <TextInput
        className="bg-gray-800 text-white p-4 rounded-lg border border-gray-700 text-lg mb-4"
        placeholder="Enter your name"
        placeholderTextColor="#9CA3AF"
        value={name}
        onChangeText={setName}
        autoFocus
      />
      <TouchableOpacity
        className={`p-4 rounded-lg ${saving ? 'bg-gray-600' : 'bg-blue-600'}`}
        onPress={handleSave}
        disabled={saving}
      >
        <Text className="text-white text-center font-semibold">{saving ? 'Saving…' : 'Continue'}</Text>
      </TouchableOpacity>
    </View>
  );
}


