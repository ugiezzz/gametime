import { 
  PhoneAuthProvider, 
  signInWithCredential, 
  RecaptchaVerifier,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  signInAnonymously
} from 'firebase/auth';
import { auth } from '@/config/firebase';

export class FirebaseAuthService {
  private static recaptchaVerifier: RecaptchaVerifier | null = null;

  // Initialize reCAPTCHA verifier
  static initializeRecaptcha(containerId: string) {
    if (!this.recaptchaVerifier) {
      this.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        },
      });
    }
    return this.recaptchaVerifier;
  }

  // Development method: Sign in anonymously for testing
  static async signInAnonymouslyForDevelopment(): Promise<User> {
    try {
      const result = await signInAnonymously(auth);
      console.log('Signed in anonymously:', result.user.uid);
      return result.user;
    } catch (error) {
      console.error('Error signing in anonymously:', error);
      throw new Error('Failed to sign in. Please try again.');
    }
  }

  // Send OTP to phone number
  static async sendOTP(phoneNumber: string, containerId: string): Promise<string> {
    try {
      const verifier = this.initializeRecaptcha(containerId);
      const confirmationResult = await verifier.signInWithPhoneNumber(phoneNumber);
      
      // Store the confirmation result for later use
      (window as any).confirmationResult = confirmationResult;
      
      return 'OTP sent successfully';
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw new Error('Failed to send OTP. Please try again.');
    }
  }

  // Verify OTP and sign in
  static async verifyOTP(otp: string): Promise<User> {
    try {
      const confirmationResult = (window as any).confirmationResult;
      if (!confirmationResult) {
        throw new Error('No OTP confirmation pending. Please send OTP again.');
      }

      const result = await confirmationResult.confirm(otp);
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