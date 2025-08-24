// Centralized Firebase Configuration (JavaScript version)
// This file can be imported by both TypeScript app files and Node.js test scripts

const firebaseConfig = {
  apiKey: 'AIzaSyCOVHqhturFgeo79MPcGDHiBTZD-ktPwDM',
  authDomain: 'gametime-app-4e0e3.firebaseapp.com',
  projectId: 'gametime-app-4e0e3',
  storageBucket: 'gametime-app-4e0e3.firebasestorage.app',
  messagingSenderId: '262537480462',
  appId: '1:262537480462:web:f3f8f46db82a3cb6d06f5f',
  measurementId: 'G-2R66RZS8C0',
  databaseURL: 'https://gametime-app-4e0e3-default-rtdb.firebaseio.com',
};

const functionsConfig = {
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

module.exports = {
  firebaseConfig,
  functionsConfig
};

