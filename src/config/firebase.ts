import { initializeApp } from 'firebase/app';
import { signInWithCustomToken } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyCOVHqhturFgeo79MPcGDHiBTZD-ktPwDM',
  authDomain: 'gametime-app-4e0e3.firebaseapp.com',
  projectId: 'gametime-app-4e0e3',
  storageBucket: 'gametime-app-4e0e3.firebasestorage.app',
  messagingSenderId: '262537480462',
  appId: '1:262537480462:web:f3f8f46db82a3cb6d06f5f',
  measurementId: 'G-2R66RZS8C0',
  databaseURL: 'https://gametime-app-4e0e3-default-rtdb.firebaseio.com', // Realtime Database URL
};

const app = initializeApp(firebaseConfig);

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

// Riot API Cloud Functions (Secure)
export const resolveSummonerId = httpsCallable(functions, 'resolveSummonerId');
export const getActiveGameStatus = httpsCallable(functions, 'getActiveGameStatus');

export { auth, database, db, functions, signInWithCustomToken };
