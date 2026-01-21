import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  lightBorder: '#E8E6E1',
};

interface Option {
  id: string;
  label: string;
  icon: string;
}

const BUDGET_OPTIONS: Option[] = [
  { id: 'accessible', label: 'Accessible Luxury', icon: 'wallet-outline' },
  { id: 'mid', label: 'Mid-Range Premium', icon: 'card-outline' },
  { id: 'high', label: 'High-End Designer', icon: 'diamond-outline' },
  { id: 'bespoke', label: 'Bespoke & Couture', icon: 'ribbon-outline' },
];

const USE_CASE_OPTIONS: Option[] = [
  { id: 'business', label: 'Business & Corporate', icon: 'briefcase-outline' },
  { id: 'social', label: 'Social & Networking', icon: 'people-outline' },
  { id: 'high-stakes', label: 'High-Stakes Events', icon: 'star-outline' },
  { id: 'everyday', label: 'Elevated Everyday', icon: 'sunny-outline' },
];

export default function PreferencesScreen() {
  const insets = useSafeAreaInsets();
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const toggleUseCase = (id: string) => {
    setSelectedUseCases((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleComplete = async () => {
    if (!selectedBudget || selectedUseCases.length === 0) return;

    await AsyncStorage.setItem(
      'style_engine_preferences',
      JSON.stringify({
        budget: selectedBudget,
        use_cases: selectedUseCases,
      })
    );

    // Get user email
    const email = await AsyncStorage.getItem('sgc_email');
    
    if (email) {
      // Get all stored analysis data
      const faceData = await AsyncStorage.getItem('style_engine_face');
      const bodyData = await AsyncStorage.getItem('style_engine_body');
      const skinData = await AsyncStorage.getItem('style_engine_skin');
      const archetype = await AsyncStorage.getItem('style_engine_archetype');

      try {
        // Save complete profile to backend
        const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
        const profileResponse = await fetch(`${BACKEND_URL}/api/style-engine/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            face: faceData ? JSON.parse(faceData) : {},
            body: bodyData ? JSON.parse(bodyData) : {},
            skin: skinData ? JSON.parse(skinData) : {},
            archetype,
            preferences: {
              budget: selectedBudget,
              use_cases: selectedUseCases,
            },
          }),
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          await AsyncStorage.setItem('style_engine_complete', JSON.stringify(profileData));
        }
      } catch (error) {
        console.log('Error saving profile to backend:', error);
      }
    }

    // Mark analysis as complete
    await AsyncStorage.setItem('sgc_has_completed_analysis', 'true');

    // Navigate to My Style tab (not gate anymore)
    router.replace('/(tabs)/style');
  };

  const handleBack = () => {
    router.back();
  };

  const isComplete = selectedBudget && selectedUseCases.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>FINAL STEP</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Define Your Parameters</Text>
            <Text style={styles.subtitle}>
              Fine-tune your style recommendations based on budget and context
            </Text>
          </View>

          {/* Budget Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>INVESTMENT LEVEL</Text>
            <View style={styles.optionsGrid}>
              {BUDGET_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    selectedBudget === option.id && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedBudget(option.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={22}
                    color={selectedBudget === option.id ? COLORS.accent : COLORS.muted}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      selectedBudget === option.id && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selectedBudget === option.id && (
                    <View style={styles.checkMark}>
                      <Ionicons name="checkmark" size={12} color={COLORS.white} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Use Cases Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PRIMARY USE CASES</Text>
            <Text style={styles.sectionHint}>Select all that apply</Text>
            <View style={styles.optionsGrid}>
              {USE_CASE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    selectedUseCases.includes(option.id) && styles.optionCardSelected,
                  ]}
                  onPress={() => toggleUseCase(option.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={22}
                    color={
                      selectedUseCases.includes(option.id) ? COLORS.accent : COLORS.muted
                    }
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      selectedUseCases.includes(option.id) && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selectedUseCases.includes(option.id) && (
                    <View style={styles.checkMark}>
                      <Ionicons name="checkmark" size={12} color={COLORS.white} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity
          style={[styles.completeButton, !isComplete && styles.completeButtonDisabled]}
          onPress={handleComplete}
          disabled={!isComplete}
          activeOpacity={0.9}
        >
          <Text style={styles.completeButtonText}>Complete Analysis</Text>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
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
    justifyContent: 'space-between',
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
  stepIndicator: {
    backgroundColor: '#FDF8E8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  stepText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1.5,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
  },
  titleSection: {
    marginTop: 10,
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  optionCard: {
    width: '47%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    margin: 6,
    borderWidth: 2,
    borderColor: COLORS.lightBorder,
    alignItems: 'center',
    position: 'relative',
  },
  optionCardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: '#FFFDF8',
  },
  optionLabel: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 10,
  },
  optionLabelSelected: {
    color: COLORS.accent,
  },
  checkMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightBorder,
  },
  completeButton: {
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
  completeButtonDisabled: {
    backgroundColor: COLORS.muted,
    opacity: 0.5,
    shadowOpacity: 0,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginRight: 8,
  },
});
