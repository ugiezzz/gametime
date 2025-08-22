import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

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
// Using getAuth for now - persistence will be handled by React Native AsyncStorage automatically
const auth = getAuth(app);
const db = getFirestore(app); // Firestore
const database = getDatabase(app); // Realtime Database

export { auth, database, db, signInWithCustomToken };
