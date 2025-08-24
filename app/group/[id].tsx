import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { get, ref } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Clipboard,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth, database, generateInviteLink } from '@/config/firebase';
import { CustomAuthService } from '@/services/customAuthService';
import type { Group, Ping } from '@/services/firebaseGroupService';
// import { NotificationService } from '@/services/notificationService';
import { FirebaseGroupService } from '@/services/firebaseGroupService';
import { getActiveGameStatus } from '@/services/riotService';

// Response type removed (to be reintroduced when wiring responses)

// Responses will be populated when real data is available

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams();
  const [group, setGroup] = useState<Group | null>(null);
  // current game removed
  const [pings, setPings] = useState<Ping[]>([]);
  // responses removed until wired to backend
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!CustomAuthService.isAuthenticated()) {
      Alert.alert('Error', 'Please sign in to view groups');
      router.replace('/auth/phone');
      return;
    }

    loadGroup();
    subscribeToGroup();
    const unsub = FirebaseGroupService.subscribeToActivePings(
      id as string,
      setPings,
    );
    return () => {
      unsub && unsub();
    };
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

    const unsubscribe = FirebaseGroupService.subscribeToGroup(
      id as string,
      (updatedGroup) => {
        if (updatedGroup) {
          setGroup(updatedGroup);
          // current game removed
        }
      },
    );

    return unsubscribe;
  };

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
      <View className="flex-1 items-center justify-center bg-gray-900">
        <Text className="text-lg text-white">Loading group...</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <Text className="text-lg text-white">Group not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      <Stack.Screen
        options={{
          headerTitle: () => (group ? <HeaderTitle group={group} /> : null),
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Ionicons name="chevron-back" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          ),
          headerRight: () =>
            group ? <MenuButton groupId={group.id} group={group} /> : null,
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#E5E7EB',
        }}
      />
      <PingCardComponentDefs />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Ping Button */}
        <View className="p-6">
          <SchedulePing
            onSend={async (scheduledAtMs) => {
              await handlePing(scheduledAtMs);
            }}
          />
        </View>

        {/* Active Pings */}
        <View className="mb-4 px-6">
          {pings.length > 0 && (
            <>
              <Text className="mb-2 text-lg font-semibold text-white">
                Active Pings
              </Text>
              {pings.map((ping) => (
                <PingCard
                  key={ping.id}
                  ping={ping}
                  group={group}
                  groupId={group.id}
                />
              ))}
            </>
          )}
        </View>

        {/* Empty state */}
        {pings.length === 0 && (
          <View className="items-center px-6 py-12">
            <Ionicons name="chatbubble-outline" size={64} color="#9CA3AF" />
            <Text className="mt-4 text-lg text-gray-400">No active pings</Text>
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

function PingCard({
  ping,
  group,
  groupId,
}: {
  ping: any;
  group: Group;
  groupId: string;
}) {
  const createdAt = ping.createdAtMs as number;
  // Use scheduled time if present; else fall back to createdAt
  const baseTimeMs: number =
    typeof ping.scheduledAtMs === 'number'
      ? (ping.scheduledAtMs as number)
      : createdAt;
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
  const uidToName = new Map<string, string>();
  
  // Populate names from deprecated members list if available
  for (const m of group.members ?? []) uidToName.set(m.id, m.name);
  
  const viewerUid = auth.currentUser?.uid;
  if (viewerUid && !uidToName.has(viewerUid)) uidToName.set(viewerUid, 'You');
  if (group.createdBy && !uidToName.has(group.createdBy))
    uidToName.set(group.createdBy, 'Creator');

  const memberUidsFromGroup =
    Array.isArray(group.members) && group.members.length > 0
      ? group.members.map((m) => m.id)
      : Object.keys(group.membersByUid || {});
  const allUids = new Set<string>([
    ...Object.keys(responses),
    ...memberUidsFromGroup,
  ]);
  
  // For users without names in the map, try to fetch from database or use fallback
  const [memberNames, setMemberNames] = React.useState<Map<string, string>>(uidToName);
  
  React.useEffect(() => {
    const loadMissingNames = async () => {
      const updatedNames = new Map(uidToName);
      let hasUpdates = false;
      
      for (const uid of allUids) {
        if (!updatedNames.has(uid)) {
          try {
            const snap = await get(ref(database, `users/${uid}/displayName`));
            if (snap.exists()) {
              const name = String(snap.val());
              if (name && name.trim().length > 0) {
                updatedNames.set(uid, name);
                hasUpdates = true;
              }
            }
          } catch {}
        }
      }
      
      if (hasUpdates) {
        setMemberNames(updatedNames);
      }
    };
    
    loadMissingNames();
  }, [ping.id, allUids.size]);

  const selectedTargets: number[] = [];
  for (const uid of allUids) {
    const name = memberNames.get(uid) || 'Unknown User';
    const r = responses[uid];
    if (!r) {
      pending.push(name);
      continue;
    }
    if (r.status === 'declined') {
      declined.push(name);
      continue;
    }
    if (r.status === 'pending') {
      pending.push(name);
      continue;
    }
    if (
      r.status === 'eta' &&
      (r.etaMinutes === null || r.etaMinutes === undefined)
    ) {
      nextRound.push(name);
      continue;
    }
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
  const sorted = Array.from(buckets.entries()).sort(
    (a, b) =>
      new Date(`1970-01-01T${a[0]}`).getTime() -
      new Date(`1970-01-01T${b[0]}`).getTime(),
  );

  const meSelected = viewerUid ? !!responses[viewerUid] : false;
  // const selectedCount = selectedTargets.length;
  const earliestSelectedMs =
    selectedTargets.length > 0 ? Math.min(...selectedTargets) : baseTimeMs;
  const earliestSelectedLabel = formatAbsoluteTime(earliestSelectedMs);
  const earliestNames = (() => {
    const lbl = formatAbsoluteTime(earliestSelectedMs);
    const arr = buckets.get(lbl) || [];
    return arr;
  })();
  const selectionTitle =
    meSelected || viewerUid === ping.createdBy
      ? 'Change start time'
      : 'Will you join?';

  return (
    <View className="mb-3 rounded-lg bg-gray-800 p-4">
      <View className="flex-row justify-between">
        <View className="flex-1" />
        {now < baseTimeMs ? (
          <Text className="text-xs text-gray-400">
            {startsInMin}m until start
          </Text>
        ) : (
          <Text className="text-xs text-gray-400">{timeLeftMin}m left</Text>
        )}
      </View>
      <Text
        className="mt-2 text-xl font-extrabold text-white"
        numberOfLines={2}
      >
        {earliestNames.length > 0
          ? `${earliestNames.join(', ')} start playing at ${earliestSelectedLabel}`
          : `Start playing at ${earliestSelectedLabel}`}
      </Text>

      {/* Gathering time */}
      <View className="mb-3">
        {sorted.length > 0 && (
          <View className="mb-2 mt-3">
            {sorted.map(([timeLabel, names]: [string, string[]]) => (
              <View key={timeLabel} className="mb-1 flex-row items-center">
                <Text className="mr-2 text-base font-semibold text-white">
                  {timeLabel}
                </Text>
                <Text className="text-sm text-gray-300">
                  {names.join(', ')}
                </Text>
              </View>
            ))}
          </View>
        )}
        {nextRound.length > 0 && (
          <View className="mb-1 flex-row items-center">
            <Text className="mr-2 text-sm font-semibold text-purple-400">
              Next round
            </Text>
            <Text className="text-sm text-gray-300">
              {nextRound.join(', ')}
            </Text>
          </View>
        )}
        {pending.length > 0 && (
          <View className="mb-1 flex-row items-center">
            <Text className="mr-2 text-sm font-semibold text-yellow-400">
              Pending
            </Text>
            <Text className="text-sm text-gray-300">{pending.join(', ')}</Text>
          </View>
        )}
        {declined.length > 0 && (
          <View className="mb-1 flex-row items-center">
            <Text className="mr-2 text-sm font-semibold text-gray-400">
              Not today
            </Text>
            <Text className="text-sm text-gray-300">{declined.join(', ')}</Text>
          </View>
        )}
        {sorted.length === 0 &&
          nextRound.length === 0 &&
          pending.length === 0 &&
          declined.length === 0 && (
            <Text className="text-gray-400">No responses yet</Text>
          )}
      </View>

      {/* Will you join / Change selection */}
      <Text className="mb-3 text-left font-semibold text-gray-100">
        {selectionTitle}
      </Text>
      <View className="mb-3 flex-row">
        {minuteOptions.map((m) => (
          <EtaButton
            key={m}
            minutes={m}
            label={formatAbsoluteTime(baseTimeMs + m * 60000)}
            pingId={ping.id}
            groupId={groupId}
          />
        ))}
      </View>
      <View className="flex-row">
        <TextButton
          label="Next round"
          onPress={async () => {
            await FirebaseGroupService.respondNextRound(groupId, ping.id);
          }}
        />
        <TextButton
          label="Not today"
          onPress={async () => {
            await FirebaseGroupService.respondNotToday(groupId, ping.id);
          }}
        />
      </View>
    </View>
  );
}

function EtaButton({
  minutes,
  label,
  pingId,
  groupId,
}: {
  minutes: number;
  label: string;
  pingId: string;
  groupId: string;
}) {
  const onPress = async () => {
    try {
      await FirebaseGroupService.respondToPing(groupId, pingId, minutes);
    } catch {
      // no-op
    }
  };
  return (
    <TouchableOpacity
      className="mx-1 flex-1 items-center rounded bg-blue-600 p-3 active:opacity-80"
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text className="text-sm font-semibold text-white">{label}</Text>
    </TouchableOpacity>
  );
}

function TextButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="mx-1 flex-1 items-center rounded bg-gray-700 p-3 active:opacity-80"
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text className="text-sm font-semibold text-white">{label}</Text>
    </TouchableOpacity>
  );
}

function HeaderTitle({ group }: { group: Group }) {
  const [members, setMembers] = React.useState<
    Array<{ uid: string; name: string }>
  >([]);
  const [statuses, setStatuses] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    const loadNames = async () => {
      // Prefer deprecated display list if present (older groups)
      const displayList = Array.isArray(group.members)
        ? group.members
            .map((m) => ({ uid: m.id, name: m.name }))
            .filter((m) => !!m.name)
        : [];
      if (displayList.length > 0) {
        if (!cancelled) setMembers(displayList);
        return;
      }

      const uids = group.membersByUid ? Object.keys(group.membersByUid) : [];
      if (uids.length === 0) {
        if (!cancelled) setMembers([]);
        return;
      }

      const currentUid = auth.currentUser?.uid;
      const resolved: Array<{ uid: string; name: string }> = [];
      for (const uid of uids) {
        if (uid === currentUid) {
          resolved.push({ uid, name: 'You' });
          continue;
        }
        try {
          const snap = await get(ref(database, `users/${uid}/displayName`));
          if (snap.exists()) {
            const name = String(snap.val());
            if (name && name.trim().length > 0) {
              resolved.push({ uid, name });
            }
          }
        } catch {}
      }
      if (!cancelled) setMembers(resolved);
    };

    loadNames();
    return () => {
      cancelled = true;
    };
  }, [group.members, group.membersByUid]);

  // Poll Riot statuses for LoL groups
  React.useEffect(() => {
    if (group.game !== 'League of Legends') {
      setStatuses({});
      return;
    }
    let cancelled = false;
    let interval: any;
    const poll = async () => {
      const uids = group.membersByUid ? Object.keys(group.membersByUid) : [];
      const next: Record<string, string> = {};
      for (const uid of uids) {
        try {
          const puuidSnap = await get(ref(database, `users/${uid}/riotPuuid`));
          const regionSnap = await get(
            ref(database, `users/${uid}/riotRegion`),
          );
          const puuid = puuidSnap.exists() ? String(puuidSnap.val()) : '';
          const region = regionSnap.exists() ? String(regionSnap.val()) : '';
          if (!puuid || !region) continue;
          try {
            const res = await getActiveGameStatus(puuid, region as any);
            if (res.inGame && typeof res.elapsedMinutes === 'number') {
              next[uid] = `In game - ${res.elapsedMinutes}m`;
            }
          } catch {}
        } catch {}
      }
      if (!cancelled) setStatuses(next);
    };
    poll();
    interval = setInterval(poll, 30000);
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [group.game, group.membersByUid]);

  const fallbackCount = (group.members?.length ??
    (group.membersByUid
      ? Object.keys(group.membersByUid).length
      : 0)) as number;

  return (
    <View>
      <Text className="text-base font-semibold text-white" numberOfLines={1}>
        {group.name}
      </Text>
      <Text
        className="text-xs text-gray-400"
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {members.length > 0
          ? members
              .map(({ uid, name }) =>
                statuses[uid] ? `${name} (${statuses[uid]})` : name,
              )
              .join(', ')
          : `${fallbackCount} member${fallbackCount === 1 ? '' : 's'}`}
      </Text>
    </View>
  );
}

