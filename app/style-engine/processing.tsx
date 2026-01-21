import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { 
  trackAnalysisStarted, 
  trackAnalysisCompleted, 
  trackAnalysisFailedInvalidImage 
} from '../../utils/analytics';
import { captureException, addBreadcrumb, captureValidationError } from '../../utils/sentry';

const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  lightBorder: '#E8E6E1',
  success: '#4A7C59',
  error: '#C44536',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type ProcessingPhase = 'preparing' | 'analyzing' | 'complete' | 'error';

interface SGCBrainResult {
  identity_snapshot_v1: any;
  outfit_catalog_v1: any;
  analysis_count: number;
  is_test_mode: boolean;
}

export default function ProcessingScreen() {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<ProcessingPhase>('preparing');
  const [statusText, setStatusText] = useState('Preparing images...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Animations
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Spinning animation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Start processing
    processImages();
  }, []);

  const convertUriToBase64 = async (uri: string): Promise<string> => {
    try {
      // Use ImageManipulator which works on all platforms including mobile web
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [], // no transformations needed
        { 
          compress: 0.7, 
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true 
        }
      );
      
      if (!result.base64) {
        throw new Error('Failed to convert image to base64');
      }
      
      return result.base64;
    } catch (error) {
      console.error('Error converting URI to base64:', error);
      throw error;
    }
  };

  const clearTemporaryImages = async () => {
    // Clear stored URIs after processing
    await AsyncStorage.multiRemove([
      'sgc_image_face_uri',
      'sgc_image_body_uri',
      'sgc_image_skin_uri',
    ]);
  };

  const processImages = async () => {
    try {
      // Track analysis started
      trackAnalysisStarted();
      
      // Phase 1: Preparing - Convert URIs to base64
      setPhase('preparing');
      setStatusText('Preparing your photos...');

      const faceUri = await AsyncStorage.getItem('sgc_image_face_uri');
      const bodyUri = await AsyncStorage.getItem('sgc_image_body_uri');
      const skinUri = await AsyncStorage.getItem('sgc_image_skin_uri');

      if (!faceUri || !bodyUri || !skinUri) {
        throw new Error('Missing images. Please complete all scans.');
      }

      // Convert to base64 just before upload
      setStatusText('Processing images...');
      const [faceBase64, bodyBase64, skinBase64] = await Promise.all([
        convertUriToBase64(faceUri),
        convertUriToBase64(bodyUri),
        convertUriToBase64(skinUri),
      ]);

      // Phase 2: Analyzing - Call SGC Brain
      setPhase('analyzing');
      setStatusText('Analyzing your identity...');

      // Get user phone for identification
      const phone = await AsyncStorage.getItem('sgc_phone');

      const response = await fetch(`${BACKEND_URL}/api/sgc-brain/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [faceBase64, bodyBase64, skinBase64],
          phone: phone?.replace('+1', '') || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Check if this is a validation error
        if (errorData.detail?.error === 'IMAGE_VALIDATION_FAILED') {
          const messages = errorData.detail.messages || [];
          // Track validation failure
          trackAnalysisFailedInvalidImage('face', messages.join(' | '));
          throw new Error(messages.join('\n\n') || 'Image validation failed. Please retake your photos.');
        }
        
        throw new Error(errorData.detail?.message || errorData.detail || 'Analysis failed. Please try again.');
      }

      const result: SGCBrainResult = await response.json();
      console.log('Processing - API Response received');
      console.log('Processing - Result keys:', Object.keys(result));
      console.log('Processing - Has outfit_catalog_v1:', !!result.outfit_catalog_v1);

      // Track analysis completed with key data
      trackAnalysisCompleted({
        face_shape: result.identity_snapshot_v1?.face_shape,
        body_type: result.identity_snapshot_v1?.body_type,
        skin_tone: result.identity_snapshot_v1?.skin_tone,
        seasonal_palette: result.identity_snapshot_v1?.seasonal_palette,
      });

      // Store the results
      try {
        const dataToStore = JSON.stringify(result);
        console.log('Processing - Data size to store:', dataToStore.length, 'bytes');
        await AsyncStorage.setItem('sgc_brain_result', dataToStore);
        console.log('Processing - Stored sgc_brain_result successfully');
        
        // Verify storage worked
        const verification = await AsyncStorage.getItem('sgc_brain_result');
        console.log('Processing - Verification read:', !!verification, verification?.length || 0, 'bytes');
        
        await AsyncStorage.setItem('sgc_has_completed_analysis', 'true');
        console.log('Processing - Stored has_completed_analysis');
      } catch (storageError) {
        console.error('Processing - Storage error:', storageError);
      }

      // Clear temporary image URIs
      await clearTemporaryImages();

      // Phase 3: Complete
      setPhase('complete');
      setStatusText('Identity unlocked!');

      // Navigate to results after brief success animation
      setTimeout(() => {
        router.replace({
          pathname: '/style-engine/results',
          params: { 
            fromProcessing: 'true',
            generateImages: 'true' // Signal results to start Phase B
          }
        });
      }, 1000);

    } catch (error: any) {
      console.error('Processing error:', error);
      
      // Capture error in Sentry
      if (error.message?.includes('validation failed') || error.message?.includes('Please upload')) {
        // Validation error - track as warning
        captureValidationError('face', error.message);
      } else {
        // Other errors - track as error
        captureException(error, {
          tags: { screen: 'processing', phase },
          extra: { errorMessage: error.message },
        });
      }
      
      setPhase('error');
      setErrorMessage(error.message || 'Something went wrong. Please try again.');
      
      // Clear temporary images even on error
      await clearTemporaryImages();
    }
  };

  const handleRetry = () => {
    // Go back to face scan to restart
    router.replace('/style-engine/face-scan');
  };

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getPhaseIcon = () => {
    switch (phase) {
      case 'preparing':
        return 'images-outline';
      case 'analyzing':
        return 'sparkles';
      case 'complete':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      default:
        return 'sparkles';
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'complete':
        return COLORS.success;
      case 'error':
        return COLORS.error;
      default:
        return COLORS.accent;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Brain Icon Animation */}
        <View style={styles.iconSection}>
          {phase !== 'complete' && phase !== 'error' ? (
            <Animated.View
              style={[
                styles.spinnerContainer,
                {
                  transform: [{ rotate: spinInterpolate }, { scale: pulseAnim }],
                },
              ]}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="sparkles" size={48} color={COLORS.accent} />
              </View>
            </Animated.View>
          ) : (
            <Animated.View
              style={[
                styles.iconCircle,
                { 
                  backgroundColor: phase === 'complete' ? '#E8F5E9' : '#FFEBEE',
                  transform: [{ scale: pulseAnim }] 
                },
              ]}
            >
              <Ionicons 
                name={getPhaseIcon() as any} 
                size={48} 
                color={getPhaseColor()} 
              />
            </Animated.View>
          )}
        </View>

        {/* Status Text */}
        <Text style={styles.title}>
          {phase === 'analyzing' ? 'TheGent AI' : 
           phase === 'complete' ? 'Analysis Complete' :
           phase === 'error' ? 'Analysis Failed' : 'Preparing'}
        </Text>
        
        <Text style={styles.statusText}>{statusText}</Text>

        {/* Progress Indicators */}
        {phase !== 'error' && phase !== 'complete' && (
          <View style={styles.progressSection}>
            <View style={styles.progressSteps}>
              <View style={[styles.progressStep, phase === 'preparing' && styles.progressStepActive]}>
                <Ionicons 
                  name="images-outline" 
                  size={16} 
                  color={phase === 'preparing' ? COLORS.accent : COLORS.muted} 
                />
                <Text style={[
                  styles.progressStepText,
                  phase === 'preparing' && styles.progressStepTextActive
                ]}>
                  Preparing
                </Text>
              </View>
              
              <View style={styles.progressLine} />
              
              <View style={[styles.progressStep, phase === 'analyzing' && styles.progressStepActive]}>
                <Ionicons 
                  name="sparkles-outline" 
                  size={16} 
                  color={phase === 'analyzing' ? COLORS.accent : COLORS.muted} 
                />
                <Text style={[
                  styles.progressStepText,
                  phase === 'analyzing' && styles.progressStepTextActive
                ]}>
                  Analyzing
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Error State */}
        {phase === 'error' && (
          <View style={styles.errorSection}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <View style={styles.errorButton} onTouchEnd={handleRetry}>
              <Ionicons name="refresh" size={18} color={COLORS.white} />
              <Text style={styles.errorButtonText}>Try Again</Text>
            </View>
          </View>
        )}

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <Ionicons name="shield-checkmark" size={14} color={COLORS.muted} />
          <Text style={styles.privacyText}>
            Your photos are analyzed securely and never stored
          </Text>
        </View>
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
    paddingHorizontal: 32,
  },
  iconSection: {
    marginBottom: 32,
  },
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.accent,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 40,
  },
  progressSection: {
    marginBottom: 40,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStep: {
    alignItems: 'center',
    paddingHorizontal: 16,
    opacity: 0.5,
  },
  progressStepActive: {
    opacity: 1,
  },
  progressStepText: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 6,
  },
  progressStepTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.lightBorder,
  },
  errorSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
  },
  errorButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 8,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    left: 32,
    right: 32,
    justifyContent: 'center',
  },
  privacyText: {
    fontSize: 12,
    color: COLORS.muted,
    marginLeft: 6,
  },
});
