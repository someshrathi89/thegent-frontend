import { Stack, SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initAnalytics, identifyUser } from '../utils/analytics';
import { initSentry, setUserContext as setSentryUser } from '../utils/sentry';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Required for proper back button handling in nested navigators
export const unstable_settings = {
  initialRouteName: 'index',
};

const COLORS = {
  background: '#F9F8F4',
};

export default function RootLayout() {
  useEffect(() => {
    async function prepare() {
      try {
        // Initialize analytics and error tracking
        initAnalytics();
        initSentry();
        
        // Identify user if authenticated
        const authStatus = await AsyncStorage.getItem('sgc_authenticated');
        const phone = await AsyncStorage.getItem('sgc_phone');
        
        if (authStatus === 'true' && phone) {
          identifyUser(phone);
          setSentryUser(phone);
        }
      } catch (error) {
        console.log('Error during app preparation:', error);
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    
    prepare();
  }, []);

  // Return Stack directly - no wrappers
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="style-engine" />
    </Stack>
  );
}
