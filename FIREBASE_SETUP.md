# 🔥 Firebase Setup Guide for GameTime

## **📋 Prerequisites**
- Google account
- Firebase project (free tier available)

## **🚀 Step 1: Create Firebase Project**

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Click "Create a project"

2. **Project Setup**
   - **Project name**: `gametime-app`
   - **Enable Google Analytics**: Yes (optional)
   - Click "Create project"

## **📱 Step 2: Add Your App**

1. **Add Android App**
   - Click "Android" icon
   - **Package name**: `com.gametimeapp.app`
   - **App nickname**: `GameTime`
   - **Debug signing certificate**: (optional for now)
   - Click "Register app"

2. **Download Config File**
   - Download `google-services.json`
   - Place it in `gameTime/android/app/`

3. **Add iOS App** (if needed)
   - Click "iOS" icon
   - **Bundle ID**: `com.gametimeapp.app`
   - **App nickname**: `GameTime`
   - Download `GoogleService-Info.plist`

## **🔐 Step 3: Enable Authentication**

1. **Go to Authentication**
   - In Firebase Console, click "Authentication"
   - Click "Get started"

2. **Enable Phone Authentication**
   - Click "Sign-in method" tab
   - Click "Phone"
   - Enable it
   - Add test phone numbers if needed

## **🗄️ Step 4: Set Up Realtime Database**

1. **Create Database**
   - Click "Realtime Database"
   - Click "Create database"
   - Choose location (closest to your users)
   - Start in **test mode** (we'll secure it later)

2. **Database Rules** (for production)
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
       }
     }
   }
   ```

## **🔧 Step 5: Update Firebase Config**

Replace the placeholder values in `src/config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com"
};
```

## **📊 Database Structure**

### **Users Collection**
```
/users/{userId}
{
  "id": "user123",
  "phoneNumber": "+1234567890",
  "displayName": "John Doe",
  "groups": ["group1", "group2"],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### **Groups Collection**
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
```

## **🔔 Step 6: Enable Cloud Messaging (Optional)**

1. **Go to Project Settings**
   - Click gear icon → Project settings
   - Go to "Cloud Messaging" tab

2. **Get Server Key**
   - Copy the "Server key" for push notifications

## **✅ Step 7: Test Your Setup**

1. **Update the config file** with your actual Firebase credentials
2. **Run the app** and test group creation
3. **Check Firebase Console** to see data being created

## **🔒 Security Notes**

- **Test mode** allows anyone to read/write (OK for development)
- **Production**: Use the security rules above
- **Phone auth**: Requires verification for production

## **📱 Next Steps**

1. **Implement Firebase Auth** in the app
2. **Switch from AsyncStorage** to Firebase
3. **Add real-time listeners** for live updates
4. **Set up push notifications** with FCM

---

**Need help?** Check Firebase documentation or ask for assistance! 