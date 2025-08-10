import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CustomAuthService } from '@/services/customAuthService';
import { FirebaseGroupService } from '@/services/firebaseGroupService';

export default function OTPScreen() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const [askNameVisible, setAskNameVisible] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerifyOTP = async (code?: string) => {
    const source = typeof code === 'string' ? code : otp;
    const cleaned = source.replace(/\D/g, '').trim();
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

      // Ensure a basic profile exists immediately after successful verification
      try {
        const createPromise = FirebaseGroupService.createUserProfile(String(phoneNumber));
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000));
        await Promise.race([createPromise, timeout]);
      } catch {
        // non-blocking; user can still proceed to set name
      }

      // Ask for name on first login; profile will be updated with name afterward
      setAskNameVisible(true);
    } catch (error) {
      console.error('OTP verification error:', error);
      Alert.alert('Error', 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    if (digits.length === 6 && !loading) {
      // Auto-verify when 6 digits are entered
      handleVerifyOTP(digits);
    }
  };

  const handleResendOTP = async () => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Phone number missing. Go back and enter your phone again.');
      return;
    }
    if (resending) return;
    setResending(true);
    try {
      await CustomAuthService.sendOTP(String(phoneNumber));
      Alert.alert('OTP Resent', 'A new verification code has been sent');
    } catch (e) {
      console.log('Resend OTP error:', e);
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmitName = async () => {
    const name = displayName.trim();
    if (!name) {
      Alert.alert('Name required', 'Please enter your name to continue');
      return;
    }
    try {
      setSavingProfile(true);
      const savePromise = FirebaseGroupService.createUserProfile(String(phoneNumber), name);
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000));
      await Promise.race([savePromise, timeout]);

      setAskNameVisible(false);
      router.replace('/(tabs)');
    } catch (e) {
      console.log('Failed to finalize profile:', e);
      // Proceed anyway to avoid blocking the user; profile can be completed later
      setAskNameVisible(false);
      Alert.alert('Saved later', 'We could not save your name right now. You can update it later in Profile.');
      router.replace('/(tabs)');
    }
    finally {
      setSavingProfile(false);
    }
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
            onChangeText={handleOtpChange}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </View>

        <TouchableOpacity
          className={`w-full p-4 rounded-lg mb-4 ${loading ? 'bg-gray-600' : 'bg-blue-600'}`}
          onPress={() => handleVerifyOTP()}
          disabled={loading}
        >
          <Text className="text-white text-center font-bold text-lg">
            {loading ? 'Verifying...' : 'Verify'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResendOTP} disabled={resending}>
          <Text className="text-blue-400 text-center mt-2">{resending ? 'Resending…' : 'Resend code'}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={askNameVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-gray-800 p-6 rounded-lg mx-6 w-full max-w-sm">
            <Text className="text-white text-xl font-bold mb-4 text-center">Your Name</Text>
            <TextInput
              className="bg-gray-700 text-white px-4 py-5 rounded-lg border border-gray-600 text-lg mb-4"
              placeholder="Enter your name"
              placeholderTextColor="#9CA3AF"
              value={displayName}
              onChangeText={setDisplayName}
              autoFocus
              style={{ paddingBottom: 12 }}
            />
            <TouchableOpacity
              className={`p-3 rounded-lg ${savingProfile ? 'bg-gray-600' : 'bg-blue-600'}`}
              onPress={handleSubmitName}
              disabled={savingProfile}
            >
              <Text className="text-white text-center font-semibold">{savingProfile ? 'Saving...' : 'Continue'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
} 