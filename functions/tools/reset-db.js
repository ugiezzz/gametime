/*
  DANGER: Destructive DB reset for the Realtime Database (dev only).
  Requirements:
  - Service account credentials with DB admin (set GOOGLE_APPLICATION_CREDENTIALS env var)
  - firebase-admin installed (available in functions package)

  Usage (PowerShell):
    $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"; node ./functions/tools/reset-db.js
*/

const admin = require('firebase-admin');

const DATABASE_URL = 'https://gametime-app-4e0e3-default-rtdb.firebaseio.com';

function assertCredentials() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('GOOGLE_APPLICATION_CREDENTIALS env var not set. Provide a service account JSON file.');
    process.exit(1);
  }
}

async function main() {
  assertCredentials();
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: DATABASE_URL,
  });

  const db = admin.database();
  const rootRef = db.ref('/');

  const pathsToDelete = [
    'groups',
    'users',
    'userGroups',
    'phoneInvites',
    'phoneToUid',
    'debug',
    'test',
  ];

  const updates = {};
  for (const p of pathsToDelete) updates[p] = null;

  console.log('Resetting database paths:', pathsToDelete);
  await rootRef.update(updates);
  console.log('✅ Database reset complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Reset failed:', err && err.message || err);
  process.exit(1);
});


