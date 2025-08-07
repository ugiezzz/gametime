import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, Modal, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NotificationService } from '@/services/notificationService';
import { FirebaseGroupService, Group } from '@/services/firebaseGroupService';
import { FirebaseAuthService } from '@/services/firebaseAuthService';

interface Response {
  id: string;
  userId: string;
  userName: string;
  response: string;
  timestamp: Date;
}

// Mock responses for now - will be replaced with Firebase
const mockResponses: Response[] = [
  {
    id: '1',
    userId: '2',
    userName: 'Jane Smith',
    response: 'Yes',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
  },
  {
    id: '2',
    userId: '3',
    userName: 'Mike Johnson',
    response: 'Coming now',
    timestamp: new Date(Date.now() - 1000 * 60 * 3), // 3 minutes ago
  },
  {
    id: '3',
    userId: '4',
    userName: 'Sarah Wilson',
    response: '10 min',
    timestamp: new Date(Date.now() - 1000 * 60 * 1), // 1 minute ago
  },
];

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams();
  const [group, setGroup] = useState<Group | null>(null);
  const [currentGame, setCurrentGame] = useState('');
  const [showGameModal, setShowGameModal] = useState(false);
  const [gameName, setGameName] = useState('');
  const [responses, setResponses] = useState<Response[]>(mockResponses);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!FirebaseAuthService.isAuthenticated()) {
      Alert.alert('Error', 'Please sign in to view groups');
      router.replace('/auth/phone');
      return;
    }

    loadGroup();
    subscribeToGroup();
  }, [id]);

  const loadGroup = async () => {
    try {
      const foundGroup = await FirebaseGroupService.getGroup(id as string);
      if (foundGroup) {
        setGroup(foundGroup);
        setCurrentGame(foundGroup.currentGame || '');
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
        setCurrentGame(updatedGroup.currentGame || '');
      }
    });

    return unsubscribe;
  };

  const handlePing = () => {
    setShowGameModal(true);
  };

  const handleSendPing = async () => {
    if (!gameName.trim()) {
      Alert.alert('Error', 'Please enter a game name');
      return;
    }

    if (!group) return;

    setCurrentGame(gameName);
    setGameName('');
    setShowGameModal(false);

    // Send notification to group members
    try {
      const memberIds = group.members.map(member => member.id);
      await NotificationService.sendPingNotification(
        group.name,
        gameName,
        memberIds
      );
      
      // Update last ping time in Firebase
      await FirebaseGroupService.updateGroupLastPing(group.id, gameName);
      
      Alert.alert('Ping Sent', `Ping sent for ${gameName}!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to send ping notification');
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const renderResponseItem = ({ item }: { item: Response }) => (
    <View className="bg-gray-800 p-4 rounded-lg mb-2 mx-4">
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold">{item.userName}</Text>
          <Text className="text-blue-400 text-base">{item.response}</Text>
        </View>
        <Text className="text-gray-400 text-sm">
          {formatTimestamp(item.timestamp)}
        </Text>
      </View>
    </View>
  );

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
    <View className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="p-4 border-b border-gray-700">
        <Text className="text-white text-2xl font-bold">{group.name}</Text>
        <Text className="text-gray-400">{group.members.length} members</Text>
      </View>

      {/* Ping Button */}
      <View className="p-6">
        <TouchableOpacity
          className="bg-blue-600 p-6 rounded-lg items-center"
          onPress={handlePing}
        >
          <Ionicons name="game-controller" size={48} color="white" />
          <Text className="text-white text-xl font-bold mt-2">PING</Text>
          <Text className="text-blue-200 text-sm mt-1">Tap to send a ping</Text>
        </TouchableOpacity>
      </View>

      {/* Current Game */}
      {currentGame && (
        <View className="px-6 mb-4">
          <Text className="text-white text-lg font-semibold mb-2">Current Game:</Text>
          <Text className="text-blue-400 text-xl font-bold">{currentGame}</Text>
        </View>
      )}

      {/* Responses */}
      <View className="flex-1">
        <View className="px-6 mb-4">
          <Text className="text-white text-lg font-semibold">Responses</Text>
        </View>
        
        {responses.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Ionicons name="chatbubble-outline" size={64} color="#9CA3AF" />
            <Text className="text-gray-400 text-lg mt-4">No responses yet</Text>
          </View>
        ) : (
          <FlatList
            data={responses}
            renderItem={renderResponseItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Game Name Modal */}
      <Modal
        visible={showGameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGameModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-gray-800 p-6 rounded-lg mx-6 w-full max-w-sm">
            <Text className="text-white text-xl font-bold mb-4 text-center">
              What game are you playing?
            </Text>
            
            <TextInput
              className="bg-gray-700 text-white p-4 rounded-lg border border-gray-600 text-lg mb-4"
              placeholder="Enter game name"
              placeholderTextColor="#9CA3AF"
              value={gameName}
              onChangeText={setGameName}
              autoFocus
            />
            
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-gray-600 p-3 rounded-lg"
                onPress={() => setShowGameModal(false)}
              >
                <Text className="text-white text-center font-semibold">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 bg-blue-600 p-3 rounded-lg"
                onPress={handleSendPing}
              >
                <Text className="text-white text-center font-semibold">Send Ping</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
} 