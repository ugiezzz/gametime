import * as Contacts from 'expo-contacts';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { FirebaseGroupService } from '@/services/firebaseGroupService';
import { getDefaultRegion, normalizePhoneNumber } from '@/services/phoneUtil';

type Contact = {
  id: string;
  name: string;
  phoneNumbers?: string[];
  selected?: boolean;
};

export default function AddMembersScreen() {
  const { id: groupId, groupName } = useLocalSearchParams<{
    id: string;
    groupName?: string;
  }>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filtered, setFiltered] = useState<Contact[]>([]);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    const q = query.toLowerCase();
    setFiltered(contacts.filter((c) => c.name.toLowerCase().includes(q)));
  }, [contacts, query]);

  const loadContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Cannot access contacts.');
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });
      const list = data
        .filter((c) => c.name && c.phoneNumbers?.length && c.id)
        .map((c) => ({
          id: c.id!,
          name: c.name || 'Unknown',
          phoneNumbers: (c.phoneNumbers || [])
            .map((p) => p.number!)
            .filter(Boolean),
          selected: false,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setContacts(list);
      setFiltered(list);
    } catch (e) {
      Alert.alert('Error', 'Failed to load contacts');
    }
  };

  const toggle = (id: string) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)),
    );
  };

  const normalize = (raw?: string) => {
    if (!raw) return '';
    const norm = normalizePhoneNumber(raw, getDefaultRegion());
    return norm.e164 || '';
  };

  const onSave = async () => {
    try {
      setSaving(true);
      const selected = contacts.filter((c) => c.selected);
      if (!selected.length) {
        Alert.alert('Select at least one contact');
        return;
      }
      for (const c of selected) {
        const phone = normalize(c.phoneNumbers?.[0]);
        if (phone) {
          await FirebaseGroupService.inviteMemberByPhone(
            String(groupId),
            phone,
          );
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
    <TouchableOpacity
      onPress={() => toggle(item.id)}
      className={`flex-row items-center border-b border-gray-700 p-4 ${item.selected ? 'bg-blue-900' : 'bg-gray-800'}`}
    >
      <View
        className={`mr-3 size-6 items-center justify-center rounded-full border-2 ${item.selected ? 'border-blue-600 bg-blue-600' : 'border-gray-500'}`}
      />
      <View className="flex-1">
        <Text className="text-lg font-semibold text-white">{item.name}</Text>
        <Text className="text-sm text-gray-400">
          {item.phoneNumbers?.[0] || 'No phone'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-900">
      <Stack.Screen
        options={{
          title: formatTitle(groupName ? String(groupName) : 'Add members'),
        }}
      />
      <View className="border-b border-gray-700 p-4">
        <TextInput
          className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
          placeholder="Search contacts..."
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(i) => i.id}
      />
      <View className="border-t border-gray-700 p-4">
        <TouchableOpacity
          className={`rounded-lg p-4 ${saving ? 'bg-gray-600' : 'bg-blue-600'}`}
          onPress={onSave}
          disabled={saving}
        >
          <Text className="text-center text-lg font-bold text-white">
            {saving ? 'Saving...' : 'Add members'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatTitle(input?: string) {
  const s = (input || '').replace(/-/g, ' ').trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
