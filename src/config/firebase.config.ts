// Centralized Firebase Configuration (TypeScript version)
// This file contains the Firebase project configuration
// Used by: firebase.ts and other TypeScript files

export const firebaseConfig = {
  apiKey: 'AIzaSyAElim4NhHkXXtzBxd4macRqwWgUKyz8tw',
  authDomain: 'gametime-app-4e0e3.firebaseapp.com',
  projectId: 'gametime-app-4e0e3',
  storageBucket: 'gametime-app-4e0e3.firebasestorage.app',
  messagingSenderId: '262537480462',
  appId: '1:262537480462:android:c630d6d8f56d5858d06f5f',
  measurementId: 'G-WGEBSG7TKE',
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
