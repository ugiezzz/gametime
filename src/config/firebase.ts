import { initializeApp } from 'firebase/app';
import { signInWithCustomToken } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { firebaseConfig } from './firebase.config';

// Initialize Firebase with error handling
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('🔧 Firebase app initialized successfully');
} catch (error: any) {
  console.error('🔧 Error initializing Firebase app:', error);
  // If there's already an app initialized, get it
  if (error.code === 'app/duplicate-app') {
    app = initializeApp();
    console.log('🔧 Using existing Firebase app instance');
  } else {
    throw error;
  }
}

// Import the React Native specific auth module
// This should work with Firebase v12 for React Native
let auth: any;
try {
  // Try the React Native specific import path
  const firebaseAuth = require('firebase/auth');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  
  if (firebaseAuth.getReactNativePersistence) {
    auth = firebaseAuth.initializeAuth(app, {
      persistence: firebaseAuth.getReactNativePersistence(AsyncStorage)
    });
    console.log('🔧 Firebase Auth initialized with getReactNativePersistence');
  } else {
    auth = firebaseAuth.initializeAuth(app);
    console.log('🔧 getReactNativePersistence not available, using initializeAuth');
  }
} catch (error) {
  console.log('🔧 Error initializing Firebase Auth:', error);
  // Fallback
  const { initializeAuth } = require('firebase/auth');
  auth = initializeAuth(app);
}

// Firebase Auth initialized successfully with persistence
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
