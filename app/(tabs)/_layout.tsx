import React, { useState, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AccountModal from '../../components/AccountModal';

export const unstable_settings = {
  initialRouteName: 'index',
};

// Design System Colors
const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  champagneGold: '#B29361',
  muted: '#8A8A8A',
  white: '#FFFFFF',
};

// Premium TheGent Logo Component
const TheGentLogo = () => (
  <View style={styles.logoContainer}>
    <Text style={[styles.logoText, styles.logoShadow]}>TheGent</Text>
    <Text style={[styles.logoText, styles.logoHighlight]}>TheGent</Text>
    <Text style={[styles.logoText, styles.logoMain]}>TheGent</Text>
  </View>
);

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  const openAccountModal = useCallback(() => {
    setAccountModalVisible(true);
  }, []);

  const closeAccountModal = useCallback(() => {
    setAccountModalVisible(false);
  }, []);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: COLORS.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '300',
            color: COLORS.primary,
            fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
          },
          headerRight: () => (
            <TouchableOpacity
              onPress={openAccountModal}
              style={styles.profileButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons name="person-circle-outline" size={28} color={COLORS.accent} />
            </TouchableOpacity>
          ),
          headerRightContainerStyle: {
            paddingRight: 16,
          },
          tabBarStyle: {
            backgroundColor: COLORS.white,
            borderTopWidth: 0.5,
            borderTopColor: '#E5E5E5',
            height: Platform.OS === 'ios' ? 85 + insets.bottom : 70,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : 10,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: COLORS.muted,
          tabBarLabelStyle: {
            fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
            fontSize: 10,
            fontWeight: '500',
            letterSpacing: 0.5,
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            headerTitle: () => <TheGentLogo />,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="style"
          options={{
            title: 'My Style',
            headerTitle: 'My Style',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="formulas"
          options={{
            title: 'Formulas',
            headerTitle: 'Style Formulas',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="grooming"
          options={{
            title: 'Journey',
            headerTitle: 'My Style Journey',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'fitness' : 'fitness-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ai-stylist"
          options={{
            title: 'AI Stylist',
            headerTitle: 'AI Stylist',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={22} color={color} />
            ),
          }}
        />
      </Tabs>
      
      {/* Account Modal - rendered outside of Tabs but in same component */}
      <AccountModal 
        visible={accountModalVisible} 
        onClose={closeAccountModal} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  profileButton: {
    padding: 4,
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: 2,
    position: 'absolute',
  },
  logoShadow: {
    color: 'rgba(120, 90, 50, 0.4)',
    top: 1.5,
    left: 0.8,
  },
  logoHighlight: {
    color: 'rgba(255, 255, 255, 0.9)',
    top: -0.5,
    left: -0.3,
  },
  logoMain: {
    color: COLORS.champagneGold,
    position: 'relative',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(201, 169, 110, 0.6)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 4,
      },
    }),
  },
});
