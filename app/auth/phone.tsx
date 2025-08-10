import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { CustomAuthService } from '@/services/customAuthService';
import { getDefaultRegion, normalizePhoneNumber, formatExamplePlaceholder } from '@/services/phoneUtil';

function inferCountryCode(regionInput?: string): string {
  // Minimal map for prefix in placeholder; final normalization is library-based
  const region = regionInput || getDefaultRegion();
  const map: Record<string, string> = {
    IL: '+972',
    US: '+1',
    CA: '+1',
    GB: '+44',
    DE: '+49',
    FR: '+33',
  };
  return map[region as keyof typeof map] || '+1';
}

export default function PhoneScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const region = getDefaultRegion();
  const defaultCode = inferCountryCode(region);

  useEffect(() => {
    requestPermissions();
    // Redirect to home if auth is restored while this screen is visible
    const unsubscribe = CustomAuthService.onAuthStateChanged((user) => {
      if (user) router.replace('/(tabs)');
    });
    return () => unsubscribe();
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

  // removed synchronous check; we rely on the auth listener above

  const handleSendOTP = async () => {
    const { e164, isValid } = normalizePhoneNumber(phoneNumber, region);
    if (!isValid || !e164) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending OTP to:', e164);
      await CustomAuthService.sendOTP(e164);
      router.push({ pathname: '/auth/otp', params: { phoneNumber: e164 } });
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
          placeholder={`e.g. ${defaultCode} ${formatExamplePlaceholder(region)}`}
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
        <Text className="text-white text-center font-bold text-lg">{loading ? 'Sending…' : 'Next'}</Text>
      </TouchableOpacity>
    </View>
  );
} 