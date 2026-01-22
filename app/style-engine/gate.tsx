import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';

const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  lightBorder: '#E8E6E1',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function GateScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleUnlock = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Step 1: Check membership in the backend
      const membershipResponse = await fetch(`${BACKEND_URL}/api/auth/check-membership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const membershipData = await membershipResponse.json();

      if (!membershipData.is_member) {
        setError('Please use your registered email ID which you used for purchase');
        setIsLoading(false);
        return;
      }

      // Step 2: Membership valid - unlock premium access
      const unlockResponse = await fetch(`${BACKEND_URL}/api/auth/unlock-premium`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const unlockData = await unlockResponse.json();

      if (unlockData.success) {
        // Step 3: Save premium status, email verified status and tier locally
        await AsyncStorage.setItem('sgc_is_premium', 'true');
        await AsyncStorage.setItem('sgc_email', email.toLowerCase().trim());
        await AsyncStorage.setItem('sgc_email_verified', 'true');  // Mark as verified for future visits
        
        // Save membership tier from response (default to transformation for legacy members)
        const tier = unlockData.membership_tier || membershipData.membership?.plan || 'transformation';
        await AsyncStorage.setItem('sgc_membership_tier', tier);
        
        // Update user's tier in backend if we have phone number
        const phone = await AsyncStorage.getItem('sgc_phone');
        if (phone) {
          const cleanPhone = phone.replace('+1', '').replace('+', '');
          try {
            await fetch(`${BACKEND_URL}/api/user/update-membership`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: cleanPhone, tier: tier }),
            });
          } catch (updateError) {
            console.log('Failed to update tier in backend:', updateError);
          }
        }
        
        // Check if analysis has been completed (user came from processing screen)
        const hasCompletedAnalysis = await AsyncStorage.getItem('sgc_has_completed_analysis');
        const hasBrainResult = await AsyncStorage.getItem('sgc_brain_result');
        
        if (hasCompletedAnalysis === 'true' && hasBrainResult) {
          // User just completed analysis - go to results
          router.replace({
            pathname: '/style-engine/results',
            params: { 
              fromProcessing: 'true',
              generateImages: 'true'
            }
          });
        } else {
          // User hasn't done analysis yet - go to analysis intro
          router.replace('/style-engine/analysis-intro');
        }
      } else {
        setError(unlockData.message || 'Failed to unlock premium access.');
      }
    } catch (error) {
      console.error('Error unlocking:', error);
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Blurred Preview Card */}
          <View style={styles.previewSection}>
            <Animated.View
              style={[styles.previewCard, { transform: [{ scale: pulseAnim }] }]}
            >
              <View style={styles.blurredContent}>
                {/* Simulated blurred results */}
                <View style={styles.blurredRow}>
                  <View style={[styles.blurredBox, { width: 80 }]} />
                  <View style={[styles.blurredBox, { width: 100 }]} />
                </View>
                <View style={styles.blurredRow}>
                  <View style={[styles.blurredBox, { width: 120 }]} />
                </View>
                <View style={styles.blurredColors}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View key={i} style={styles.blurredColorSwatch} />
                  ))}
                </View>
                <View style={styles.blurredRow}>
                  <View style={[styles.blurredBox, { width: 140 }]} />
                </View>
              </View>

              {/* Lock overlay */}
              <View style={styles.lockOverlay}>
                <View style={styles.lockIcon}>
                  <Ionicons name="lock-closed" size={32} color={COLORS.accent} />
                </View>
              </View>
            </Animated.View>
          </View>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <View style={styles.completeBadge}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.accent} />
              <Text style={styles.completeBadgeText}>ANALYSIS COMPLETE</Text>
            </View>
            <Text style={styles.title}>Your Transformation{"\n"}Blueprint is Ready</Text>
            <Text style={styles.subtitle}>
              To unlock your personalized results and AI Stylist access, enter the email address
              used for your TheGent Membership.
            </Text>
          </View>

          {/* Email Input */}
          <View style={styles.inputSection}>
            <View style={[styles.inputContainer, error && styles.inputContainerError]}>
              <Ionicons name="mail-outline" size={20} color={COLORS.muted} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={COLORS.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError('');
                }}
                editable={true}
                selectTextOnFocus={true}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          {/* Unlock Button */}
          <TouchableOpacity
            style={[
              styles.unlockButton,
              (!email || isLoading) && styles.unlockButtonDisabled,
            ]}
            onPress={handleUnlock}
            disabled={!email || isLoading}
            activeOpacity={0.9}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="lock-open" size={20} color={COLORS.white} />
                <Text style={styles.unlockButtonText}>Unlock My Identity</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Privacy Note */}
          <View style={styles.privacyNote}>
            <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.muted} />
            <Text style={styles.privacyText}>
              Your data is encrypted and never shared with third parties
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  previewSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  previewCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    position: 'relative',
    overflow: 'hidden',
  },
  blurredContent: {
    opacity: 0.3,
  },
  blurredRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  blurredBox: {
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    marginRight: 12,
  },
  blurredColors: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  blurredColorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D0D0D0',
    marginRight: 10,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(249, 248, 244, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF8E8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  completeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1,
    marginLeft: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 10,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputContainerError: {
    borderColor: '#C44536',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.primary,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  errorText: {
    fontSize: 13,
    color: '#C44536',
    marginTop: 8,
    marginLeft: 4,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    borderRadius: 30,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  unlockButtonDisabled: {
    backgroundColor: COLORS.muted,
    opacity: 0.5,
    shadowOpacity: 0,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 10,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  privacyText: {
    fontSize: 12,
    color: COLORS.muted,
    marginLeft: 6,
  },
});
