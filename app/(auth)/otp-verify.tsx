import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackSignupCompleted, identifyUser } from '../../utils/analytics';
import { verifyOTP as verifyFirebaseOTP, sendOTP as resendFirebaseOTP } from '../../utils/firebase';

const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  lightBorder: '#E8E6E1',
  error: '#C44536',
  success: '#4A7C59',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function OTPVerifyScreen() {
  const insets = useSafeAreaInsets();
  const { phone, useFirebase } = useLocalSearchParams<{ phone: string; useFirebase: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Animation values
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Focus first input immediately
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, []);

  useEffect(() => {
    // Resend timer countdown
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    setError('');
    const newOtp = [...otp];
    
    // Handle paste
    if (value.length > 1) {
      const pastedCode = value.slice(0, 6).split('');
      pastedCode.forEach((char, i) => {
        if (i < 6) newOtp[i] = char;
      });
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      return;
    }
    
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let verifySuccess = false;
      let userData: any = null;

      if (useFirebase === 'true') {
        // Use Firebase OTP verification
        const result = await verifyFirebaseOTP(otpCode);
        
        if (result.success) {
          verifySuccess = true;
          
          // Also register/update user in our backend
          try {
            const backendResponse = await fetch(`${BACKEND_URL}/api/auth/firebase-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: phone,
                firebase_uid: result.user?.uid,
              }),
            });
            
            if (backendResponse.ok) {
              userData = await backendResponse.json();
            }
          } catch (backendError) {
            console.log('Backend user sync error:', backendError);
          }
        } else {
          setError(result.error || 'Invalid OTP. Please try again.');
          setIsLoading(false);
          return;
        }
      } else {
        // Use backend mock OTP verification (for testing)
        const response = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phone,
            otp: otpCode,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          verifySuccess = true;
          userData = data;
        } else {
          setError(data.detail || 'Invalid OTP. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      if (verifySuccess) {
        // Success animation
        Animated.spring(successScale, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }).start();

        // Save user session data locally
        await AsyncStorage.setItem('sgc_authenticated', 'true');
        await AsyncStorage.setItem('sgc_phone', phone || '');
        await AsyncStorage.setItem('sgc_is_premium', userData?.user?.is_premium ? 'true' : 'false');
        await AsyncStorage.setItem('sgc_is_verified', 'true');
        await AsyncStorage.setItem('sgc_has_completed_analysis', userData?.user?.has_completed_analysis ? 'true' : 'false');

        // Track signup completed & identify user
        trackSignupCompleted(phone || '');
        identifyUser(phone || '');

        // Navigate to main app after brief delay
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 800);
      }
    } catch (error) {
      console.error('OTP Verify Error:', error);
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    
    setOtp(['', '', '', '', '', '']);
    setError('');
    
    try {
      if (useFirebase === 'true') {
        // Resend using Firebase
        const result = await resendFirebaseOTP(phone || '');
        
        if (result.success) {
          setResendTimer(30);
          inputRefs.current[0]?.focus();
        } else {
          Alert.alert('Error', result.error || 'Failed to resend OTP. Please try again.');
        }
      } else {
        // Resend using backend
        const response = await fetch(`${BACKEND_URL}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phone?.replace(/^\+\d+/, '') || '',
            country_code: phone?.match(/^\+\d+/)?.[0] || '+1',
          }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          setResendTimer(30);
          console.log('OTP Resent:', data);
          inputRefs.current[0]?.focus();
        } else {
          Alert.alert('Error', 'Failed to resend OTP. Please try again.');
        }
      }
    } catch (error) {
      console.error('Resend OTP Error:', error);
      Alert.alert('Connection Error', 'Unable to connect to server.');
    }
  };

  const handleBack = () => {
    router.back();
  };

  const isComplete = otp.every(digit => digit !== '');

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.headline}>Verify Your Mobile Number</Text>
            <Text style={styles.subtext}>
              Enter the 6-digit code sent to{' '}
              <Text style={styles.phoneHighlight}>{phone}</Text>
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <View key={index} style={styles.otpInputWrapper}>
                <TextInput
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled,
                    error && styles.otpInputError,
                  ]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  selectTextOnFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                />
                {index === 2 && <View style={styles.otpSeparator} />}
              </View>
            ))}
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.button,
              !isComplete && styles.buttonDisabled,
            ]}
            onPress={handleVerify}
            disabled={!isComplete || isLoading}
            activeOpacity={0.9}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Animated.View
                  style={[
                    styles.successIcon,
                    { transform: [{ scale: successScale }] },
                  ]}
                >
                  <Ionicons name="checkmark" size={24} color={COLORS.white} />
                </Animated.View>
                <Text style={styles.buttonText}>Verifying...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Verify & Enter</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendTimer > 0}
            >
              <Text
                style={[
                  styles.resendLink,
                  resendTimer > 0 && styles.resendLinkDisabled,
                ]}
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  titleContainer: {
    marginBottom: 48,
  },
  headline: {
    fontSize: 28,
    fontWeight: '300',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  subtext: {
    fontSize: 15,
    color: COLORS.muted,
    lineHeight: 22,
  },
  phoneHighlight: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  otpInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  otpInput: {
    width: 48,
    height: 56,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.lightBorder,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '500',
    color: COLORS.primary,
    marginHorizontal: 4,
  },
  otpInputFilled: {
    borderColor: COLORS.accent,
    backgroundColor: '#FDF8E8',
  },
  otpInputError: {
    borderColor: COLORS.error,
  },
  otpSeparator: {
    width: 12,
    height: 2,
    backgroundColor: COLORS.lightBorder,
    marginHorizontal: 4,
    borderRadius: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginLeft: 6,
  },
  button: {
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: COLORS.muted,
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    letterSpacing: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successIcon: {
    marginRight: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  resendText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  resendLink: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: COLORS.muted,
    fontWeight: '400',
  },
});
