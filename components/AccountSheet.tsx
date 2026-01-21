import React, { forwardRef, useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  lightBorder: '#E8E6E1',
  danger: '#C44536',
};

interface AccountSheetProps {
  onClose?: () => void;
}

const AccountSheet = forwardRef<BottomSheet, AccountSheetProps>(({ onClose }, ref) => {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const snapPoints = useMemo(() => ['35%'], []);

  useEffect(() => {
    loadPhoneNumber();
  }, []);

  const loadPhoneNumber = async () => {
    try {
      const phone = await AsyncStorage.getItem('sgc_phone');
      if (phone) {
        setPhoneNumber(phone);
      }
    } catch (error) {
      console.log('Error loading phone:', error);
    }
  };

  const maskPhoneNumber = (phone: string): string => {
    if (!phone) return '******';
    // Remove any prefix and get last 4 digits
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 4) {
      const lastFour = digits.slice(-4);
      const maskedPart = '*'.repeat(Math.max(0, digits.length - 4));
      // Format with country code if present
      if (phone.startsWith('+')) {
        const countryCode = phone.match(/^\+\d{1,3}/)?.[0] || '+91';
        return `${countryCode} ${maskedPart}${lastFour}`;
      }
      return `${maskedPart}${lastFour}`;
    }
    return phone;
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              // Clear ONLY auth/session tokens - NOT analysis data
              const keysToRemove = [
                'sgc_authenticated',
                'sgc_phone',
                'sgc_is_premium',
                'sgc_is_verified',
                'sgc_email',
                // DO NOT clear these - keep analysis data:
                // 'sgc_has_completed_analysis',
                // 'style_engine_complete',
                // 'style_engine_face',
                // 'style_engine_body',
                // 'style_engine_skin',
                // 'style_engine_archetype',
                // 'style_engine_preferences',
              ];

              await AsyncStorage.multiRemove(keysToRemove);

              // Close sheet and navigate to login
              if (ref && 'current' in ref && ref.current) {
                ref.current.close();
              }
              
              // Navigate to welcome/login screen
              setTimeout(() => {
                router.replace('/');
              }, 300);
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1 && onClose) {
      onClose();
    }
  }, [onClose]);

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={handleSheetChanges}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account</Text>
        </View>

        {/* Account Info */}
        <View style={styles.accountSection}>
          <View style={styles.accountRow}>
            <View style={styles.accountIconContainer}>
              <Ionicons name="person" size={22} color={COLORS.accent} />
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>My Account</Text>
              <Text style={styles.accountPhone}>{maskPhoneNumber(phoneNumber)}</Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
          <Text style={styles.logoutText}>
            {isLoggingOut ? 'Logging out...' : 'Log Out'}
          </Text>
        </TouchableOpacity>

        {/* Footer Note */}
        <Text style={styles.footerNote}>
          Your style analysis data will be preserved
        </Text>
      </BottomSheetView>
    </BottomSheet>
  );
});

AccountSheet.displayName = 'AccountSheet';

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: COLORS.lightBorder,
    width: 40,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  accountSection: {
    marginTop: 16,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 16,
  },
  accountIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  accountInfo: {
    flex: 1,
  },
  accountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  accountPhone: {
    fontSize: 15,
    color: COLORS.muted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightBorder,
    marginVertical: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.danger,
    marginLeft: 10,
  },
  footerNote: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default AccountSheet;
