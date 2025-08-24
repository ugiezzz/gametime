# Product Requirements Document (PRD): Group Invite Link Feature (Updated)

## 1. Overview
### 1.1 Product Summary
The app is a messaging platform similar to WhatsApp, currently in early development stages. This feature allows group members to generate a shareable invite link for their group, enabling others to join by clicking or scanning the link. The link will be unique to each group, secured via signed tokens, and can be shared via external channels (e.g., email, social media, or direct copy).

### 1.2 Goals
- Enable easy group expansion without manual admin approvals for each new member.
- Maintain security by using time-limited links with backend-enforced expiration.
- Integrate seamlessly into the existing UI, specifically via the three dots menu on the group screen.
- Prioritize efficient data handling (stateless tokens over DB storage where possible) to ensure scalability and minimal database overhead.
- Minimize code changes: Leverage existing group management APIs, UI components, authentication flows, and Firebase services.

### 1.3 Scope
- **In Scope**:
  - Generate a unique, signed invite link per group with basic expiration (e.g., 7 days).
  - Display the link in a modal or screen for copying/sharing.
  - Handle joining via the link (validate token and add user to group).
- **Out of Scope**:
  - Advanced features like link revocation, multiple links per group, or admin-only generation.
  - QR code generation (can be added later if needed).
  - Analytics on link usage.
  - Changes to core group creation or member management flows.

### 1.4 Assumptions
- The app uses Firebase for backend services: Authentication, Firestore for data storage (e.g., groups collection), and Cloud Functions for secure logic.
- Groups are stored in Firestore with fields like `groupId` (doc ID), `name`, `members` (array of user IDs).
- Authentication is handled via Firebase Auth, potentially integrated with Twilio for phone/SMS verification.
- Frontend is built with Expo (React Native), with an existing group screen including a three dots menu.
- No major UI overhauls; reuse existing components like modals and share dialogs.
- Deep linking configured for custom URLs (e.g., via Expo Linking).

## 2. User Stories
As a group member:
- I want to access the invite link option from the three dots menu so I can quickly generate a link without navigating elsewhere.
- I want to copy or share the generated link easily so others can join my group.

As a potential new member:
- I want to click/open the shared link and be prompted to join the group seamlessly, assuming I'm authenticated in the app.

As an admin/developer:
- I want the link to be secure and expire automatically to reduce abuse risks.

## 3. Functional Requirements
### 3.1 User Flow
1. **Generating the Link**:
   - On the group screen, tap the three dots menu (existing button).
   - Add a new menu item: "Create Invite Link".
   - Upon selection, call a Cloud Function to generate a signed JWT token embedding `groupId` and `exp` (expiration timestamp).
   - Display the link (e.g., `https://yourapp.com/join?token=JWT`) in a modal with options to "Copy Link" and "Share" (using native share API).
   - Include a note: "Expires in 7 days."

2. **Joining via Link**:
   - User opens the link (e.g., via browser or deep link in app).
   - Extract token and call a Cloud Function to validate (verify signature, check expiration, ensure not already a member).
   - If valid, add the user to the group's members array in Firestore.
   - Show success message and navigate to the group chat.
   - If invalid/expired, show error message.

3. **Edge Cases**:
   - User already in group: Show "You're already a member" message.
   - Group full (if max members enforced): Prevent join.
   - Unauthenticated user: Prompt login/signup before joining.

### 3.2 API Endpoints (Via Cloud Functions)
Use HTTPS callable Cloud Functions for minimal additions:

- **generateInviteLink (HTTPS Callable)**:
  - Auth: Requires Firebase Auth (user must be a group member).
  - Input: { groupId: string }
  - Logic: Fetch group from Firestore, verify membership, sign JWT with payload { groupId, exp: now + 7 days }.
  - Response: { inviteLink: string, expiresInDays: 7 }

