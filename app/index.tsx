import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  background: '#F9F8F4',
  accent: '#D4AF37',
};

export default function Index() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait for navigation to be ready before redirecting
    if (!rootNavigationState?.key) return;

    const checkAuthAndRedirect = async () => {
      try {
        const authStatus = await AsyncStorage.getItem('sgc_authenticated');
        if (authStatus === 'true') {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/welcome');
        }
      } catch (error) {
        router.replace('/(auth)/welcome');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuthAndRedirect();
  }, [rootNavigationState?.key]);

  // Show loading while checking auth or waiting for navigation
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
