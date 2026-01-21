import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Legal URLs
const PRIVACY_POLICY_URL = 'https://thegent.in/privacy';
const TERMS_CONDITIONS_URL = 'https://thegent.in/terms';

const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  champagneGold: '#B29361',
  champagneGoldLight: '#C9A96E',
  champagneGoldDark: '#9A7D4E',
  muted: '#8A8A8A',
  white: '#FFFFFF',
};

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  
  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      // Logo fade in and scale
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // Text slide up and fade in
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Button fade in
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(buttonTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    router.push('/(auth)/mobile-auth');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" />
      
      {/* Main Content */}
      <View style={styles.content}>
        {/* Premium Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          {/* TheGent Logo Image */}
          <View style={styles.logoWrapper}>
            {/* Outer glow */}
            <View style={styles.logoGlow} />
            
            {/* Logo Image */}
            <Image
              source={require('../../assets/images/thegent-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          
          {/* Decorative accent line */}
          <View style={styles.logoAccentWrapper}>
            <View style={styles.logoAccentLeft} />
            <View style={styles.logoAccentDiamond} />
            <View style={styles.logoAccentRight} />
          </View>
        </Animated.View>

        {/* Headlines */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.headline}>Welcome to TheGent</Text>
          <Text style={styles.subheadline}>Your Personal Style Partner</Text>
        </Animated.View>
      </View>

      {/* Bottom Section */}
      <Animated.View
        style={[
          styles.bottomSection,
          {
            opacity: buttonOpacity,
            transform: [{ translateY: buttonTranslateY }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={handleGetStarted}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#C9A96E', '#B29361', '#9A7D4E', '#B29361']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <View style={styles.buttonInnerGlow} />
            <Text style={styles.buttonText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.socialProof}>20k+ Transformations Completed</Text>
        
        <Text style={styles.termsText}>
          By using TheGent you confirm that you are over 18 years and agree to the{' '}
          <Text style={styles.termsLink} onPress={() => Linking.openURL(TERMS_CONDITIONS_URL)}>Terms and Conditions</Text>
          {' '}and{' '}
          <Text style={styles.termsLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>Privacy Policy</Text>
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(178, 147, 97, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.champagneGold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
      },
    }),
  },
  logoImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  logoAccentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  logoAccentLeft: {
    width: 40,
    height: 1,
    backgroundColor: COLORS.champagneGold,
    opacity: 0.4,
  },
  logoAccentDiamond: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.champagneGold,
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 12,
    opacity: 0.6,
  },
  logoAccentRight: {
    width: 40,
    height: 1,
    backgroundColor: COLORS.champagneGold,
    opacity: 0.4,
  },
  textContainer: {
    alignItems: 'center',
  },
  headline: {
    fontSize: 30,
    fontWeight: '300',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1,
  },
  subheadline: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  bottomSection: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.champagneGold,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 15,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  buttonInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    letterSpacing: 1,
    zIndex: 1,
  },
  socialProof: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 20,
    letterSpacing: 0.5,
  },
  termsText: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  termsLink: {
    color: COLORS.champagneGold,
    textDecorationLine: 'underline',
  },
});
