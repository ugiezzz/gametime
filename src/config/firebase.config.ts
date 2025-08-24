// Centralized Firebase Configuration (TypeScript version)
// This file contains the Firebase project configuration
// Used by: firebase.ts and other TypeScript files

export const firebaseConfig = {
  apiKey: 'AIzaSyCOVHqhturFgeo79MPcGDHiBTZD-ktPwDM',
  authDomain: 'gametime-app-4e0e3.firebaseapp.com',
  projectId: 'gametime-app-4e0e3',
  storageBucket: 'gametime-app-4e0e3.firebasestorage.app',
  messagingSenderId: '262537480462',
  appId: '1:262537480462:web:f3f8f46db82a3cb6d06f5f',
  measurementId: 'G-2R66RZS8C0',
  databaseURL: 'https://gametime-app-4e0e3-default-rtdb.firebaseio.com',
};

export const functionsConfig = {
  baseUrl: 'https://us-central1-gametime-app-4e0e3.cloudfunctions.net',
  endpoints: {
    sendOtp: '/sendOtp',
    verifyOtp: '/verifyOtp',
    generateInviteLink: 'generateInviteLink',
    joinGroupViaLink: 'joinGroupViaLink',
    resolveSummonerId: 'resolveSummonerId',
    getActiveGameStatus: 'getActiveGameStatus',
  }
};
