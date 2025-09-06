import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, initializeApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { firebaseConfig } from './firebase.config';

// Initialize Firebase with error handling
const app = (() => {
  try {
    return initializeApp(firebaseConfig);
  } catch (error: any) {
    if (error?.code === 'app/duplicate-app') {
      // Use existing Firebase app instance
      return getApp();
    }
    // Re-throw without console noise to satisfy no-console
    throw error;
  }
})();

// Initialize Auth for React Native with persistence where available
const { initializeAuth, signInWithCustomToken, getReactNativePersistence } =
  firebaseAuth as any;
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Firebase services
const db = getFirestore(app); // Firestore
const database = getDatabase(app); // Realtime Database
const functions = getFunctions(app);

// Cloud Functions
export const generateInviteLink = httpsCallable(
  functions,
  'generateInviteLink',
);
export const joinGroupViaLink = httpsCallable(functions, 'joinGroupViaLink');
export const sendNextGameNotification = httpsCallable(
  functions,
  'sendNextGameNotification',
);

// Riot API Cloud Functions (Secure)
export const resolveSummonerId = httpsCallable<
  any,
  { puuid: string; summonerId: string }
>(functions, 'resolveSummonerId');
export const getActiveGameStatus = httpsCallable<
  any,
  {
    inGame: boolean;
    elapsedMinutes?: number;
    gameMode?: string;
    gameType?: string;
  }
>(functions, 'getActiveGameStatus');

export { auth, database, db, functions, signInWithCustomToken };
