# 🔥 Next Steps for Firebase Setup

## ✅ What's Been Done:
1. ✅ Created Firebase Functions structure
2. ✅ Set up OTP sending/verification functions
3. ✅ Created custom auth service
4. ✅ Updated frontend to use new auth flow

## 🔧 What You Need to Do:

### 1. Set up Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project called `gametime-app`
3. Enable Authentication (Phone provider)
4. Enable Firestore Database

### 2. Get Firebase Config
1. In Firebase Console, go to Project Settings
2. Add a web app to your project
3. Copy the config and update `src/config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "gametime-app.firebaseapp.com",
  projectId: "gametime-app",
  storageBucket: "gametime-app.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
};
```

### 3. Set up Twilio
1. Create a [Twilio account](https://www.twilio.com/)
2. Get your Account SID and Auth Token
3. Get a phone number for sending SMS
4. Update `functions/.env`:

```
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Deploy Firebase Functions
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init functions` (select existing project)
4. Deploy: `firebase deploy --only functions`

### 5. Update Functions URL
After deployment, update the functions URL in `src/services/customAuthService.ts`:

```typescript
private static functionsBaseUrl = 'https://us-central1-gametime-app.cloudfunctions.net';
```

## 🚀 Test the Setup:
1. Run the app: `npm start`
2. Enter a phone number
3. Check if OTP is sent via SMS
4. Verify the OTP

## 📱 Current Flow:
1. User enters phone number
2. App calls Cloud Function to send OTP via Twilio
3. User enters OTP
4. App calls Cloud Function to verify OTP
5. User gets signed in with custom token

## 🔧 Development Notes:
- Currently using mock phone number in OTP verification
- Need to pass phone number between screens
- Consider using React Context or state management for phone number 