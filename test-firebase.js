const { initializeApp } = require('firebase/app');
const { getAuth, signInAnonymously, signOut } = require('firebase/auth');
const { getDatabase, ref, set, get, remove } = require('firebase/database');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCOVHqhturFgeo79MPcGDHiBTZD-ktPwDM",
  authDomain: "gametime-app-4e0e3.firebaseapp.com",
  projectId: "gametime-app-4e0e3",
  storageBucket: "gametime-app-4e0e3.firebasestorage.app",
  messagingSenderId: "262537480462",
  appId: "1:262537480462:web:f3f8f46db82a3cb6d06f5f",
  measurementId: "G-2R66RZS8C0",
  databaseURL: "https://gametime-app-4e0e3-default-rtdb.firebaseio.com",
};

console.log('🔥 Starting Firebase Tests...\n');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

const testResults = {
  config: false,
  auth: false,
  database: false,
  write: false,
  read: false
};

async function runTests() {
  console.log('📋 Test Results:\n');

  // Test 1: Configuration
  try {
    console.log('✅ Test 1: Firebase Configuration');
    console.log(`   Project ID: ${auth.app.options.projectId}`);
    console.log(`   Database URL: ${database.app.options.databaseURL}`);
    testResults.config = true;
  } catch (error) {
    console.log('❌ Test 1: Firebase Configuration - FAILED');
    console.log(`   Error: ${error.message}`);
  }

  // Test 2: Authentication
  try {
    console.log('\n✅ Test 2: Firebase Authentication');
    const userCredential = await signInAnonymously(auth);
    console.log(`   User ID: ${userCredential.user.uid}`);
    await signOut(auth);
    testResults.auth = true;
  } catch (error) {
    console.log('\n❌ Test 2: Firebase Authentication - FAILED');
    console.log(`   Error: ${error.message}`);
  }

  // Test 3: Database Connection
  try {
    console.log('\n✅ Test 3: Database Connection');
    const testRef = ref(database, 'test/connection');
    await set(testRef, { message: 'Connection test', timestamp: new Date().toISOString() });
    testResults.database = true;
    console.log('   Database connection successful');
  } catch (error) {
    console.log('\n❌ Test 3: Database Connection - FAILED');
    console.log(`   Error: ${error.message}`);
    console.log('   💡 Make sure Realtime Database is enabled in Firebase Console');
  }

  // Test 4: Database Write
  if (testResults.database) {
    try {
      console.log('\n✅ Test 4: Database Write');
      const testData = {
        message: 'Hello from GameTime!',
        timestamp: new Date().toISOString(),
        testId: Math.random().toString(36).substr(2, 9)
      };
      const testRef = ref(database, `test/${testData.testId}`);
      await set(testRef, testData);
      testResults.write = true;
      console.log('   Data written successfully');
    } catch (error) {
      console.log('\n❌ Test 4: Database Write - FAILED');
      console.log(`   Error: ${error.message}`);
    }
  }

  // Test 5: Database Read
  if (testResults.write) {
    try {
      console.log('\n✅ Test 5: Database Read');
      const testRef = ref(database, 'test/connection');
      const snapshot = await get(testRef);
      if (snapshot.exists()) {
        testResults.read = true;
        console.log('   Data read successfully');
        console.log(`   Retrieved: ${JSON.stringify(snapshot.val())}`);
      } else {
        throw new Error('No data found');
      }
    } catch (error) {
      console.log('\n❌ Test 5: Database Read - FAILED');
      console.log(`   Error: ${error.message}`);
    }
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`   Configuration: ${testResults.config ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Authentication: ${testResults.auth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Database Connection: ${testResults.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Database Write: ${testResults.write ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Database Read: ${testResults.read ? '✅ PASS' : '❌ FAIL'}`);

  const passedTests = Object.values(testResults).filter(Boolean).length;
  const totalTests = Object.keys(testResults).length;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Firebase is properly configured.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    
    if (!testResults.database) {
      console.log('\n💡 To fix database issues:');
      console.log('   1. Go to Firebase Console');
      console.log('   2. Select your project: gametime-app-4e0e3');
      console.log('   3. Click "Realtime Database"');
      console.log('   4. Click "Create database"');
      console.log('   5. Choose location and start in test mode');
    }
  }

  // Cleanup
  try {
    const testRef = ref(database, 'test/connection');
    await remove(testRef);
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Run the tests
runTests().catch(console.error); 