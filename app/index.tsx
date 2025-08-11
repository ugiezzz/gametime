// app/index.tsx
import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { CustomAuthService } from '@/services/customAuthService';
import { NotificationService } from '@/services/notificationService';
import { FirebaseGroupService } from '@/services/firebaseGroupService';
import { database } from '@/config/firebase';
import { ref, get } from 'firebase/database';

export default function Index() {
  useEffect(() => {
    // Navigate after Firebase rehydrates auth (persistent session)
    const unsubscribe = CustomAuthService.onAuthStateChanged(async (user) => {
      if (!user) {
        router.replace('/auth/phone');
        return;
      }

      // Non-blocking: ensure phone->uid mapping and claim any pending phone-based invites
      FirebaseGroupService.ensurePhoneToUidMappingForCurrentUser().catch(() => {});
      FirebaseGroupService.claimPendingInvitesForCurrentUser().catch(() => {});

      // Route to name onboarding if displayName is missing
      try {
        const snap = await get(ref(database, `users/${user.uid}`));
        const hasName = snap.exists() && typeof snap.val()?.displayName === 'string' && String(snap.val()?.displayName).trim().length > 0;
        router.replace(hasName ? '/(tabs)' : '/onboarding/name');
      } catch {
        router.replace('/(tabs)');
      }
    });

    // Best-effort push token registration early
    NotificationService.registerPushTokenAsync().catch(() => {});

    return unsubscribe;
  }, []);

  return (
    <View className="flex-1 justify-center items-center bg-gray-900">
      <Text className="text-white text-2xl font-bold mb-4">GameTime</Text>
      <Text className="text-gray-400">Loading...</Text>
    </View>
  );
}
