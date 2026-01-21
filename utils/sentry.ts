import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sentry Configuration - Parsed from DSN
const SENTRY_DSN = 'https://eee8840f03d832ebaabf1b86dd1fc18f@o4510645650980864.ingest.us.sentry.io/4510645659107328';
const SENTRY_PUBLIC_KEY = 'eee8840f03d832ebaabf1b86dd1fc18f';
const SENTRY_HOST = 'https://o4510645650980864.ingest.us.sentry.io';
const SENTRY_PROJECT_ID = '4510645659107328';

// Store endpoint
const SENTRY_STORE_URL = `${SENTRY_HOST}/api/${SENTRY_PROJECT_ID}/store/?sentry_key=${SENTRY_PUBLIC_KEY}&sentry_version=7`;

// User context
let userContext: { id?: string; phone?: string } = {};

// Breadcrumbs for debugging
const breadcrumbs: Array<{
  timestamp: number;
  category: string;
  message: string;
  level: string;
}> = [];
const MAX_BREADCRUMBS = 20;

// Initialize Sentry
export const initSentry = async () => {
  try {
    const phone = await AsyncStorage.getItem('sgc_phone');
    if (phone) {
      userContext = { id: phone, phone };
    }
    console.log('Sentry: Error tracking initialized');
  } catch (error) {
    console.error('Sentry: Failed to initialize', error);
  }
};

// Set user context (call after login)
export const setUserContext = (userId: string, additionalData?: Record<string, any>) => {
  userContext = { id: userId, ...additionalData };
};

// Clear user context (call on logout)
export const clearUserContext = () => {
  userContext = {};
};

// Add breadcrumb for debugging trail
export const addBreadcrumb = (category: string, message: string, level: string = 'info') => {
  breadcrumbs.push({
    timestamp: Date.now() / 1000,
    category,
    message,
    level,
  });
  
  // Keep only last N breadcrumbs
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
};

// Core function to capture and send error to Sentry
export const captureException = async (
  error: Error | string,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    level?: 'fatal' | 'error' | 'warning' | 'info';
  }
) => {
  try {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    // Build Sentry event payload
    const event = {
      event_id: generateEventId(),
      timestamp: new Date().toISOString(),
      platform: 'javascript',
      level: context?.level || 'error',
      logger: 'thegent-app',
      
      // Error details
      exception: {
        values: [
          {
            type: errorObj.name || 'Error',
            value: errorObj.message,
            stacktrace: errorObj.stack ? parseStackTrace(errorObj.stack) : undefined,
          },
        ],
      },
      
      // User info
      user: userContext.id ? userContext : undefined,
      
      // Tags for filtering
      tags: {
        platform: Platform.OS,
        ...context?.tags,
      },
      
      // Extra context
      extra: {
        ...context?.extra,
      },
      
      // Breadcrumbs trail
      breadcrumbs: breadcrumbs.slice(-10),
      
      // Device/App context
      contexts: {
        app: {
          app_name: 'TheGent',
          app_version: Constants.expoConfig?.version || '1.0.0',
        },
        device: {
          family: Platform.OS,
        },
        os: {
          name: Platform.OS,
          version: Platform.Version?.toString(),
        },
      },
    };

    // Send to Sentry
    fetch(SENTRY_STORE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }).catch(err => console.log('Sentry send error:', err));

    console.log('Sentry: Captured exception -', errorObj.message);
  } catch (err) {
    console.error('Sentry: Failed to capture exception', err);
  }
};

// Capture a message (non-error)
export const captureMessage = async (
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' = 'info',
  extra?: Record<string, any>
) => {
  try {
    const event = {
      event_id: generateEventId(),
      timestamp: new Date().toISOString(),
      platform: 'javascript',
      level,
      logger: 'thegent-app',
      message,
      user: userContext.id ? userContext : undefined,
      tags: {
        platform: Platform.OS,
      },
      extra,
      breadcrumbs: breadcrumbs.slice(-10),
      contexts: {
        app: {
          app_name: 'TheGent',
          app_version: Constants.expoConfig?.version || '1.0.0',
        },
      },
    };

    fetch(SENTRY_STORE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }).catch(err => console.log('Sentry send error:', err));

    console.log('Sentry: Captured message -', message);
  } catch (err) {
    console.error('Sentry: Failed to capture message', err);
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Generate unique event ID
const generateEventId = (): string => {
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Parse stack trace into Sentry format
const parseStackTrace = (stack: string) => {
  const frames = stack
    .split('\n')
    .slice(1)
    .map((line) => {
      const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/);
      if (match) {
        return {
          function: match[1],
          filename: match[2],
          lineno: parseInt(match[3], 10),
          colno: parseInt(match[4], 10),
        };
      }
      return { filename: line.trim() };
    })
    .filter(Boolean);

  return { frames: frames.reverse() };
};

// ============================================
// CONVENIENCE FUNCTIONS FOR COMMON ERRORS
// ============================================

// Track API errors
export const captureApiError = (
  endpoint: string,
  statusCode: number,
  errorMessage?: string
) => {
  captureException(new Error(`API Error: ${endpoint} returned ${statusCode}`), {
    tags: {
      error_type: 'api_error',
      endpoint,
      status_code: statusCode.toString(),
    },
    extra: {
      endpoint,
      statusCode,
      errorMessage,
    },
    level: statusCode >= 500 ? 'error' : 'warning',
  });
};

// Track validation errors
export const captureValidationError = (
  imageType: 'face' | 'body' | 'skin',
  errorMessage: string
) => {
  captureMessage(`Image validation failed: ${imageType}`, 'warning', {
    imageType,
    errorMessage,
  });
};

// Track navigation errors
export const captureNavigationError = (
  screen: string,
  error: Error
) => {
  captureException(error, {
    tags: {
      error_type: 'navigation_error',
      screen,
    },
  });
};

export default {
  initSentry,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  captureException,
  captureMessage,
  captureApiError,
  captureValidationError,
  captureNavigationError,
};
