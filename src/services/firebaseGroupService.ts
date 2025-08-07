import { ref, set, get, push, update, onValue, off } from 'firebase/database';
import { database } from '@/config/firebase';
import { auth } from '@/config/firebase';

export interface Group {
  id: string;
  name: string;
  members: Array<{
    id: string;
    name: string;
    phoneNumber: string;
    userId?: string; // Firebase user ID if they have an account
  }>;
  createdBy: string; // User ID of creator
  createdAt: Date;
  lastPing?: Date;
  currentGame?: string;
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

      const newGroup: Group = {
        id: groupId,
        name,
        members,
        createdBy: currentUser.uid,
        createdAt: new Date(),
      };

      await set(newGroupRef, newGroup);

      // Add group to each member's groups list
      for (const member of members) {
        if (member.userId) {
          await this.addGroupToUser(member.userId, groupId);
        }
      }

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

      const userRef = ref(database, `${this.USERS_REF}/${currentUser.uid}`);
      const userSnapshot = await get(userRef);

      if (!userSnapshot.exists()) {
        return [];
      }

      const userData = userSnapshot.val() as User;
      const groups: Group[] = [];

      // Get each group the user is a member of
      for (const groupId of userData.groups || []) {
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
      await set(userRef, {
        id: currentUser.uid,
        phoneNumber,
        displayName,
        groups: [],
        createdAt: new Date().toISOString(),
      });

      console.log('User profile created successfully for:', phoneNumber);
    } catch (error) {
      console.error('Failed to create user profile:', error);
      throw error;
    }
  }
} 