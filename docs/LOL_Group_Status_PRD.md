## Feature PRD: League of Legends Member Status in Groups

### Overview
Enable groups configured for League of Legends to display members' live game status. Users add their Riot ID and region in their profile. On group pages, show "In game - Xm" next to each member currently in a live match. Poll for updates while the group page is open.

### Goals
- Display live in-game status for group members who have provided Riot ID and region.
- Add game selection to group creation (closed list, initially only League of Legends).
- Allow users to add/edit Riot ID and region; verify and persist Summoner ID.
- Poll status on group page for freshness while respecting Riot rate limits.

### Non-Goals
- Historical match data, ranks, or MMR display.
- Non-LoL titles. (Future-proof the dropdown to support more titles later.)
- Server-side proxy or caching in v1 (will be a follow-up; v1 uses direct client calls per input).

### User Stories
- As a group creator, I select the game for my group so features can be tailored for that game.
- As a user, I provide my Riot ID and region so my group can see if I am currently in a match.
- As a group member, when I open a LoL group, I want to see who is in game right now and for how long.

### UX / UI Requirements
- Group creation:
  - Same line layout: `Group name` input on the left, `Game` dropdown on the right.
  - Closed list with a single option for now: "League of Legends".
  - Store `game` with the group; defaults to "League of Legends" if the user does not change it.
- User profile:
  - Fields:
    - `Riot ID` in the format `gameName#tagLine` (e.g., `Faker#KR1`).
    - `Region` from a closed list (see Region list below).
  - Validation:
    - `Riot ID` must contain a single `#` with non-empty `gameName` and `tagLine`.
    - `Region` must be one of the supported codes.
  - Save behavior:
    - On Save, call Riot APIs to resolve PUUID and Summoner ID.
    - If successful, persist `riotGameName`, `riotTagLine`, `riotRegion`, derived `riotSuperRegion`, and `riotSummonerId` (and optionally `riotPuuid`).
    - Show inline success/error states; do not persist partially invalid data.
- Group page (for groups where `game === League of Legends`):
  - In the header/member list, next to each member name who has a Riot ID, show:
    - If in a live game: `In game - Xm` where `X` is minutes since `gameStartTime`.
    - If not in game, or data fetch fails: show nothing (no badge/placeholder).
  - Polling:
    - Start on page load and while the page remains visible.
    - Poll every 30 seconds by default; stop on page hide/unmount.
    - Update the UI incrementally without full page refresh.

### Data Model Changes
- User additions:
  - `riotGameName: string | null`
  - `riotTagLine: string | null`
  - `riotRegion: string | null` (specific region code, e.g., `KR`, `NA1`, `EUW1`)
  - `riotSuperRegion: 'americas' | 'europe' | 'asia' | 'sea' | null` (derived)
  - `riotPuuid: string | null`
  - `riotSummonerId: string | null`
  - `riotLastVerifiedAt: Date | null`
- Group additions:
  - `game: 'League of Legends'` (enum constrained; start with a single option)

No schema change required for memberships. Status is fetched on demand and not persisted.

### Riot Regions (Closed List) and Mapping
- Specific Regions (user picks one): BR1, EUN1, EUW1, JP1, KR, LA1, LA2, NA1, OC1, TR1, RU, PH2, SG2, TH2, TW2, VN2.
- Mapping to Super Regions:

| Specific Region | Super Region |
|-----------------|--------------|
| BR1             | americas     |
| EUN1            | europe       |
| EUW1            | europe       |
| JP1             | asia         |
| KR              | asia         |
| LA1             | americas     |
| LA2             | americas     |
| NA1             | americas     |
| OC1             | sea          |
| TR1             | europe       |
| RU              | europe       |
| PH2             | sea          |
| SG2             | sea          |
| TH2             | sea          |
| TW2             | sea          |
| VN2             | sea          |

### API Integration
- Step 1: Resolve identifiers (once per user save/update)
  1) Get PUUID from Riot ID (Account-v1 on super region):
     - GET `https://{superRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}`
  2) Optionally get Summoner ID from PUUID (Summoner-v4 on platform region). Note: some keys may return masked payloads without `id`.
     - GET `https://{region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}`
     - Store `riotPuuid` as the primary identifier; `riotSummonerId` is optional.

- Step 2: Get live game status (per member, on group page poll)
  - GET `https://{region}.api.riotgames.com/lol/spectator/v5/active-games/by-puuid/{puuid}`
  - If 200: compute minutes as `round((now - gameStartTime) / 60000)`.
  - If 404: not in game; render nothing.
  - Else: treat as transient error; render nothing.

