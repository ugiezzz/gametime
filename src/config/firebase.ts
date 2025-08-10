import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCOVHqhturFgeo79MPcGDHiBTZD-ktPwDM",
  authDomain: "gametime-app-4e0e3.firebaseapp.com",
  projectId: "gametime-app-4e0e3",
  storageBucket: "gametime-app-4e0e3.firebasestorage.app",
  messagingSenderId: "262537480462",
  appId: "1:262537480462:web:f3f8f46db82a3cb6d06f5f",
  measurementId: "G-2R66RZS8C0",
  databaseURL: "https://gametime-app-4e0e3-default-rtdb.firebaseio.com", // Realtime Database URL
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
const db = getFirestore(app); // Firestore
const database = getDatabase(app); // Realtime Database

export { auth, db, database, signInWithCustomToken }; Untitled.jpeg