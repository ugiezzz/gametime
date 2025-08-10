import { ref, set, get, push, update, onValue, remove } from 'firebase/database';
import { database } from '@/config/firebase';
import { auth } from '@/config/firebase';
import { normalizePhoneNumber } from '@/services/phoneUtil';

export interface Group {
  id: string;
  name: string;
  members: Array<{
    id: string;
    name: string;
    phoneNumber: string;
    userId?: string; // Firebase user ID if they have an account
  }>;
  membersByUid?: Record<string, true>;
  createdBy: string; // User ID of creator
  createdAt: Date;
  lastPing?: Date;
  currentGame?: string;
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
}

export class FirebaseGroupService {
  private static GROUPS_REF = 'groups';
  private static USERS_REF = 'users';
  private static PHONE_TO_UID_REF = 'phoneToUid';

  // Create a new group
  static async createGroup(name: string, members: Array<{ id: string; name: string; phoneNumber: string; userId?: string }>): Promise<Group> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const groupRef = ref(database, this.GROUPS_REF);
      const newGroupRef = push(groupRef);
      const groupId = newGroupRef.key!;

      // Normalize member phone numbers to E.164 when possible
      const normalizedMembers = members.map((member) => {
        const normalized = normalizePhoneNumber(member.phoneNumber);
        const e164 = normalized.e164 || member.phoneNumber;
        const { userId, ...rest } = member;
        return userId ? { ...rest, userId, phoneNumber: e164 } : { ...rest, phoneNumber: e164 };
      });

      // Ensure creator appears in the display members list as well
      const creatorUid = currentUser.uid;
      const creatorPhoneE164 = creatorUid.startsWith('phone:') ? creatorUid.slice('phone:'.length) : '';
      const hasCreatorInDisplay = creatorPhoneE164
        ? normalizedMembers.some((m) => m.phoneNumber === creatorPhoneE164)
        : false;
      if (creatorPhoneE164 && !hasCreatorInDisplay) {
        normalizedMembers.unshift({ id: creatorUid, name: 'Owner', phoneNumber: creatorPhoneE164 });
      }

      // Resolve known users from phoneToUid map
      const lookupResults = await Promise.all(
        normalizedMembers.map(async (m) => {
          const phone = m.phoneNumber;
          if (!phone || !phone.startsWith('+')) return { phone, uid: null };
          try {
            const snap = await get(ref(database, `${this.PHONE_TO_UID_REF}/${phone}`));
            return { phone, uid: snap.exists() ? (snap.val() as string) : null };
          } catch (e) {
            return { phone, uid: null };
          }
        })
      );

      const newGroup: Group = {
        id: groupId,
        name,
        members: normalizedMembers,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString() as unknown as Date,
      };

      // Compose hybrid membership maps for secure access control
      const membersByUid: Record<string, true> = { [currentUser.uid]: true };
      const inviteesByPhone: Record<string, true> = {};
      for (const r of lookupResults) {
        if (!r.phone) continue;
        if (r.uid) {
          membersByUid[r.uid] = true;
        } else if (r.phone.startsWith('+')) {
          inviteesByPhone[r.phone] = true;
        }
      }

      await set(newGroupRef, {
        ...newGroup,
        membersByUid,
        inviteesByPhone,
      });

      // Ensure creator sees the group
      await this.addGroupToUser(currentUser.uid, groupId);
      // Also set userGroups index for creator (owner-write; rules must allow)
      try {
        const userGroupRef = ref(database, `userGroups/${currentUser.uid}/${groupId}`);
        await set(userGroupRef, true);
      } catch (e) {
        // non-blocking if rules disallow; Cloud Function indexer will populate
      }

      // Note: Do not write to other users' profiles here; restricted by security rules.
      // A backend function should add groups for invited members.

      return newGroup;
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
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

  // Invite member by phone (adds to inviteesByPhone map)
  static async inviteMemberByPhone(groupId: string, phoneNumber: string): Promise<void> {
    const normalized = normalizePhoneNumber(phoneNumber);
    const e164 = normalized.e164 || (phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber.replace(/\D/g, '')}`);
    const inviteRef = ref(database, `${this.GROUPS_REF}/${groupId}/inviteesByPhone/${e164}`);
    await set(inviteRef, true);
  }

  // Remove a member by uid (admin-only by rules)
  static async removeMember(groupId: string, userId: string): Promise<void> {
    // Remove from group membership map
    const memberRef = ref(database, `${this.GROUPS_REF}/${groupId}/membersByUid/${userId}`);
    await remove(memberRef);
    // Remove group from user's groups array
    const userRef = ref(database, `${this.USERS_REF}/${userId}`);
    const snap = await get(userRef);
    if (snap.exists()) {
      const val = snap.val() as User;
      const updated = (val.groups || []).filter((g) => g !== groupId);
      await update(userRef, { groups: updated });
    }
  }

  // Current user exits group (may require rules to allow self-removal in membersByUid)
  static async exitGroup(groupId: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    await this.removeMember(groupId, currentUser.uid);
  }

  // Upsert a display member into the groups/{groupId}/members array for UI visibility
  static async upsertDisplayMember(
    groupId: string,
    member: { id: string; name: string; phoneNumber: string }
  ): Promise<void> {
    const groupRef = ref(database, `${this.GROUPS_REF}/${groupId}`);
    const snap = await get(groupRef);
    if (!snap.exists()) return;
    const groupData = snap.val() as { members?: Array<{ id: string; name: string; phoneNumber: string }>; };
    const current: Array<{ id: string; name: string; phoneNumber: string }> = Array.isArray(groupData.members)
      ? groupData.members
      : [];

    const exists = current.some((m) => (m.phoneNumber && member.phoneNumber && m.phoneNumber === member.phoneNumber) || m.id === member.id);
    if (exists) return;

    const updated = [...current, member];
    await update(groupRef, { members: updated });
  }

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
} 