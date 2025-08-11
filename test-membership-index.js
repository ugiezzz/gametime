// Diagnose membership indexing and visibility
// Usage:
//   node ./test-membership-index.js                     -> lists groups and exits
//   node ./test-membership-index.js <groupId>           -> checks that group's members vs userGroups

// ESM-only Firebase v12 dynamic imports (like test-firebase.js)
let initializeApp, getDatabase, ref, get;
async function loadFirebase() {
  const appMod = await import('firebase/app');
  const dbMod = await import('firebase/database');
  initializeApp = appMod.initializeApp;
  getDatabase = dbMod.getDatabase;
  ref = dbMod.ref;
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

function print(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

async function main() {
  await loadFirebase();
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);

  const groupIdArg = process.argv[2];

  // List all groups when no id is provided
  const groupsSnap = await get(ref(database, 'groups'));
  if (!groupIdArg) {
    if (!groupsSnap.exists()) {
      console.log('No groups found');
      return;
    }
    const ids = Object.keys(groupsSnap.val());
    console.log('Groups in RTDB:', ids);
    console.log('Run: node ./test-membership-index.js <groupId> to diagnose a specific group');
    return;
  }

  // Read a specific group
  const gid = groupIdArg;
  const groupSnap = await get(ref(database, `groups/${gid}`));
  if (!groupSnap.exists()) {
    console.log(`Group ${gid} not found`);
    return;
  }
  const group = groupSnap.val();
  const membersByUid = group.membersByUid ? Object.keys(group.membersByUid) : [];
  console.log('\nGroup:', gid);
  print({ name: group.name, createdBy: group.createdBy, membersByUid });

  // For each member UID, check userGroups index and profile/token presence
  const report = [];
  for (const uid of membersByUid) {
    const idxSnap = await get(ref(database, `userGroups/${uid}/${gid}`));
    const hasIndex = idxSnap.exists();
    const profSnap = await get(ref(database, `users/${uid}`));
    const hasProfile = profSnap.exists();
    const tokSnap = await get(ref(database, `users/${uid}/expoPushToken`));
    const pushToken = tokSnap.exists() ? tokSnap.val() : null;
    report.push({ uid, userGroupsIndex: hasIndex, hasProfile, pushTokenPresent: typeof pushToken === 'string' });
  }
  console.log('\nMember checks:');
  print(report);

  // Highlight probable issues
  const missingIndex = report.filter(r => !r.userGroupsIndex).map(r => r.uid);
  const missingToken = report.filter(r => !r.pushTokenPresent).map(r => r.uid);
  if (missingIndex.length > 0) console.log('\n⚠️ Missing userGroups index for:', missingIndex);
  if (missingToken.length > 0) console.log('\n⚠️ Missing expoPushToken for:', missingToken);
  // For pending phone invites, query phoneInvites separately if desired
}

main().catch((e) => {
  console.error('Test failed:', e?.message || e);
  process.exit(1);
});


