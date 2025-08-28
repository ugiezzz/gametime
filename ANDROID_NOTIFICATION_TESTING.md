# Android Notification Testing Guide

## Overview
This guide explains how to test Android notifications in the GameTime app using a test account that bypasses Twilio authentication.

## 🧪 Test Account Setup

### Test Credentials
- **Phone Number**: `+15551234567`
- **OTP Code**: `123456`
- **UID**: `phone:+15551234567`

### How It Works
1. **Bypass Authentication**: The test account bypasses Twilio OTP verification
2. **Direct Login**: Uses a hardcoded OTP that always works
3. **Test Notifications**: Can send test notifications to itself for debugging

## 🚀 Setup Steps

### 1. Deploy Updated Cloud Functions
```bash
cd gameTime/functions
firebase login
firebase deploy --only functions
```

### 2. Verify Functions Deployment
Check that these functions are deployed:
- `sendOtp` - with test account bypass
- `verifyOtp` - with test account bypass  
- `sendTestNotification` - new test notification function

### 3. Build Android App
```bash
cd gameTime
npm run build:android
```

## 📱 Testing Process

### Step 1: Login with Test Account
1. Open the app on Android emulator/device
2. Enter phone number: `+15551234567`
3. Enter OTP: `123456`
4. Should authenticate immediately (bypasses Twilio)

### Step 2: Test Notifications
1. Navigate to Profile screen
2. Scroll to "Test scripts" section
3. Use "Send Test Notification" button
4. Check for notification on device

### Step 3: Verify in Firebase
1. **Realtime Database**: Check `debug/testNotifications/phone:+15551234567`
2. **Functions Logs**: Look for `sendTestNotification` function calls
3. **User Data**: Verify `users/phone:+15551234567/expoPushToken` exists

## 🔍 Debug Information

### Firebase Debug Paths
```
debug/testNotifications/phone:+15551234567/
├── {timestamp}/
│   ├── message: "Test notification from GameTime!"
│   ├── timestamp: ServerTimestamp
│   ├── expoResponse: {...}
│   └── success: true
└── error/
    └── {timestamp}/
        ├── error: "Error message"
        └── timestamp: ServerTimestamp
```

### Common Issues & Solutions

#### Issue: Test account not authenticating
- **Solution**: Verify Cloud Functions are deployed
- **Check**: Firebase Console > Functions > verifyOtp

#### Issue: Test notification not sending
- **Solution**: Check if user has valid Expo push token
- **Check**: `users/phone:+15551234567/expoPushToken`

#### Issue: Notification not received on device
- **Solution**: Verify notification permissions are granted
- **Check**: App settings > Notifications

## 🧹 Cleanup

### Remove Test Account (After Testing)
```bash
# In Firebase Console > Authentication
# Delete user with UID: phone:+15551234567

# In Realtime Database
# Remove: debug/testNotifications/phone:+15551234567
# Remove: users/phone:+15551234567
```

### Remove Test Functions (After Testing)
```bash
# Comment out or remove from functions/index.js:
# - Test account bypass in verifyOtp
# - sendTestNotification function
```

## 📋 Test Checklist

- [ ] Cloud Functions deployed successfully
- [ ] Test account can authenticate with bypass
- [ ] User profile created in Firebase
- [ ] Expo push token registered
- [ ] Test notification function works
- [ ] Notification received on Android device
- [ ] Debug logs written to Firebase
- [ ] Cleanup completed after testing

## 🔒 Security Notes

⚠️ **Important**: This test setup is for development only!

- Test account bypass should NEVER be deployed to production
- Test functions should be removed before production deployment
- Test credentials are hardcoded and publicly visible in code
- Use only in development/testing environments

## 📞 Support

If you encounter issues:
1. Check Firebase Functions logs
2. Verify Expo push token registration
3. Check Android notification permissions
4. Review debug data in Firebase Realtime Database


