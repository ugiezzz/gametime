import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CustomAuthService } from '@/services/customAuthService';

export default function OTPScreen() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();

  const handleVerifyOTP = async () => {
    const cleaned = otp.replace(/\D/g, '').trim();
    if (!cleaned || cleaned.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      console.log('Verifying OTP:', cleaned);

      if (!phoneNumber) {
        Alert.alert('Error', 'Phone number not found. Please try again.');
        router.back();
        return;
      }

      await CustomAuthService.verifyOTP(String(phoneNumber), cleaned);

      Alert.alert('Success', 'Phone number verified successfully!');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('OTP verification error:', error);
      Alert.alert('Error', 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    Alert.alert('OTP Resent', 'A new verification code has been sent');
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-900" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-1 justify-center items-center px-6">
        <Text className="text-white text-2xl font-bold mb-6">Verify Phone</Text>
        <Text className="text-white text-lg mb-6 text-center">
          Enter the 6-digit code sent to your phone
        </Text>

        <View className="w-full mb-10">
          <TextInput
            className="bg-gray-800 text-white p-4 rounded-lg border border-gray-700 text-lg text-center"
            placeholder="Enter OTP"
            placeholderTextColor="#9CA3AF"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </View>

        <TouchableOpacity
          className={`w-full p-4 rounded-lg mb-4 ${loading ? 'bg-gray-600' : 'bg-blue-600'}`}
          onPress={handleVerifyOTP}
          disabled={loading}
        >
          <Text className="text-white text-center font-bold text-lg">
            {loading ? 'Verifying...' : 'Verify OTP'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResendOTP}>
          <Text className="text-blue-400 text-center mt-2">Resend OTP</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
} 