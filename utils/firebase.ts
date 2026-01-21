import { Platform } from 'react-native';

// ============================================
// NATIVE (Android/iOS) - @react-native-firebase
// ============================================
let nativeAuth: any = null;
let nativeConfirmation: any = null;

// ============================================
// WEB - Firebase JS SDK
// ============================================
let webApp: any = null;
let webAuth: any = null;
let webConfirmationResult: any = null;
let recaptchaVerifier: any = null;

// Firebase configuration (for web)
const firebaseConfig = {
  apiKey: "AIzaSyA222q7BTXH3Cg0QHnTFP1Jjjf2DYc5gk8",
  authDomain: "thegent-app.firebaseapp.com",
  projectId: "thegent-app",
  storageBucket: "thegent-app.firebasestorage.app",
  messagingSenderId: "304131317560",
  appId: "1:304131317560:web:3d789daa8b785b1e62abcd",
  measurementId: "G-EVJ2FVLDMN"
};

/**
 * Initialize Firebase based on platform
 */
const initializeFirebase = async () => {
  if (Platform.OS === 'web') {
    // Web: Use Firebase JS SDK
    const { initializeApp, getApps } = await import('firebase/app');
    const { getAuth } = await import('firebase/auth');
    
    webApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    webAuth = getAuth(webApp);
    console.log('Firebase Web SDK initialized');
  } else {
    // Native: Use @react-native-firebase
    const firebaseApp = await import('@react-native-firebase/app');
    const firebaseAuth = await import('@react-native-firebase/auth');
    
    nativeAuth = firebaseAuth.default();
    console.log('Firebase Native SDK initialized');
  }
};

// Initialize on module load
initializeFirebase();

/**
 * Initialize reCAPTCHA verifier (WEB ONLY)
 */
export const initRecaptcha = async (buttonId: string = 'recaptcha-container') => {
  if (Platform.OS !== 'web') return null;
  
  try {
    const { RecaptchaVerifier } = await import('firebase/auth');
    
    if (!webAuth) {
      await initializeFirebase();
    }
    
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
    }
    
    recaptchaVerifier = new RecaptchaVerifier(webAuth, buttonId, {
      size: 'invisible',
      callback: () => {
        console.log('reCAPTCHA verified');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
      }
    });
    
    return recaptchaVerifier;
  } catch (error) {
    console.error('Error initializing reCAPTCHA:', error);
    return null;
  }
};

/**
 * Clean up reCAPTCHA (WEB ONLY)
 */
export const cleanupRecaptcha = () => {
  if (Platform.OS === 'web' && recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
    } catch (e) {}
  }
};

/**
 * Send OTP to phone number
 */
export const sendOTP = async (phoneNumber: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Ensure phone number has country code
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    if (Platform.OS === 'web') {
      // WEB: Use Firebase JS SDK with reCAPTCHA
      const { signInWithPhoneNumber } = await import('firebase/auth');
      
      if (!recaptchaVerifier) {
        await initRecaptcha();
      }
      
      if (!recaptchaVerifier) {
        throw new Error('reCAPTCHA not initialized');
      }
      
      webConfirmationResult = await signInWithPhoneNumber(webAuth, formattedPhone, recaptchaVerifier);
      console.log('OTP sent successfully (web) to:', formattedPhone);
      
    } else {
      // NATIVE: Use @react-native-firebase
      if (!nativeAuth) {
        const firebaseAuth = await import('@react-native-firebase/auth');
        nativeAuth = firebaseAuth.default();
      }
      
      nativeConfirmation = await nativeAuth.signInWithPhoneNumber(formattedPhone);
      console.log('OTP sent successfully (native) to:', formattedPhone);
    }
    
    return { success: true };
    
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    
    // Reset reCAPTCHA on error (web only)
    if (Platform.OS === 'web' && recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
        recaptchaVerifier = null;
      } catch (e) {}
    }
    
    // Handle specific Firebase errors
    let errorMessage = 'Failed to send OTP. Please try again.';
    
    const errorCode = error.code || '';
    
    if (errorCode === 'auth/invalid-phone-number') {
      errorMessage = 'Invalid phone number format. Please check and try again.';
    } else if (errorCode === 'auth/too-many-requests') {
      errorMessage = 'Too many attempts. Please try again later.';
    } else if (errorCode === 'auth/quota-exceeded') {
      errorMessage = 'SMS quota exceeded. Please try again later.';
    } else if (errorCode === 'auth/missing-client-identifier') {
      errorMessage = 'App verification failed. Please try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
};

/**
 * Verify OTP code
 */
export const verifyOTP = async (code: string): Promise<{ success: boolean; user?: any; error?: string }> => {
  try {
    let user: any;
    
    if (Platform.OS === 'web') {
      // WEB: Use Firebase JS SDK
      if (!webConfirmationResult) {
        throw new Error('No OTP was sent. Please request a new code.');
      }
      
      const result = await webConfirmationResult.confirm(code);
      user = {
        uid: result.user.uid,
        phoneNumber: result.user.phoneNumber,
      };
      
    } else {
      // NATIVE: Use @react-native-firebase
      if (!nativeConfirmation) {
        throw new Error('No OTP was sent. Please request a new code.');
      }
      
      const result = await nativeConfirmation.confirm(code);
      user = {
        uid: result.user.uid,
        phoneNumber: result.user.phoneNumber,
      };
    }
    
    console.log('OTP verified successfully');
    return { success: true, user };
    
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    
    let errorMessage = 'Invalid code. Please try again.';
    const errorCode = error.code || '';
    
    if (errorCode === 'auth/invalid-verification-code') {
      errorMessage = 'Invalid verification code. Please check and try again.';
    } else if (errorCode === 'auth/code-expired') {
      errorMessage = 'Code has expired. Please request a new one.';
    } else if (errorCode === 'auth/session-expired') {
      errorMessage = 'Session expired. Please request a new code.';
    }
    
    return { success: false, error: errorMessage };
  }
};

/**
 * Sign out user
 */
export const signOut = async () => {
  try {
    if (Platform.OS === 'web') {
      if (webAuth) {
        await webAuth.signOut();
      }
      webConfirmationResult = null;
    } else {
      if (nativeAuth) {
        await nativeAuth.signOut();
      }
      nativeConfirmation = null;
    }
    console.log('User signed out');
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  if (Platform.OS === 'web') {
    return webAuth?.currentUser;
  } else {
    return nativeAuth?.currentUser;
  }
};

// Export for compatibility
export const auth = Platform.OS === 'web' ? webAuth : nativeAuth;
export const app = webApp;
