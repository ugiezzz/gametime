// Minimal test to validate group create/delete against current RTDB rules
let initializeApp, getAuth, signInAnonymously, getDatabase, ref, set, update, get;
async function loadFirebase() {
  const appMod = await import('firebase/app');
  const authMod = await import('firebase/auth');
  const dbMod = await import('firebase/database');
  initializeApp = appMod.initializeApp;
  getAuth = authMod.getAuth;
  signInAnonymously = authMod.signInAnonymously;
  getDatabase = dbMod.getDatabase;
  ref = dbMod.ref;
  set = dbMod.set;
  update = dbMod.update;
  get = dbMod.get;
}

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

async function main() {
  await loadFirebase();
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getDatabase(app);

  console.log('Signing in anonymously...');
  const cred = await signInAnonymously(auth);
  const uid = cred.user.uid;
  console.log('UID:', uid);

  const groupId = `test-del-${Math.random().toString(36).slice(2, 10)}`;
  const groupRef = ref(db, `groups/${groupId}`);

  const groupPayload = {
    id: groupId,
    name: 'Temp Test Group',
    createdBy: uid,
    createdAt: new Date().toISOString(),
    membersByUid: { [uid]: true },
  };

  console.log('Creating group at', `groups/${groupId}`);
  await set(groupRef, groupPayload);

  console.log('Creating owner index at', `userGroups/${uid}/${groupId}`);
  await set(ref(db, `userGroups/${uid}/${groupId}`), true);

  // Verify exists
  const existsBefore = (await get(groupRef)).exists();
  if (!existsBefore) throw new Error('Group was not created');

  // Try deleting group node only
  console.log('Deleting group only...');
  try {
    await update(ref(db), { [`groups/${groupId}`]: null });
    console.log('Deleted group node');
  } catch (e) {
    console.error('Failed to delete group node:', e?.message || e);
    throw e;
  }

  // Then delete index
  console.log('Deleting userGroups index...');
  try {
    await update(ref(db), { [`userGroups/${uid}/${groupId}`]: null });
    console.log('Deleted userGroups index');
  } catch (e) {
    console.error('Failed to delete userGroups index:', e?.message || e);
    throw e;
  }

  const existsAfter = (await get(groupRef)).exists();
  const idxAfter = (await get(ref(db, `userGroups/${uid}/${groupId}`))).exists();

  console.log('Group exists after delete:', existsAfter);
  console.log('Index exists after delete:', idxAfter);

  if (existsAfter || idxAfter) throw new Error('Delete did not fully clean up');
  console.log('✅ Delete flow verified.');
}

main().catch((e) => { console.error('Test failed:', e?.message || e); process.exit(1); });


