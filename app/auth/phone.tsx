import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { CustomAuthService } from '@/services/customAuthService';
import {
  formatExamplePlaceholder,
  getDefaultRegion,
  normalizePhoneNumber,
} from '@/services/phoneUtil';

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
      const { status: notificationStatus } =
        await Notifications.requestPermissionsAsync();
      if (notificationStatus !== 'granted') {
        Alert.alert(
          'Notifications',
          'Please enable notifications to receive pings from your friends.',
          [{ text: 'OK' }],
        );
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
    <View className="flex-1 items-center justify-center bg-gray-900 px-6">
      <Text className="mb-8 text-2xl font-bold text-white">GameTime</Text>
      <Text className="mb-8 text-center text-lg text-white">
        Enter your phone number to get started
      </Text>

      <View className="mb-6 w-full">
        <TextInput
          className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-lg text-white"
          placeholder={`e.g. ${defaultCode} ${formatExamplePlaceholder(region)}`}
          placeholderTextColor="#9CA3AF"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          autoFocus
        />
      </View>

      <TouchableOpacity
        className={`w-full rounded-lg p-4 ${loading ? 'bg-gray-600' : 'bg-blue-600'}`}
        onPress={handleSendOTP}
        disabled={loading}
      >
        <Text className="text-center text-lg font-bold text-white">
          {loading ? 'Sending…' : 'Next'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
