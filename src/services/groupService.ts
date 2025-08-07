import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Group {
  id: string;
  name: string;
  members: Array<{
    id: string;
    name: string;
    phoneNumber: string;
  }>;
  createdAt: Date;
  lastPing?: Date;
}

export class GroupService {
  private static GROUPS_KEY = 'gametime_groups';

  static async getGroups(): Promise<Group[]> {
    try {
      const groupsJson = await AsyncStorage.getItem(this.GROUPS_KEY);
      if (groupsJson) {
        const groups = JSON.parse(groupsJson);
        return groups.map((group: any) => ({
          ...group,
          createdAt: new Date(group.createdAt),
          lastPing: group.lastPing ? new Date(group.lastPing) : undefined,
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to get groups:', error);
      return [];
    }
  }

  static async createGroup(name: string, members: Array<{ id: string; name: string; phoneNumber: string }>): Promise<Group> {
    try {
      const newGroup: Group = {
        id: Date.now().toString(),
        name,
        members,
        createdAt: new Date(),
      };

      const existingGroups = await this.getGroups();
      const updatedGroups = [...existingGroups, newGroup];
      
      await AsyncStorage.setItem(this.GROUPS_KEY, JSON.stringify(updatedGroups));
      
      return newGroup;
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
  }

  static async updateGroupLastPing(groupId: string): Promise<void> {
    try {
      const groups = await this.getGroups();
      const updatedGroups = groups.map(group => 
        group.id === groupId 
          ? { ...group, lastPing: new Date() }
          : group
      );
      
      await AsyncStorage.setItem(this.GROUPS_KEY, JSON.stringify(updatedGroups));
    } catch (error) {
      console.error('Failed to update group last ping:', error);
    }
  }
} 