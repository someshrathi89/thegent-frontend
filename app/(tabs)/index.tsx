import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { trackTaskStarted, trackTaskCompleted } from '../../utils/analytics';

// Premium Design System
const COLORS = {
  background: '#F9F8F4',
  headerGlass: 'rgba(253, 251, 247, 0.8)',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  accentLight: '#E8C547',
  accentDark: '#B8962E',
  bronze: '#CD7F32',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  cardBg: 'rgba(255, 255, 255, 0.85)',
  glassBg: 'rgba(255, 255, 255, 0.65)',
  lightBorder: 'rgba(232, 230, 225, 0.6)',
  success: '#4CAF50',
  glowGold: 'rgba(212, 175, 55, 0.4)',
  glowGoldActive: 'rgba(212, 175, 55, 0.6)',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface TransformationTask {
  day: number;
  week: number;
  title: string;
  instruction: string;
  cta_text: string;
  deep_link: string;
  deep_link_section?: string;
}

interface TodayTaskResponse {
  has_started: boolean;
  current_day?: number;
  current_week?: number;
  total_days?: number;
  task?: TransformationTask;
  is_completed?: boolean;
  completed_tasks?: number[];
  locked?: boolean;
  locked_message?: string;
  message?: string;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [todayTask, setTodayTask] = useState<TodayTaskResponse | null>(null);
  const [markingDone, setMarkingDone] = useState(false);
  const [hasLocalAnalysis, setHasLocalAnalysis] = useState(false);
  
  // Scroll animation for header glassmorphism
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const getGreeting = () => {
    return 'Hello';
  };

  const fetchTodayTask = async (userPhone: string) => {
    // Create abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/transformation/today-task?phone=${userPhone}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        setTodayTask(data);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.log('Today task fetch timed out');
      } else {
        console.log('Error fetching today task:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPhone = async () => {
    try {
      const storedPhone = await AsyncStorage.getItem('sgc_phone');
      const storedFirstName = await AsyncStorage.getItem('user_first_name');
      const hasCompletedAnalysis = await AsyncStorage.getItem('sgc_has_completed_analysis');
      
      if (storedFirstName) {
        setFirstName(storedFirstName);
      }
      
      // Check if user has completed local analysis
      if (hasCompletedAnalysis === 'true') {
        setHasLocalAnalysis(true);
      }
      
      if (storedPhone) {
        const cleanPhone = storedPhone.replace('+1', '');
        setPhone(cleanPhone);
        await fetchTodayTask(cleanPhone);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.log('Error loading phone:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhone();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    if (phone) {
      await fetchTodayTask(phone);
    }
    setRefreshing(false);
  };

  const handleTaskCTA = async () => {
    if (!todayTask?.task) return;

    const { deep_link, deep_link_section } = todayTask.task;

    // Track task started
    trackTaskStarted(todayTask.task.day, todayTask.task.title, todayTask.task.week);

    if (deep_link === 'mark_done') {
      await markTaskComplete();
      return;
    }

    if (deep_link_section) {
      await AsyncStorage.setItem('scroll_to_section', deep_link_section);
    }
    router.push(deep_link as any);
  };

  const markTaskComplete = async () => {
    if (!phone || !todayTask?.task) return;

    setMarkingDone(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/transformation/complete-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          day: todayTask.task.day,
        }),
      });

      if (response.ok) {
        // Track task completed
        trackTaskCompleted(todayTask.task.day, todayTask.task.title, todayTask.task.week);
        await fetchTodayTask(phone);
      }
    } catch (error) {
      console.log('Error completing task:', error);
    } finally {
      setMarkingDone(false);
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  // Premium CTA Button with metallic gold gradient
  const renderCTAButton = (text: string, onPress: () => void, isLoading?: boolean) => (
    <TouchableOpacity
      style={styles.ctaButtonWrapper}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={isLoading}
    >
      <LinearGradient
        colors={['#E8C547', '#D4AF37', '#B8962E', '#CD7F32']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ctaButton}
      >
        <View style={styles.ctaInnerGlow} />
        {isLoading ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <Text style={styles.ctaButtonText}>{text}</Text>
            <View style={styles.ctaIconWrapper}>
              <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
            </View>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  // Icon with golden ambient glow
  const renderGlowIcon = (iconName: string, size: number, isActive: boolean = true) => (
    <View style={styles.glowIconContainer}>
      {isActive && (
        <>
          <View style={styles.glowOuter} />
          <View style={styles.glowInner} />
        </>
      )}
      <Ionicons name={iconName as any} size={size} color={COLORS.accent} />
    </View>
  );

  const renderTaskCard = () => {
    if (!todayTask) return null;

    // Not started - needs analysis (but check local state too)
    if (!todayTask.has_started) {
      // If user has completed analysis locally, show "View Your Style" instead
      if (hasLocalAnalysis) {
        return (
          <View style={styles.glassCardWrapper}>
            <View style={styles.glassCard}>
              <View style={styles.glassCardInner}>
                <View style={styles.taskHeader}>
                  <View style={styles.taskIconContainer}>
                    <View style={styles.iconGlowOuter} />
                    <View style={styles.iconGlowInner} />
                    <Ionicons name="checkmark-circle" size={28} color={COLORS.accent} />
                  </View>
                  <View style={styles.taskHeaderText}>
                    <Text style={styles.taskLabel}>ANALYSIS COMPLETE</Text>
                    <Text style={styles.taskTitle}>Your Style Blueprint</Text>
                  </View>
                </View>
                <Text style={styles.taskInstruction}>
                  Your personalized style analysis is ready. View your color palette, style recommendations, and more.
                </Text>
                {renderCTAButton('View My Style', () => router.push('/(tabs)/style'))}
              </View>
            </View>
          </View>
        );
      }
      
      return (
        <View style={styles.glassCardWrapper}>
          <View style={styles.glassCard}>
            <View style={styles.glassCardInner}>
              <View style={styles.taskHeader}>
                <View style={styles.taskIconContainer}>
                  <View style={styles.iconGlowOuter} />
                  <View style={styles.iconGlowInner} />
                  <Ionicons name="fitness-outline" size={28} color={COLORS.accent} />
                </View>
                <View style={styles.taskHeaderText}>
                  <Text style={styles.taskLabel}>YOUR TRANSFORMATION</Text>
                  <Text style={styles.taskTitle}>Get Started</Text>
                </View>
              </View>
              <Text style={styles.taskInstruction}>
                Complete your style analysis to begin your 90-day transformation.
              </Text>
              {renderCTAButton('Start Style Analysis', () => router.push('/style-engine/analysis-intro'))}
            </View>
          </View>
        </View>
      );
    }

    // Locked (weeks 5-12 without membership)
    if (todayTask.locked) {
      return (
        <View style={styles.glassCardWrapper}>
          <View style={styles.glassCard}>
            <View style={styles.glassCardInner}>
              <View style={styles.taskHeader}>
                <View style={[styles.taskIconContainer, styles.taskIconLocked]}>
                  <Ionicons name="lock-closed" size={28} color={COLORS.muted} />
                </View>
                <View style={styles.taskHeaderText}>
                  <Text style={styles.taskLabel}>MONTH 2</Text>
                  <Text style={styles.taskTitle}>Advanced Refinement</Text>
                </View>
              </View>
              <Text style={styles.taskInstruction}>{todayTask.locked_message}</Text>
              <View style={styles.lockedBadge}>
                <Text style={styles.lockedBadgeText}>Upgrade to unlock</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Active task
    if (todayTask.task) {
      const isCompleted = todayTask.is_completed;

      return (
        <View style={styles.glassCardWrapper}>
          <View style={styles.cardShadow} />
          <View style={styles.glassCard}>
            <View style={styles.glassCardInner}>
              <View style={styles.taskHeader}>
                <View style={[styles.taskIconContainer, isCompleted && styles.taskIconCompleted]}>
                  {!isCompleted && (
                    <>
                      <View style={styles.iconGlowOuter} />
                      <View style={styles.iconGlowInner} />
                    </>
                  )}
                  <Ionicons 
                    name={isCompleted ? "checkmark-circle" : "fitness-outline"} 
                    size={28} 
                    color={isCompleted ? COLORS.success : COLORS.accent} 
                  />
                </View>
                <View style={styles.taskHeaderText}>
                  <Text style={styles.taskLabel}>TODAY'S TASK</Text>
                  <Text style={styles.taskTitle}>{todayTask.task.title}</Text>
                </View>
              </View>
              <Text style={styles.taskInstruction}>{todayTask.task.instruction}</Text>
              
              {isCompleted ? (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                  <Text style={styles.completedBadgeText}>Completed</Text>
                </View>
              ) : (
                renderCTAButton(todayTask.task.cta_text, handleTaskCTA, markingDone)
              )}
            </View>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Fixed Header with Glassmorphism on Scroll */}
      <Animated.View 
        style={[
          styles.fixedHeader,
          { 
            paddingTop: insets.top,
            opacity: headerOpacity,
          }
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={40} tint="light" style={styles.headerBlur}>
            <View style={styles.headerGlassOverlay} />
          </BlurView>
        ) : (
          <View style={[styles.headerBlur, styles.headerGlassAndroid]} />
        )}
      </Animated.View>

      {/* Actual Header Content (always visible) */}
      <View style={[styles.headerContent, { paddingTop: insets.top + 12 }]}>
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.greetingName}>{firstName || 'Gentleman'}</Text>
        </View>
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 70 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* 90-Day Transformation Header */}
        <View style={styles.transformationHeader}>
          <Text style={styles.transformationTitle}>Your 90-Day Style Transformation</Text>
          {todayTask?.has_started && todayTask.current_day && (
            <Text style={styles.transformationSubtitle}>
              Week {todayTask.current_week} · Day {todayTask.current_day} of {todayTask.total_days || 90} · One step closer
            </Text>
          )}
        </View>

        {/* Today's Task Card - Glassmorphism */}
        {loading ? (
          <View style={styles.glassCardWrapper}>
            <View style={styles.glassCard}>
              <View style={[styles.glassCardInner, styles.loadingCard]}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.loadingText}>Loading your task...</Text>
              </View>
            </View>
          </View>
        ) : (
          renderTaskCard()
        )}

        {/* Progress Overview */}
        {todayTask?.has_started && todayTask.completed_tasks && (
          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Progress</Text>
            <View style={styles.progressCard}>
              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Text style={styles.progressNumber}>{todayTask.completed_tasks.length}</Text>
                  <Text style={styles.progressLabel}>Tasks Done</Text>
                </View>
                <View style={styles.progressDivider} />
                <View style={styles.progressStat}>
                  <Text style={styles.progressNumber}>{todayTask.current_day || 1}</Text>
                  <Text style={styles.progressLabel}>Current Day</Text>
                </View>
                <View style={styles.progressDivider} />
                <View style={styles.progressStat}>
                  <Text style={styles.progressNumber}>{todayTask.current_week || 1}</Text>
                  <Text style={styles.progressLabel}>Week</Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={['#E8C547', '#D4AF37', '#B8962E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${((todayTask.current_day || 1) / 90) * 100}%` }]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Quick Links with Enhanced Glow Effect */}
        <View style={styles.quickLinksSection}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickLinksRow}>
            <TouchableOpacity 
              style={styles.quickLinkCard}
              onPress={() => router.push('/(tabs)/style')}
              activeOpacity={0.8}
            >
              <View style={styles.quickLinkIconWrapper}>
                <View style={styles.quickLinkGlowOuter} />
                <View style={styles.quickLinkGlowInner} />
                <View style={styles.quickLinkIcon}>
                  <Ionicons name="person-outline" size={22} color={COLORS.accent} />
                </View>
              </View>
              <Text style={styles.quickLinkText}>My Style</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickLinkCard}
              onPress={() => router.push('/(tabs)/formulas')}
              activeOpacity={0.8}
            >
              <View style={styles.quickLinkIconWrapper}>
                <View style={styles.quickLinkGlowOuter} />
                <View style={styles.quickLinkGlowInner} />
                <View style={styles.quickLinkIcon}>
                  <Ionicons name="shirt-outline" size={22} color={COLORS.accent} />
                </View>
              </View>
              <Text style={styles.quickLinkText}>Formulas</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickLinkCard}
              onPress={() => router.push('/(tabs)/grooming')}
              activeOpacity={0.8}
            >
              <View style={styles.quickLinkIconWrapper}>
                <View style={styles.quickLinkGlowOuter} />
                <View style={styles.quickLinkGlowInner} />
                <View style={styles.quickLinkIcon}>
                  <Ionicons name="fitness-outline" size={22} color={COLORS.accent} />
                </View>
              </View>
              <Text style={styles.quickLinkText}>Journey</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Spacer for bottom tab */}
        <View style={{ height: 20 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Fixed Header with Glassmorphism
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 100,
    overflow: 'hidden',
  },
  headerBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  headerGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.headerGlass,
  },
  headerGlassAndroid: {
    backgroundColor: COLORS.headerGlass,
  },
  headerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 101,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  greeting: {
    fontSize: 15,
    fontWeight: '300',
    color: COLORS.muted,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
  },
  greetingName: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.muted,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    marginLeft: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginTop: 2,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  transformationHeader: {
    marginBottom: 16,
  },
  transformationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  transformationSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 16,
  },
  // Glassmorphism Card
  glassCardWrapper: {
    marginBottom: 24,
    position: 'relative',
  },
  cardShadow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: -8,
    borderRadius: 24,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  glassCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  glassCardInner: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.muted,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  taskIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(253, 248, 232, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
  },
  // Enhanced Golden Glow for Task Icon
  iconGlowOuter: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    top: -8,
    left: -8,
  },
  iconGlowInner: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(212, 175, 55, 0.25)',
    top: -4,
    left: -4,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 15,
      },
    }),
  },
  taskIconCompleted: {
    backgroundColor: '#E8F5E9',
  },
  taskIconLocked: {
    backgroundColor: '#F5F5F5',
  },
  taskHeaderText: {
    flex: 1,
  },
  taskLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.primary,
  },
  taskInstruction: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 21,
    marginBottom: 20,
  },
  // Premium CTA Button
  ctaButtonWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 28,
    borderRadius: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  ctaInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  ctaIconWrapper: {
    marginLeft: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 8,
  },
  completedBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  lockedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  lockedBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.muted,
  },
  progressSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  progressCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressStat: {
    flex: 1,
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressLabel: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.lightBorder,
  },
  progressBar: {
    height: 5,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  quickLinksSection: {
    marginBottom: 24,
  },
  quickLinksRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickLinkCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  quickLinkIconWrapper: {
    position: 'relative',
    marginBottom: 8,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Enhanced Golden Glow for Quick Links
  quickLinkGlowOuter: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
  },
  quickLinkGlowInner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
    }),
  },
  quickLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  quickLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Generic glow icon styles
  glowIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOuter: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
  },
  glowInner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(212, 175, 55, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
      },
    }),
  },
});
