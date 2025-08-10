import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { normalizePhoneNumber, getDefaultRegion } from '@/services/phoneUtil';
import { FirebaseGroupService } from '@/services/firebaseGroupService';

type Contact = {
  id: string;
  name: string;
  phoneNumbers?: string[];
  selected?: boolean;
};

export default function AddMembersScreen() {
  const { id: groupId, groupName } = useLocalSearchParams<{ id: string; groupName?: string }>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filtered, setFiltered] = useState<Contact[]>([]);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    const q = query.toLowerCase();
    setFiltered(contacts.filter(c => c.name.toLowerCase().includes(q)));
  }, [contacts, query]);

  const loadContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Cannot access contacts.');
        return;
      }
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers] });
      const list = data
        .filter(c => c.name && c.phoneNumbers?.length && c.id)
        .map(c => ({ id: c.id!, name: c.name || 'Unknown', phoneNumbers: (c.phoneNumbers || []).map(p => p.number!).filter(Boolean), selected: false }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setContacts(list);
      setFiltered(list);
    } catch (e) {
      Alert.alert('Error', 'Failed to load contacts');
    }
  };

  const toggle = (id: string) => {
    setContacts(prev => prev.map(c => (c.id === id ? { ...c, selected: !c.selected } : c)));
  };

  const normalize = (raw?: string) => {
    if (!raw) return '';
    const norm = normalizePhoneNumber(raw, getDefaultRegion());
    return norm.e164 || '';
  };

  const onSave = async () => {
    try {
      setSaving(true);
      const selected = contacts.filter(c => c.selected);
      if (!selected.length) {
        Alert.alert('Select at least one contact');
        return;
      }
      for (const c of selected) {
        const phone = normalize(c.phoneNumbers?.[0]);
        if (phone) {
          await FirebaseGroupService.inviteMemberByPhone(String(groupId), phone);
          await FirebaseGroupService.upsertDisplayMember(String(groupId), {
            id: c.id,
            name: c.name,
            phoneNumber: phone,
          });
        }
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to add members');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity onPress={() => toggle(item.id)} className={`p-4 border-b border-gray-700 flex-row items-center ${item.selected ? 'bg-blue-900' : 'bg-gray-800'}`}>
      <View className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${item.selected ? 'bg-blue-600 border-blue-600' : 'border-gray-500'}`}> 
      </View>
      <View className="flex-1">
        <Text className="text-white text-lg font-semibold">{item.name}</Text>
        <Text className="text-gray-400 text-sm">{item.phoneNumbers?.[0] || 'No phone'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-900">
      <Stack.Screen options={{ title: groupName ? String(groupName) : 'Add members' }} />
      <View className="p-4 border-b border-gray-700">
        <TextInput
          className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
          placeholder="Search contacts..."
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <FlatList data={filtered} renderItem={renderItem} keyExtractor={i => i.id} />
      <View className="p-4 border-t border-gray-700">
        <TouchableOpacity className={`p-4 rounded-lg ${saving ? 'bg-gray-600' : 'bg-blue-600'}`} onPress={onSave} disabled={saving}>
          <Text className="text-white text-center font-bold text-lg">{saving ? 'Saving...' : 'Add members'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


