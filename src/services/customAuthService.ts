import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';

import { auth, signInWithCustomToken } from '@/config/firebase';

export class CustomAuthService {
  private static functionsBaseUrl =
    'https://us-central1-gametime-app-4e0e3.cloudfunctions.net';

  // Send OTP to phone number
  static async sendOTP(phoneNumber: string): Promise<string> {
    try {
      const response = await fetch(`${this.functionsBaseUrl}/sendOtp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      if (!response.ok) {
        let message = 'Failed to send OTP';
        try {
          const text = await response.text();
          // Some backends return JSON, others plain text; show whichever exists
          if (text) {
            try {
              const data = JSON.parse(text);
              message = data.error || data.message || text;
            } catch {
              message = text;
            }
          }
        } catch {}
        throw new Error(message);
      }

      return 'OTP sent successfully';
    } catch (error) {
      console.error('Error sending OTP:', error);
      if (error instanceof Error) throw error;
      throw new Error('Failed to send OTP. Please try again.');
    }
  }

  // Verify OTP and sign in
  static async verifyOTP(phoneNumber: string, otp: string): Promise<User> {
    try {
      const response = await fetch(`${this.functionsBaseUrl}/verifyOtp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, code: otp }),
      });

      if (!response.ok) {
        let message = 'Failed to verify OTP';
        try {
          const text = await response.text();
          if (text) {
            try {
              const data = JSON.parse(text);
              message = data.error || data.message || text;
            } catch {
              message = text;
            }
          }
        } catch {}
        throw new Error(message);
      }

      const { token } = await response.json();
      const result = await signInWithCustomToken(auth, token);
      return result.user;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      if (error instanceof Error) throw error;
      throw new Error('Invalid OTP. Please try again.');
    }
  }

  // Sign out
  static async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  // Get current user
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Listen to auth state changes
  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return auth.currentUser !== null;
  }
}
