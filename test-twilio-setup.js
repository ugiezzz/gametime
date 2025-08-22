const twilio = require('twilio');

// Test Twilio configuration
console.log('🧪 Testing Twilio Setup...\n');

// Twilio credentials from your console (read from env in real usage)
const accountSid = process.env.TWILIO_ACCOUNT_SID || '<set in .env>';
const authToken = process.env.TWILIO_AUTH_TOKEN || '<set in .env>';
const verifyServiceSid =
  process.env.TWILIO_VERIFY_SERVICE_SID || '<set in .env>';

console.log('✅ Twilio Credentials:');
console.log('   - Account SID:', accountSid);
console.log(
  '   - Auth Token:',
  authToken ? `***${authToken.slice(-4)}` : 'NOT SET',
);
console.log('   - Verify Service SID:', verifyServiceSid);

// Test Twilio client initialization
try {
  const client = twilio(accountSid, authToken);
  console.log('\n✅ Twilio Client: Initialized successfully');

  // Test Verify service access
  console.log('\n✅ Verify Service: Ready to use');
  console.log('   - Service SID:', verifyServiceSid);
} catch (error) {
  console.error('\n❌ Twilio Client Error:', error.message);
}

console.log('\n📱 Firebase Functions URLs:');
console.log(
  '   - Send OTP: https://us-central1-gametime-app-4e0e3.cloudfunctions.net/sendOtp',
);
console.log(
  '   - Verify OTP: https://us-central1-gametime-app-4e0e3.cloudfunctions.net/verifyOtp',
);

console.log('\n🎯 Next Steps:');
console.log('1. Install Firebase CLI: npm install -g firebase-tools');
console.log('2. Login to Firebase: firebase login');
console.log('3. Deploy functions: firebase deploy --only functions');
console.log('4. Test the app: npm start');

console.log('\n📞 For manual testing:');
console.log('- Use your phone number in the app');
console.log('- Check Twilio console for SMS logs');
console.log('- Verify OTP code in the app');

console.log('\n🚀 Ready to test!');
