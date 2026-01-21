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

interface Archetype {
  id: string;
  name: string;
  description: string;
  icon: string;
  traits: string[];
}

const ARCHETYPES: Archetype[] = [
  {
    id: 'executive',
    name: 'The Executive',
    description: 'Commanding presence with refined power dressing',
    icon: 'business',
    traits: ['Structured suits', 'Power colors', 'Minimal accessories'],
  },
  {
    id: 'creative',
    name: 'The Creative',
    description: 'Artful expression through unconventional choices',
    icon: 'color-wand',
    traits: ['Unique textures', 'Bold patterns', 'Statement pieces'],
  },
  {
    id: 'minimalist',
    name: 'Classic Minimalist',
    description: 'Timeless elegance through simplicity',
    icon: 'remove',
    traits: ['Neutral palette', 'Clean lines', 'Quality basics'],
  },
];

export default function ArchetypeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleContinue = async () => {
    if (!selectedArchetype) return;
    await AsyncStorage.setItem('style_engine_archetype', selectedArchetype);
    router.push('/style-engine/preferences');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>STEP 4 OF 4</Text>
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
            <View style={styles.iconContainer}>
              <Ionicons name="diamond" size={32} color={COLORS.accent} />
            </View>
            <Text style={styles.title}>Select Your Style Archetype</Text>
            <Text style={styles.subtitle}>
              Choose the identity that best represents your desired presence
            </Text>
          </View>

          {/* Archetype Cards */}
          <View style={styles.archetypesContainer}>
            {ARCHETYPES.map((archetype) => (
              <TouchableOpacity
                key={archetype.id}
                style={[
                  styles.archetypeCard,
                  selectedArchetype === archetype.id && styles.archetypeCardSelected,
                ]}
                onPress={() => setSelectedArchetype(archetype.id)}
                activeOpacity={0.8}
              >
                <View style={styles.archetypeHeader}>
                  <View
                    style={[
                      styles.archetypeIcon,
                      selectedArchetype === archetype.id && styles.archetypeIconSelected,
                    ]}
                  >
                    <Ionicons
                      name={archetype.icon as any}
                      size={24}
                      color={selectedArchetype === archetype.id ? COLORS.white : COLORS.accent}
                    />
                  </View>
                  {selectedArchetype === archetype.id && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark" size={14} color={COLORS.white} />
                    </View>
                  )}
                </View>
                <Text style={styles.archetypeName}>{archetype.name}</Text>
                <Text style={styles.archetypeDescription}>{archetype.description}</Text>
                <View style={styles.traitsContainer}>
                  {archetype.traits.map((trait, index) => (
                    <View key={index} style={styles.traitTag}>
                      <Text style={styles.traitText}>{trait}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity
          style={[styles.continueButton, !selectedArchetype && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selectedArchetype}
          activeOpacity={0.9}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
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
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 32,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  archetypesContainer: {
    marginBottom: 20,
  },
  archetypeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.lightBorder,
  },
  archetypeCardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: '#FFFDF8',
  },
  archetypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  archetypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  archetypeIconSelected: {
    backgroundColor: COLORS.accent,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archetypeName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  archetypeDescription: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 12,
  },
  traitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  traitTag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 6,
  },
  traitText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightBorder,
  },
  continueButton: {
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
  continueButtonDisabled: {
    backgroundColor: COLORS.muted,
    opacity: 0.5,
    shadowOpacity: 0,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginRight: 8,
  },
});
