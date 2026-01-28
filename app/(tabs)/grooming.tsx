import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  lightBorder: '#E8E6E1',
  success: '#4CAF50',
  locked: '#9E9E9E',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Grooming Types
interface GroomingTask {
  id: string;
  title: string;
  frequency: string;
  icon: string;
  completed: boolean;
}

interface RoutineCategory {
  id: string;
  name: string;
  tasks: GroomingTask[];
}

// Transformation Types
interface TransformationTask {
  day: number;
  week: number;
  title: string;
  instruction: string;
  cta_text: string;
  deep_link: string;
  deep_link_section?: string;
  is_completed?: boolean;
}

interface TransformationWeek {
  week: number;
  title: string;
  goal: string;
  tasks: TransformationTask[];
  locked: boolean;
}

interface AllTasksResponse {
  weeks: TransformationWeek[];
  completed_tasks: number[];
  membership_tier: string;
  unlocked_weeks: number;
}

const DEFAULT_ROUTINES: RoutineCategory[] = [
  {
    id: 'daily',
    name: 'Daily Essentials',
    tasks: [
      { id: '1', title: 'Cleanse face (AM & PM)', frequency: 'Daily', icon: 'water-outline', completed: false },
      { id: '2', title: 'Apply moisturizer with SPF', frequency: 'Daily', icon: 'sunny-outline', completed: false },
      { id: '3', title: 'Style hair', frequency: 'Daily', icon: 'brush-outline', completed: false },
      { id: '4', title: 'Apply deodorant', frequency: 'Daily', icon: 'sparkles-outline', completed: false },
      { id: '5', title: 'Brush teeth (twice)', frequency: 'Daily', icon: 'happy-outline', completed: false },
    ],
  },
  {
    id: 'weekly',
    name: 'Weekly Rituals',
    tasks: [
      { id: '6', title: 'Exfoliate face', frequency: '2x Weekly', icon: 'refresh-outline', completed: false },
      { id: '7', title: 'Deep condition hair', frequency: 'Weekly', icon: 'leaf-outline', completed: false },
      { id: '8', title: 'Trim facial hair', frequency: 'Weekly', icon: 'cut-outline', completed: false },
      { id: '9', title: 'Manicure check', frequency: 'Weekly', icon: 'hand-left-outline', completed: false },
    ],
  },
  {
    id: 'monthly',
    name: 'Monthly Maintenance',
    tasks: [
      { id: '10', title: 'Haircut appointment', frequency: 'Monthly', icon: 'calendar-outline', completed: false },
      { id: '11', title: 'Skin assessment', frequency: 'Monthly', icon: 'scan-outline', completed: false },
      { id: '12', title: 'Replace toiletries', frequency: 'Monthly', icon: 'cart-outline', completed: false },
    ],
  },
];

