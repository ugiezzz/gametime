import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Modal, Pressable, ScrollView } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// import { NotificationService } from '@/services/notificationService';
import { FirebaseGroupService, Group } from '@/services/firebaseGroupService';
import type { Ping } from '@/services/firebaseGroupService';
import { auth, database } from '@/config/firebase';
import { ref, get } from 'firebase/database';
import { FirebaseAuthService } from '@/services/firebaseAuthService';

// Response type removed (to be reintroduced when wiring responses)

// Responses will be populated when real data is available

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams();
  const [group, setGroup] = useState<Group | null>(null);
  // current game removed
  const [pings, setPings] = useState<Ping[]>([]);
  // responses removed until wired to backend
  const [loading, setLoading] = useState(true);
  const [memberUids, setMemberUids] = useState<string[]>([]);
  const [uidToName, setUidToName] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!FirebaseAuthService.isAuthenticated()) {
      Alert.alert('Error', 'Please sign in to view groups');
      router.replace('/auth/phone');
      return;
    }

    loadGroup();
    subscribeToGroup();
    const unsub = FirebaseGroupService.subscribeToActivePings(id as string, setPings);
    return () => { unsub && unsub(); };
  }, [id]);

  const loadGroup = async () => {
    try {
      const foundGroup = await FirebaseGroupService.getGroup(id as string);
      if (foundGroup) {
        setGroup(foundGroup);
        // current game removed
      } else {
        Alert.alert('Error', 'Group not found');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load group');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const subscribeToGroup = () => {
    if (!id) return;

    const unsubscribe = FirebaseGroupService.subscribeToGroup(id as string, (updatedGroup) => {
      if (updatedGroup) {
        setGroup(updatedGroup);
        // current game removed
      }
    });

    return unsubscribe;
  };

  // Derive member UIDs from group and resolve names from users/{uid}
  useEffect(() => {
    const resolveNames = async () => {
      if (!group) return;
      const uids: string[] = group.membersByUid
        ? Object.keys(group.membersByUid)
        : Array.isArray((group as any).members)
        ? ((group as any).members as Array<{ id: string }>).map((m) => m.id)
        : [];
      setMemberUids(uids);

      const entries = await Promise.all(
        uids.map(async (uid) => {
          try {
            const snap = await get(ref(database, `users/${uid}`));
            const name = snap.exists() && snap.val()?.displayName ? String(snap.val().displayName) : 'Member';
            return [uid, name] as [string, string];
          } catch {
            return [uid, 'Member'] as [string, string];
          }
        })
      );
      const map: Record<string, string> = Object.fromEntries(entries);
      const viewerUid = auth.currentUser?.uid;
      if (viewerUid && !map[viewerUid]) map[viewerUid] = 'You';
      if (group.createdBy && !map[group.createdBy]) map[group.createdBy] = 'Creator';
      setUidToName(map);
    };
    resolveNames();
  }, [group]);

  const handlePing = async (scheduledAtMs?: number) => {
    if (!group) return;

    try {
      await FirebaseGroupService.createPing(group.id, scheduledAtMs);
      await FirebaseGroupService.updateGroupLastPing(group.id, '');
    } catch (error) {
      Alert.alert('Error', 'Failed to send ping notification');
    }
  };

  // formatTimestamp removed

  // renderResponseItem removed

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <Text className="text-white text-lg">Loading group...</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <Text className="text-white text-lg">Group not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      <Stack.Screen
        options={{
          headerTitle: () => (group ? <HeaderTitle group={group} memberUids={memberUids} uidToName={uidToName} /> : null),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
              <Ionicons name="chevron-back" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          ),
          headerRight: () => (group ? <MenuButton groupId={group.id} group={group} memberUids={memberUids} uidToName={uidToName} /> : null),
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#E5E7EB',
        }}
      />
      <PingCardComponentDefs />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Ping Button */}
        <View className="p-6">
          <SchedulePing onSend={async (scheduledAtMs) => {
            await handlePing(scheduledAtMs);
          }} />
        </View>

        {/* Active Pings */}
        <View className="px-6 mb-4">
          {pings.length > 0 && (
            <>
              <Text className="text-white text-lg font-semibold mb-2">Active Pings</Text>
                  {pings.map((ping) => (
                <PingCard key={ping.id} ping={ping} group={group} groupId={group.id} memberUids={memberUids} uidToName={uidToName} />
              ))}
            </>
          )}
        </View>

        {/* Empty state */}
        {pings.length === 0 && (
          <View className="px-6 py-12 items-center">
            <Ionicons name="chatbubble-outline" size={64} color="#9CA3AF" />
            <Text className="text-gray-400 text-lg mt-4">No active pings</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal removed as requested */}
    </SafeAreaView>
  );
} 

