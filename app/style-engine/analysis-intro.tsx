import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  background: '#F5F1EB',
  primary: '#2C2C2C',
  accent: '#C8A45B',
  accentDark: '#B28E42',
  muted: '#666666',
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  lightBorder: '#E8E6E1',
  imageBg: '#FDF9F3',
};

// User-provided example images matching the mockup
const STEP_IMAGES = {
  // Face photo - front-facing male in beige sweater
  face: 'https://customer-assets.emergentagent.com/job_37b981b4-1781-4790-bae7-285812593c14/artifacts/atny6vij_ChatGPT%20Image%20Jan%207%2C%202026%2C%2004_16_36%20PM.png',
  // Full body photo - man standing in black athletic wear
  body: 'https://customer-assets.emergentagent.com/job_37b981b4-1781-4790-bae7-285812593c14/artifacts/xv8x96i2_ChatGPT%20Image%20Jan%207%2C%202026%2C%2004_16_33%20PM.png',
  // Wrist/skin photo - close-up of inner wrist showing veins
  wrist: 'https://customer-assets.emergentagent.com/job_37b981b4-1781-4790-bae7-285812593c14/artifacts/94al1nej_ChatGPT%20Image%20Jan%207%2C%202026%2C%2004_16_30%20PM.png',
};

interface StepCardProps {
  stepNumber: number;
  title: string;
  subtitle: string;
  description: string;
  imageUri: string;
  imageStyle?: 'square' | 'portrait' | 'landscape';
  delay: number;
}

const StepCard: React.FC<StepCardProps> = ({ 
  stepNumber, 
  title, 
  subtitle,
  description, 
  imageUri,
  imageStyle = 'square',
  delay 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Image dimensions based on style
  const getImageDimensions = () => {
    switch (imageStyle) {
      case 'portrait':
        return { width: 85, height: 110 };
      case 'landscape':
        return { width: 95, height: 70 };
      default:
        return { width: 85, height: 85 };
    }
  };

  const imageDimensions = getImageDimensions();

  return (
    <Animated.View 
      style={[
        styles.stepCard,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.stepContent}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumberCircle}>
            <Text style={styles.stepNumberText}>{stepNumber}</Text>
          </View>
          <View style={styles.stepTextContainer}>
            <Text style={styles.stepTitle}>
              Step {stepNumber}: <Text style={styles.stepTitleBold}>{title}</Text>
              {subtitle && <Text style={styles.stepSubtitle}> {subtitle}</Text>}
            </Text>
            <Text style={styles.stepDescription}>{description}</Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.stepImageContainer, { width: imageDimensions.width, height: imageDimensions.height }]}>
        {imageLoading && (
          <View style={[styles.imageLoadingOverlay, imageDimensions]}>
            <ActivityIndicator size="small" color={COLORS.accent} />
          </View>
        )}
        <Image
          source={{ uri: imageUri }}
          style={[styles.stepImage, imageDimensions]}
          resizeMode="cover"
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
        />
      </View>
    </Animated.View>
  );
};

export default function AnalysisIntroScreen() {
  const insets = useSafeAreaInsets();
  const headerFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleStartAnalysis = () => {
    // Navigate to the face-scan screen to begin the analysis
    router.push('/style-engine/face-scan');
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <Animated.View style={[styles.titleSection, { opacity: headerFadeAnim }]}>
          <Text style={styles.mainTitle}>Your Style Transformation{'\n'}Starts Here</Text>
          <Text style={styles.subtitle}>
            Follow these steps to get the best, most accurate analysis.
          </Text>
        </Animated.View>

        {/* Step Cards */}
        <View style={styles.stepsContainer}>
          <StepCard
            stepNumber={1}
            title="Face photo"
            subtitle="(front-facing)"
            description="Take a clear photo of your face looking straight at the camera."
            imageUri={STEP_IMAGES.face}
            imageStyle="square"
            delay={200}
          />

          <StepCard
            stepNumber={2}
            title="Full body photo"
            subtitle=""
            description="Stand up straight and take a full body photo. Make sure your whole outfit fits in the frame."
            imageUri={STEP_IMAGES.body}
            imageStyle="portrait"
            delay={400}
          />

          <StepCard
            stepNumber={3}
            title="Wrist/skin photo"
            subtitle=""
            description="Get a close-up photo of the inside of your wrist showing clear skin and veins."
            imageUri={STEP_IMAGES.wrist}
            imageStyle="landscape"
            delay={600}
          />
        </View>

        {/* Lighting Tip */}
        <Animated.View style={[styles.tipContainer, { opacity: headerFadeAnim }]}>
          <Ionicons name="sunny-outline" size={18} color={COLORS.muted} />
          <Text style={styles.tipText}>
            Make sure your photos are in good lighting for best results.
          </Text>
        </Animated.View>
      </ScrollView>

      {/* CTA Button */}
      <View style={[styles.ctaContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={handleStartAnalysis}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaButtonText}>Start My Analysis</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  stepsContainer: {
    gap: 16,
  },
  stepCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    color: COLORS.accent,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  stepTitleBold: {
    fontWeight: '600',
    fontStyle: 'normal',
    color: COLORS.primary,
  },
  stepSubtitle: {
    fontStyle: 'normal',
    color: COLORS.muted,
    fontSize: 14,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
  stepImageContainer: {
    marginLeft: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.imageBg,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  stepImage: {
    borderRadius: 11,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    zIndex: 1,
    backgroundColor: COLORS.imageBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.muted,
    fontStyle: 'italic',
    marginLeft: 8,
    textAlign: 'center',
  },
  ctaContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: COLORS.background,
  },
  ctaButton: {
    backgroundColor: COLORS.accentDark,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.white,
  },
});
