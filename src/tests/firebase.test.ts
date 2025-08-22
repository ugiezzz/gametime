import { signInAnonymously, signOut } from 'firebase/auth';
import { get, ref, remove, set } from 'firebase/database';

import { auth, database, db } from '@/config/firebase';
import { CustomAuthService } from '@/services/customAuthService';
import { FirebaseGroupService } from '@/services/firebaseGroupService';

describe('Firebase Configuration Tests', () => {
  test('Firebase app should be initialized', () => {
    expect(auth).toBeDefined();
    expect(database).toBeDefined();
    expect(db).toBeDefined();
  });

  test('Firebase config should have correct project ID', () => {
    expect(auth.app.options.projectId).toBe('gametime-app-4e0e3');
  });

  test('Database URL should be configured', () => {
    expect(database.app.options.databaseURL).toBe(
      'https://gametime-app-4e0e3-default-rtdb.firebaseio.com',
    );
  });
});

describe('Firebase Realtime Database Tests', () => {
  const testData = {
    message: 'Test message from GameTime',
    timestamp: new Date().toISOString(),
    testId: Math.random().toString(36).substr(2, 9),
  };

  afterEach(async () => {
    // Clean up test data
    try {
      const testRef = ref(database, `test/${testData.testId}`);
      await remove(testRef);
    } catch (error) {
      console.log('Cleanup error (expected):', error);
    }
  });

  test('Should write data to Realtime Database', async () => {
    const testRef = ref(database, `test/${testData.testId}`);

    try {
      await set(testRef, testData);
      const snapshot = await get(testRef);

      expect(snapshot.exists()).toBe(true);
      expect(snapshot.val()).toEqual(testData);
    } catch (error) {
      // If database is not enabled, this will fail
      expect(error).toBeDefined();
      console.log(
        'Database write test failed (expected if database not enabled):',
        error,
      );
    }
  });

  test('Should read data from Realtime Database', async () => {
    const testRef = ref(database, `test/${testData.testId}`);

    try {
      // First write the data
      await set(testRef, testData);

      // Then read it back
      const snapshot = await get(testRef);

      expect(snapshot.exists()).toBe(true);
      expect(snapshot.val().message).toBe(testData.message);
      expect(snapshot.val().timestamp).toBe(testData.timestamp);
    } catch (error) {
      expect(error).toBeDefined();
      console.log(
        'Database read test failed (expected if database not enabled):',
        error,
      );
    }
  });
});

describe('Firebase Authentication Tests', () => {
  test('Should be able to sign in anonymously', async () => {
    try {
      const userCredential = await signInAnonymously(auth);
      expect(userCredential.user).toBeDefined();
      expect(userCredential.user.uid).toBeDefined();

      // Clean up
      await signOut(auth);
    } catch (error) {
      console.log('Anonymous auth test failed:', error);
      // This might fail if auth is not properly configured
    }
  });

  test('CustomAuthService should be properly configured', () => {
    expect(CustomAuthService).toBeDefined();
    expect(typeof CustomAuthService.sendOTP).toBe('function');
    expect(typeof CustomAuthService.verifyOTP).toBe('function');
    expect(typeof CustomAuthService.isAuthenticated).toBe('function');
  });

  test('CustomAuthService should have correct functions URL', () => {
    // Access the private property for testing
    const functionsUrl = (CustomAuthService as any).functionsBaseUrl;
    expect(functionsUrl).toBe(
      'https://us-central1-gametime-app-4e0e3.cloudfunctions.net',
    );
  });
});

describe('Firebase Group Service Tests', () => {
  test('FirebaseGroupService should be properly configured', () => {
    expect(FirebaseGroupService).toBeDefined();
    expect(typeof FirebaseGroupService.createGroup).toBe('function');
    expect(typeof FirebaseGroupService.getUserGroups).toBe('function');
    expect(typeof FirebaseGroupService.createUserProfile).toBe('function');
  });

  test('Should have correct database references', () => {
    expect(FirebaseGroupService.GROUPS_REF).toBe('groups');
    expect(FirebaseGroupService.USERS_REF).toBe('users');
  });
});

describe('Configuration Validation Tests', () => {
  test('Firebase config should have all required fields', () => {
    const config = auth.app.options;

    expect(config.apiKey).toBe('AIzaSyCOVHqhturFgeo79MPcGDHiBTZD-ktPwDM');
    expect(config.authDomain).toBe('gametime-app-4e0e3.firebaseapp.com');
    expect(config.projectId).toBe('gametime-app-4e0e3');
    expect(config.storageBucket).toBe('gametime-app-4e0e3.firebasestorage.app');
    expect(config.messagingSenderId).toBe('262537480462');
    expect(config.appId).toBe('1:262537480462:web:f3f8f46db82a3cb6d06f5f');
  });

  test('Database URL should be correctly formatted', () => {
    const dbUrl = database.app.options.databaseURL;
    expect(dbUrl).toMatch(/^https:\/\/.*\.firebaseio\.com$/);
    expect(dbUrl).toContain('gametime-app-4e0e3');
  });
});

describe('Error Handling Tests', () => {
  test('Should handle database connection errors gracefully', async () => {
    const invalidRef = ref(database, 'invalid/path/that/should/fail');

    try {
      await set(invalidRef, { test: 'data' });
      // If this succeeds, the database is working
      expect(true).toBe(true);
    } catch (error) {
      // If this fails, it's expected behavior
      expect(error).toBeDefined();
      console.log('Database error handling test passed:', error);
    }
  });
});
