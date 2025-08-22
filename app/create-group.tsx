import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { CustomAuthService } from '@/services/customAuthService';
// Removed phoneUtil import - normalization now handled by FirebaseGroupService
import { FirebaseGroupService } from '@/services/firebaseGroupService';

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: string[];
  selected?: boolean;
}

export default function CreateGroupScreen() {
  const [groupName, setGroupName] = useState('');
  const [game] = useState<'League of Legends'>('League of Legends'); // Default game as per PRD
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    // Filter contacts based on search query
    const filtered = contacts.filter((contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredContacts(filtered);
  }, [contacts, searchQuery]);

  const loadContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        });

        const formattedContacts = data
          .filter(
            (contact) =>
              contact.name && contact.phoneNumbers?.length && contact.id,
          )
          .map((contact) => ({
            id: contact.id!,
            name: contact.name || 'Unknown',
            phoneNumbers:
              contact.phoneNumbers
                ?.map((p) => p.number)
                .filter((num): num is string => Boolean(num)) || [],
            selected: false,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

        setContacts(formattedContacts);
        setFilteredContacts(formattedContacts);
      } else {
        Alert.alert('Permission Denied', 'Cannot access contacts.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load contacts.');
    } finally {
      setLoading(false);
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === contactId
          ? { ...contact, selected: !contact.selected }
          : contact,
      ),
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    const selectedContacts = contacts.filter((contact) => contact.selected);
    if (selectedContacts.length === 0) {
      Alert.alert('Error', 'Please select at least one contact');
      return;
    }

    // Check if user is authenticated
    if (!CustomAuthService.isAuthenticated()) {
      Alert.alert('Error', 'Please sign in to create groups');
      router.replace('/auth/phone');
      return;
    }

    setCreating(true);
    try {
      // Don't normalize here - let FirebaseGroupService handle it with creator's region context
      // Just pass the raw phone numbers and let the service normalize them properly
      const members = selectedContacts.map((contact) => {
        const allNumbers = contact.phoneNumbers || [];
        const bestRawNumber = (allNumbers[0] || '').trim(); // Just take the first raw number
        return {
          id: contact.id,
          name: contact.name,
          phoneNumber: bestRawNumber, // Pass raw number to service
        };
      });

      await FirebaseGroupService.createGroup(groupName.trim(), members, game);
      Alert.alert('Success', 'Group created successfully!');
      router.back();
    } catch (error) {
      console.error('Failed to create group:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create group. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setCreating(false);
    }
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      className={`flex-row items-center border-b border-gray-700 p-4 ${
        item.selected ? 'bg-blue-900' : 'bg-gray-800'
      }`}
      onPress={() => toggleContactSelection(item.id)}
    >
      <View
        className={`mr-3 size-6 items-center justify-center rounded-full border-2 ${
          item.selected ? 'border-blue-600 bg-blue-600' : 'border-gray-500'
        }`}
      >
        {item.selected && <Ionicons name="checkmark" size={16} color="white" />}
      </View>
      <View className="flex-1">
        <Text className="text-lg font-semibold text-white">{item.name}</Text>
        <Text className="text-sm text-gray-400">
          {item.phoneNumbers?.[0] || 'No phone number'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <Text className="text-lg text-white">Loading contacts...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      <View className="border-b border-gray-700 p-4">
        <TextInput
          className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-lg text-white"
          placeholder="Enter group name"
          placeholderTextColor="#9CA3AF"
          value={groupName}
          onChangeText={setGroupName}
        />
      </View>

      <View className="flex-1">
        <View className="border-b border-gray-700 p-4">
          <Text className="mb-3 text-lg font-semibold text-white">
            Select Contacts
          </Text>
          <View className="relative mb-2">
            <TextInput
              className="rounded-lg border border-gray-700 bg-gray-800 p-4 pl-10 text-lg text-white"
              placeholder="Search contacts..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Ionicons
              name="search"
              size={20}
              color="#9CA3AF"
              style={{ position: 'absolute', left: 12, top: 14 }}
            />
          </View>
          <Text className="text-sm text-gray-400">
            {contacts.filter((c) => c.selected).length} selected •{' '}
            {filteredContacts.length} contacts
          </Text>
        </View>

        <FlatList
          data={filteredContacts}
          renderItem={renderContactItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <View className="border-t border-gray-700 p-4">
        <TouchableOpacity
          className={`rounded-lg p-4 ${creating ? 'bg-gray-600' : 'bg-blue-600'}`}
          onPress={handleCreateGroup}
          disabled={creating}
        >
          <Text className="text-center text-lg font-bold text-white">
            {creating ? 'Creating...' : 'Create Group'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
