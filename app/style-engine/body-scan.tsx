import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.6)',
};

export default function BodyScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  
  const scanAnim = useRef(new Animated.Value(0)).current;
  const gridOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Grid pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(gridOpacity, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(gridOpacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (isAnalyzing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isAnalyzing]);

  const processAndSaveImage = async (uri: string) => {
    // Resize image and save to local file (NOT base64)
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    setIsAnalyzing(true);

    // Store file URI only (NOT base64) - will convert on processing screen
    await AsyncStorage.setItem('sgc_image_body_uri', manipulated.uri);
    
    // Brief animation then navigate
    setTimeout(() => {
      router.push('/style-engine/skin-scan');
    }, 1200);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo) {
        await processAndSaveImage(photo.uri);
      }
    } catch (error) {
      console.error('Capture error:', error);
      setIsCapturing(false);
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access photos is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,  // Disable cropping - use full image
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        await processAndSaveImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const scanTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_HEIGHT * 0.6],
  });

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        {/* Body guide overlay */}
        <View style={styles.overlay}>
          {/* Guide frame */}
          <View style={styles.guideFrame}>
            <Animated.View style={[styles.gridOverlay, { opacity: gridOpacity }]}>
              {/* Vertical lines */}
              <View style={[styles.gridLine, styles.gridLineVertical, { left: '25%' }]} />
              <View style={[styles.gridLine, styles.gridLineVertical, { left: '50%' }]} />
              <View style={[styles.gridLine, styles.gridLineVertical, { left: '75%' }]} />
              {/* Horizontal lines */}
              <View style={[styles.gridLine, styles.gridLineHorizontal, { top: '25%' }]} />
              <View style={[styles.gridLine, styles.gridLineHorizontal, { top: '50%' }]} />
              <View style={[styles.gridLine, styles.gridLineHorizontal, { top: '75%' }]} />
            </Animated.View>

            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {isAnalyzing && (
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanTranslate }] },
                ]}
              />
            )}
          </View>
        </View>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>STEP 2 OF 4</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Bottom UI */}
        <View style={[styles.bottomUI, { paddingBottom: Math.max(insets.bottom, 30) }]}>
          {isAnalyzing ? (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="small" color={COLORS.accent} />
              <Text style={styles.analyzingText}>Mapping body silhouette...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.instruction}>
                Stand with arms slightly away from body.{"\n"}
                Wear fitted clothing for accurate analysis.
              </Text>
              
              {/* Two options: Camera or Upload */}
              <View style={styles.captureOptions}>
                {/* Upload from Gallery */}
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images-outline" size={24} color={COLORS.white} />
                  <Text style={styles.uploadButtonText}>Upload</Text>
                </TouchableOpacity>

                {/* Camera Capture */}
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
                      <Ionicons name="body" size={28} color={COLORS.primary} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Spacer for symmetry */}
                <View style={styles.uploadButton}>
                  <Text style={styles.uploadHint}>or take{'\n'}a photo</Text>
                </View>
              </View>
              
              <Text style={styles.hint}>Tip: Ask someone to take your photo, or use a mirror</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideFrame: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_HEIGHT * 0.65,
    position: 'relative',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: COLORS.accent,
  },
  gridLineVertical: {
    width: 1,
    height: '100%',
  },
  gridLineHorizontal: {
    height: 1,
    width: '100%',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.accent,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
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
  captureOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  uploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  uploadButtonText: {
    fontSize: 11,
    color: COLORS.white,
    marginTop: 4,
    fontWeight: '500',
  },
  uploadHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 14,
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
    textAlign: 'center',
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
