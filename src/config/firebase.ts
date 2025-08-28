import { initializeApp, getApp } from 'firebase/app';
import {
  initializeAuth,
  signInWithCustomToken,
} from 'firebase/auth';
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
const auth = initializeAuth(app);

// Firebase services
const db = getFirestore(app); // Firestore
const database = getDatabase(app); // Realtime Database
const functions = getFunctions(app);

// Cloud Functions
export const generateInviteLink = httpsCallable(functions, 'generateInviteLink');
export const joinGroupViaLink = httpsCallable(functions, 'joinGroupViaLink');
export const sendNextGameNotification = httpsCallable(functions, 'sendNextGameNotification');

// Riot API Cloud Functions (Secure)
export const resolveSummonerId = httpsCallable(functions, 'resolveSummonerId');
export const getActiveGameStatus = httpsCallable(functions, 'getActiveGameStatus');

export { auth, database, db, functions, signInWithCustomToken };