- **joinGroupViaLink (HTTPS Callable)**:
  - Auth: Requires Firebase Auth.
  - Input: { token: string }
  - Logic: Verify JWT (signature and exp), fetch group, add user if valid (use FieldValue.arrayUnion for atomic update).
  - Response: { success: boolean, groupId?: string } or error.

### 3.3 Data Structures
Prioritize stateless design to minimize changes. No new collections needed beyond existing `groups`.

- **Existing Group Schema (Firestore)**:
  ```json
  {
    "name": string,
    "members": array of strings (user IDs),
    "createdAt": timestamp,
    // Other fields...
  }
  ```

- **Invite Data Handling**:
  - Use signed JWT tokens instead of a DB collection. Tokens embed `groupId` and `exp` (expiration).
  - Library: `jsonwebtoken` in Cloud Functions.
  - Why this structure? 
    - Stateless: No DB storage/query overhead for invites; validation is cryptographic.
    - Minimal changes: No schema additions; leverages Firebase's secure serverless env.
    - Scalable: Supports expiration without TTL or cleanup jobs.
    - Security: Tokens can't be forged without the secret key (stored in Cloud Functions).

- **Alternative (If DB Preferred)**: Add an `inviteLinks` collection as in original PRD, but JWT is recommended for simplicity.

### 3.4 UI Components
- **Three Dots Menu**: Add item to existing menu array/options.
  - Label: "Create Invite Link"
  - Icon: Share or link icon (reuse existing assets).

- **Invite Modal**: Reuse existing modal component.
  - Content: Text field with link (read-only), Copy button, Share button.
  - Example: "Share this link to invite others: [link] Expires in 7 days."

- **Join Screen**: New simple screen or modal for confirmation.
  - Buttons: "Join Group" or "Cancel".

## 4. Non-Functional Requirements
### 4.1 Performance
- Link generation: < 500ms (simple JWT sign + Firestore read).
- Validation: < 200ms (JWT verify + Firestore update).
- Handle up to 100 concurrent joins (Firebase scales automatically).

### 4.2 Security
- Tokens: Cryptographically signed with a secret key; embed minimal data.
- Rate limiting: Use Firebase's built-in quotas or add middleware.
- Authorization: Cloud Functions enforce membership checks.
- HTTPS: All calls over secure connections.
- No frontend enforcement: All critical logic (expiration, joins) on backend.

### 4.3 Reliability
- Idempotency: Generate new token each time (or cache in app if needed).
- Error Handling: Graceful messages for expired/invalid tokens; use try-catch in functions.
- Consistency: Server-side timestamps ensure uniform expiration.

### 4.4 Platforms
- Mobile-first (iOS/Android), assuming Expo (React Native) framework.
- Deep Linking: Use Expo Linking for seamless app redirects.

## 5. Dependencies and Risks
- **Dependencies**: Firebase SDKs, `jsonwebtoken` in Cloud Functions, Expo modules (e.g., expo-linking, expo-sharing).
- **Risks**:
  - Key management: Store JWT secret securely (e.g., Firebase Environment Variables).
  - Deep link setup: Test for app/browser handling.
  - Abuse: Monitor via Firebase Analytics; expiration mitigates long-term risks.

## 6. Success Metrics
- Usage: % of groups with generated links.
- Adoption: # of joins via links.
- Feedback: User satisfaction via app ratings or surveys.

## 7. Implementation Notes for Corsur (AI Code Agent)
- Focus on minimal diffs: Patch existing files (e.g., GroupScreen.js for frontend, add Cloud Functions).
- Generate code snippets for:
  - Cloud Functions: As provided in prior response (generateInviteLink, joinGroupViaLink).
  - Frontend: Menu item, modal, deep link handler (using Expo Linking and Firebase SDK).
- Test Cases: Unit tests for token gen/validation; E2E for user flow.
- Tech Stack: Firebase (Auth, Firestore, Cloud Functions); Expo (React Native) frontend; Twilio for auth enhancements.