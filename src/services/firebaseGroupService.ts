import { ref, set, get, push, update, onValue, remove } from 'firebase/database';
import { database } from '@/config/firebase';
import { auth } from '@/config/firebase';
import { updateProfile } from 'firebase/auth';
import { normalizePhoneNumber } from '@/services/phoneUtil';

export interface Group {
  id: string;
  name: string;
  // Deprecated: display-only members list (kept optional for older groups). Prefer membersByUid.
  members?: Array<{
    id: string;
    name: string;
    phoneNumber: string;
    userId?: string;
  }>;
  membersByUid?: Record<string, true>;
  createdBy: string; // User ID of creator
  createdAt: Date;
  lastPing?: Date;
  currentGame?: string;
  game?: string;
}

export interface PingResponse {
  status: 'pending' | 'eta' | 'declined';
  etaMinutes?: number;
  updatedAtMs?: number;
}

export interface Ping {
  id: string;
  createdBy: string;
  createdAtMs: number;
  scheduledAtMs?: number;
  expiresAtMs: number;
  responses?: Record<string, PingResponse>;
}

export interface User {
  id: string;
  phoneNumber: string;
  displayName?: string;
  groups: string[]; // Array of group IDs
  createdAt: Date;
  riotGameName?: string | null;
  riotTagLine?: string | null;
  riotRegion?: string | null;
  riotSuperRegion?: 'americas' | 'europe' | 'asia' | 'sea' | null;
  riotPuuid?: string | null;
  riotSummonerId?: string | null;
  riotLastVerifiedAt?: string | null;
}

export class FirebaseGroupService {
  private static GROUPS_REF = 'groups';
  private static USERS_REF = 'users';
  private static PHONE_TO_UID_REF = 'phoneToUid';
  private static PHONE_INVITES_REF = 'phoneInvites';

  // Create a new group
  static async createGroup(
    name: string,
    members: Array<{ id: string; name: string; phoneNumber: string; userId?: string }>,
    game: string = 'League of Legends'
  ): Promise<Group> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const groupRef = ref(database, this.GROUPS_REF);
      const newGroupRef = push(groupRef);
      const groupId = newGroupRef.key!;

      // Try to infer creator's region from their saved phone number to better parse local inputs
      let creatorRegion: string | undefined;
      let creatorPhone: string | undefined;
      
      try {
        console.log('🔍 Current user UID:', currentUser.uid);
        
        // Check if UID is phone-based (format: "phone:+1234567890")
        if (currentUser.uid.startsWith('phone:')) {
          creatorPhone = currentUser.uid.substring(6); // Remove "phone:" prefix
          console.log('🔍 Creator phone extracted from UID:', creatorPhone);
        } else {
          // Try to get from database for regular UIDs
          const creatorSnap = await get(ref(database, `${this.USERS_REF}/${currentUser.uid}`));
          creatorPhone = creatorSnap.exists() ? (creatorSnap.val()?.phoneNumber as string | undefined) : undefined;
          console.log('🔍 Creator phone from database:', creatorPhone);
          
          // Fallback: get from Firebase Auth user (if phone auth was used)
          if (!creatorPhone && currentUser.phoneNumber) {
            creatorPhone = currentUser.phoneNumber;
            console.log('🔍 Creator phone from auth:', creatorPhone);
          }
        }
        
        if (creatorPhone) {
          const parsedCreator = normalizePhoneNumber(creatorPhone);
          creatorRegion = parsedCreator.region || undefined;
          console.log('🌍 Detected creator region from phone', creatorPhone, ':', creatorRegion);
        } else {
          console.log('⚠️ No creator phone found in database, auth, or UID');
        }
      } catch (error) {
        console.log('⚠️ Failed to get creator phone:', error);
      }

      // Normalize member phone numbers to E.164 when possible.
      // If parsing fails or a "+" is missing, fall back to a sanitized +<digits> form
      const normalizedMembers = members.map((member) => {
        const raw = (member.phoneNumber || '').trim();
        // Remove all non-digit characters except the leading + for international numbers
        const cleaned = raw.startsWith('+') 
          ? '+' + raw.substring(1).replace(/\D/g, '')
          : raw.replace(/\D/g, '');
        
        console.log('📱 Original phone:', raw);
        console.log('📱 Cleaned phone:', cleaned);
        console.log('📱 Using region:', creatorRegion);
        
        const normalized = normalizePhoneNumber(cleaned, creatorRegion);
        console.log('📱 Normalized result:', normalized);
        
        const digits = cleaned.replace(/\D/g, '');
        const fallback = cleaned.startsWith('+')
          ? cleaned
          : (digits.length > 0 ? `+${digits}` : '');
        const e164 = normalized.e164 || fallback;
        console.log('📱 Final E.164:', e164);
        
        const { userId, ...rest } = member;
        return userId ? { ...rest, userId, phoneNumber: e164 } : { ...rest, phoneNumber: e164 };
      });