// Scheduling widget for PING
function SchedulePing({
  onSend,
}: {
  onSend: (scheduledAtMs?: number) => Promise<void>;
}) {
  const now = new Date();
  const roundUp10 = (d: Date) => {
    const m = d.getMinutes();
    const add = (10 - (m % 10)) % 10;
    const copy = new Date(d);
    copy.setMinutes(m + add, 0, 0);
    return copy;
  };
  const [time, setTime] = React.useState<Date>(roundUp10(now));

  const incHour = () =>
    setTime(
      (t) =>
        new Date(
          t.getFullYear(),
          t.getMonth(),
          t.getDate(),
          t.getHours() + 1,
          t.getMinutes(),
          0,
          0,
        ),
    );
  const decHour = () =>
    setTime(
      (t) =>
        new Date(
          t.getFullYear(),
          t.getMonth(),
          t.getDate(),
          t.getHours() - 1,
          t.getMinutes(),
          0,
          0,
        ),
    );
  const incMin = () =>
    setTime(
      (t) =>
        new Date(
          t.getFullYear(),
          t.getMonth(),
          t.getDate(),
          t.getHours(),
          t.getMinutes() + 10,
          0,
          0,
        ),
    );
  const decMin = () =>
    setTime(
      (t) =>
        new Date(
          t.getFullYear(),
          t.getMonth(),
          t.getDate(),
          t.getHours(),
          t.getMinutes() - 10,
          0,
          0,
        ),
    );

  // label kept for possible future preview text
  const send = () => onSend(time.getTime());

  return (
    <View className="rounded-lg bg-blue-600 p-4">
      <View className="flex-row items-center justify-between">
        {/* Left block: Icon/Title and Send button */}
        <View className="flex-1 items-center justify-center pr-4">
          <View className="mb-3 flex-row items-center justify-center">
            <Ionicons name="game-controller" size={32} color="white" />
            <Text className="ml-2 text-xl font-bold text-white">PING</Text>
          </View>
          <TouchableOpacity
            className="items-center rounded bg-white px-6 py-3"
            onPress={send}
          >
            <Text className="font-semibold text-blue-700">Send</Text>
          </TouchableOpacity>
        </View>

        {/* Right block: time pickers */}
        <View className="flex-row items-center">
          <View className="mx-4 items-center">
            <TouchableOpacity
              onPress={incHour}
              className="mb-2 size-9 items-center justify-center rounded-lg bg-blue-700 active:opacity-80"
            >
              <Ionicons name="chevron-up" size={18} color="white" />
            </TouchableOpacity>
            <Text className="my-1 text-2xl font-semibold text-white">
              {String(time.getHours()).padStart(2, '0')}
            </Text>
            <TouchableOpacity
              onPress={decHour}
              className="mt-2 size-9 items-center justify-center rounded-lg bg-blue-700 active:opacity-80"
            >
              <Ionicons name="chevron-down" size={18} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-2xl font-bold text-white">:</Text>
          <View className="mx-4 items-center">
            <TouchableOpacity
              onPress={incMin}
              className="mb-2 size-9 items-center justify-center rounded-lg bg-blue-700 active:opacity-80"
            >
              <Ionicons name="chevron-up" size={18} color="white" />
            </TouchableOpacity>
            <Text className="my-1 text-2xl font-semibold text-white">
              {String(time.getMinutes()).padStart(2, '0')}
            </Text>
            <TouchableOpacity
              onPress={decMin}
              className="mt-2 size-9 items-center justify-center rounded-lg bg-blue-700 active:opacity-80"
            >
              <Ionicons name="chevron-down" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function MenuButton({ groupId, group }: { groupId: string; group: Group }) {
  const [open, setOpen] = React.useState(false);
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const [inviteLink, setInviteLink] = React.useState<string>('');
  const [generating, setGenerating] = React.useState(false);
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
    router.push({
      pathname: `/group/${groupId}/add-members`,
      params: { groupName: group.name },
    });
  };

  const handleDeleteGroup = async () => {
    Alert.alert(
      'Delete group',
      'This will permanently remove the group for all members. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await FirebaseGroupService.deleteGroup(groupId);
              setOpen(false);
              router.back();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to delete group');
            }
          },
        },
      ],
    );
  };

  const handleCreateInviteLink = async () => {
    console.log('🔗 [InviteLink] Starting invite link creation for groupId:', groupId);
    setOpen(false);
    setGenerating(true);
    
    try {
      console.log('🔗 [InviteLink] Calling generateInviteLink Cloud Function...');
      const result = await generateInviteLink({ groupId });
      console.log('🔗 [InviteLink] Cloud Function response:', result);
      
      const data = result.data as { inviteLink: string; expiresInDays: number };
      console.log('🔗 [InviteLink] Parsed data:', data);
      
      setInviteLink(data.inviteLink);
      setInviteModalOpen(true);
      console.log('🔗 [InviteLink] Invite link created successfully:', data.inviteLink);
      
    } catch (error: any) {
      console.error('❌ [InviteLink] Error creating invite link:', error);
      console.error('❌ [InviteLink] Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        stack: error?.stack
      });
      
      let errorMessage = 'Failed to create invite link';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code) {
        errorMessage = `Error: ${error.code}`;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setGenerating(false);
      console.log('🔗 [InviteLink] Finished invite link creation process');
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={() => setOpen((v) => !v)}>
        <Ionicons name="ellipsis-vertical" size={22} color="#9CA3AF" />
      </TouchableOpacity>
      {open && (
        <Modal
          transparent
          animationType="fade"
          visible
          onRequestClose={() => setOpen(false)}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <View className="mr-2 mt-10 w-48 rounded-lg border border-gray-700 bg-gray-800 p-2">
                <>
                  <TouchableOpacity className="py-2" onPress={handleAddMember}>
                    <Text className="text-sm text-white">Add members</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="py-2" 
                    onPress={handleCreateInviteLink}
                    disabled={generating}
                  >
                    <Text className="text-sm text-white">
                      {generating ? 'Creating invite link...' : 'Create invite link'}
                    </Text>
                  </TouchableOpacity>
                  {canManage && (
                    <>
                      <TouchableOpacity
                        className="py-2"
                        onPress={handleDeleteGroup}
                      >
                        <Text className="text-sm text-red-400">
                          Delete group
                        </Text>
                      </TouchableOpacity>
                      {Array.isArray(group.members) &&
                        group.members.length > 0 &&
                        group.members.map((m) => (
                          <TouchableOpacity
                            key={m.id}
                            className="py-2"
                            onPress={() => handleRemoveMember(m.id)}
                          >
                            <Text className="text-sm text-white">
                              Remove {m.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </>
                  )}
                  <TouchableOpacity className="py-2" onPress={handleExit}>
                    <Text className="text-sm text-red-400">Exit group</Text>
                  </TouchableOpacity>
                </>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Invite Link Modal */}
      {inviteModalOpen && (
        <Modal
          transparent
          animationType="slide"
          visible
          onRequestClose={() => setInviteModalOpen(false)}
        >
          <View className="flex-1 items-center justify-center bg-black/50 px-6">
            <View className="w-full max-w-sm rounded-lg bg-gray-800 p-6">
              <Text className="mb-4 text-lg font-semibold text-white">
                Invite Link Created
              </Text>
              
              <Text className="mb-2 text-sm text-gray-300">
                Share this link to invite others to {group.name}:
              </Text>
              
              <View className="mb-4 rounded bg-gray-700 p-3">
                <Text className="text-xs text-gray-300" numberOfLines={3}>
                  {inviteLink}
                </Text>
              </View>
              
              <Text className="mb-6 text-xs text-gray-400">
                Expires in 7 days
              </Text>
              
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  className="flex-1 rounded bg-blue-600 py-3"
                  onPress={async () => {
                    await Clipboard.setString(inviteLink);
                    Alert.alert('Copied!', 'Invite link copied to clipboard');
                  }}
                >
                  <Text className="text-center font-semibold text-white">
                    Copy Link
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  className="flex-1 rounded bg-green-600 py-3"
                  onPress={async () => {
                    try {
                      await Share.share({
                        message: `Join our ${group.name} group on GameTime! ${inviteLink}`,
                        title: `Join ${group.name}`,
                      });
                    } catch (error) {
                      console.error('Error sharing:', error);
                    }
                  }}
                >
                  <Text className="text-center font-semibold text-white">
                    Share
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                className="mt-4 rounded bg-gray-700 py-3"
                onPress={() => setInviteModalOpen(false)}
              >
                <Text className="text-center text-white">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
