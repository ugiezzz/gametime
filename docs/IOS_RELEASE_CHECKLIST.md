# GameTime iOS Release Checklist

This is the step-by-step guide to ship GameTime on the Apple App Store.

## 1) Prerequisites
- [ ] Apple Developer Program account (Individual or Company)
- [ ] Access to App Store Connect and Developer portal
- [ ] Twilio Verify (paid/credits) for real SMS OTP in review
- [ ] Privacy Policy URL (public)

## 2) Bundle ID and Capabilities
- [ ] In Apple Developer portal → Identifiers → create App ID: `com.gametimeapp.app`
- [ ] Enable capability: Push Notifications
- [ ] Associated Domains: not required (only for universal links)

## 3) App Store Connect App Record
- [ ] Create new iOS app: Name, SKU, Bundle ID `com.gametimeapp.app`, Default language
- [ ] Pricing: Free

## 4) Push Notification Certificate Setup

### Option A: Manual CSR Generation (if needed)
If you need to manually create APNS certificates:

```bash
# Generate CSR file using our script
# Windows PowerShell:
./scripts/generate-csr.ps1

# macOS/Linux:
./scripts/generate-csr.sh
```

- [ ] Generate CSR file using the script above OR via Keychain Access (see `docs/CSR_GENERATION_GUIDE.md`)
- [ ] Upload CSR to Apple Developer Portal → Certificates → Apple Push Notification service SSL (Sandbox)
- [ ] Download the certificate and install in Keychain Access

### Option B: EAS Automated Setup (Recommended)
Run in project root `gameTime/`.

```bash
# Login to Expo account
EAS_NO_VCS=1 eas login

# Confirm your account
EAS_NO_VCS=1 eas whoami

# Configure iOS credentials (APNs key, provisioning)
EAS_NO_VCS=1 eas credentials
```
- [ ] Create/upload an APNs Key (recommended) when prompted
- [ ] Let EAS create provisioning profile and signing certs

## 5) Versioning & Config (iOS)
In `app.json`:
- [ ] `expo.version` is marketing version (e.g. `1.0.0`)
- [ ] `expo.ios.buildNumber` is set (e.g. `"1"`) and will be bumped for each resubmission
- [ ] `expo.scheme` is `"gametime"`
- [ ] Plugins/permissions are configured: `expo-notifications`, `expo-contacts`, iOS InfoPlist usage strings

Paths:
- `gameTime/app.json`
- `gameTime/eas.json`

## 6) Backend readiness (Firebase + Twilio)
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

## 7) Build iOS with EAS
From `gameTime/`:
```bash
# Build App Store archive
npm run build:ios
```
- [ ] Wait for build to finish (EAS dashboard link printed)
- [ ] Install on a physical device (via QR/TestFlight later) and smoke test

## 8) QA Smoke Test on device
- [ ] OTP sign-in completes end-to-end
- [ ] Push token saved under `users/{uid}/expoPushToken`
- [ ] Create a group, add via Contacts permission, send Ping
- [ ] Receive push on another device; tapping opens `group/{id}` inside app
- [ ] Logout flow works

## 9) Submit to TestFlight / App Store
```bash
# Submit the built archive to App Store Connect
npm run submit:ios
```
- [ ] If prompted, connect App Store Connect API Key or sign in with Apple
- [ ] In App Store Connect, add build to TestFlight (Internal)

## 10) App Store Metadata & Compliance
- App Information
  - [ ] Name, Subtitle, Category
  - [ ] Age rating questionnaire
- Screenshots
  - [ ] iPhone 6.7" and 6.1" at minimum (PNG/JPG)
- App Privacy
  - [ ] Data collection for functionality: phone number, contacts (optional), push token
  - [ ] No tracking across apps; ATT = No
  - [ ] Export compliance: Uses encryption, exempt
- Reviewer Notes (recommended)
  - [ ] Explain OTP + push permission steps
  - [ ] Provide a test phone/workflow; ensure Twilio can send SMS to reviewer region

## 11) Account Deletion (App Store Guideline 5.1.1(v))
Apple requires in-app account deletion if account creation exists.
- [ ] Add a Delete Account option in `app/(tabs)/profile.tsx`
  - Calls backend to delete Firebase Auth user and purge user data from `users/{uid}`, `userGroups/{uid}`, and group membership maps where allowed
- [ ] We can implement this before submission if needed; otherwise expect a review request to add it

## 12) App Review and Release
- [ ] Internal TestFlight testing (invite accounts)
- [ ] Submit for beta review or directly to App Review
- [ ] After approval, release to App Store (manual or scheduled)

## 13) Ongoing Releases
- [ ] Bump `expo.ios.buildNumber` for every resubmission
- [ ] Bump `expo.version` for marketing releases (1.0.1, 1.1.0, …)
- [ ] Keep Privacy answers up to date

## Commands quick reference
```bash
# Credentials setup
EAS_NO_VCS=1 eas credentials

# Build / Submit
echo "Ensure app.json version/buildNumber updated"
npm run build:ios
npm run submit:ios

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
- CSR Generation Guide: `gameTime/docs/CSR_GENERATION_GUIDE.md`
- CSR Scripts: `gameTime/scripts/generate-csr.ps1` (Windows) or `gameTime/scripts/generate-csr.sh` (macOS/Linux)