      // Resolve known users from phoneToUid map
      const lookupResults = await Promise.all(
        normalizedMembers.map(async (m) => {
          const phone = m.phoneNumber;
          if (!phone || !phone.startsWith('+')) return { phone, uid: null };
          // Try direct phoneToUid mapping first
          try {
            const snap = await get(ref(database, `${this.PHONE_TO_UID_REF}/${phone}`));
            if (snap.exists()) return { phone, uid: snap.val() as string };
          } catch {}
          // If not found, try reverse lookup by user profiles (best-effort)
          try {
            const phoneToUidSnap = await get(ref(database, `users`));
            if (phoneToUidSnap.exists()) {
              const usersVal = phoneToUidSnap.val() as Record<string, { phoneNumber?: string }>;
              for (const [uid, u] of Object.entries(usersVal)) {
                if (u && typeof u.phoneNumber === 'string' && u.phoneNumber === phone) {
                  return { phone, uid };
                }
              }
            }
          } catch {}
          return { phone, uid: null };
        })
      );

      const newGroup: Group = {
        id: groupId,
        name,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString() as unknown as Date,
        game,
      };

      // Compose membership map; unresolved phones will be stored in phoneInvites index (not under group)
      const membersByUid: Record<string, true> = { [currentUser.uid]: true };
      const unresolvedPhones: string[] = [];
      for (const r of lookupResults) {
        if (!r.phone) continue;
        if (r.uid) {
          membersByUid[r.uid] = true;
        } else if (r.phone.startsWith('+')) {
          // Derive UID when backend uses deterministic uid scheme: `phone:${e164}`
          const derivedUid = `phone:${r.phone}`;
          membersByUid[derivedUid] = true;
          unresolvedPhones.push(r.phone);
        }
      }

      await set(newGroupRef, {
        ...newGroup,
        membersByUid,
      });

      // Ensure creator sees the group
      await this.addGroupToUser(currentUser.uid, groupId);
      // Best-effort: index the group for all resolved/derived member UIDs
      try {
        const resolvedUids = Object.keys(membersByUid).filter((uid) => uid !== currentUser.uid);
        await Promise.all(
          resolvedUids.map(async (uid) => {
            const userGroupRef = ref(database, `userGroups/${uid}/${groupId}`);
            try {
              await set(userGroupRef, true);
            } catch {
              // allowed by rules for creator when index does not exist; ignore on permission errors
            }
          })
        );
      } catch {}
      // Also set userGroups index for creator (owner-write; rules must allow)
      try {
        const userGroupRef = ref(database, `userGroups/${currentUser.uid}/${groupId}`);
        await set(userGroupRef, true);
      } catch (e) {
        // non-blocking if rules disallow; Cloud Function indexer will populate
      }

      // Index unresolved phone invites at user-level index for later claim on signup
      try {
        for (const phone of unresolvedPhones) {
          await set(ref(database, `phoneInvites/${phone}/${groupId}`), true);
        }
      } catch {
        // best-effort
      }

      // Note: Do not write to other users' profiles beyond allowed indexes; group membership remains source of truth.

