// Use dynamic imports to work with ESM-only Firebase v12
let initializeApp, getAuth, signInAnonymously, signOut, getDatabase, ref, set, get, remove;
async function loadFirebase() {
  const appMod = await import('firebase/app');
  const authMod = await import('firebase/auth');
  const dbMod = await import('firebase/database');
  initializeApp = appMod.initializeApp;
  getAuth = authMod.getAuth;
  signInAnonymously = authMod.signInAnonymously;
  signOut = authMod.signOut;
  getDatabase = dbMod.getDatabase;
  ref = dbMod.ref;
  set = dbMod.set;
  get = dbMod.get;
  remove = dbMod.remove;
}

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

let app, auth, database;

const testResults = {
  config: false,
  auth: false,
  database: false,
  write: false,
  read: false
};

async function runTests() {
  await loadFirebase();
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  database = getDatabase(app);
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

  // Prepare paths and data that are allowed by secure RTDB rules
  const tempGroupId = `test-${Math.random().toString(36).slice(2, 10)}`;
  const tempGroupRef = ref(database, `groups/${tempGroupId}`);

  // Test 3: Create group (allowed if createdBy === auth.uid)
  try {
    console.log('\n✅ Test 3: Database Write (Create Group)');
    const nowIso = new Date().toISOString();
    const userCredential = await signInAnonymously(auth);
    const uid = userCredential.user.uid;
    const groupPayload = {
      id: tempGroupId,
      name: 'Test Group',
      createdBy: uid,
      createdAt: nowIso,
      members: { [uid]: true }
    };
    await set(tempGroupRef, groupPayload);
    testResults.database = true;
    testResults.write = true;
    console.log('   Group created successfully');
  } catch (error) {
    console.log('\n❌ Test 3: Database Write (Create Group) - FAILED');
    console.log(`   Error: ${error.message}`);
  }

  // Test 4: Update group field (creator/admin-only)
  if (testResults.write) {
    try {
      console.log('\n✅ Test 4: Database Update');
      const nowIso = new Date().toISOString();
      await set(ref(database, `groups/${tempGroupId}/lastPing`), nowIso);
      console.log('   Group updated successfully');
    } catch (error) {
      console.log('\n❌ Test 4: Database Update - FAILED');
      console.log(`   Error: ${error.message}`);
    }
  }

  // Test 5: Database Read (group)
  if (testResults.write) {
    try {
      console.log('\n✅ Test 5: Database Read');
      const snapshot = await get(tempGroupRef);
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

  // Cleanup: remove temp group
  try {
    await remove(tempGroupRef);
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Run the tests
runTests().catch(console.error); 