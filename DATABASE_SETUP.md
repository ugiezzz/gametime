# 🗄️ Firebase Database Setup Guide

## ✅ Current Status:
- ✅ Firebase Functions configured
- ✅ Realtime Database service ready
- ✅ Firestore service ready
- ✅ Local storage fallback available

## 🔧 Database Setup Steps:

### 1. Enable Realtime Database
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your `gametime-app` project
3. Click "Realtime Database" in the left sidebar
4. Click "Create database"
5. Choose location (closest to your users)
6. Start in **test mode** for development

### 2. Update Firebase Config
Replace the placeholder values in `src/config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "gametime-app.firebaseapp.com",
  projectId: "gametime-app",
  storageBucket: "gametime-app.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  databaseURL: "https://gametime-app-default-rtdb.firebaseio.com", // Your actual URL
};
```

### 3. Database Structure
The app will create this structure in Realtime Database:

```
/groups/{groupId}
{
  "id": "group123",
  "name": "Gaming Squad",
  "members": [
    {
      "id": "contact1",
      "name": "John Doe",
      "phoneNumber": "+1234567890",
      "userId": "user123"
    }
  ],
  "createdBy": "user123",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastPing": "2024-01-01T12:00:00.000Z",
  "currentGame": "Call of Duty"
}

/users/{userId}
{
  "id": "user123",
  "phoneNumber": "+1234567890",
  "displayName": "John Doe",
  "groups": ["group1", "group2"],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 4. Database Rules (for production)
In Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "groups": {
      "$groupId": {
        ".read": "data.child('members').child(auth.uid).exists()",
        ".write": "data.child('createdBy').val() === auth.uid"
      }
    },
    "otp": {
      "$phone": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

## 🚀 Test Database Connection:

1. **Run the app**: `npm start`
2. **Create a group** - This will test database writes
3. **Check Firebase Console** - You should see data being created

## 📊 Current Services:

### FirebaseGroupService (Realtime Database)
- ✅ Create groups
- ✅ Get user groups
- ✅ Real-time updates
- ✅ User profiles

### GroupService (Local Storage)
- ✅ Local group storage
- ✅ Offline capability
- ✅ Fallback when Firebase is unavailable

## 🔄 Migration Path:
1. Start with local storage (GroupService)
2. Add Firebase integration (FirebaseGroupService)
3. Gradually migrate data to Firebase
4. Keep local storage as offline fallback 