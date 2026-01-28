import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackAiStylistMessageSent } from '../../utils/analytics';

const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  lightBorder: '#E8E6E1',
  userBubble: '#2C2C2C',
  aiBubble: '#FFFFFF',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  'What should I wear to a job interview?',
  'Best colors for my skin tone?',
  'Build me a capsule wardrobe',
  'Perfect outfit for a first date',
];

// Simple markdown renderer for bold text
const renderMarkdownText = (text: string, isUser: boolean) => {
  // Split by **text** pattern for bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Remove ** and render as bold
      const boldText = part.slice(2, -2);
      return (
        <Text 
          key={index} 
          style={[
            isUser ? styles.userMessageText : styles.aiMessageText,
            styles.boldText
          ]}
        >
          {boldText}
        </Text>
      );
    }
    return (
      <Text 
        key={index} 
        style={isUser ? styles.userMessageText : styles.aiMessageText}
      >
        {part}
      </Text>
    );
  });
};

interface StyleProfile {
  face_shape?: string;
  body_type?: string;
  skin_tone?: string;
  undertone?: string;
  seasonal_palette?: string;
  best_colors?: string[];
  archetype?: string;
}

export default function AIStylistScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [membershipTier, setMembershipTier] = useState<string>('free');
  const [hasCompletedAnalysis, setHasCompletedAnalysis] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [welcomeSet, setWelcomeSet] = useState(false);

  // Check status whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkUserStatus();
    }, [])
  );

  const checkUserStatus = async () => {
    setIsCheckingStatus(true);
    try {
      // Check local storage first
      const localPremium = await AsyncStorage.getItem('sgc_is_premium');
      const localAnalysis = await AsyncStorage.getItem('sgc_has_completed_analysis');
      const localTier = await AsyncStorage.getItem('sgc_membership_tier');
      const phone = await AsyncStorage.getItem('sgc_phone');
      
      console.log('AI Stylist - Local Premium:', localPremium);
      console.log('AI Stylist - Local Analysis:', localAnalysis);
      console.log('AI Stylist - Local Tier:', localTier);

      let premium = localPremium === 'true';
      let analysisComplete = localAnalysis === 'true';
      let tier = localTier || 'free';

      // Verify with backend for the most up-to-date status
      try {
        // Try the new user status endpoint first
        if (phone) {
          const cleanPhone = phone.replace('+1', '').replace('+', '');
          const statusResponse = await fetch(`${BACKEND_URL}/api/user/status?phone=${cleanPhone}`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log('AI Stylist - User Status:', statusData);
            
            if (statusData.found) {
              tier = statusData.membership_tier || 'free';
              premium = statusData.is_premium || tier === 'lifestyle' || tier === 'transformation';
              
              // Save to local storage
              await AsyncStorage.setItem('sgc_membership_tier', tier);
              await AsyncStorage.setItem('sgc_is_premium', premium ? 'true' : 'false');
            }
          }
        }
        
        // Also check legacy auth status
        const response = await fetch(`${BACKEND_URL}/api/auth/user-status`);
        if (response.ok) {
          const data = await response.json();
          console.log('AI Stylist - Backend Status:', data);
          
          // Use backend values if they indicate premium or analysis
          if (data.is_premium) {
            premium = true;
          }
          if (data.has_completed_analysis) {
            analysisComplete = true;
          }
          
          // Update local storage with backend values
          await AsyncStorage.setItem('sgc_is_premium', premium ? 'true' : 'false');
          await AsyncStorage.setItem('sgc_has_completed_analysis', analysisComplete ? 'true' : 'false');
        }
      } catch (error) {
        console.log('Backend status check failed, using local values');
      }

      setIsPremium(premium);
      setMembershipTier(tier);
      setHasCompletedAnalysis(analysisComplete);

      // If user has completed analysis and is Style Pro, load their profile
      if (analysisComplete && tier === 'lifestyle') {
        await loadProfile();
      }
    } catch (error) {
      console.log('Error checking user status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const loadProfile = async () => {
    try {
      // First try to load from sgc_brain_result which has the full identity
      const brainResult = await AsyncStorage.getItem('sgc_brain_result');
      if (brainResult) {
        const parsed = JSON.parse(brainResult);
        const identity = parsed.identity_snapshot_v1;
        if (identity) {
          const profileData: StyleProfile = {
            face_shape: identity.face_shape,
            body_type: identity.body_type,
            skin_tone: identity.skin_tone,
            undertone: identity.skin_undertone,
            seasonal_palette: identity.seasonal_palette,
            best_colors: identity.best_colors,
            archetype: identity.overall_archetype,
          };
          setProfile(profileData);
          if (!welcomeSet) {
            setWelcomeMessage(profileData);
            setWelcomeSet(true);
          }
          return;
        }
      }
      
      // Fallback to backend profile endpoint
      const response = await fetch(`${BACKEND_URL}/api/profile`);
      if (response.ok) {
        const data = await response.json();
        if (data.face_shape || data.body_type) {
          setProfile(data);
          if (!welcomeSet) {
            setWelcomeMessage(data);
            setWelcomeSet(true);
          }
          return;
        }
      }
    } catch (error) {
      console.log('Profile load error:', error);
    }

    // Final fallback to legacy local storage
    try {
      const completeData = await AsyncStorage.getItem('style_engine_complete');
      if (completeData) {
        const parsed = JSON.parse(completeData);
        setProfile(parsed);
        if (!welcomeSet) {
          setWelcomeMessage(parsed);
          setWelcomeSet(true);
        }
        return;
      }

      const faceData = await AsyncStorage.getItem('style_engine_face');
      const bodyData = await AsyncStorage.getItem('style_engine_body');
      const skinData = await AsyncStorage.getItem('style_engine_skin');
      const archetype = await AsyncStorage.getItem('style_engine_archetype');

      if (faceData || bodyData || skinData) {
        const face = faceData ? JSON.parse(faceData) : {};
        const body = bodyData ? JSON.parse(bodyData) : {};
        const skin = skinData ? JSON.parse(skinData) : {};

        const profileData: StyleProfile = {
          face_shape: face.face_shape,
          body_type: body.body_type,
          skin_tone: skin.skin_tone,
          undertone: skin.undertone,
          seasonal_palette: skin.seasonal_palette,
          best_colors: skin.best_colors,
          archetype: archetype || undefined,
        };
        setProfile(profileData);
        if (!welcomeSet) {
          setWelcomeMessage(profileData);
          setWelcomeSet(true);
        }
      }
    } catch (error) {
      console.log('Local profile not found');
    }
  };

  const setWelcomeMessage = (profileData: StyleProfile | null) => {
    let welcomeText = '';
    
    if (profileData && (profileData.body_type || profileData.face_shape)) {
      welcomeText = `Welcome back. I've loaded your style blueprint:\n\n` +
        `• Face Shape: ${profileData.face_shape || 'Analyzing...'}\n` +
        `• Body Type: ${profileData.body_type || 'Analyzing...'}\n` +
        `• Skin Tone: ${profileData.skin_tone || 'Analyzing...'}\n` +
        `• Seasonal Palette: ${profileData.seasonal_palette || 'Autumn'}\n` +
        `• Archetype: ${profileData.archetype || 'Style Professional'}\n\n` +
        `I can help you navigate your outfit catalog, explain why certain styles work for you, and recommend looks for any occasion.\n\n` +
        `What would you like to know?`;
    } else {
      welcomeText = `Welcome to TheGent AI Stylist. I'm your personal style navigator, here to help you make the most of your style blueprint.\n\nComplete your Style Analysis first, and I'll help you navigate your personalized outfit catalog!`;
    }

    setMessages([{
      id: '1',
      role: 'assistant',
      content: welcomeText,
      timestamp: new Date(),
    }]);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Track AI Stylist message sent
    trackAiStylistMessageSent(text.trim().length);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    Keyboard.dismiss();

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      // Get phone for user-specific grounding
      const phone = await AsyncStorage.getItem('sgc_phone');
      const cleanPhone = phone ? phone.replace('+1', '') : null;
      
      const response = await fetch(`${BACKEND_URL}/api/ai-stylist/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.map(m => ({ role: m.role, content: m.content })),
          phone: cleanPhone,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      let errorContent = 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.';
      if (error.name === 'AbortError') {
        errorContent = 'The request took too long. The AI service may be temporarily unavailable. Please try again.';
      }
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleBeginAnalysis = () => {
    // Direct to intro screen before analysis
    router.push('/style-engine/analysis-intro');
  };

  // Loading state while checking status
  if (isCheckingStatus) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const isLifestyle = membershipTier === 'lifestyle';
  
  if (!isLifestyle || !hasCompletedAnalysis) {
    // Determine what message to show
    const needsAnalysis = !hasCompletedAnalysis;
    const needsUpgrade = !isLifestyle;
    
    return (
      <View style={styles.container}>
        {/* Locked Content */}
        <View style={styles.lockedContainer}>
          <View style={styles.lockIconContainer}>
            <Ionicons name="lock-closed" size={48} color={COLORS.accent} />
          </View>
          <Text style={styles.lockedTitle}>
            {needsAnalysis ? 'Complete Your Analysis' : 'Lifestyle Feature'}
          </Text>
          <Text style={styles.lockedSubtitle}>
            {needsAnalysis 
              ? 'Complete the Biological Analysis so I can load your profile and give you tailored style recommendations.'
              : 'Upgrade to Lifestyle on our website to unlock Your Personal Stylist'
            }
          </Text>
          {needsAnalysis && (
            <>
              <View style={styles.lockedFeatures}>
                <View style={styles.lockedFeatureRow}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
                  <Text style={styles.lockedFeatureText}>Personalized outfit recommendations</Text>
                </View>
                <View style={styles.lockedFeatureRow}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
                  <Text style={styles.lockedFeatureText}>Color palette advice for your skin tone</Text>
                </View>
                <View style={styles.lockedFeatureRow}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
                  <Text style={styles.lockedFeatureText}>Body type specific styling tips</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.unlockButton}
                onPress={handleBeginAnalysis}
              >
                <Text style={styles.unlockButtonText}>Begin Biological Analysis</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </>
          )}
          {/* For non-Lifestyle users, show features they'll get with upgrade */}
          {!needsAnalysis && needsUpgrade && (
            <View style={styles.lockedFeatures}>
              <View style={styles.lockedFeatureRow}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
                <Text style={styles.lockedFeatureText}>Personal AI styling assistant</Text>
              </View>
              <View style={styles.lockedFeatureRow}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
                <Text style={styles.lockedFeatureText}>Ask questions about your style</Text>
              </View>
              <View style={styles.lockedFeatureRow}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
                <Text style={styles.lockedFeatureText}>Get outfit recommendations</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  // UNLOCKED STATE - User is premium AND has completed analysis
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 25}
    >
      {/* Profile Badge Bar */}
      {profile && (
        <View style={styles.profileBar}>
          <View style={styles.profileBarContent}>
            <Ionicons name="sparkles" size={14} color={COLORS.accent} />
            <Text style={styles.profileBarText}>
              {profile.face_shape || 'Oval'} Face • {profile.body_type} Build
            </Text>
          </View>
          <View style={styles.profileBadge}>
            <Ionicons name="shield-checkmark" size={12} color={COLORS.accent} />
            <Text style={styles.profileBadgeText}>Active</Text>
          </View>
        </View>
      )}

      {/* Chat Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.role === 'user' ? styles.userBubble : styles.aiBubble,
            ]}
          >
            {message.role === 'assistant' && (
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={14} color={COLORS.accent} />
              </View>
            )}
            <View
              style={[
                styles.messageContent,
                message.role === 'user' ? styles.userMessageContent : styles.aiMessageContent,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.role === 'user' ? styles.userMessageText : styles.aiMessageText,
                ]}
              >
                {message.role === 'assistant' 
                  ? renderMarkdownText(message.content, false)
                  : message.content
                }
              </Text>
            </View>
          </View>
        ))}
        
        {isLoading && (
          <View style={[styles.messageBubble, styles.aiBubble]}>
            <View style={styles.aiAvatar}>
              <Ionicons name="sparkles" size={14} color={COLORS.accent} />
            </View>
            <View style={[styles.messageContent, styles.aiMessageContent]}>
              <ActivityIndicator size="small" color={COLORS.accent} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <View style={styles.quickPromptsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {QUICK_PROMPTS.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickPrompt}
                onPress={() => sendMessage(prompt)}
              >
                <Text style={styles.quickPromptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input Area */}
      <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask about style, outfits, colors..."
            placeholderTextColor={COLORS.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() && !isLoading ? COLORS.white : COLORS.muted}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  // Profile Bar (for chat view)
  profileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FDF8E8',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
  },
  profileBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileBarText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary,
    marginLeft: 8,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  profileBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4A7C59',
    marginLeft: 4,
  },
  // Locked state styles
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  lockIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 12,
  },
  lockedSubtitle: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  lockedFeatures: {
    width: '100%',
    marginBottom: 32,
  },
  lockedFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  lockedFeatureText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 12,
    flex: 1,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 30,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  unlockButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    marginRight: 8,
  },
  // Chat styles
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  aiBubble: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  messageContent: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userMessageContent: {
    backgroundColor: COLORS.userBubble,
    borderBottomRightRadius: 4,
  },
  aiMessageContent: {
    backgroundColor: COLORS.aiBubble,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: COLORS.white,
  },
  aiMessageText: {
    color: COLORS.primary,
  },
  boldText: {
    fontWeight: '700',
    color: COLORS.accent,
  },
  quickPromptsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightBorder,
  },
  quickPrompt: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  quickPromptText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  inputArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightBorder,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.primary,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.lightBorder,
  },
});
