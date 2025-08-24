const https = require('https');

// Import centralized Firebase configuration
const { firebaseConfig } = require('./firebase.config.js');

console.log('🔍 Checking Database URL Accessibility...\n');

const databaseUrl = firebaseConfig.databaseURL;

console.log(`📋 Testing URL: ${databaseUrl}\n`);

// Test 1: Check if the URL is accessible
function testUrlAccessibility() {
  return new Promise((resolve, reject) => {
    const req = https.get(databaseUrl, (res) => {
      console.log(`✅ URL is accessible`);
      console.log(`   Status Code: ${res.statusCode}`);
      console.log(`   Content Type: ${res.headers['content-type']}`);

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`   Response: ${data.substring(0, 200)}...`);
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`❌ URL is not accessible`);
      console.log(`   Error: ${error.message}`);
      reject(error);
    });

    req.setTimeout(5000, () => {
      console.log(`❌ URL timeout`);
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Test 2: Check Firebase project status
function checkProjectStatus() {
  const projectUrl = `https://${firebaseConfig.authDomain}`;

  return new Promise((resolve, reject) => {
    const req = https.get(projectUrl, (res) => {
      console.log(`\n✅ Firebase project is accessible`);
      console.log(`   Status Code: ${res.statusCode}`);
      resolve();
    });

    req.on('error', (error) => {
      console.log(`\n❌ Firebase project is not accessible`);
      console.log(`   Error: ${error.message}`);
      reject(error);
    });

    req.setTimeout(5000, () => {
      console.log(`\n❌ Project URL timeout`);
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function runChecks() {
  try {
    await testUrlAccessibility();
    await checkProjectStatus();

    console.log('\n📊 Summary:');
    console.log('   ✅ Database URL format is correct');
    console.log('   ✅ Firebase project is accessible');
    console.log('\n💡 If the database is still not working:');
    console.log('   1. Wait 5-10 minutes for database initialization');
    console.log('   2. Check Firebase Console → Realtime Database');
    console.log('   3. Verify database rules allow read/write');
    console.log('   4. Try accessing the database URL in browser');
  } catch (error) {
    console.log('\n❌ Database URL check failed');
    console.log(`   Error: ${error.message}`);
  }
}

runChecks();
