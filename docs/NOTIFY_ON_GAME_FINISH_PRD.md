# Product Requirements Document (PRD): Get Notified Feature (Updated)
## 1. Overview
### 1.1 Product Summary
The app is a messaging platform similar to WhatsApp, integrated with Riot Games API for game-related features. This feature allows group members to request notifications when any member currently in an active game finishes. The request applies to all currently playing members at the time of the request and is made via a CTA button on the "currently playing" card in the group screen. A backend service will poll the Riot API every 30 seconds using the existing `getActiveGameStatus` Cloud Function. Upon detecting that at least one player has finished, it will send personalized notifications (including group name and member name) via Expo Notifications for each finished player in that polling cycle, then terminate monitoring for the entire request by deleting the doc—without waiting for or notifying about remaining players.
### 1.2 Goals
- Enhance user engagement by alerting members when others become available post-game, but avoid notification spam by terminating after the first set of finishes.
- Leverage existing Riot API integration and Cloud Functions to minimize new code.
- Ensure efficient, scalable monitoring with automatic cleanup after initial notifications or expiration (1 hour).
- Integrate seamlessly into the group screen UI without major overhauls.
- Handle multiple requesters and multiple playing members securely and efficiently.
### 1.3 Scope
- **In Scope**:
  - CTA button on the currently playing card to request notifications for all active games.
  - Backend storage for notification requests, including list of playing members.
  - Scheduled Cloud Function to poll Riot API, check statuses, send notifications for finished players in a cycle, and terminate by deleting the doc.
  - Expo Notifications for push alerts, including group and member details.
  - Option to cancel request (as it's low-cost to implement).
- **Out of Scope**:
  - Custom notification preferences (e.g., sound/vibration settings).
  - Handling new games started after request (monitor only the snapshot of playing members at request time).
  - Notifications for subsequent player finishes after the first detection cycle.
  - Analytics on notification usage.
  - Integration with non-Riot games or advanced Riot features (e.g., match details).
### 1.4 Assumptions
- The app uses Firebase for backend: Authentication, Firestore for data (e.g., users with `riotSummonerId`, `name`, and Expo push tokens; groups with `name` and `members`), Cloud Functions for logic, and Cloud Scheduler for periodic tasks.
- Existing `getActiveGameStatus` Cloud Function takes a Riot identifier (derived from `riotSummonerId`) and returns whether the user is in an active game.
- Users have linked Riot accounts with `riotSummonerId` stored in their Firestore user doc.
- Expo Notifications are set up, with push tokens stored in user docs (e.g., `pushToken` field).
- Frontend is Expo (React Native), with an existing group screen showing a "currently playing" card (e.g., listing or indicating members in games).
- The frontend can determine and send the list of currently playing user IDs when requesting (based on displayed data).
- Deep linking or in-app navigation for notification taps (e.g., to group chat).
- Riot API rate limits are managed via existing function; polling every 30s is feasible for expected load (small groups).
## 2. User Stories
As a group member:
- I want to tap the CTA button on the currently playing card to request notifications when any playing member finishes, so I can coordinate easily.
- I want the button to update to "Notification Active" after requesting, with an option to cancel.
As a notified user:
- I want to receive a push notification when a member finishes, including the group name and member's name (e.g., "LOL Fighters - Rick just finished a game."), even if I've left the group (ignore edge case complexities). Subsequent finishes won't trigger additional notifications for this request.
As an admin/developer:
- I want automatic expiration (1 hour) and cleanup to prevent resource leaks.
## 3. Functional Requirements
### 3.1 User Flow
1. **Requesting Notification**:
   - On the group screen, if there are currently playing members, display the "currently playing" card with CTA button: "Get Notified".
   - Upon tap, frontend collects list of playing user IDs, calls a Cloud Function to add the request (store requester and players in a group-specific doc).
   - Update button to "Notification Active" (local state or refetch); allow tap to cancel (remove requester).
   - Note: Multiple users can request, adding to the same doc if one exists for the group.
2. **Monitoring and Notification**:
   - A scheduled Cloud Function runs every 30s, queries active notification request docs from Firestore.
   - For each doc, call `getActiveGameStatus` for each player in the list.
   - If any players have finished, fetch group name and player names, send Expo push notifications to all requesters for each finished player (e.g., "[Group Name] - [Player Name] just finished a game.").
   - After sending, delete the doc to terminate monitoring (even if some players remain active).
   - If no finishes but expired (1 hour from creation), delete without notifying.
3. **Handling Notification**:
   - On receipt, show push alert; tap navigates to group chat.
4. **Edge Cases**:
   - No playing members: Hide or disable button.
   - Requester leaves group: Still notify (ignore complexities like group access checks).
   - Multiple requests: Use a single doc per group; aggregate requesters and use initial players list.
   - Multiple finishes in one cycle: Notify for all in that cycle, then terminate.
   - Polling overlap: Use atomic Firestore operations to avoid duplicates.
### 3.2 API Endpoints (Via Cloud Functions)
Use HTTPS callable Cloud Functions for frontend interactions; add a scheduled function for polling.
- **requestNotification (HTTPS Callable)**:
  - Auth: Requires Firebase Auth (user must be in group).
  - Input: { groupId: string, playingUserIds: array of strings (current playing members) }
  - Logic: If no existing doc for group, create with players; verify at least one is active (sample check); add requester to array (arrayUnion), set expiry (now + 1 hour).
  - Response: { success: boolean } or error.
- **cancelNotification (HTTPS Callable)**:
  - Auth: Requires Firebase Auth.
  - Input: { groupId: string }
  - Logic: Remove requester from array (arrayRemove); delete doc if requesters empty.
  - Response: { success: boolean }
- **checkNotifications (Scheduled, e.g., via Cloud Scheduler every 30s)**:
  - No input (runs periodically).
  - Logic: Query `notificationRequests` where expiry > now; for each, batch call `getActiveGameStatus` for players; if any finished: fetch group name/player names/push tokens, send Expo notifications for each finished, then delete doc. For expired: delete doc.
  - Use Expo SDK in Node.js for sending notifications.
### 3.3 Data Structures
Add a new Firestore collection: `notificationRequests` (top-level or subcollection under groups for scoping).
- **Notification Request Schema (Firestore)**:
  ```json
  {
    "groupId": string (doc ID or field),
    "requesters": array of strings (user IDs),
    "players": array of strings (user IDs of playing members at request time),
    "createdAt": timestamp,
    "expiry": timestamp (createdAt + 1 hour),
    // Index on groupId for quick lookups
  }
  ```
- **Why this structure?**
  - Efficient: One doc per group (merge requests); arrays for multiple requesters/players reduce docs.
  - Minimal changes: Leverages existing user docs for `riotSummonerId`, `name`, and push tokens; group docs for `name`.
  - Scalable: Scheduled function scans limited docs (one per active group); batch API calls.
  - Cleanup: Docs auto-removed after first finish detection or expiry; no TTL needed (handled in function).
- **Existing User Schema (Firestore)**:
  Assumes:
  ```json
  {
    "riotSummonerId": string,
    "name": string (display name, e.g., "Rick"),
    "pushToken": string (Expo token),
    // Other fields...
  }
  ```
- **Existing Group Schema (Firestore)**:
  Assumes:
  ```json
  {
    "name": string (e.g., "LOL Fighters"),
    // Other fields...
  }
  ```
### 3.4 UI Components
- **Currently Playing Card**: Add CTA button to existing card component.
  - Label: "Get Notified" (initial); "Notification Active" after request.
  - Icon: Bell or similar (reuse assets).
  - On tap: Collect playingUserIds from displayed data, call request/cancel function; update UI via local state or Firestore listener.
- **No New Screens/Modals**: Inline feedback (e.g., toast: "Notification requested").
## 4. Non-Functional Requirements
### 4.1 Performance
- Request add/cancel: < 300ms (Firestore write + check).
- Polling cycle: < 1s per doc (batch for efficiency); handle up to 100 active requests.
- Expo Notifications: Delivery in seconds (Expo handles queuing).
### 4.2 Security
- Auth: Enforce group membership in functions.
- Data: Limit access via security rules (e.g., only group members can read/write).
- API Keys: Store Riot/Expo keys securely in Cloud Functions env vars.
- Rate Limits: Monitor Riot API usage; backoff if needed.
### 4.3 Reliability
- Idempotency: Array operations handle duplicates.
- Error Handling: Retry failed API calls; log errors; user-facing messages for requests.
- Consistency: Use server timestamps for expiry.
### 4.4 Platforms
- Mobile-first (iOS/Android) via Expo (React Native).
- Notifications: Use Expo's push service for cross-platform.
## 5. Dependencies and Risks
- **Dependencies**: Firebase SDKs, Expo Notifications module, existing `getActiveGameStatus` function, Cloud Scheduler.
- **Risks**:
  - Riot API downtime/limits: Fallback to skip checks; notify devs.
  - High load: If many groups/players, optimize batching or use Pub/Sub for distributed checks.
  - Push token management: Ensure tokens are updated on app login.
  - Player snapshot: If games end quickly, notifications might be missed; 30s polling mitigates.
## 6. Success Metrics
- Usage: # of notification requests and deliveries.
- Engagement: Time between notification and group activity.
- Feedback: User reports on timeliness/accuracy.
## 7. Implementation Notes for Corsur (AI Code Agent)
- Minimal diffs: Add to existing group screen components; new Cloud Functions as above.
- Generate code snippets for:
  - Cloud Functions: requestNotification (handle playingUserIds), cancelNotification, checkNotifications (with name fetches, Expo integration, and delete after any send).
  - Frontend: Button logic in card component (collect playingUserIds), using Firebase SDK for calls.
- Test Cases: Unit for functions (mock API); E2E for request-notification flow.
- Tech Stack: Firebase (Auth, Firestore, Cloud Functions, Scheduler); Expo (React Native, Notifications); Twilio for auth; Riot API via existing function.