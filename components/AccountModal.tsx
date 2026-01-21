import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  champagneGold: '#B29361',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  lightBorder: '#E8E6E1',
  danger: '#C44536',
  overlay: 'rgba(0,0,0,0.5)',
  sectionBg: '#FAFAF8',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const APP_VERSION = '1.0.0';

// Legal URLs
const PRIVACY_POLICY_URL = 'https://thegent.in/privacy';
const TERMS_CONDITIONS_URL = 'https://thegent.in/terms';

interface AccountModalProps {
  visible: boolean;
  onClose: () => void;
}

type ModalView = 'main' | 'editName' | 'logoutConfirm' | 'deleteConfirm';

export default function AccountModal({ visible, onClose }: AccountModalProps) {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [editedName, setEditedName] = useState<string>('');
  const [membershipTier, setMembershipTier] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState<ModalView>('main');

  useEffect(() => {
    if (visible) {
      loadUserData();
      setCurrentView('main');
    }
  }, [visible]);

  const loadUserData = async () => {
    try {
      const [phone, name, tier] = await Promise.all([
        AsyncStorage.getItem('sgc_phone'),
        AsyncStorage.getItem('user_first_name'),
        AsyncStorage.getItem('sgc_membership_tier'),
      ]);
      
      if (phone) setPhoneNumber(phone);
      if (name) {
        setFirstName(name);
        setEditedName(name);
      }
      if (tier) {
        setMembershipTier(tier);
      } else {
        // Try to fetch from backend
        if (phone) {
          fetchMembershipTier(phone.replace('+1', ''));
        }
      }
    } catch (error) {
      console.log('Error loading user data:', error);
    }
  };

  const fetchMembershipTier = async (phone: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/user/status?phone=${phone}`);
      if (response.ok) {
        const data = await response.json();
        if (data.membership_tier) {
          setMembershipTier(data.membership_tier);
          await AsyncStorage.setItem('sgc_membership_tier', data.membership_tier);
        }
      }
    } catch (error) {
      console.log('Error fetching membership:', error);
    }
  };

  const formatMembershipTier = (tier: string): string => {
    if (!tier) return 'Free';
    switch (tier) {
      case '1_month': return '1 Month Member';
      case '3_month': return '3 Month Member';
      case '6_month': return '6 Month Member';
      case '12_month': return '12 Month Member';
      default: return tier.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    // Format as +1 XXX XXX XXXX
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+1 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return phone;
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }
    
    setIsLoading(true);
    try {
      await AsyncStorage.setItem('user_first_name', editedName.trim());
      setFirstName(editedName.trim());
      setCurrentView('main');
    } catch (error) {
      Alert.alert('Error', 'Failed to save name');
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      // Clear ONLY auth/session tokens - NOT analysis data
      const keysToRemove = [
        'sgc_authenticated',
        'sgc_phone',
        'sgc_is_premium',
        'sgc_is_verified',
        'sgc_email',
        'user_first_name',
        'sgc_membership_tier',
      ];

      await AsyncStorage.multiRemove(keysToRemove);
      
      setIsLoading(false);
      onClose();
      
      // Navigate to welcome screen after logout
      router.replace('/(auth)/welcome');
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      const phone = phoneNumber.replace('+1', '').replace(/\D/g, '');
      
      // Call backend to delete user data
      const response = await fetch(`${BACKEND_URL}/api/user/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Clear all local storage
      await AsyncStorage.clear();
      
      setIsLoading(false);
      onClose();
      
      // Navigate to welcome screen after account deletion
      router.replace('/(auth)/welcome');
    } catch (error) {
      console.error('Delete account error:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
      setIsLoading(false);
    }
  };

  const handleOpenLink = async (url: string, title: string) => {
    if (!url) {
      Alert.alert('Coming Soon', `${title} will be available soon.`);
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', `Could not open ${title}`);
    }
  };

  const handleContactUs = () => {
    Alert.alert(
      'Contact Us',
      'Please share your queries or any feedback on hello@thegent.in',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Email', 
          onPress: () => Linking.openURL('mailto:hello@thegent.in?subject=TheGent App Feedback')
        },
      ]
    );
  };

  const renderMainView = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={32} color={COLORS.champagneGold} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{firstName || 'Gentleman'}</Text>
          <Text style={styles.profilePhone}>{formatPhoneNumber(phoneNumber)}</Text>
          <View style={styles.membershipBadge}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.champagneGold} />
            <Text style={styles.membershipText}>{formatMembershipTier(membershipTier)}</Text>
          </View>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => {
            setEditedName(firstName);
            setCurrentView('editName');
          }}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
            <Text style={styles.menuItemText}>Edit Name</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => setCurrentView('logoutConfirm')}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.primary} />
            <Text style={styles.menuItemText}>Logout</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      {/* Legal Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LEGAL</Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => handleOpenLink(PRIVACY_POLICY_URL, 'Privacy Policy')}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="shield-outline" size={20} color={COLORS.primary} />
            <Text style={styles.menuItemText}>Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => handleOpenLink(TERMS_CONDITIONS_URL, 'Terms and Conditions')}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
            <Text style={styles.menuItemText}>Terms and Conditions</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SUPPORT</Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={handleContactUs}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
            <Text style={styles.menuItemText}>Contact Us</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: COLORS.danger }]}>DANGER ZONE</Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, styles.dangerItem]}
          onPress={() => setCurrentView('deleteConfirm')}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
            <Text style={[styles.menuItemText, { color: COLORS.danger }]}>Delete Account</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <Text style={styles.versionText}>TheGent App v{APP_VERSION}</Text>
    </ScrollView>
  );

  const renderEditNameView = () => (
    <View style={styles.subView}>
      <View style={styles.subViewHeader}>
        <TouchableOpacity onPress={() => setCurrentView('main')}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.subViewTitle}>Edit Name</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.editNameContent}>
        <Text style={styles.inputLabel}>First Name</Text>
        <TextInput
          style={styles.textInput}
          value={editedName}
          onChangeText={setEditedName}
          placeholder="Enter your name"
          placeholderTextColor={COLORS.muted}
          autoCapitalize="words"
          autoFocus
        />

        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSaveName}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLogoutConfirmView = () => (
    <View style={styles.confirmView}>
      <Ionicons name="log-out-outline" size={48} color={COLORS.accent} />
      <Text style={styles.confirmTitle}>Log Out?</Text>
      <Text style={styles.confirmMessage}>
        Are you sure you want to log out? Your style analysis data will be preserved.
      </Text>

      <View style={styles.confirmButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setCurrentView('main')}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.confirmActionButton}
          onPress={handleLogout}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.confirmActionButtonText}>Log Out</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDeleteConfirmView = () => (
    <View style={styles.confirmView}>
      <Ionicons name="warning" size={48} color={COLORS.danger} />
      <Text style={styles.confirmTitle}>Delete Account?</Text>
      <Text style={styles.confirmMessage}>
        This action cannot be undone. All your data including style analysis, preferences, and account information will be permanently deleted.
      </Text>

      <View style={styles.confirmButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setCurrentView('main')}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmActionButton, { backgroundColor: COLORS.danger }]}
          onPress={handleDeleteAccount}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.confirmActionButtonText}>Delete</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.overlay} 
        onPress={currentView === 'main' ? onClose : undefined}
      >
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Handle Bar */}
          <View style={styles.handleBar} />

          {currentView === 'main' && (
            <>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
                  <Ionicons name="close" size={24} color={COLORS.muted} />
                </TouchableOpacity>
              </View>
              {renderMainView()}
            </>
          )}

          {currentView === 'editName' && renderEditNameView()}
          {currentView === 'logoutConfirm' && renderLogoutConfirmView()}
          {currentView === 'deleteConfirm' && renderDeleteConfirmView()}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.lightBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  closeIcon: {
    position: 'absolute',
    right: 0,
    padding: 4,
  },
  // Profile Header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.sectionBg,
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: COLORS.champagneGold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 8,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF8E8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  membershipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.champagneGold,
    marginLeft: 4,
  },
  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.sectionBg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 15,
    color: COLORS.primary,
    marginLeft: 12,
  },
  dangerItem: {
    backgroundColor: 'rgba(196, 69, 54, 0.08)',
  },
  versionText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  // Sub Views
  subView: {
    paddingVertical: 8,
  },
  subViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  subViewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  editNameContent: {
    paddingHorizontal: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.sectionBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: COLORS.champagneGold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Confirm Views
  confirmView: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  confirmMessage: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.sectionBg,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  confirmActionButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.champagneGold,
    borderRadius: 12,
  },
  confirmActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
});
