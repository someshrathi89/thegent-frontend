import React, { useEffect, useRef } from 'react';
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
import { StatusBar } from 'expo-status-bar';

const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  lightBorder: '#E8E6E1',
};

const PHASES = [
  {
    id: 1,
    title: 'Facial Analysis',
    subtitle: 'Face shape & hairline mapping',
    icon: 'scan-outline',
    duration: '30 sec',
  },
  {
    id: 2,
    title: 'Body Mapping',
    subtitle: 'Silhouette & proportions',
    icon: 'body-outline',
    duration: '20 sec',
  },
  {
    id: 3,
    title: 'Skin Analysis',
    subtitle: 'Undertones & seasonal palette',
    icon: 'color-palette-outline',
    duration: '15 sec',
  },
  {
    id: 4,
    title: 'Style Profile',
    subtitle: 'Archetype & preferences',
    icon: 'options-outline',
    duration: '1 min',
  },
];

export default function StyleEngineIntro() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    router.back();
  };

  const handleStart = () => {
    router.push('/style-engine/analysis-intro');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.labBadge}>
          <Ionicons name="flask" size={14} color={COLORS.accent} />
          <Text style={styles.labText}>STYLE LAB</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Title Section */}
          <View style={styles.titleSection}>
            <View style={styles.dnaIcon}>
              <Ionicons name="finger-print" size={40} color={COLORS.accent} />
            </View>
            <Text style={styles.title}>Style Identity Engine</Text>
            <Text style={styles.subtitle}>
              A science-backed analysis system that maps your unique physical attributes to create
              your personalized style blueprint.
            </Text>
          </View>

          {/* Phases */}
          <View style={styles.phasesSection}>
            <Text style={styles.sectionLabel}>ANALYSIS PROTOCOL</Text>
            {PHASES.map((phase, index) => (
              <View key={phase.id} style={styles.phaseCard}>
                <View style={styles.phaseNumber}>
                  <Text style={styles.phaseNumberText}>{phase.id}</Text>
                </View>
                <View style={styles.phaseContent}>
                  <View style={styles.phaseHeader}>
                    <Ionicons name={phase.icon as any} size={20} color={COLORS.accent} />
                    <Text style={styles.phaseTitle}>{phase.title}</Text>
                  </View>
                  <Text style={styles.phaseSubtitle}>{phase.subtitle}</Text>
                </View>
                <Text style={styles.phaseDuration}>{phase.duration}</Text>
              </View>
            ))}
          </View>

          {/* Scientific Note */}
          <View style={styles.noteCard}>
            <Ionicons name="shield-checkmark" size={18} color={COLORS.accent} />
            <Text style={styles.noteText}>
              Your photos are analyzed in real-time and never stored. Our AI uses advanced facial
              geometry and color science algorithms.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.9}>
          <Text style={styles.startButtonText}>Begin Analysis</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.timeEstimate}>Estimated time: 2-3 minutes</Text>
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
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  labBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF8E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  labText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1.5,
    marginLeft: 6,
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
    marginTop: 20,
    marginBottom: 40,
  },
  dnaIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  phasesSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  phaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  phaseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  phaseNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  phaseContent: {
    flex: 1,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  phaseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  phaseSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginLeft: 28,
  },
  phaseDuration: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#FDF8E8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 20,
    marginLeft: 12,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightBorder,
  },
  startButton: {
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
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginRight: 8,
  },
  timeEstimate: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 12,
  },
});
