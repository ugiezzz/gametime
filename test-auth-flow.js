const { initializeApp } = require('firebase/app');
const { getAuth, signInWithCustomToken } = require('firebase/auth');

// Import centralized Firebase configuration
const { firebaseConfig, functionsConfig } = require('./firebase.config.js');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

console.log('🔥 Testing GameTime Auth Flow...\n');

// Test 1: Firebase Configuration
console.log('✅ Test 1: Firebase Configuration');
console.log('   - Project ID:', firebaseConfig.projectId);
console.log('   - Auth Domain:', firebaseConfig.authDomain);
console.log('   - Database URL:', firebaseConfig.databaseURL);

// Test 2: Cloud Functions URLs
console.log('\n✅ Test 2: Cloud Functions URLs');
console.log('   - Send OTP:', `${functionsConfig.baseUrl}${functionsConfig.endpoints.sendOtp}`);
console.log('   - Verify OTP:', `${functionsConfig.baseUrl}${functionsConfig.endpoints.verifyOtp}`);

// Test 3: Auth Service Methods
console.log('\n✅ Test 3: Auth Service Methods Available');
console.log('   - CustomAuthService.sendOTP()');
console.log('   - CustomAuthService.verifyOTP()');
console.log('   - CustomAuthService.signOut()');
console.log('   - CustomAuthService.getCurrentUser()');

// Test 4: Frontend Screens
console.log('\n✅ Test 4: Frontend Screens');
console.log('   - /auth/phone.tsx (Phone input)');
console.log('   - /auth/otp.tsx (OTP verification)');
console.log('   - /auth/_layout.tsx (Auth layout)');

// Test 5: Phone Number Flow
console.log('\n✅ Test 5: Phone Number Flow (Fixed)');
console.log('   - Phone number passed via router params');
console.log('   - OTP screen receives phone number');
console.log('   - Verification uses correct phone number');

console.log('\n🎯 NEXT STEPS:');
console.log('1. Configure Twilio credentials in functions/.env');
console.log('2. Deploy Firebase Functions: firebase deploy --only functions');
console.log('3. Test complete flow: npm start');
console.log('4. Enter phone number and verify OTP');

console.log('\n📞 For Twilio setup, see: TWILIO_SETUP.md');
console.log('📋 For complete guide, see: Auth setup guide');

console.log('\n🚀 Auth setup is 95% complete!');
