import AsyncStorage from '@react-native-async-storage/async-storage';

// PostHog Configuration
const POSTHOG_API_KEY = 'phc_979ko69af1HaOjsmKhb4Jss7UJRrqR7Nz53cHfe0xzj';
const POSTHOG_HOST = 'https://app.posthog.com';

// User identification
let distinctId: string | null = null;

// Initialize - generate or retrieve distinct ID
export const initAnalytics = async () => {
  try {
    let storedId = await AsyncStorage.getItem('posthog_distinct_id');
    if (!storedId) {
      storedId = 'user_' + Math.random().toString(36).substring(2, 15);
      await AsyncStorage.setItem('posthog_distinct_id', storedId);
    }
    distinctId = storedId;
    console.log('PostHog: Analytics initialized with ID:', distinctId);
  } catch (error) {
    console.error('PostHog: Failed to initialize', error);
  }
};

// Identify user (call after login)
export const identifyUser = async (userId: string, properties?: Record<string, any>) => {
  if (!distinctId) return;
  
  // Update distinct ID to the user's phone
  const oldId = distinctId;
  distinctId = userId;
  await AsyncStorage.setItem('posthog_distinct_id', userId);
  
  // Send identify event with alias
  await captureEvent('$identify', {
    $anon_distinct_id: oldId,
    $set: properties || {},
  });
};

// Reset user (call on logout)
export const resetUser = async () => {
  distinctId = 'anon_' + Math.random().toString(36).substring(2, 15);
  await AsyncStorage.setItem('posthog_distinct_id', distinctId);
  console.log('PostHog: User reset');
};

// Core capture function - sends events to PostHog
const captureEvent = async (eventName: string, properties?: Record<string, any>) => {
  if (!distinctId || !POSTHOG_API_KEY) return;

  try {
    const payload = {
      api_key: POSTHOG_API_KEY,
      event: eventName,
      properties: {
        distinct_id: distinctId,
        $lib: 'thegent-app',
        ...properties,
      },
      timestamp: new Date().toISOString(),
    };

    fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).catch(err => console.log('PostHog capture error:', err));
    
  } catch (error) {
    console.error('PostHog: Failed to capture event', error);
  }
};

// ============================================
// EVENT TRACKING FUNCTIONS
// ============================================

// Authentication Events
export const trackSignupCompleted = (phone: string) => {
  captureEvent('signup_completed', { phone: maskPhone(phone) });
};

// Analysis Events
export const trackAnalysisStarted = () => {
  captureEvent('analysis_started');
};

export const trackAnalysisFailedInvalidImage = (imageType: 'face' | 'body' | 'skin', errorMessage?: string) => {
  captureEvent('analysis_failed_invalid_image', {
    image_type: imageType,
    error_message: errorMessage,
  });
};

export const trackAnalysisCompleted = (analysisData?: {
  face_shape?: string;
  body_type?: string;
  skin_tone?: string;
  seasonal_palette?: string;
}) => {
  captureEvent('analysis_completed', analysisData);
};

// Navigation Events
export const trackOpenedStyleIdentity = () => {
  captureEvent('opened_style_identity');
};

export const trackOpenedFormulas = () => {
  captureEvent('opened_formulas');
};

// Image Generation Events
export const trackOutfitImageGenerated = (context?: string, outfitTitle?: string) => {
  captureEvent('outfit_image_generated', {
    context,
    outfit_title: outfitTitle,
  });
};

// AI Stylist Events
export const trackAiStylistMessageSent = (messageLength?: number) => {
  captureEvent('ai_stylist_message_sent', {
    message_length: messageLength,
  });
};

// 90-Day Journey Events
export const trackTaskStarted = (taskId: number, taskTitle?: string, week?: number) => {
  captureEvent('task_started', {
    task_id: taskId,
    task_title: taskTitle,
    week,
  });
};

export const trackTaskCompleted = (taskId: number, taskTitle?: string, week?: number) => {
  captureEvent('task_completed', {
    task_id: taskId,
    task_title: taskTitle,
    week,
  });
};

// Subscription Events
export const trackSubscriptionStarted = (tier: string) => {
  captureEvent('subscription_started', { tier });
};

export const trackSubscriptionRenewed = (tier: string) => {
  captureEvent('subscription_renewed', { tier });
};

export const trackSubscriptionCancelled = (tier: string, reason?: string) => {
  captureEvent('subscription_cancelled', { tier, reason });
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Mask phone number for privacy (show last 4 digits)
const maskPhone = (phone: string): string => {
  if (!phone || phone.length < 4) return '****';
  return '****' + phone.slice(-4);
};

export default {
  initAnalytics,
  identifyUser,
  resetUser,
  trackSignupCompleted,
  trackAnalysisStarted,
  trackAnalysisFailedInvalidImage,
  trackAnalysisCompleted,
  trackOpenedStyleIdentity,
  trackOpenedFormulas,
  trackOutfitImageGenerated,
  trackAiStylistMessageSent,
  trackTaskStarted,
  trackTaskCompleted,
  trackSubscriptionStarted,
  trackSubscriptionRenewed,
  trackSubscriptionCancelled,
};
