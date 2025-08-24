const { initializeApp } = require('firebase/app');
const {
  getDatabase,
  ref,
  set,
  get,
  remove,
  connectDatabaseEmulator,
} = require('firebase/database');

// Import centralized Firebase configuration
const { firebaseConfig } = require('./firebase.config.js');

console.log('🔍 Debugging Firebase Database Connection...\n');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

console.log('📋 Database Configuration:');
console.log(`   Project ID: ${app.options.projectId}`);
console.log(`   Database URL: ${database.app.options.databaseURL}`);
console.log(`   Database Name: ${database.app.name}`);

async function testDatabaseConnection() {
  console.log('\n🧪 Testing Database Connection...\n');

  // Test 1: Basic connection
  try {
    console.log('✅ Test 1: Basic Database Connection');
    const testRef = ref(database, 'debug/test');
    console.log('   Reference created successfully');
    console.log(`   Path: ${testRef.toString()}`);
  } catch (error) {
    console.log('❌ Test 1: Basic Database Connection - FAILED');
    console.log(`   Error: ${error.message}`);
  }

  // Test 2: Write operation
  try {
    console.log('\n✅ Test 2: Database Write Operation');
    const testRef = ref(database, 'debug/test-write');
    const testData = {
      message: 'Database write test',
      timestamp: new Date().toISOString(),
      testId: Math.random().toString(36).substr(2, 9),
    };

    console.log('   Attempting to write data...');
    await set(testRef, testData);
    console.log('   ✅ Write operation successful!');
    console.log(`   Data written: ${JSON.stringify(testData)}`);

    // Test 3: Read operation
    console.log('\n✅ Test 3: Database Read Operation');
    const snapshot = await get(testRef);
    if (snapshot.exists()) {
      console.log('   ✅ Read operation successful!');
      console.log(`   Retrieved data: ${JSON.stringify(snapshot.val())}`);
    } else {
      console.log('   ⚠️  Data not found after write');
    }

    // Cleanup
    await remove(testRef);
    console.log('   ✅ Test data cleaned up');
  } catch (error) {
    console.log('\n❌ Test 2/3: Database Operations - FAILED');
    console.log(`   Error Type: ${error.constructor.name}`);
    console.log(`   Error Message: ${error.message}`);
    console.log(`   Error Code: ${error.code || 'N/A'}`);

    if (error.message.includes('permission')) {
      console.log('\n💡 This looks like a permissions issue.');
      console.log('   Make sure your database rules allow read/write access.');
    } else if (error.message.includes('URL')) {
      console.log('\n💡 This looks like a URL configuration issue.');
      console.log(
        '   Check if the database URL is correct in Firebase Console.',
      );
    } else {
      console.log('\n💡 This might be a database initialization issue.');
      console.log(
        '   Try waiting a few minutes for the database to fully initialize.',
      );
    }
  }
}

// Run the debug test
testDatabaseConnection().catch(console.error);