// Inline component defs (kept here for minimal diff)
function PingCardComponentDefs() {
  return <></>;
}

function formatAbsoluteTime(dateMs: number): string {
  const date = new Date(dateMs);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function PingCard({ ping, group, groupId, memberUids, uidToName }: { ping: any; group: Group; groupId: string; memberUids: string[]; uidToName: Record<string, string> }) {
  const createdAt = ping.createdAtMs as number;
  // Use scheduled time if present; else fall back to createdAt
  const baseTimeMs: number = typeof ping.scheduledAtMs === 'number' ? (ping.scheduledAtMs as number) : createdAt;
  // Options: 0, 5, 15 minutes from scheduled time
  const minuteOptions: number[] = [0, 5, 15];
  const now = Date.now();
  const startsInMin = Math.max(0, Math.ceil((baseTimeMs - now) / 60000));
  const timeLeftMin = Math.max(0, Math.ceil((ping.expiresAtMs - now) / 60000));

  const responses = ping.responses || {};
  // Build buckets: absoluteTime -> [memberNames]; handle next round, declined, and pending separately
  const buckets = new Map<string, string[]>();
  const nextRound: string[] = [];
  const declined: string[] = [];
  const pending: string[] = [];
  const nameMap = new Map<string, string>();
  for (const uid of memberUids) nameMap.set(uid, uidToName[uid] || 'Member');
  const viewerUid = auth.currentUser?.uid;
  if (viewerUid && !nameMap.has(viewerUid)) nameMap.set(viewerUid, 'You');
  if (group.createdBy && !nameMap.has(group.createdBy)) nameMap.set(group.createdBy, 'Creator');

  const allUids = new Set<string>([...Object.keys(responses), ...memberUids]);
  const selectedTargets: number[] = [];
  for (const uid of allUids) {
    const name = nameMap.get(uid) || 'Member';
    const r = responses[uid];
    if (!r) { pending.push(name); continue; }
    if (r.status === 'declined') { declined.push(name); continue; }
    if (r.status === 'pending') { pending.push(name); continue; }
    if (r.status === 'eta' && (r.etaMinutes === null || r.etaMinutes === undefined)) { nextRound.push(name); continue; }
    if (r.status === 'eta' && typeof r.etaMinutes === 'number') {
      const targetMs = baseTimeMs + Math.max(0, r.etaMinutes) * 60000;
      const label = formatAbsoluteTime(targetMs);
      const arr = buckets.get(label) || [];
      arr.push(name);
      buckets.set(label, arr);
      selectedTargets.push(targetMs);
    }
  }
  // Sort times ascending
  const sorted = Array.from(buckets.entries()).sort((a, b) => new Date(`1970-01-01T${a[0]}`).getTime() - new Date(`1970-01-01T${b[0]}`).getTime());

  const meSelected = viewerUid ? !!responses[viewerUid] : false;
  // const selectedCount = selectedTargets.length;
  const earliestSelectedMs = selectedTargets.length > 0 ? Math.min(...selectedTargets) : baseTimeMs;
  const earliestSelectedLabel = formatAbsoluteTime(earliestSelectedMs);
  const earliestNames = (() => {
    const lbl = formatAbsoluteTime(earliestSelectedMs);
    const arr = buckets.get(lbl) || [];
    return arr;
  })();
  const selectionTitle = meSelected || viewerUid === ping.createdBy ? 'Change start time' : 'Will you join?';

  return (
    <View className="bg-gray-800 p-4 rounded-lg mb-3">
      <View className="flex-row justify-between">
        <View className="flex-1" />
        {now < baseTimeMs ? (
          <Text className="text-gray-400 text-xs">{startsInMin}m until start</Text>
        ) : (
          <Text className="text-gray-400 text-xs">{timeLeftMin}m left</Text>
        )}
      </View>
      <Text className="text-white text-xl font-extrabold mt-2" numberOfLines={2}>
        {earliestNames.length > 0 ? `${earliestNames.join(', ')} start playing at ${earliestSelectedLabel}` : `Start playing at ${earliestSelectedLabel}`}
      </Text>

      {/* Gathering time */}
      <View className="mb-3">
      {sorted.length > 0 && (
        <View className="mt-3 mb-2">
          {sorted.map(([timeLabel, names]: [string, string[]]) => (
            <View key={timeLabel} className="flex-row items-center mb-1">
              <Text className="text-white text-base font-semibold mr-2">{timeLabel}</Text>
              <Text className="text-gray-300 text-sm">{names.join(', ')}</Text>
            </View>
          ))}
        </View>
      )}
        {nextRound.length > 0 && (
          <View className="flex-row items-center mb-1">
            <Text className="text-purple-400 text-sm font-semibold mr-2">Next round</Text>
            <Text className="text-gray-300 text-sm">{nextRound.join(', ')}</Text>
          </View>
        )}
        {pending.length > 0 && (
          <View className="flex-row items-center mb-1">
            <Text className="text-yellow-400 text-sm font-semibold mr-2">Pending</Text>
            <Text className="text-gray-300 text-sm">{pending.join(', ')}</Text>
          </View>
        )}
        {declined.length > 0 && (
          <View className="flex-row items-center mb-1">
            <Text className="text-gray-400 text-sm font-semibold mr-2">Not today</Text>
            <Text className="text-gray-300 text-sm">{declined.join(', ')}</Text>
          </View>
        )}
        {sorted.length === 0 && nextRound.length === 0 && pending.length === 0 && declined.length === 0 && (
          <Text className="text-gray-400">No responses yet</Text>
        )}
      </View>

      {/* Will you join / Change selection */}
      <Text className="text-gray-100 font-semibold mb-3 text-left">{selectionTitle}</Text>
      <View className="flex-row mb-3">
        {minuteOptions.map((m) => (
          <EtaButton key={m} minutes={m} label={formatAbsoluteTime(baseTimeMs + m * 60000)} pingId={ping.id} groupId={groupId} />
        ))}
      </View>
      <View className="flex-row">
        <TextButton label="Next round" onPress={async () => { await FirebaseGroupService.respondNextRound(groupId, ping.id); }} />
        <TextButton label="Not today" onPress={async () => { await FirebaseGroupService.respondNotToday(groupId, ping.id); }} />
      </View>
    </View>
  );
}

function EtaButton({ minutes, label, pingId, groupId }: { minutes: number; label: string; pingId: string; groupId: string }) {
  const onPress = async () => {
    try {
      await FirebaseGroupService.respondToPing(groupId, pingId, minutes);
    } catch {
      // no-op
    }
  };
  return (
    <TouchableOpacity
      className="bg-blue-600 px-3 py-3 rounded flex-1 items-center active:opacity-80 mx-1"
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text className="text-white text-sm font-semibold">{label}</Text>
    </TouchableOpacity>
  );
}

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      className="bg-gray-700 px-3 py-3 rounded flex-1 items-center active:opacity-80 mx-1"
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text className="text-white text-sm font-semibold">{label}</Text>
    </TouchableOpacity>
  );
}

