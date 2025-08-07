import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Localization from 'expo-localization';
import { CustomAuthService } from '@/services/customAuthService';

function inferCountryCode(): string {
  const region = Localization.region || '';
  // Simple map; expand as needed
  const map: Record<string, string> = {
    IL: '+972',
    US: '+1',
    CA: '+1',
    GB: '+44',
    DE: '+49',
    FR: '+33',
  };
  return map[region] || '+1';
}

export default function PhoneScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [defaultCode, setDefaultCode] = useState(inferCountryCode());

  useEffect(() => {
    requestPermissions();
    checkAuthState();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
      if (notificationStatus !== 'granted') {
        Alert.alert('Notifications', 'Please enable notifications to receive pings from your friends.', [{ text: 'OK' }]);
      }
    } catch (error) {
      console.log('Permission request error:', error);
    }
  };

  const checkAuthState = () => {
    if (CustomAuthService.isAuthenticated()) {
      console.log('User already authenticated');
      router.replace('/(tabs)');
    }
  };

  const handleSendOTP = async () => {
    const raw = phoneNumber.trim();
    const hasPlus = raw.startsWith('+');
    const normalized = hasPlus ? raw : `${defaultCode}${raw.replace(/\D/g, '')}`;

    if (!normalized || normalized.length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending OTP to:', normalized);
      await CustomAuthService.sendOTP(normalized);

      Alert.alert('Success', 'OTP sent to your phone number!');
      router.push({ pathname: '/auth/otp', params: { phoneNumber: normalized } });
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center px-6 bg-gray-900">
      <Text className="text-white text-2xl font-bold mb-8">GameTime</Text>
      <Text className="text-white text-lg mb-8 text-center">Enter your phone number to get started</Text>

      <View className="w-full mb-6">
        <TextInput
          className="bg-gray-800 text-white p-4 rounded-lg border border-gray-700 text-lg"
          placeholder={`e.g. ${defaultCode} 5551234567`}
          placeholderTextColor="#9CA3AF"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          autoFocus
        />
      </View>

      <TouchableOpacity
        className={`w-full p-4 rounded-lg ${loading ? 'bg-gray-600' : 'bg-blue-600'}`}
        onPress={handleSendOTP}
        disabled={loading}
      >
        <Text className="text-white text-center font-bold text-lg">{loading ? 'Verifying...' : 'Continue'}</Text>
      </TouchableOpacity>
    </View>
  );
} 