      return newGroup;
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
  }

  // Delete a group (owner-only). Removes the group and userGroups index entries for all members.
  static async deleteGroup(groupId: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');

    // Read group to verify ownership and gather member index
    const groupRef = ref(database, `${this.GROUPS_REF}/${groupId}`);
    const snap = await get(groupRef);
    if (!snap.exists()) return;
    const groupData = snap.val() as { createdBy: string; membersByUid?: Record<string, true> };
    if (groupData.createdBy !== currentUser.uid) {
      throw new Error('Only the group owner can delete this group');
    }

    // Build a multi-path update to delete the group and clean up userGroups indexes
    const updates: Record<string, null> = {};
    updates[`${this.GROUPS_REF}/${groupId}`] = null;

    const members = groupData.membersByUid ? Object.keys(groupData.membersByUid) : [];
    const uniqueUids = new Set<string>([...members, groupData.createdBy]);
    for (const uid of uniqueUids) {
      updates[`userGroups/${uid}/${groupId}`] = null;
    }

    await update(ref(database), updates);
  }
  // Get all groups for the current user
  static async getUserGroups(): Promise<Group[]> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return [];
      }

      // Primary source: server-maintained index userGroups/{uid}
      const indexRef = ref(database, `userGroups/${currentUser.uid}`);
      const idxSnap = await get(indexRef);
      const groupIdsIndex = idxSnap.exists() ? Object.keys(idxSnap.val() || {}) : [];

      // Fallback: discover groups where current user is a member by UID (safe read per rules)
      // We cannot scan /groups, so we use the index if available; otherwise return empty until indexer runs
      const groupIds = groupIdsIndex;
      if (groupIds.length === 0) return [];
      const groups: Group[] = [];
      for (const groupId of groupIds) {
        const groupRef = ref(database, `${this.GROUPS_REF}/${groupId}`);
        const groupSnapshot = await get(groupRef);
        if (groupSnapshot.exists()) {
          const groupData = groupSnapshot.val();
          groups.push({
            ...groupData,
            createdAt: new Date(groupData.createdAt),
            lastPing: groupData.lastPing ? new Date(groupData.lastPing) : undefined,
          });
        }
      }
      return groups;
    } catch (error) {
      console.error('Failed to get user groups:', error);
      return [];
    }
  }

  // Get a specific group by ID
  static async getGroup(groupId: string): Promise<Group | null> {
    try {
      const groupRef = ref(database, `${this.GROUPS_REF}/${groupId}`);
      const snapshot = await get(groupRef);

      if (snapshot.exists()) {
        const groupData = snapshot.val();
        return {
          ...groupData,
          createdAt: new Date(groupData.createdAt),
          lastPing: groupData.lastPing ? new Date(groupData.lastPing) : undefined,
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get group:', error);
      return null;
    }
  }

  // Update group's last ping time
  static async updateGroupLastPing(groupId: string, gameName: string): Promise<void> {
    try {
      const groupRef = ref(database, `${this.GROUPS_REF}/${groupId}`);
      await update(groupRef, {
        lastPing: new Date().toISOString(),
        currentGame: gameName,
      });
    } catch (error) {
      console.error('Failed to update group last ping:', error);
    }
  }

  // Create a new ping. If scheduledAtMs provided, ping is for the future; expiry = scheduledAtMs + 60m
  static async createPing(groupId: string, scheduledAtMs?: number): Promise<Ping> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');

    const now = Date.now();
    const base = typeof scheduledAtMs === 'number' ? scheduledAtMs : now;
    const expires = base + 60 * 60 * 1000;
    const pingsRef = ref(database, `${this.GROUPS_REF}/${groupId}/pings`);
    const newPingRef = push(pingsRef);
    const pingId = newPingRef.key!;

    const ping: Ping = {
      id: pingId,
      createdBy: currentUser.uid,
      createdAtMs: now,
      scheduledAtMs: base,
      expiresAtMs: expires,
      responses: {
        // Creator defaults to first option (5 minutes from ping)
        [currentUser.uid]: { status: 'eta', etaMinutes: 5, updatedAtMs: now },
      },
    };

    await set(newPingRef, ping);
    return ping;
  }

  // Respond to a ping with ETA in minutes (from ping creation time)
  static async respondToPing(groupId: string, pingId: string, etaMinutes: number): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const respRef = ref(database, `${this.GROUPS_REF}/${groupId}/pings/${pingId}/responses/${currentUser.uid}`);
    await set(respRef, { status: 'eta', etaMinutes, updatedAtMs: Date.now() });
  }

  // Respond 'next round' (no absolute time)
  static async respondNextRound(groupId: string, pingId: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const respRef = ref(database, `${this.GROUPS_REF}/${groupId}/pings/${pingId}/responses/${currentUser.uid}`);
    await set(respRef, { status: 'eta', etaMinutes: null, updatedAtMs: Date.now() });
  }

  // Respond 'not today' (declined)
  static async respondNotToday(groupId: string, pingId: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const respRef = ref(database, `${this.GROUPS_REF}/${groupId}/pings/${pingId}/responses/${currentUser.uid}`);
    await set(respRef, { status: 'declined', updatedAtMs: Date.now() });
  }

  // Subscribe to active pings in the last hour
  static subscribeToActivePings(groupId: string, callback: (pings: Ping[]) => void): () => void {
    const pingsRef = ref(database, `${this.GROUPS_REF}/${groupId}/pings`);
    const unsubscribe = onValue(pingsRef, (snapshot) => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const list: Ping[] = [];
      snapshot.forEach((child) => {
        const val = child.val();
        if (
          val &&
          typeof val.expiresAtMs === 'number' &&
          typeof val.createdAtMs === 'number' &&
          val.createdAtMs >= oneHourAgo &&
          val.expiresAtMs > Date.now()
        ) {
          list.push({ ...val, id: child.key! });
        }
      });
      // Newest first
      list.sort((a, b) => b.createdAtMs - a.createdAtMs);
      callback(list);
    });
    return unsubscribe;
  }

  // Invite or add member by phone.
  // If the phone number is already associated with a registered user (via phoneToUid),
  // add them directly to membersByUid and index userGroups. Otherwise, index under phoneInvites only.
  static async inviteMemberByPhone(
    groupId: string,
    phoneNumber: string
  ): Promise<{ action: 'addedAsMember' | 'invitedByPhone'; uid?: string; e164: string }> {
    const normalized = normalizePhoneNumber(phoneNumber);
    const e164 =
      normalized.e164 || (phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber.replace(/\D/g, '')}`);

    // Use deterministic uid scheme: uid = `phone:${e164}`
    const derivedUid = `phone:${e164}`;

    // Add to group membership map unconditionally; rules allow creator/admin to add
    await set(ref(database, `${this.GROUPS_REF}/${groupId}/membersByUid/${derivedUid}`), true);

    // Best-effort index the group for that user
    try {
      await set(ref(database, `userGroups/${derivedUid}/${groupId}`), true);
    } catch {}

    // Also record phone-level invite so non-existing users can claim later (harmless for existing)
    try {
      await set(ref(database, `${this.PHONE_INVITES_REF}/${e164}/${groupId}`), true);
    } catch {}

    return { action: 'addedAsMember', uid: derivedUid, e164 };
  }

  // When a user completes signup, call this to claim any phone-based invites
  static async claimPendingInvitesForCurrentUser(): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    // We need the user's phone number from profile
    const userSnap = await get(ref(database, `${this.USERS_REF}/${currentUser.uid}`));
    if (!userSnap.exists()) return;
    const val = userSnap.val() as { phoneNumber?: string };
    const phone = val.phoneNumber;
    if (!phone) return;

    const inviteSnap = await get(ref(database, `${this.PHONE_INVITES_REF}/${phone}`));
    if (!inviteSnap.exists()) return;
    const groupIds: string[] = Object.keys(inviteSnap.val() || {});

    const updates: Record<string, any> = {};
    for (const gid of groupIds) {
      updates[`${this.GROUPS_REF}/${gid}/membersByUid/${currentUser.uid}`] = true;
      updates[`userGroups/${currentUser.uid}/${gid}`] = true;
      // Do not remove phone-based membership; in this project, uid equals `phone:{e164}`
      updates[`${this.PHONE_INVITES_REF}/${phone}/${gid}`] = null;
    }
    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }
  }

  // Ensure phoneToUid mapping exists for the current user (self-service, permitted by rules)
  static async ensurePhoneToUidMappingForCurrentUser(): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const userSnap = await get(ref(database, `${this.USERS_REF}/${currentUser.uid}`));
      if (!userSnap.exists()) return;
      const val = userSnap.val() as { phoneNumber?: string };
      const phone = val.phoneNumber;
      if (!phone || !phone.startsWith('+')) return;
      const mappingRef = ref(database, `${this.PHONE_TO_UID_REF}/${phone}`);
      const mapSnap = await get(mappingRef);
      if (!mapSnap.exists() || mapSnap.val() !== currentUser.uid) {
        await set(mappingRef, currentUser.uid);
      }
    } catch {
      // best-effort, no throw
    }
  }

  // Remove a member by uid (admin-only by rules)
  static async removeMember(groupId: string, userId: string): Promise<void> {
    // Remove from group membership map
    const memberRef = ref(database, `${this.GROUPS_REF}/${groupId}/membersByUid/${userId}`);
    await remove(memberRef);
    // Clean userGroups index for the removed member. Rules allow group creator/admin to delete index entries.
    try {
      await remove(ref(database, `userGroups/${userId}/${groupId}`));
    } catch {
      // ignore best-effort index cleanup
    }
  }

  // Current user exits group (may require rules to allow self-removal in membersByUid)
  static async exitGroup(groupId: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    await this.removeMember(groupId, currentUser.uid);
  }

  // Removed: upsertDisplayMember (deprecated display list not maintained anymore)

  // Add group to user's groups list
  private static async addGroupToUser(userId: string, groupId: string): Promise<void> {
    try {
      const userRef = ref(database, `${this.USERS_REF}/${userId}`);
      const userSnapshot = await get(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val() as User;
        const updatedGroups = [...(userData.groups || []), groupId];

        await update(userRef, {
          groups: updatedGroups,
        });
      }
    } catch (error) {
      console.error('Failed to add group to user:', error);
    }
  }

  // Listen to real-time updates for a group
  static subscribeToGroup(groupId: string, callback: (group: Group | null) => void): () => void {
    const groupRef = ref(database, `${this.GROUPS_REF}/${groupId}`);

    const unsubscribe = onValue(groupRef, (snapshot) => {
      if (snapshot.exists()) {
        const groupData = snapshot.val();
        const group: Group = {
          ...groupData,
          createdAt: new Date(groupData.createdAt),
          lastPing: groupData.lastPing ? new Date(groupData.lastPing) : undefined,
        };
        callback(group);
      } else {
        callback(null);
      }
    });

    return unsubscribe;
  }

  // Create or update user profile
  static async createUserProfile(phoneNumber: string, displayName?: string): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const userRef = ref(database, `${this.USERS_REF}/${currentUser.uid}`);
      const existing = await get(userRef);
      const baseProfile: Record<string, unknown> = {
        id: currentUser.uid,
        phoneNumber,
        groups: [],
        createdAt: new Date().toISOString(),
      };
      if (displayName && displayName.trim().length > 0) baseProfile.displayName = displayName.trim();

      if (!existing.exists()) {
        await set(userRef, baseProfile);
      } else {
        // Merge non-destructive updates
        const updates: Record<string, unknown> = {};
        const val = existing.val() as User;
        if (!val.phoneNumber && phoneNumber) updates.phoneNumber = phoneNumber;
        if (displayName && displayName.trim().length > 0 && !val.displayName) updates.displayName = displayName.trim();
        if (Object.keys(updates).length > 0) await update(userRef, updates);
      }

      console.log('User profile created successfully for:', phoneNumber);

      // Maintain phone -> uid mapping using strict E.164 format
      const { e164 } = normalizePhoneNumber(phoneNumber);
      const e164Key = e164 || (phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber.replace(/\D/g, '').replace(/^0+/, '')}`);
      const phoneRef = ref(database, `${this.PHONE_TO_UID_REF}/${e164Key}`);
      await set(phoneRef, currentUser.uid);
    } catch (error) {
      console.error('Failed to create user profile:', error);
      throw error;
    }
  }

  // Update current user's display name
  static async updateCurrentUserDisplayName(newDisplayName: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const trimmed = (newDisplayName || '').trim();
    if (!trimmed) throw new Error('Name cannot be empty');

    const userRef = ref(database, `${this.USERS_REF}/${currentUser.uid}`);
    await update(userRef, {
      displayName: trimmed,
      displayNameUpdatedAt: new Date().toISOString(),
    });

    try {
      await updateProfile(currentUser, { displayName: trimmed });
    } catch {
      // auth profile update best-effort; DB is source of truth for app
    }
  }

  // Update current user's Riot identifiers (after verification)
  static async updateCurrentUserRiotFields(fields: {
    riotGameName: string;
    riotTagLine: string;
    riotRegion: string;
    riotSuperRegion: 'americas' | 'europe' | 'asia' | 'sea';
    riotPuuid: string;
    riotSummonerId: string;
  }): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const userRef = ref(database, `${this.USERS_REF}/${currentUser.uid}`);
    await update(userRef, {
      riotGameName: fields.riotGameName,
      riotTagLine: fields.riotTagLine,
      riotRegion: fields.riotRegion,
      riotSuperRegion: fields.riotSuperRegion,
      riotPuuid: fields.riotPuuid,
      riotSummonerId: fields.riotSummonerId,
      riotLastVerifiedAt: new Date().toISOString(),
    });
  }
} 