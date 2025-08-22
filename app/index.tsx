// app/index.tsx
import { router } from 'expo-router';
import { get, ref } from 'firebase/database';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { database } from '@/config/firebase';
import { getRiotApiKey } from '@/config/riotConfig';
import { CustomAuthService } from '@/services/customAuthService';
import { FirebaseGroupService } from '@/services/firebaseGroupService';
import { NotificationService } from '@/services/notificationService';
import { configureRiotService } from '@/services/riotService';

export default function Index() {
  useEffect(() => {
    try {
      const key = getRiotApiKey();
      if (key) configureRiotService({ apiKey: key });
    } catch {}
    // Navigate after Firebase rehydrates auth (persistent session)
    const unsubscribe = CustomAuthService.onAuthStateChanged(async (user) => {
      if (!user) {
        router.replace('/auth/phone');
        return;
      }

      // Non-blocking: ensure phone->uid mapping and claim any pending phone-based invites
      FirebaseGroupService.ensurePhoneToUidMappingForCurrentUser().catch(
        () => {},
      );
      FirebaseGroupService.claimPendingInvitesForCurrentUser().catch(() => {});

      // Now that the user is authenticated, save the Expo push token under users/{uid}
      NotificationService.registerPushTokenAsync().catch(() => {});

      // Route to name onboarding if displayName is missing
      try {
        const snap = await get(ref(database, `users/${user.uid}`));
        const hasName =
          snap.exists() &&
          typeof snap.val()?.displayName === 'string' &&
          String(snap.val()?.displayName).trim().length > 0;
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
    <View className="flex-1 items-center justify-center bg-gray-900">
      <Text className="mb-4 text-2xl font-bold text-white">GameTime</Text>
      <Text className="text-gray-400">Loading...</Text>
    </View>
  );
}