export default function MyStyleJourneyScreen() {
  const insets = useSafeAreaInsets();
  const [activeCard, setActiveCard] = useState<'grooming' | 'transformation'>('transformation');
  const [refreshing, setRefreshing] = useState(false);
  
  // Grooming state
  const [routines, setRoutines] = useState<RoutineCategory[]>(DEFAULT_ROUTINES);
  const [expandedCategory, setExpandedCategory] = useState<string>('daily');
  
  // Transformation state
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [transformationData, setTransformationData] = useState<AllTasksResponse | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number>(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storedPhone = await AsyncStorage.getItem('sgc_phone');
      if (storedPhone) {
        const cleanPhone = storedPhone.replace('+1', '');
        setPhone(cleanPhone);
        await fetchTransformationTasks(cleanPhone);
      }
    } catch (error) {
      console.log('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransformationTasks = async (userPhone: string) => {
    // Create abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/transformation/all-tasks?phone=${userPhone}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        setTransformationData(data);
        
        // Auto-expand the current week based on completed tasks
        const currentWeek = Math.ceil((data.completed_tasks.length + 1) / 7) || 1;
        setExpandedWeek(Math.min(currentWeek, 4));
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.log('Transformation tasks fetch timed out');
      } else {
        console.log('Error fetching transformation tasks:', error);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Grooming functions
  const toggleTask = async (categoryId: string, taskId: string) => {
    setRoutines(prevRoutines =>
      prevRoutines.map(category => {
        if (category.id === categoryId) {
          return {
            ...category,
            tasks: category.tasks.map(task => {
              if (task.id === taskId) {
                return { ...task, completed: !task.completed };
              }
              return task;
            }),
          };
        }
        return category;
      })
    );

    try {
      await fetch(`${BACKEND_URL}/api/grooming/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, taskId }),
      });
    } catch (error) {
      console.log('Error saving task state');
    }
  };

  const getCompletionStats = (category: RoutineCategory) => {
    const completed = category.tasks.filter(t => t.completed).length;
    return { completed, total: category.tasks.length };
  };

  const getTotalProgress = () => {
    const allTasks = routines.flatMap(r => r.tasks);
    const completed = allTasks.filter(t => t.completed).length;
    return Math.round((completed / allTasks.length) * 100);
  };

  // Transformation functions
  const getWeekProgress = (week: TransformationWeek) => {
    if (!week.tasks || week.tasks.length === 0) return 0;
    const completed = week.tasks.filter(t => t.is_completed).length;
    return Math.round((completed / week.tasks.length) * 100);
  };

  const renderGroomingCard = () => (
    <View style={styles.contentCard}>
      {/* Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Today's Progress</Text>
          <Text style={styles.progressPercent}>{getTotalProgress()}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${getTotalProgress()}%` }]} />
        </View>
      </View>

      {/* Routine Categories */}
      {routines.map(category => {
        const stats = getCompletionStats(category);
        const isExpanded = expandedCategory === category.id;

        return (
          <View key={category.id} style={styles.categoryCard}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => setExpandedCategory(isExpanded ? '' : category.id)}
              activeOpacity={0.8}
            >
              <View>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryStats}>
                  {stats.completed} of {stats.total} complete
                </Text>
              </View>
              <View style={styles.categoryRight}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {stats.completed}/{stats.total}
                  </Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={COLORS.muted}
                />
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.tasksList}>
                {category.tasks.map(task => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskItem}
                    onPress={() => toggleTask(category.id, task.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.checkbox,
                      task.completed && styles.checkboxCompleted,
                    ]}>
                      {task.completed && (
                        <Ionicons name="checkmark" size={14} color={COLORS.white} />
                      )}
                    </View>
                    <View style={styles.taskContent}>
                      <Text style={[
                        styles.taskTitle,
                        task.completed && styles.taskTitleCompleted,
                      ]}>
                        {task.title}
                      </Text>
                      <Text style={styles.taskFrequency}>{task.frequency}</Text>
                    </View>
                    <Ionicons name={task.icon as any} size={20} color={COLORS.muted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );

  const renderTransformationCard = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading your transformation...</Text>
        </View>
      );
    }

    if (!transformationData) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="fitness-outline" size={48} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>Start Your Transformation</Text>
          <Text style={styles.emptyText}>Complete your style analysis to unlock your 90-day transformation plan.</Text>
        </View>
      );
    }

    return (
      <View style={styles.contentCard}>
        {/* Overall Progress */}
        <View style={styles.transformationProgress}>
          <Text style={styles.transformationProgressTitle}>Overall Progress</Text>
          <View style={styles.transformationStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{transformationData.completed_tasks.length}</Text>
              <Text style={styles.statLabel}>Tasks Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{transformationData.unlocked_weeks * 7}</Text>
              <Text style={styles.statLabel}>Days Unlocked</Text>
            </View>
          </View>
        </View>

        {/* Weeks */}
        {transformationData.weeks.map(week => {
          const isExpanded = expandedWeek === week.week;
          const weekProgress = getWeekProgress(week);
          const isLocked = week.locked;

          return (
            <View key={week.week} style={[styles.weekCard, isLocked && styles.weekCardLocked]}>
              <TouchableOpacity
                style={styles.weekHeader}
                onPress={() => !isLocked && setExpandedWeek(isExpanded ? 0 : week.week)}
                activeOpacity={isLocked ? 1 : 0.8}
                disabled={isLocked}
              >
                <View style={styles.weekHeaderLeft}>
                  {isLocked ? (
                    <View style={styles.weekIconLocked}>
                      <Ionicons name="lock-closed" size={20} color={COLORS.locked} />
                    </View>
                  ) : (
                    <View style={[styles.weekIcon, weekProgress === 100 && styles.weekIconComplete]}>
                      {weekProgress === 100 ? (
                        <Ionicons name="checkmark" size={20} color={COLORS.white} />
                      ) : (
                        <Text style={styles.weekNumber}>{week.week}</Text>
                      )}
                    </View>
                  )}
                  <View>
                    <Text style={[styles.weekTitle, isLocked && styles.weekTitleLocked]}>
                      Week {week.week}: {week.title}
                    </Text>
                    <Text style={[styles.weekGoal, isLocked && styles.weekGoalLocked]}>
                      {isLocked ? '🔒 Unlock with 3-month membership' : week.goal}
                    </Text>
                  </View>
                </View>
                {!isLocked && (
                  <View style={styles.weekHeaderRight}>
                    <Text style={styles.weekProgressText}>{weekProgress}%</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={COLORS.muted}
                    />
                  </View>
                )}
              </TouchableOpacity>

              {isExpanded && !isLocked && week.tasks && week.tasks.length > 0 && (
                <View style={styles.weekTasks}>
                  {week.tasks.map((task, index) => (
                    <View key={index} style={styles.transformationTaskItem}>
                      <View style={[
                        styles.dayBadge,
                        task.is_completed && styles.dayBadgeComplete
                      ]}>
                        <Text style={[
                          styles.dayBadgeText,
                          task.is_completed && styles.dayBadgeTextComplete
                        ]}>
                          Day {task.day}
                        </Text>
                      </View>
                      <View style={styles.transformationTaskContent}>
                        <Text style={[
                          styles.transformationTaskTitle,
                          task.is_completed && styles.transformationTaskTitleComplete
                        ]}>
                          {task.title}
                        </Text>
                        <Text style={styles.transformationTaskInstruction}>
                          {task.instruction}
                        </Text>
                      </View>
                      {task.is_completed && (
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Style Journey</Text>
          <Text style={styles.subtitle}>Track your transformation progress</Text>
        </View>

        {/* Card Selector */}
        <View style={styles.cardSelector}>
          <TouchableOpacity
            style={[styles.selectorTab, activeCard === 'transformation' && styles.selectorTabActive]}
            onPress={() => setActiveCard('transformation')}
          >
            <Ionicons 
              name="fitness-outline" 
              size={18} 
              color={activeCard === 'transformation' ? COLORS.accent : COLORS.muted} 
            />
            <Text style={[
              styles.selectorText,
              activeCard === 'transformation' && styles.selectorTextActive
            ]}>
              90-Day Transformation
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selectorTab, activeCard === 'grooming' && styles.selectorTabActive]}
            onPress={() => setActiveCard('grooming')}
          >
            <Ionicons 
              name="sparkles-outline" 
              size={18} 
              color={activeCard === 'grooming' ? COLORS.accent : COLORS.muted} 
            />
            <Text style={[
              styles.selectorText,
              activeCard === 'grooming' && styles.selectorTextActive
            ]}>
              Grooming
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeCard === 'grooming' ? renderGroomingCard() : renderTransformationCard()}

        {/* Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginTop: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 4,
  },
  cardSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  selectorTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  selectorTabActive: {
    backgroundColor: '#FDF8E8',
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.muted,
  },
  selectorTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  contentCard: {
    gap: 16,
  },
  loadingContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.muted,
  },
  emptyContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  // Grooming styles
  progressCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  progressPercent: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.accent,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  categoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  categoryStats: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#FDF8E8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  tasksList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightBorder,
    paddingVertical: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.lightBorder,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    color: COLORS.primary,
  },
  taskTitleCompleted: {
    color: COLORS.muted,
    textDecorationLine: 'line-through',
  },
  taskFrequency: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  // Transformation styles
  transformationProgress: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  transformationProgressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 16,
  },
  transformationStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.accent,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.lightBorder,
  },
  weekCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    overflow: 'hidden',
  },
  weekCardLocked: {
    backgroundColor: '#FAFAFA',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  weekHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  weekIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  weekIconComplete: {
    backgroundColor: COLORS.success,
  },
  weekIconLocked: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  weekNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
  },
  weekTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  weekTitleLocked: {
    color: COLORS.muted,
  },
  weekGoal: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  weekGoalLocked: {
    fontStyle: 'italic',
  },
  weekHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  weekTasks: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightBorder,
    padding: 12,
    gap: 12,
  },
  transformationTaskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
  },
  dayBadge: {
    backgroundColor: '#FDF8E8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  dayBadgeComplete: {
    backgroundColor: '#E8F5E9',
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
  },
  dayBadgeTextComplete: {
    color: COLORS.success,
  },
  transformationTaskContent: {
    flex: 1,
  },
  transformationTaskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  transformationTaskTitleComplete: {
    color: COLORS.success,
  },
  transformationTaskInstruction: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
  },
});
