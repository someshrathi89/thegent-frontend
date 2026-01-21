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
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendOTP, initRecaptcha, cleanupRecaptcha } from '../../utils/firebase';

const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  lightBorder: '#E8E6E1',
  inputBg: '#FFFFFF',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Always use Firebase OTP (native uses @react-native-firebase, web uses JS SDK with reCAPTCHA)
const USE_FIREBASE_OTP = true;

const COUNTRY_CODES = [
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+971', country: 'AE', flag: '🇦🇪' },
  { code: '+65', country: 'SG', flag: '🇸🇬' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
];

export default function MobileAuthScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);

  // Animation values
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Initialize reCAPTCHA for Firebase (web only)
    if (USE_FIREBASE_OTP && Platform.OS === 'web') {
      setTimeout(() => {
        initRecaptcha('recaptcha-container');
      }, 500);
    }

    // Cleanup on unmount
    return () => {
      if (USE_FIREBASE_OTP) {
        cleanupRecaptcha();
      }
    };
  }, []);

  const handleProceed = async () => {
    if (phoneNumber.length < 6 || firstName.trim().length < 1) return;
    
    setIsLoading(true);
    
    try {
      // Save the first name to AsyncStorage
      await AsyncStorage.setItem('user_first_name', firstName.trim());
      
      const fullPhone = `${selectedCountry.code}${phoneNumber}`;
      
      // Use Firebase Phone Auth (native uses @react-native-firebase, web uses JS SDK)
      const result = await sendOTP(fullPhone);
      
      if (result.success) {
        router.push({
          pathname: '/(auth)/otp-verify',
          params: { 
            phone: fullPhone,
            useFirebase: 'true'
          },
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      console.error('OTP Request Error:', error);
      Alert.alert('Connection Error', 'Unable to send OTP. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const formatPhoneNumber = (text: string) => {
    // Remove non-numeric characters
    const cleaned = text.replace(/[^0-9]/g, '');
    setPhoneNumber(cleaned);
  };

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
              <Text style={styles.headline}>Start Your Styling Journey</Text>
              <Text style={styles.subtext}>Enter your details to continue</Text>
            </View>

            {/* Name Input */}
            <View style={styles.nameInputSection}>
              <View style={styles.nameInputContainer}>
                <Ionicons name="person-outline" size={20} color={COLORS.muted} style={styles.nameIcon} />
                <TextInput
                  ref={nameInputRef}
                  style={styles.nameInput}
                  placeholder="First Name"
                  placeholderTextColor={COLORS.muted}
                  value={firstName}
                  onChangeText={setFirstName}
                  maxLength={30}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => inputRef.current?.focus()}
                />
              </View>
            </View>

            {/* Phone Input */}
            <View style={styles.inputSection}>
              {/* Country Code Selector */}
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setShowCountryPicker(!showCountryPicker)}
                activeOpacity={0.8}
              >
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.countryCode}>{selectedCountry.code}</Text>
                <Ionicons
                  name={showCountryPicker ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={COLORS.muted}
                />
              </TouchableOpacity>

              {/* Phone Number Input */}
              <View style={styles.phoneInputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.phoneInput}
                  placeholder="Mobile Number"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={formatPhoneNumber}
                  maxLength={15}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  returnKeyType="done"
                  enablesReturnKeyAutomatically={true}
                />
              </View>
            </View>

            {/* Country Picker Dropdown */}
            {showCountryPicker && (
              <Animated.View style={styles.countryPicker}>
                <ScrollView style={styles.countryList} nestedScrollEnabled>
                  {COUNTRY_CODES.map((country) => (
                    <TouchableOpacity
                      key={country.code}
                      style={[
                        styles.countryOption,
                        selectedCountry.code === country.code && styles.countryOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedCountry(country);
                        setShowCountryPicker(false);
                      }}
                    >
                      <Text style={styles.countryOptionFlag}>{country.flag}</Text>
                      <Text style={styles.countryOptionText}>
                        {country.country} ({country.code})
                      </Text>
                      {selectedCountry.code === country.code && (
                        <Ionicons name="checkmark" size={18} color={COLORS.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            )}

            {/* Proceed Button */}
            <TouchableOpacity
              style={[
                styles.button,
                (phoneNumber.length < 6 || firstName.trim().length < 1) && styles.buttonDisabled,
              ]}
              onPress={handleProceed}
              disabled={phoneNumber.length < 6 || firstName.trim().length < 1 || isLoading}
              activeOpacity={0.9}
            >
              {isLoading ? (
                <Text style={styles.buttonText}>Processing...</Text>
              ) : (
                <Text style={styles.buttonText}>Proceed</Text>
              )}
            </TouchableOpacity>

            {/* Privacy Note */}
            <Text style={styles.privacyNote}>
              We'll send you a verification code via SMS
            </Text>
            
            {/* Hidden reCAPTCHA container for Firebase (web only) */}
            {Platform.OS === 'web' && (
              <View nativeID="recaptcha-container" style={styles.recaptchaContainer} />
            )}
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
  },
  content: {
    flex: 1,
    paddingTop: 40,
  },
  titleContainer: {
    marginBottom: 32,
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
  nameInputSection: {
    marginBottom: 16,
  },
  nameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    paddingHorizontal: 14,
  },
  nameIcon: {
    marginRight: 10,
  },
  nameInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.primary,
  },
  inputSection: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    marginRight: 12,
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 8,
  },
  countryCode: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
    marginRight: 6,
  },
  phoneInputContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.primary,
    letterSpacing: 1,
  },
  countryPicker: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    marginBottom: 24,
    maxHeight: 200,
    overflow: 'hidden',
  },
  countryList: {
    maxHeight: 200,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
  },
  countryOptionSelected: {
    backgroundColor: '#FDF8E8',
  },
  countryOptionFlag: {
    fontSize: 18,
    marginRight: 12,
  },
  countryOptionText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.primary,
  },
  button: {
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 32,
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
  privacyNote: {
    marginTop: 20,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
  },
  recaptchaContainer: {
    height: 0,
    width: 0,
    opacity: 0,
  },
});
