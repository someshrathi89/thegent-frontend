import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_SIZE = SCREEN_WIDTH * 0.5;

const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.75)',
};

export default function SkinScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (isAnalyzing) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isAnalyzing]);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false, // Don't generate base64 - we'll do it later
      });

      if (photo) {
        // Resize image and save to local file (NOT base64)
        const manipulated = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 600 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        setIsAnalyzing(true);

        // Store file URI only (NOT base64) - will convert on processing screen
        await AsyncStorage.setItem('sgc_image_skin_uri', manipulated.uri);
        
        // Brief animation then navigate to Processing screen (the Brain!)
        setTimeout(() => {
          router.push('/style-engine/processing');
        }, 1200);
      }
    } catch (error) {
      console.error('Capture error:', error);
      setIsCapturing(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        {/* Overlay with circle cutout */}
        <View style={styles.overlay}>
          <View style={styles.topOverlay} />
          <View style={styles.middleRow}>
            <View style={styles.sideOverlay} />
            <Animated.View
              style={[
                styles.circleContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={styles.circle} />
              <View style={styles.circleBorder} />
              {/* Crosshair */}
              <View style={styles.crosshairH} />
              <View style={styles.crosshairV} />
              {/* Color sampling indicators */}
              <View style={[styles.sampleDot, { top: '30%', left: '30%' }]} />
              <View style={[styles.sampleDot, { top: '30%', right: '30%' }]} />
              <View style={[styles.sampleDot, { bottom: '30%', left: '30%' }]} />
              <View style={[styles.sampleDot, { bottom: '30%', right: '30%' }]} />
              
              {isAnalyzing && (
                <Animated.View
                  style={[
                    styles.analyzeRing,
                    { transform: [{ rotate: rotateInterpolate }] },
                  ]}
                />
              )}
            </Animated.View>
            <View style={styles.sideOverlay} />
          </View>
          <View style={styles.bottomOverlay} />
        </View>

        {/* Vein indicator hint - positioned below the circle but above button area */}
        <View style={styles.veinHint}>
          <Ionicons name="water" size={14} color={COLORS.accent} />
          <Text style={styles.veinHintText}>Blue/green = Cool | Green/olive = Warm</Text>
        </View>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>STEP 3 OF 4</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Bottom UI */}
        <View style={[styles.bottomUI, { paddingBottom: Math.max(insets.bottom, 30) }]}>
          {isAnalyzing ? (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="small" color={COLORS.accent} />
              <Text style={styles.analyzingText}>Analyzing skin undertones...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.instruction}>
                Position your inner wrist in the circle
              </Text>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={handleCapture}
                disabled={isCapturing}
                activeOpacity={0.8}
              >
                <View style={styles.captureButtonInner}>
                  {isCapturing ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Ionicons name="color-palette" size={28} color={COLORS.primary} />
                  )}
                </View>
              </TouchableOpacity>
              <Text style={styles.hint}>Natural lighting recommended</Text>
            </>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
  },
  middleRow: {
    flexDirection: 'row',
    height: CIRCLE_SIZE,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
  },
  circleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE_SIZE - 4,
    height: CIRCLE_SIZE - 4,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: 'transparent',
  },
  circleBorder: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  crosshairH: {
    position: 'absolute',
    width: 20,
    height: 1,
    backgroundColor: COLORS.accent,
  },
  crosshairV: {
    position: 'absolute',
    width: 1,
    height: 20,
    backgroundColor: COLORS.accent,
  },
  sampleDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  analyzeRing: {
    position: 'absolute',
    width: CIRCLE_SIZE + 20,
    height: CIRCLE_SIZE + 20,
    borderRadius: (CIRCLE_SIZE + 20) / 2,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
  },
  veinHint: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  veinHintText: {
    fontSize: 11,
    color: COLORS.white,
    marginLeft: 6,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  stepText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1.5,
  },
  bottomUI: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  instruction: {
    fontSize: 15,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 16,
  },
  analyzingContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 16,
  },
  analyzingText: {
    fontSize: 15,
    color: COLORS.white,
    marginTop: 12,
    fontWeight: '500',
  },
});