### Rate Limits and Polling Strategy
- Respect dev key limits (e.g., ~20 req/s, 100 per 2 min; subject to Riot program specifics).
- Group page polling:
  - Debounce initial burst by batching requests with small delays (e.g., 100–200 ms spacing) if member list is large.
  - Cap concurrent requests (e.g., 5–8 at a time) using a simple queue.
  - Cache negative results for 30 seconds to avoid excessive 404 calls.
  - Cancel all pending requests on navigation/unmount.

### Architecture
- v1 (per input): client directly calls Riot endpoints using a configured API key.
  - Configure `RIOT_API_KEY` via environment/secure storage; do not hardcode in source.
  - Add a thin client service module for Riot requests with error handling and backoff.
- v2 (follow-up): server proxy and caching
  - Proxy calls to keep the key server-side, add caching, and centralize rate limiting.

### Error Handling
- Profile save:
  - Input validation errors surfaced inline.
  - Riot API 4xx/5xx shown as non-blocking banner with actionable message; do not persist fields on failure.
  - Distinguish invalid Riot ID vs. wrong region vs. transient error.
- Group page polling:
  - Swallow errors silently and render nothing for that member.
  - Optionally show a subtle warning banner if a high error rate persists (>50% failures for >60s).

### Privacy & Security
- Do not log PII or credentials. Mask Riot ID in logs where possible.
- Do not commit the API key. Use environment configuration (even in v1 client-flow, prefer user-secured storage or runtime injection).
- Plan to migrate to server-side proxy in v2 to remove client-side API key exposure.

### Observability
- Client metrics/events:
  - `riot.profile.verify.start/success/fail`
  - `riot.status.poll.start/complete/error`
  - Rate-limit/backoff occurrences

### Rollout & Feature Flag
- Gate all UI and API calls behind `feature.lolStatus` flag.
- Rollout steps: dev → staging → prod. Validate with test accounts in each region.

### Acceptance Criteria
- Group creation shows game dropdown on the same row as name, with "League of Legends" as the only option.
- Users can save a valid `Riot ID` and `Region`. On save, system resolves and persists `riotSummonerId`.
- On a LoL group page, members with a Riot ID who are in a live game show `In game - Xm`. Others show nothing.
- Polling updates every 30 seconds while the page is visible and stops when not visible.
- No UI regressions for non-LoL groups.
- No secrets committed; app builds and lints cleanly.

### Test Plan
- Unit tests for:
  - Region parsing and mapping to super regions.
  - Riot ID parsing/validation logic.
  - Summoner ID resolution flow (mocked fetch).
  - Spectator status parsing and elapsed time calculation.
- Integration/UI tests for:
  - Profile save flows (success, invalid Riot ID, wrong region, network error).
  - Group page polling and UI updates.
- Manual checks across a subset of regions (e.g., KR, NA1, EUW1, OC1).

### Open Questions
- Should we persist `riotPuuid` for future features (e.g., match history)? Proposed: yes.
- Should we show a tooltip when status is blank to explain that the user is not in game or status is unavailable? Proposed: no (quiet failure as per spec).
- Maximum group size assumptions for polling strategy? Proposed: design for up to 100 members with Riot IDs.

### Tasks / Tickets
1) Data model: add user fields and group `game` enum; migrations + type updates.
2) Feature flag: `feature.lolStatus` wiring.
3) Group creation UI: add game dropdown on same row as name; persist `game`.
4) Profile UI: add `Riot ID` and `Region` fields, validation, and save UX.
5) Riot client service (v1):
   - `resolveSummonerId(gameName, tagLine, region)` → `{ puuid, summonerId }`.
   - `getActiveGameStatus(summonerId, region)` → `{ inGame: boolean, elapsedMinutes?: number }`.
   - Concurrency cap, caching of negative results, error normalization.
6) Persist user Riot fields on successful verification.
7) Group page status component:
   - Only for `game === 'League of Legends'`.
   - Poll on mount/visible, update UI per member, handle cancellations.
8) Telemetry: add client events and minimal logging (no PII).
9) QA & accessibility: keyboard navigation for new inputs, color/contrast for status text.
10) Docs: update README with configuration (`RIOT_API_KEY`) and feature flag; add region list reference.
11) Follow-up epic: server-side proxy + caching + central rate limiting.





