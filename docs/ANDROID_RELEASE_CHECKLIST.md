# GameTime Android Release Checklist

This is the step-by-step guide to ship GameTime on Google Play.

## 1) Prerequisites
- [ ] Google Play Console account (owner/admin access)
- [ ] App privacy policy URL (public)
- [ ] Test devices and at least one additional Gmail tester account

## 2) App entry and package name
- [ ] In Google Play Console → Create app
  - App name
  - Default language
  - App/Business type (App)
  - Free pricing
  - Declarations (no ads, not a news app, etc. adjust as needed)
- [ ] Confirm package name: `com.gametimeapp.app` (already set in `app.json`)

## 3) EAS credentials and FCM (push)
Run in project root `gameTime/`.

```bash
# Login to Expo account
EAS_NO_VCS=1 eas login

# Configure Android credentials and FCM
EAS_NO_VCS=1 eas credentials -p android
```
- [ ] Let EAS manage the Android keystore (recommended)
- [ ] Add the Firebase Cloud Messaging (FCM) Server key for push notifications
  - You can create an FCM Server key in Firebase console → Project settings → Cloud Messaging → Cloud Messaging API (Legacy)
  - Alternatively, use an existing key if already configured

Note: Using Expo Notifications; no native `google-services.json` is required for this project.

## 4) Versioning & Config (Android)
In `app.json`:
- [ ] `expo.version` is marketing version (e.g. `1.0.0`)
- [ ] `expo.android.versionCode` is an incrementing integer (e.g. `1`, `2`, …)
- [ ] Permissions are declared: `READ_CONTACTS`, `POST_NOTIFICATIONS` (already configured)

Paths:
- `gameTime/app.json`
- `gameTime/eas.json`

## 5) Backend readiness (Firebase + Twilio)
Deploy from `gameTime/` and `gameTime/functions/`:

```bash
# Login once
firebase login

# Set Twilio secrets for Functions
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set TWILIO_VERIFY_SERVICE_SID

# Deploy Functions and Realtime Database rules
firebase deploy --only functions,database
```

- [ ] Confirm Cloud Functions region is `us-central1` or update base URL in `src/services/customAuthService.ts`
- [ ] Confirm Realtime Database rules deployed (`gameTime/database.rules.json`)

## 6) Build Android AAB with EAS
From `gameTime/`:
```bash
# Build Play Store artifact (AAB)
npm run build:android
```
- [ ] Wait for build to finish (EAS dashboard link printed)
- [ ] Download the `.aab` if you want to upload manually (optional)

## 7) QA Smoke Test (internal build)
- [ ] Install internal build (or use an internal testing track) on real device
- [ ] OTP sign-in completes end-to-end
- [ ] Push token saved under `users/{uid}/expoPushToken`
- [ ] Create a group, add via Contacts permission, send Ping
- [ ] Receive push on another device; tapping opens `group/{id}` inside app
- [ ] Logout flow works

## 8) Upload & Create Internal Testing Release
Option A: CLI submit
```bash
# Submit latest EAS build to Google Play
npm run submit:android
```
Option B: Manual upload
- [ ] Google Play Console → Internal Testing → Create new release → Upload AAB

- [ ] Resolve Play Signing (enable Play App Signing if prompted)
- [ ] Add testers (email lists or opt-in URL)
- [ ] Roll out Internal test

## 9) App Content & Store Listing
- App content (Policy forms)
  - [ ] Data safety: disclose collection for functionality (phone number, contacts if used, push token/identifiers)
  - [ ] Data sharing: none
  - [ ] Data deletion: provide in-app deletion (see below)
  - [ ] App access: add instructions for OTP (reviewer access notes)
  - [ ] Ads: No (unless you add ads)
- Store listing
  - [ ] Short description & Full description
  - [ ] Screenshots for phones (1080×1920 or similar)
  - [ ] High-res icon (512×512), Feature graphic (1024×500) if desired
  - [ ] Category, contact email, privacy policy URL

## 10) Account Deletion (Google Play Data Deletion)
Google Play requires a data deletion option if you collect user data.
- [ ] Add a Delete Account option in `app/(tabs)/profile.tsx`
  - Calls backend to delete Firebase Auth user and purge user data from `users/{uid}`, `userGroups/{uid}`, and group membership maps where allowed
  - Expose a support channel for deletion requests if in-app deletion is temporarily unavailable

## 11) Promote to Production
- [ ] After Internal testing passes, create a Closed or Open testing release (optional)
- [ ] Prepare a Production release → Upload AAB (or promote from testing)
- [ ] Fill release notes, roll out gradually

## 12) Ongoing Releases
- [ ] Increment `expo.android.versionCode` for every submission
- [ ] Bump `expo.version` for marketing releases (1.0.1, 1.1.0, …)
- [ ] Keep Data safety and privacy policy up to date

## Commands quick reference
```bash
# Credentials / FCM
EAS_NO_VCS=1 eas credentials -p android

# Build / Submit
npm run build:android
npm run submit:android

# Firebase
echo "Set Twilio secrets once, then deploy"
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set TWILIO_VERIFY_SERVICE_SID
firebase deploy --only functions,database
```

## Links
- App config: `gameTime/app.json`
- EAS config: `gameTime/eas.json`
- Functions: `gameTime/functions/index.js`
- Auth client: `gameTime/src/services/customAuthService.ts`
- Notifications: `gameTime/src/services/notificationService.ts`
- Database rules: `gameTime/database.rules.json`










