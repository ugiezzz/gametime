import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { normalizePhoneNumber, getDefaultRegion } from '@/services/phoneUtil';
import { FirebaseGroupService } from '@/services/firebaseGroupService';
import { FirebaseAuthService } from '@/services/firebaseAuthService';

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: string[];
  selected?: boolean;
}

export default function CreateGroupScreen() {
  const [groupName, setGroupName] = useState('');
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
    const filtered = contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase())
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
          .filter(contact => contact.name && contact.phoneNumbers?.length && contact.id)
          .map(contact => ({
            id: contact.id!,
            name: contact.name || 'Unknown',
            phoneNumbers: contact.phoneNumbers?.map(p => p.number).filter((num): num is string => Boolean(num)) || [],
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
    setContacts(prev => 
      prev.map(contact => 
        contact.id === contactId 
          ? { ...contact, selected: !contact.selected }
          : contact
      )
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    const selectedContacts = contacts.filter(contact => contact.selected);
    if (selectedContacts.length === 0) {
      Alert.alert('Error', 'Please select at least one contact');
      return;
    }

    // Check if user is authenticated
    if (!FirebaseAuthService.isAuthenticated()) {
      Alert.alert('Error', 'Please sign in to create groups');
      router.replace('/auth/phone');
      return;
    }

    setCreating(true);
    try {
      const normalizePhone = (raw?: string) => {
        if (!raw) return '';
        const norm = normalizePhoneNumber(raw, getDefaultRegion());
        return norm.e164 || '';
      };

      const members = selectedContacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        phoneNumber: normalizePhone(contact.phoneNumbers?.[0]),
      }));

      await FirebaseGroupService.createGroup(groupName.trim(), members);
      Alert.alert('Success', 'Group created successfully!');
      router.back();
    } catch (error) {
      console.error('Failed to create group:', error);
      const message = error instanceof Error ? error.message : 'Failed to create group. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setCreating(false);
    }
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      className={`p-4 border-b border-gray-700 flex-row items-center ${
        item.selected ? 'bg-blue-900' : 'bg-gray-800'
      }`}
      onPress={() => toggleContactSelection(item.id)}
    >
      <View className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
        item.selected ? 'bg-blue-600 border-blue-600' : 'border-gray-500'
      }`}>
        {item.selected && (
          <Ionicons name="checkmark" size={16} color="white" />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-white text-lg font-semibold">{item.name}</Text>
        <Text className="text-gray-400 text-sm">
          {item.phoneNumbers?.[0] || 'No phone number'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <Text className="text-white text-lg">Loading contacts...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      <View className="p-4 border-b border-gray-700">
        <TextInput
          className="bg-gray-800 text-white p-4 rounded-lg border border-gray-700 text-lg"
          placeholder="Enter group name"
          placeholderTextColor="#9CA3AF"
          value={groupName}
          onChangeText={setGroupName}
        />
      </View>

      <View className="flex-1">
        <View className="p-4 border-b border-gray-700">
          <Text className="text-white text-lg font-semibold mb-3">Select Contacts</Text>
          <View className="relative mb-2">
            <TextInput
              className="bg-gray-800 text-white p-4 rounded-lg border border-gray-700 text-lg pl-10"
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
          <Text className="text-gray-400 text-sm">
            {contacts.filter(c => c.selected).length} selected • {filteredContacts.length} contacts
          </Text>
        </View>

        <FlatList
          data={filteredContacts}
          renderItem={renderContactItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <View className="p-4 border-t border-gray-700">
        <TouchableOpacity
          className={`p-4 rounded-lg ${creating ? 'bg-gray-600' : 'bg-blue-600'}`}
          onPress={handleCreateGroup}
          disabled={creating}
        >
          <Text className="text-white text-center font-bold text-lg">
            {creating ? 'Creating...' : 'Create Group'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
} 