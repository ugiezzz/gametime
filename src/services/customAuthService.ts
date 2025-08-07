import { auth, signInWithCustomToken } from '@/config/firebase';
import { User, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';

export class CustomAuthService {
  private static functionsBaseUrl = 'https://us-central1-gametime-app-4e0e3.cloudfunctions.net';

  // Send OTP to phone number
  static async sendOTP(phoneNumber: string): Promise<string> {
    try {
      const response = await fetch(`${this.functionsBaseUrl}/sendOtp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      if (!response.ok) {
        throw new Error('Failed to send OTP');
      }

      return 'OTP sent successfully';
    } catch (error) {
      console.error('Error sending OTP:', error);
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify OTP');
      }

      const { token } = await response.json();
      const result = await signInWithCustomToken(auth, token);
      return result.user;
    } catch (error) {
      console.error('Error verifying OTP:', error);
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