function HeaderTitle({ group, memberUids, uidToName }: { group: Group; memberUids: string[]; uidToName: Record<string, string> }) {
  return (
    <View>
      <Text className="text-white text-base font-semibold" numberOfLines={1}>
        {group.name}
      </Text>
      <Text className="text-gray-400 text-xs" numberOfLines={1} ellipsizeMode="tail">
        {memberUids.map((uid) => uidToName[uid] || 'Member').join(', ')}
      </Text>
    </View>
  );
}

// Scheduling widget for PING
function SchedulePing({ onSend }: { onSend: (scheduledAtMs?: number) => Promise<void> }) {
  const now = new Date();
  const roundUp10 = (d: Date) => {
    const m = d.getMinutes();
    const add = (10 - (m % 10)) % 10;
    const copy = new Date(d);
    copy.setMinutes(m + add, 0, 0);
    return copy;
  };
  const [time, setTime] = React.useState<Date>(roundUp10(now));

  const incHour = () => setTime((t) => new Date(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours() + 1, t.getMinutes(), 0, 0));
  const decHour = () => setTime((t) => new Date(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours() - 1, t.getMinutes(), 0, 0));
  const incMin = () => setTime((t) => new Date(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), t.getMinutes() + 10, 0, 0));
  const decMin = () => setTime((t) => new Date(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), t.getMinutes() - 10, 0, 0));

  // label kept for possible future preview text
  const send = () => onSend(time.getTime());

  return (
    <View className="bg-blue-600 rounded-lg p-4">
      <View className="flex-row items-center justify-between">
        {/* Left block: Icon/Title and Send button */}
        <View className="flex-1 items-center justify-center pr-4">
          <View className="flex-row items-center mb-3 justify-center">
            <Ionicons name="game-controller" size={32} color="white" />
            <Text className="text-white text-xl font-bold ml-2">PING</Text>
          </View>
          <TouchableOpacity className="bg-white rounded py-3 items-center px-6" onPress={send}>
            <Text className="text-blue-700 font-semibold">Send</Text>
          </TouchableOpacity>
        </View>

        {/* Right block: time pickers */}
        <View className="flex-row items-center">
          <View className="items-center mx-4">
            <TouchableOpacity onPress={incHour} className="bg-blue-700 w-9 h-9 rounded-lg items-center justify-center mb-2 active:opacity-80">
              <Ionicons name="chevron-up" size={18} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-semibold my-1">{String(time.getHours()).padStart(2, '0')}</Text>
            <TouchableOpacity onPress={decHour} className="bg-blue-700 w-9 h-9 rounded-lg items-center justify-center mt-2 active:opacity-80">
              <Ionicons name="chevron-down" size={18} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-white text-2xl font-bold">:</Text>
          <View className="items-center mx-4">
            <TouchableOpacity onPress={incMin} className="bg-blue-700 w-9 h-9 rounded-lg items-center justify-center mb-2 active:opacity-80">
              <Ionicons name="chevron-up" size={18} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-semibold my-1">{String(time.getMinutes()).padStart(2, '0')}</Text>
            <TouchableOpacity onPress={decMin} className="bg-blue-700 w-9 h-9 rounded-lg items-center justify-center mt-2 active:opacity-80">
              <Ionicons name="chevron-down" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function MenuButton({ groupId, group, memberUids, uidToName }: { groupId: string; group: Group; memberUids: string[]; uidToName: Record<string, string> }) {
  const [open, setOpen] = React.useState(false);
  const isCreator = (uid?: string) => uid && uid === group.createdBy;
  const currentUserId = auth.currentUser?.uid;
  const canManage = isCreator(currentUserId);

  const handleExit = async () => {
    try {
      await FirebaseGroupService.exitGroup(groupId);
      router.back();
    } catch {
      // ignore
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await FirebaseGroupService.removeMember(groupId, userId);
    } catch {
      // ignore
    }
  };

  const handleAddMember = () => {
    setOpen(false);
    router.push({ pathname: `/group/${groupId}/add-members`, params: { groupName: group.name } });
  };

  return (
    <View>
      <TouchableOpacity onPress={() => setOpen((v) => !v)}>
        <Ionicons name="ellipsis-vertical" size={22} color="#9CA3AF" />
      </TouchableOpacity>
      {open && (
        <Modal transparent animationType="fade" visible onRequestClose={() => setOpen(false)}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <View className="mt-10 mr-2 bg-gray-800 rounded-lg p-2 w-48 border border-gray-700">
                <>
                  <TouchableOpacity className="py-2" onPress={handleAddMember}>
                    <Text className="text-white text-sm">Add members</Text>
                  </TouchableOpacity>
                  {canManage && (
                    <>
                      <View className="h-[1px] bg-gray-700 my-1" />
                      {memberUids.map((uid) => (
                        <TouchableOpacity key={uid} className="py-2" onPress={() => handleRemoveMember(uid)}>
                          <Text className="text-white text-sm">Remove {uidToName[uid] || 'Member'}</Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                  <View className="h-[1px] bg-gray-700 my-1" />
                  <TouchableOpacity className="py-2" onPress={handleExit}>
                    <Text className="text-red-400 text-sm">Exit group</Text>
                  </TouchableOpacity>
                </>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}