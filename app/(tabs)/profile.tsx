import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { get, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { auth, database } from '@/config/firebase';
import { CustomAuthService } from '@/services/customAuthService';
import { FirebaseGroupService } from '@/services/firebaseGroupService';
import { NotificationService } from '@/services/notificationService';
import {
  getSuperRegion,
  resolveSummonerId,
  type SpecificRegion,
} from '@/services/riotService';

export default function ProfileScreen() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [debugOutput, setDebugOutput] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [riotIdInput, setRiotIdInput] = useState('');
  const [riotRegionInput, setRiotRegionInput] =
    useState<SpecificRegion>('EUN1');
  const [regionPickerVisible, setRegionPickerVisible] = useState(false);
  const regions: SpecificRegion[] = [
    'BR1',
    'EUN1',
    'EUW1',
    'JP1',
    'KR',
    'LA1',
    'LA2',
    'NA1',
    'OC1',
    'TR1',
    'RU',
    'PH2',
    'SG2',
    'TH2',
    'TW2',
    'VN2',
  ];

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = ref(database, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val() as {
          displayName?: string;
          phoneNumber?: string;
          riotGameName?: string;
          riotTagLine?: string;
          riotRegion?: SpecificRegion;
        };
        setDisplayName(val.displayName || null);
        setPhoneNumber(val.phoneNumber || null);
        if (!editing) setNameInput(val.displayName || '');
        const riot = [val.riotGameName, val.riotTagLine]
          .filter(Boolean)
          .join('#');
        setRiotIdInput(riot || '');
        if (val.riotRegion)
          setRiotRegionInput(val.riotRegion as SpecificRegion);
      }
    });

    return () => unsubscribe();
  }, [editing]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await CustomAuthService.signOut();
          } finally {
            router.replace('/auth/phone');
          }
        },
      },
    ]);
  };

  const isOwner = phoneNumber === '+972502525177';
  const isTestAccount = phoneNumber === '+15551234567';

  const startEdit = () => {
    setNameInput(displayName || '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setNameInput(displayName || '');
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert('Invalid name', 'Name cannot be empty');
      return;
    }
    try {
      setSaving(true);
      await FirebaseGroupService.updateCurrentUserDisplayName(trimmed);
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Failed to save', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveRiotProfile = async () => {
    const id = (riotIdInput || '').trim();
    const idx = id.indexOf('#');
    if (idx <= 0 || idx === id.length - 1) {
      Alert.alert('Invalid Riot ID', 'Use format gameName#tagLine');
      return;
    }
    try {
      setSaving(true);
      const { puuid, summonerId } = await resolveSummonerId(
        id,
        riotRegionInput,
      );
      const gameName = id.slice(0, idx);
      const tagLine = id.slice(idx + 1);
      const riotSuperRegion = getSuperRegion(riotRegionInput);
      await FirebaseGroupService.updateCurrentUserRiotFields({
        riotGameName: gameName,
        riotTagLine: tagLine,
        riotRegion: riotRegionInput,
        riotSuperRegion,
        riotPuuid: puuid,
        riotSummonerId: summonerId,
      });
      Alert.alert('Saved', 'Riot profile verified and saved');
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not verify Riot ID');
    } finally {
      setSaving(false);
    }
  };

  // Owner-only test: create and delete a temp group with current auth
  const runCreateDeleteGroupTest = async () => {
    try {
      setDebugOutput('Starting create/delete group test...');
      const group = await FirebaseGroupService.createGroup(
        'Temp Delete Test',
        [],
      );
      setDebugOutput(`Created group ${group.id}, deleting...`);
      await FirebaseGroupService.deleteGroup(group.id);
      setDebugOutput(`Success: Group ${group.id} deleted and indexes cleaned.`);
      Alert.alert('Success', 'Create/Delete group test passed.');
    } catch (e: any) {
      const msg = e?.message || String(e);
      setDebugOutput(`Create/Delete test failed: ${msg}`);
      Alert.alert('Error', msg);
    }
  };

  const runMembershipDiagnostics = async () => {
    try {
      setDebugOutput('Running diagnostics...');
      const me = auth.currentUser?.uid || '';
      // Read user's index first to avoid permission errors on groups root
      const idxSnap = await get(ref(database, `userGroups/${me}`));
      if (!idxSnap.exists()) {
        setDebugOutput(
          'No userGroups index for current user. Create a group or wait for indexer.',
        );
        return;
      }
      const groupIds: string[] = Object.keys(idxSnap.val() || {});
      const lines: string[] = [];
      
      // Use Promise.all to fetch all groups in parallel instead of sequentially
      const groupPromises = groupIds.map(async (gid) => {
        const groupSnap = await get(ref(database, `groups/${gid}`));
        if (!groupSnap.exists()) return null;
        const group = groupSnap.val();
        const membersByUid = group.membersByUid
          ? Object.keys(group.membersByUid)
          : [];
        const hasMe = me ? membersByUid.includes(me) : false;
        const hasIndex = true; // we already read from userGroups/{me}
        return `${gid} • member=${hasMe} • userGroupsIndex=${hasIndex}`;
      });
      
      const results = await Promise.all(groupPromises);
      const validResults = results.filter(Boolean) as string[];
      lines.push(...validResults);
      setDebugOutput(lines.join('\n'));
    } catch (e: any) {
      setDebugOutput(`Error: ${e?.message || e}`);
    }
  };

  const sendTestNotification = async () => {
    try {
      const phone = phoneNumber || '';
      if (phone !== '+15551234567') {
        Alert.alert('Unavailable', 'This action is available only for the test account');
        return;
      }
      // Ensure we have a fresh Expo push token saved for this user
      const token = await NotificationService.registerPushTokenAsync();
      if (!token) {
        Alert.alert(
          'Notifications disabled',
          'We could not register a push token. Please enable notifications in system settings and try again.',
        );
        return;
      }
      const message = await CustomAuthService.sendTestNotification(
        phone,
        '123456',
      );
      Alert.alert('Success', message || 'Test notification sent');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send test notification');
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-900"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-6 rounded-lg bg-gray-800 p-6">
        <View className="mb-2 items-center">
          <Text className="text-xl font-bold text-white">
            {displayName || phoneNumber || '—'}
          </Text>
          <Text className="mt-1 text-gray-400">{phoneNumber || '—'}</Text>
        </View>
        {!editing ? (
          <TouchableOpacity
            className="mt-3 self-center rounded bg-blue-600 px-4 py-2"
            onPress={startEdit}
          >
            <Text className="font-semibold text-white">Edit name</Text>
          </TouchableOpacity>
        ) : (
          <View className="mt-4">
            <Text className="mb-2 text-gray-300">Display name</Text>
            <TextInput
              className="rounded border border-gray-700 bg-gray-900 p-3 text-white"
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
              value={nameInput}
              onChangeText={setNameInput}
              editable={!saving}
            />
            <View className="mt-3 flex-row">
              <TouchableOpacity
                className="mr-3 rounded bg-gray-700 px-4 py-2"
                onPress={cancelEdit}
                disabled={saving}
              >
                <Text className="text-white">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center rounded bg-green-600 px-4 py-2"
                onPress={saveName}
                disabled={saving}
              >
                {saving && (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                    className="mr-2"
                  />
                )}
                <Text className="font-semibold text-white">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View className="mb-6 rounded-lg bg-gray-800 p-4">
        <Text className="mb-4 text-lg font-bold text-white">Riot settings</Text>
        <Text className="mb-2 text-gray-300">Riot ID (gameName#tagLine)</Text>
        <TextInput
          className="mb-3 rounded border border-gray-700 bg-gray-900 p-3 text-white"
          placeholder="e.g., Faker#KR1"
          placeholderTextColor="#9CA3AF"
          value={riotIdInput}
          onChangeText={setRiotIdInput}
          editable={!saving}
        />
        <Text className="mb-2 text-gray-300">Region</Text>
        <TouchableOpacity
          className="mb-3 rounded border border-gray-700 bg-gray-900 p-3"
          onPress={() => setRegionPickerVisible(true)}
          disabled={saving}
        >
          <Text className="text-white">{riotRegionInput}</Text>
        </TouchableOpacity>
        <Modal
          visible={regionPickerVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setRegionPickerVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="rounded-t-xl bg-gray-800 p-4">
              <Text className="mb-3 text-lg font-bold text-white">
                Select Region
              </Text>
              <ScrollView className="mb-3" style={{ maxHeight: '60%' }}>
                {regions.map((r) => (
                  <TouchableOpacity
                    key={r}
                    className={`mb-2 flex-row items-center justify-between rounded p-3 ${riotRegionInput === r ? 'bg-blue-600' : 'bg-gray-700'}`}
                    onPress={() => {
                      setRiotRegionInput(r);
                      setRegionPickerVisible(false);
                    }}
                  >
                    <Text className="text-base text-white">{r}</Text>
                    {riotRegionInput === r && (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                className="rounded bg-gray-700 px-4 py-3"
                onPress={() => setRegionPickerVisible(false)}
              >
                <Text className="text-center font-semibold text-white">
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <TouchableOpacity
          className={`rounded px-4 py-2 ${saving ? 'bg-gray-600' : 'bg-green-600'}`}
          onPress={saveRiotProfile}
          disabled={saving}
        >
          <Text className="font-semibold text-white">Save Riot Profile</Text>
        </TouchableOpacity>
      </View>

      <View className="mb-6 rounded-lg bg-gray-800 p-4">
        <Text className="mb-4 text-lg font-bold text-white">App settings</Text>
        <TouchableOpacity className="flex-row items-center border-b border-gray-700 py-3">
          <Ionicons name="notifications-outline" size={20} color="#9CA3AF" />
          <Text className="ml-3 flex-1 text-white">Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center border-b border-gray-700 py-3">
          <Ionicons name="people-outline" size={20} color="#9CA3AF" />
          <Text className="ml-3 flex-1 text-white">Contacts</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center py-3">
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#9CA3AF"
          />
          <Text className="ml-3 flex-1 text-white">About</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {isTestAccount && (
        <View className="mb-6 rounded-lg bg-gray-800 p-4">
          <Text className="mb-3 text-lg font-bold text-white">
            Test notification
          </Text>
          <TouchableOpacity
            className="rounded bg-blue-600 p-3"
            onPress={sendTestNotification}
          >
            <Text className="text-center font-semibold text-white">
              Send Test Notification
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isOwner && (
        <View className="mb-6 rounded-lg bg-gray-800 p-4">
          <Text className="mb-3 text-lg font-bold text-white">
            Test scripts
          </Text>
          <TouchableOpacity
            className="mb-3 rounded bg-blue-600 p-3"
            onPress={runMembershipDiagnostics}
          >
            <Text className="text-center font-semibold text-white">
              Membership index diagnostics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="mb-3 rounded bg-gray-700 p-3"
            onPress={runCreateDeleteGroupTest}
          >
            <Text className="text-center font-semibold text-white">
              Create & delete temp group
            </Text>
          </TouchableOpacity>
          {!!debugOutput && (
            <View className="rounded bg-gray-900 p-3">
              <Text className="text-xs text-gray-300" selectable>
                {debugOutput}
              </Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        className="flex-row items-center justify-center rounded-lg bg-red-600 p-4"
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color="white" />
        <Text className="ml-2 font-bold text-white">Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
