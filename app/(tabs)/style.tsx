import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackOpenedStyleIdentity } from '../../utils/analytics';

const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  lightBorder: '#E8E6E1',
  success: '#4A7C59',
  danger: '#C44536',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Comprehensive color hex mapping
const COLOR_HEX_MAP: { [key: string]: string } = {
  // Blues
  'Navy': '#1B3A57',
  'Navy Blue': '#000080',
  'Royal Blue': '#4169E1',
  'Slate Blue': '#6A5ACD',
  'Deep Teal': '#014D4E',
  'Teal': '#008080',
  'Light Blue': '#ADD8E6',
  'Sky Blue': '#87CEEB',
  'Cobalt': '#0047AB',
  'Powder Blue': '#B0E0E6',
  'Steel Blue': '#4682B4',
  'Denim': '#1560BD',
  
  // Greens
  'Forest Green': '#228B22',
  'Olive': '#808000',
  'Sage': '#9DC183',
  'Emerald': '#50C878',
  'Hunter Green': '#355E3B',
  'Moss': '#8A9A5B',
  'Mint': '#98FF98',
  'Seafoam': '#71EEB8',
  'Pine': '#01796F',
  'Kelly Green': '#4CBB17',
  'Jade': '#00A86B',
  'Olive Green': '#808000',
  'Dark Green': '#006400',
  'Light Green': '#90EE90',
  'Army Green': '#4B5320',
  
  // Browns/Neutrals
  'Camel': '#C19A6B',
  'Charcoal': '#36454F',
  'Taupe': '#483C32',
  'Chocolate': '#7B3F00',
  'Tan': '#D2B48C',
  'Beige': '#F5F5DC',
  'Khaki': '#C3B091',
  'Sand': '#C2B280',
  'Stone': '#928E85',
  'Pewter': '#8F8F8F',
  'Espresso': '#3C2415',
  'Cognac': '#9A463D',
  'Mocha': '#967969',
  'Chestnut': '#954535',
  'Coffee': '#6F4E37',
  'Dark Brown': '#654321',
  'Light Brown': '#B5651D',
  'Walnut': '#773F1A',
  
  // Reds/Pinks
  'Burgundy': '#722F37',
  'Rust': '#B7410E',
  'Wine': '#722F37',
  'Terracotta': '#E2725B',
  'Coral': '#FF7F50',
  'Brick': '#CB4154',
  'Maroon': '#800000',
  'Crimson': '#DC143C',
  'Salmon': '#FA8072',
  'Dusty Rose': '#DCAE96',
  'Blush': '#DE5D83',
  'Rose': '#FF007F',
  'Berry': '#8E4585',
  'Cranberry': '#9E003A',
  'Cherry': '#DE3163',
  
  // Yellows/Oranges
  'Mustard': '#FFDB58',
  'Gold': '#FFD700',
  'Amber': '#FFBF00',
  'Honey': '#EB9605',
  'Marigold': '#EAA221',
  'Ochre': '#CC7722',
  'Burnt Orange': '#CC5500',
  'Tangerine': '#FF9966',
  'Peach': '#FFCBA4',
  'Apricot': '#FBCEB1',
  'Pumpkin': '#FF7518',
  'Copper': '#B87333',
  
  // Purples
  'Plum': '#8E4585',
  'Eggplant': '#614051',
  'Lavender': '#E6E6FA',
  'Mauve': '#E0B0FF',
  'Violet': '#EE82EE',
  'Grape': '#6F2DA8',
  'Aubergine': '#3D0C02',
  'Lilac': '#C8A2C8',
  'Orchid': '#DA70D6',
  'Mulberry': '#C54B8C',
  
  // Whites/Creams
  'Cream': '#FFFDD0',
  'Ivory': '#FFFFF0',
  'White': '#FFFFFF',
  'Off-White': '#FAF9F6',
  'Pearl': '#FDEEF4',
  'Eggshell': '#F0EAD6',
  'Linen': '#FAF0E6',
  'Champagne': '#F7E7CE',
  'Vanilla': '#F3E5AB',
  
  // Grays/Blacks
  'Black': '#000000',
  'Gray': '#808080',
  'Grey': '#808080',
  'Light Gray': '#D3D3D3',
  'Light Grey': '#D3D3D3',
  'Dark Gray': '#A9A9A9',
  'Dark Grey': '#A9A9A9',
  'Silver': '#C0C0C0',
  'Slate': '#708090',
  'Graphite': '#383838',
  'Onyx': '#353839',
  'Jet Black': '#0A0A0A',
};

// Helper function to get color hex with fallback
const getColorHex = (colorName: string): string => {
  if (!colorName) return '#888888';
  
  const trimmedName = colorName.trim();
  
  // Direct match
  if (COLOR_HEX_MAP[trimmedName]) {
    return COLOR_HEX_MAP[trimmedName];
  }
  
  // Try case-insensitive exact match
  const lowerName = trimmedName.toLowerCase();
  for (const [key, value] of Object.entries(COLOR_HEX_MAP)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  // Try matching with common variations (e.g., "Olive Green" -> "Olive")
  const words = lowerName.split(/\s+/);
  
  // Check each word individually for a match
  for (const word of words) {
    for (const [key, value] of Object.entries(COLOR_HEX_MAP)) {
      if (key.toLowerCase() === word) {
        return value;
      }
    }
  }
  
  // Try partial match - check if color name contains any key
  for (const [key, value] of Object.entries(COLOR_HEX_MAP)) {
    const keyLower = key.toLowerCase();
    if (lowerName.includes(keyLower) || keyLower.includes(lowerName)) {
      return value;
    }
  }
  
  // Common color word extraction
  const colorKeywords: { [key: string]: string } = {
    'green': '#228B22',
    'blue': '#1B3A57',
    'red': '#DC143C',
    'brown': '#8B4513',
    'orange': '#FF8C00',
    'yellow': '#FFD700',
    'purple': '#800080',
    'pink': '#FFC0CB',
    'gray': '#808080',
    'grey': '#808080',
    'black': '#000000',
    'white': '#FFFFFF',
    'tan': '#D2B48C',
    'beige': '#F5F5DC',
  };
  
  for (const [keyword, hex] of Object.entries(colorKeywords)) {
    if (lowerName.includes(keyword)) {
      return hex;
    }
  }
  
  // Default gray for truly unknown colors
  return '#888888';
};

// Banned colors based on skin tone
const BANNED_COLORS: { [key: string]: string[] } = {
  'Fair': ['Pale Yellow', 'Orange', 'Neon Pink'],
  'Light': ['Washed Pastels', 'Bright White', 'Mustard'],
  'Medium': ['Skin-tone Beige', 'Pale Pink', 'Light Gray'],
  'Olive': ['Neon Green', 'Muddy Brown', 'Hot Pink'],
  'Tan': ['Dull Brown', 'Muted Gray', 'Washed Blue'],
  'Deep': ['Dark Brown alone', 'Black alone', 'Muddy Green'],
};

const BANNED_COLOR_HEX: { [key: string]: string } = {
  'Pale Yellow': '#FFFFE0',
  'Orange': '#FFA500',
  'Neon Pink': '#FF6EC7',
  'Washed Pastels': '#E6E6FA',
  'Bright White': '#FFFFFF',
  'Mustard': '#FFDB58',
  'Skin-tone Beige': '#C8AD7F',
  'Pale Pink': '#FADADD',
  'Light Gray': '#D3D3D3',
  'Neon Green': '#39FF14',
  'Muddy Brown': '#5C4033',
  'Hot Pink': '#FF69B4',
  'Dull Brown': '#6B4423',
  'Muted Gray': '#9E9E9E',
  'Washed Blue': '#B0C4DE',
  'Dark Brown alone': '#3D2314',
  'Black alone': '#1a1a1a',
  'Muddy Green': '#4A5D23',
};

// Haircut recommendations by face shape
const HAIRCUT_RECOMMENDATIONS: { [key: string]: { name: string; description: string; tips: string[] } } = {
  'Oval': {
    name: 'The Versatile Classic',
    description: 'Your balanced proportions allow for maximum flexibility.',
    tips: ['Medium length on top', 'Clean fade on sides', 'Can experiment with most styles'],
  },
  'Round': {
    name: 'The Angular Sculpt',
    description: 'Add height and angles to elongate the face.',
    tips: ['Volume on top', 'Tight sides', 'Avoid rounded styles', 'Textured quiff works well'],
  },
  'Square': {
    name: 'The Soft Taper',
    description: 'Soften strong jawline with flowing styles.',
    tips: ['Medium fade', 'Textured top', 'Side part works well', 'Avoid boxy cuts'],
  },
  'Oblong': {
    name: 'The Balanced Frame',
    description: 'Add width while avoiding extra height.',
    tips: ['Shorter on top', 'Fuller on sides', 'Bangs can help', 'Avoid tall pompadours'],
  },
  'Heart': {
    name: 'The Forehead Balancer',
    description: 'Balance wider forehead with fuller sides.',
    tips: ['Medium length all around', 'Side-swept fringe', 'Avoid slicked back styles'],
  },
  'Diamond': {
    name: 'The Width Creator',
    description: 'Add fullness at forehead and chin.',
    tips: ['Fuller fringe', 'Volume on sides', 'Textured styles', 'Chin-length options'],
  },
};

interface StyleProfile {
  face_shape: string;
  body_type: string;
  skin_tone: string;
  undertone: string;
  seasonal_palette: string;
  archetype: string;
  best_colors: string[];
  approved_items: string[];
  avoid_items: string[];
  has_completed_analysis?: boolean;
}

// Barber & Beard interfaces
interface HairstyleItem {
  name: string;
  description: string;
  why_it_works: string;
}

interface BarberSection {
  face_shape: string;
  hairstyles: HairstyleItem[];
}

interface BeardStyleItem {
  name: string;
  description: string;
  why_it_works: string;
}

interface BeardSection {
  beard_styles: BeardStyleItem[];
}

interface HeadshotImage {
  style_type: string;
  name: string;
  image_base64: string;
}

interface AnalysisMode {
  is_test_mode: boolean;
  analysis_count: number;
  max_analyses: number;
  can_analyze: boolean;
  remaining_regenerations: number;
  has_existing_analysis: boolean;
  locked_message: string | null;
}

export default function MyStyleScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedAnalysis, setHasCompletedAnalysis] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Barber & Beard state
  const [barberSection, setBarberSection] = useState<BarberSection | null>(null);
  const [beardSection, setBeardSection] = useState<BeardSection | null>(null);
  const [hairstyleImages, setHairstyleImages] = useState<{ [key: number]: string }>({});
  const [beardImages, setBeardImages] = useState<{ [key: number]: string }>({});
  const [generatingHairstyle, setGeneratingHairstyle] = useState<number | null>(null);
  const [generatingBeard, setGeneratingBeard] = useState<number | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    checkStatusAndLoadProfile();
    // Track opened style identity
    trackOpenedStyleIdentity();
  }, []);

  useEffect(() => {
    if (profile) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [profile]);

  // Auto-generate first hairstyle and beard images when data is loaded
  useEffect(() => {
    if (barberSection?.hairstyles?.[0] && !hairstyleImages[0] && generatingHairstyle !== 0) {
      generateHeadshotImage('hairstyle', 0, barberSection.hairstyles[0]);
    }
  }, [barberSection]);

  useEffect(() => {
    if (beardSection?.beard_styles?.[0] && !beardImages[0] && generatingBeard !== 0) {
      generateHeadshotImage('beard', 0, beardSection.beard_styles[0]);
    }
  }, [beardSection]);

  // Generate headshot image function
  const generateHeadshotImage = async (
    styleType: 'hairstyle' | 'beard',
    index: number,
    style: HairstyleItem | BeardStyleItem
  ) => {
    if (styleType === 'hairstyle') {
      setGeneratingHairstyle(index);
    } else {
      setGeneratingBeard(index);
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/sgc-brain/generate-headshot-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style_type: styleType,
          name: style.name,
          description: style.description,
          phone: phone,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.image_base64) {
          if (styleType === 'hairstyle') {
            setHairstyleImages(prev => ({ ...prev, [index]: data.image_base64 }));
          } else {
            setBeardImages(prev => ({ ...prev, [index]: data.image_base64 }));
          }
        }
      }
    } catch (error) {
      console.error(`Error generating ${styleType} image:`, error);
    } finally {
      if (styleType === 'hairstyle') {
        setGeneratingHairstyle(null);
      } else {
        setGeneratingBeard(null);
      }
    }
  };

  const checkAnalysisMode = async () => {
    try {
      const phone = await AsyncStorage.getItem('sgc_phone');
      if (phone) {
        const response = await fetch(`${BACKEND_URL}/api/sgc-brain/analysis-mode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phone.replace('+1', '') })
        });
        if (response.ok) {
          const data = await response.json();
          setAnalysisMode(data);
        }
      }
    } catch (error) {
      console.log('Error checking analysis mode:', error);
    }
  };

  const handleForceReset = async () => {
    try {
      setIsResetting(true);
      const phone = await AsyncStorage.getItem('sgc_phone');
      if (!phone) {
        alert('No phone number found');
        return;
      }
      
      const response = await fetch(`${BACKEND_URL}/api/sgc-brain/force-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: phone.replace('+1', ''),
          confirm: true 
        })
      });
      
      if (response.ok) {
        // Clear all local storage related to analysis
        await AsyncStorage.multiRemove([
          'sgc_has_completed_analysis',
          'sgc_brain_result',
          'sgc_outfit_images',
          'style_engine_complete',
          'style_engine_face',
          'style_engine_body',
          'style_engine_skin',
          'style_engine_archetype',
          'style_engine_preferences',
          'sgc_image_face_uri',
          'sgc_image_body_uri',
          'sgc_image_skin_uri',
        ]);
        
        setProfile(null);
        setHasCompletedAnalysis(false);
        await checkAnalysisMode();
        
        // Redirect to analysis flow with intro screen
        router.push('/style-engine/analysis-intro');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to reset');
      }
    } catch (error) {
      console.error('Force reset error:', error);
      alert('Failed to reset analysis');
    } finally {
      setIsResetting(false);
    }
  };

  const checkStatusAndLoadProfile = async () => {
    setIsLoading(true);
    try {
      // Check email verification status FIRST
      const emailVerified = await AsyncStorage.getItem('sgc_email_verified');
      setIsEmailVerified(emailVerified === 'true');
      
      // Check local storage first - prioritize cached data for instant display
      const localPremium = await AsyncStorage.getItem('sgc_is_premium');
      const localAnalysis = await AsyncStorage.getItem('sgc_has_completed_analysis');
      const brainResult = await AsyncStorage.getItem('sgc_brain_result');
      const storedPhone = await AsyncStorage.getItem('sgc_phone');
      
      if (storedPhone) {
        setPhone(storedPhone.replace('+1', ''));
      }
      
      if (localPremium === 'true') {
        setIsPremium(true);
      }
      
      // Only load profile data if email is verified
      if (emailVerified !== 'true') {
        setIsLoading(false);
        return;
      }
      
      // If we have cached brain result, show it immediately
      if (brainResult) {
        const parsed = JSON.parse(brainResult);
        const identity = parsed.identity_snapshot_v1;
        
        if (identity) {
          setProfile({
            face_shape: identity.face_shape,
            body_type: identity.body_type,
            skin_tone: identity.skin_tone,
            undertone: identity.skin_undertone,
            seasonal_palette: identity.seasonal_palette,
            archetype: identity.overall_archetype,
            best_colors: identity.best_colors || [],
            approved_items: generateApprovedItems(identity),
            avoid_items: identity.avoid_colors || [],
          });
          setHasCompletedAnalysis(true);
          
          // Load barber and beard sections
          if (parsed.barber_section) {
            setBarberSection(parsed.barber_section);
          }
          if (parsed.beard_section) {
            setBeardSection(parsed.beard_section);
          }
          
          setIsLoading(false);
          
          // Check analysis mode in background
          checkAnalysisMode();
          return;
        }
      }
      
      if (localAnalysis === 'true') {
        setHasCompletedAnalysis(true);
      }

      // Check analysis mode
      await checkAnalysisMode();

      // Try to get status from backend (background check)
      try {
        const statusResponse = await fetch(`${BACKEND_URL}/api/auth/user-status`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setIsPremium(statusData.is_premium);
          setHasCompletedAnalysis(statusData.has_completed_analysis);
          
          if (statusData.is_premium) {
            await AsyncStorage.setItem('sgc_is_premium', 'true');
          }
          if (statusData.has_completed_analysis) {
            await AsyncStorage.setItem('sgc_has_completed_analysis', 'true');
          }
        }
      } catch (e) {
        console.log('Backend status check failed, using cached data');
      }

      // If analysis is complete but no cached result, try to load profile
      if (localAnalysis === 'true' || (await AsyncStorage.getItem('sgc_has_completed_analysis')) === 'true') {
        await loadProfile();
      }
    } catch (error) {
      console.log('Error checking status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      // Priority 1: Load from SGC Brain result (Gemini output)
      const brainResult = await AsyncStorage.getItem('sgc_brain_result');
      if (brainResult) {
        const parsed = JSON.parse(brainResult);
        const identity = parsed.identity_snapshot_v1;
        
        if (identity) {
          setProfile({
            face_shape: identity.face_shape,
            body_type: identity.body_type,
            skin_tone: identity.skin_tone,
            undertone: identity.skin_undertone,
            seasonal_palette: identity.seasonal_palette,
            archetype: identity.overall_archetype,
            best_colors: identity.best_colors || [],
            approved_items: generateApprovedItems(identity),
            avoid_items: identity.avoid_colors || [],
          });
          setHasCompletedAnalysis(true);
          return;
        }
      }

      // Priority 2: Try to get from backend SGC Brain status
      const phone = await AsyncStorage.getItem('sgc_phone');
      if (phone) {
        const statusResponse = await fetch(`${BACKEND_URL}/api/sgc-brain/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phone.replace('+1', '') })
        });
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.has_analysis && statusData.identity_snapshot_v1) {
            const identity = statusData.identity_snapshot_v1;
            setProfile({
              face_shape: identity.face_shape,
              body_type: identity.body_type,
              skin_tone: identity.skin_tone,
              undertone: identity.skin_undertone,
              seasonal_palette: identity.seasonal_palette,
              archetype: identity.overall_archetype,
              best_colors: identity.best_colors || [],
              approved_items: generateApprovedItems(identity),
              avoid_items: identity.avoid_colors || [],
            });
            setHasCompletedAnalysis(true);
            
            // Cache locally for faster loads
            await AsyncStorage.setItem('sgc_brain_result', JSON.stringify({
              identity_snapshot_v1: identity,
              outfit_catalog_v1: statusData.outfit_catalog_v1
            }));
            return;
          }
        }
      }

      // Priority 3: Legacy - try old profile endpoint
      try {
        const response = await fetch(`${BACKEND_URL}/api/profile`);
        if (response.ok) {
          const data = await response.json();
          if (data.has_completed_analysis || data.face_shape) {
            setProfile(data);
            setHasCompletedAnalysis(true);
            return;
          }
        }
      } catch (error) {
        console.log('Backend profile not found');
      }
    } catch (error) {
      console.log('Error loading profile:', error);
    }
  };

  // Generate approved items based on identity
  const generateApprovedItems = (identity: any): string[] => {
    const items: string[] = [];
    
    // Body type recommendations
    if (identity.body_type === 'Athletic') {
      items.push('Fitted clothes that show physique');
      items.push('Slim fit shirts');
    } else if (identity.body_type === 'Slim') {
      items.push('Layered outfits');
      items.push('Textured fabrics');
    }
    
    // Face shape recommendations
    if (identity.face_shape === 'Oval') {
      items.push('Most frame shapes work well');
    } else if (identity.face_shape === 'Round') {
      items.push('Angular frames');
      items.push('V-necks');
    }
    
    // Default items
    items.push('Structured blazers');
    items.push('Tailored trousers');
    
    return items.slice(0, 5);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkStatusAndLoadProfile();
    setRefreshing(false);
  };

  const handleBeginAnalysis = () => {
    // Check if user is premium first
    if (!isPremium) {
      // Redirect to gate to unlock premium
      router.push('/style-engine/gate');
    } else {
      // Start the analysis flow with intro screen
      router.push('/style-engine/analysis-intro');
    }
  };

  const getBannedColors = () => {
    if (!profile) return [];
    return BANNED_COLORS[profile.skin_tone] || BANNED_COLORS['Medium'];
  };

  const getHaircutRec = () => {
    if (!profile) return HAIRCUT_RECOMMENDATIONS['Oval'];
    return HAIRCUT_RECOMMENDATIONS[profile.face_shape] || HAIRCUT_RECOMMENDATIONS['Oval'];
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  // Locked state - Analysis not completed
  if (!hasCompletedAnalysis) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={styles.lockedContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
          }
        >
          <View style={styles.lockedContent}>
            {/* DNA Icon */}
            <View style={styles.lockedIconContainer}>
              <Ionicons name="finger-print" size={56} color={COLORS.accent} />
            </View>
            
            <Text style={styles.lockedTitle}>Your Style Identity</Text>
            <Text style={styles.lockedSubtitle}>
              Complete the Biological Analysis to unlock your personalized style blueprint based on your unique physical attributes.
            </Text>

            {/* Features List */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <View style={styles.featureIconBg}>
                  <Ionicons name="scan-outline" size={20} color={COLORS.accent} />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Facial Analysis</Text>
                  <Text style={styles.featureDesc}>Face shape & hairline mapping</Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconBg}>
                  <Ionicons name="body-outline" size={20} color={COLORS.accent} />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Body Mapping</Text>
                  <Text style={styles.featureDesc}>Silhouette & proportions</Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconBg}>
                  <Ionicons name="color-palette-outline" size={20} color={COLORS.accent} />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Skin Analysis</Text>
                  <Text style={styles.featureDesc}>Undertones & seasonal palette</Text>
                </View>
              </View>
            </View>

            {/* CTA Button */}
            <TouchableOpacity style={styles.beginButton} onPress={handleBeginAnalysis}>
              <Ionicons name="flask" size={20} color={COLORS.white} />
              <Text style={styles.beginButtonText}>Begin Biological Analysis</Text>
            </TouchableOpacity>

            <Text style={styles.timeEstimate}>
              <Ionicons name="time-outline" size={12} color={COLORS.muted} /> Estimated time: 2-3 minutes
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Analysis complete but email NOT verified - show locked state with gate redirect
  if (hasCompletedAnalysis && !isEmailVerified) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={styles.lockedContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
          }
        >
          <View style={styles.lockedContent}>
            {/* Lock Icon */}
            <View style={styles.lockedIconContainer}>
              <Ionicons name="lock-closed" size={56} color={COLORS.accent} />
            </View>
            
            <Text style={styles.lockedTitle}>Results Locked</Text>
            <Text style={styles.lockedSubtitle}>
              Your style analysis is complete! To view your personalized results, please verify your membership email.
            </Text>

            {/* Blurred Preview */}
            <View style={styles.blurredPreviewCard}>
              <View style={styles.blurredRow}>
                <View style={[styles.blurredBox, { width: 80 }]} />
                <View style={[styles.blurredBox, { width: 100 }]} />
              </View>
              <View style={styles.blurredRow}>
                <View style={[styles.blurredBox, { width: 120 }]} />
              </View>
              <View style={styles.blurredColors}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={styles.blurredColorSwatch} />
                ))}
              </View>
              <View style={styles.lockOverlaySmall}>
                <Ionicons name="lock-closed" size={24} color={COLORS.accent} />
              </View>
            </View>

            {/* CTA Button */}
            <TouchableOpacity 
              style={styles.beginButton} 
              onPress={() => router.push('/style-engine/gate')}
            >
              <Ionicons name="mail-outline" size={20} color={COLORS.white} />
              <Text style={styles.beginButtonText}>Verify Email to Unlock</Text>
            </TouchableOpacity>

            <Text style={styles.timeEstimate}>
              <Ionicons name="shield-checkmark-outline" size={12} color={COLORS.muted} /> Use your purchase email
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Profile not loaded yet but analysis is complete
  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
          }
        >
          <View style={styles.emptyContent}>
            <View style={styles.emptyIcon}>
              <Ionicons name="refresh-outline" size={48} color={COLORS.accent} />
            </View>
            <Text style={styles.emptyTitle}>Loading Your Style</Text>
            <Text style={styles.emptySubtitle}>
              Pull down to refresh your style profile
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  const haircutRec = getHaircutRec();
  const bannedColors = getBannedColors();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Your Style Identity</Text>
            <View style={styles.paletteBadge}>
              <Ionicons name="color-palette" size={14} color={COLORS.accent} />
              <Text style={styles.paletteBadgeText}>{profile.seasonal_palette} Palette</Text>
            </View>
          </View>

          {/* Identity Card */}
          <View style={styles.identityCard}>
            <View style={styles.identityHeader}>
              <Text style={styles.identityLabel}>PHYSICAL PROFILE</Text>
              <View style={styles.confidenceBadge}>
                <Ionicons name="shield-checkmark" size={12} color={COLORS.success} />
                <Text style={styles.confidenceText}>Verified</Text>
              </View>
            </View>

            <View style={styles.identityGrid}>
              <View style={styles.identityItem}>
                <View style={styles.identityIconContainer}>
                  <Ionicons name="happy-outline" size={24} color={COLORS.accent} />
                </View>
                <Text style={styles.identityItemLabel}>Face Shape</Text>
                <Text style={styles.identityItemValue}>{profile.face_shape}</Text>
              </View>

              <View style={styles.identityDivider} />

              <View style={styles.identityItem}>
                <View style={styles.identityIconContainer}>
                  <Ionicons name="body-outline" size={24} color={COLORS.accent} />
                </View>
                <Text style={styles.identityItemLabel}>Body Type</Text>
                <Text style={styles.identityItemValue}>{profile.body_type}</Text>
              </View>

              <View style={styles.identityDivider} />

              <View style={styles.identityItem}>
                <View style={styles.identityIconContainer}>
                  <Ionicons name="color-fill-outline" size={24} color={COLORS.accent} />
                </View>
                <Text style={styles.identityItemLabel}>Skin Tone</Text>
                <Text style={styles.identityItemValue}>{profile.skin_tone}</Text>
                <Text style={styles.identityItemSub}>{profile.undertone} Undertone</Text>
              </View>
            </View>
          </View>

          {/* Approved Color Palette */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>YOUR APPROVED PALETTE</Text>
              <View style={styles.approvedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              </View>
            </View>
            <View style={styles.colorPaletteCard}>
              <View style={styles.colorSwatches}>
                {profile.best_colors.map((color, index) => (
                  <View key={index} style={styles.colorSwatchItem}>
                    <View
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: getColorHex(color) },
                      ]}
                    />
                    <Text style={styles.colorSwatchLabel}>{color}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Banned Colors */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>COLORS TO AVOID</Text>
              <View style={styles.bannedBadge}>
                <Ionicons name="close-circle" size={14} color={COLORS.danger} />
              </View>
            </View>
            <View style={styles.bannedColorsCard}>
              <View style={styles.bannedSwatches}>
                {bannedColors.map((color, index) => (
                  <View key={index} style={styles.bannedSwatchItem}>
                    <View style={styles.bannedSwatchContainer}>
                      <View
                        style={[
                          styles.bannedSwatch,
                          { backgroundColor: BANNED_COLOR_HEX[color] || '#888' },
                        ]}
                      />
                      <View style={styles.bannedX}>
                        <Ionicons name="close" size={12} color={COLORS.white} />
                      </View>
                    </View>
                    <Text style={styles.bannedSwatchLabel}>{color}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Grooming / Barber Instruction - Dynamic Hairstyle Section */}
          {barberSection && barberSection.hairstyles && barberSection.hairstyles.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>HAIRSTYLE RECOMMENDATIONS</Text>
                <View style={styles.approvedBadge}>
                  <Ionicons name="cut" size={14} color={COLORS.accent} />
                </View>
              </View>
              <Text style={styles.sectionSubtitle}>Based on your {barberSection.face_shape} face shape</Text>
              
              {barberSection.hairstyles.map((style, index) => (
                <View key={index} style={styles.styleCard}>
                  <View style={styles.styleCardHeader}>
                    <View style={styles.styleIconContainer}>
                      <Ionicons name="cut-outline" size={24} color={COLORS.accent} />
                    </View>
                    <View style={styles.styleTitleContainer}>
                      <Text style={styles.styleName}>{style.name}</Text>
                      <Text style={styles.styleDescription}>{style.description}</Text>
                    </View>
                  </View>
                  
                  {/* Image Section */}
                  <View style={styles.styleImageSection}>
                    {hairstyleImages[index] ? (
                      <Image
                        source={{ uri: `data:image/png;base64,${hairstyleImages[index]}` }}
                        style={styles.styleImage}
                        resizeMode="contain"
                      />
                    ) : generatingHairstyle === index ? (
                      <View style={styles.styleImagePlaceholder}>
                        <ActivityIndicator size="large" color={COLORS.accent} />
                        <Text style={styles.generatingText}>Generating preview...</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.generateButton}
                        onPress={() => generateHeadshotImage('hairstyle', index, style)}
                      >
                        <Ionicons name="image-outline" size={24} color={COLORS.accent} />
                        <Text style={styles.generateButtonText}>Generate Preview</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={styles.styleWhyWorks}>
                    <Text style={styles.styleWhyLabel}>Why it works:</Text>
                    <Text style={styles.styleWhyText}>{style.why_it_works}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Beard Style Section */}
          {beardSection && beardSection.beard_styles && beardSection.beard_styles.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>BEARD STYLE RECOMMENDATIONS</Text>
                <View style={styles.approvedBadge}>
                  <Ionicons name="person" size={14} color={COLORS.accent} />
                </View>
              </View>
              <Text style={styles.sectionSubtitle}>Styles that complement your features</Text>
              
              {beardSection.beard_styles.map((style, index) => (
                <View key={index} style={styles.styleCard}>
                  <View style={styles.styleCardHeader}>
                    <View style={styles.styleIconContainer}>
                      <Ionicons name="man-outline" size={24} color={COLORS.accent} />
                    </View>
                    <View style={styles.styleTitleContainer}>
                      <Text style={styles.styleName}>{style.name}</Text>
                      <Text style={styles.styleDescription}>{style.description}</Text>
                    </View>
                  </View>
                  
                  {/* Image Section */}
                  <View style={styles.styleImageSection}>
                    {beardImages[index] ? (
                      <Image
                        source={{ uri: `data:image/png;base64,${beardImages[index]}` }}
                        style={styles.styleImage}
                        resizeMode="contain"
                      />
                    ) : generatingBeard === index ? (
                      <View style={styles.styleImagePlaceholder}>
                        <ActivityIndicator size="large" color={COLORS.accent} />
                        <Text style={styles.generatingText}>Generating preview...</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.generateButton}
                        onPress={() => generateHeadshotImage('beard', index, style)}
                      >
                        <Ionicons name="image-outline" size={24} color={COLORS.accent} />
                        <Text style={styles.generateButtonText}>Generate Preview</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={styles.styleWhyWorks}>
                    <Text style={styles.styleWhyLabel}>Why it works:</Text>
                    <Text style={styles.styleWhyText}>{style.why_it_works}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Fallback: Static Barber Instruction if no dynamic data */}
          {(!barberSection || !barberSection.hairstyles || barberSection.hairstyles.length === 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>BARBER INSTRUCTION</Text>
              <View style={styles.barberCard}>
                <View style={styles.barberHeader}>
                  <View style={styles.barberIconContainer}>
                    <Ionicons name="cut" size={28} color={COLORS.accent} />
                  </View>
                  <View style={styles.barberTitleContainer}>
                    <Text style={styles.barberName}>{haircutRec.name}</Text>
                    <Text style={styles.barberFaceShape}>For {profile.face_shape} Face</Text>
                  </View>
                </View>
                
                <Text style={styles.barberDescription}>{haircutRec.description}</Text>
                
                <View style={styles.barberTips}>
                  <Text style={styles.barberTipsTitle}>Show Your Barber:</Text>
                  {haircutRec.tips.map((tip, index) => (
                    <View key={index} style={styles.barberTipItem}>
                      <View style={styles.barberTipDot} />
                      <Text style={styles.barberTipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Approved Items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>APPROVED FOR YOU</Text>
              <View style={styles.approvedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              </View>
            </View>
            <View style={styles.listCard}>
              {profile.approved_items.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={[styles.listDot, { backgroundColor: COLORS.success }]} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Avoid Items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ITEMS TO AVOID</Text>
              <View style={styles.bannedBadge}>
                <Ionicons name="close-circle" size={14} color={COLORS.danger} />
              </View>
            </View>
            <View style={styles.listCard}>
              {profile.avoid_items.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={[styles.listDot, { backgroundColor: COLORS.danger }]} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* TEST MODE SECTION - Only visible for admin phone */}
          {analysisMode?.is_test_mode && (
            <View style={styles.testModeSection}>
              <View style={styles.testModeBanner}>
                <Ionicons name="flask" size={16} color="#FF6B00" />
                <Text style={styles.testModeLabel}>TEST MODE ACTIVE</Text>
              </View>
              
              <View style={styles.testModeCard}>
                <Text style={styles.testModeTitle}>Developer Options</Text>
                <Text style={styles.testModeDesc}>
                  Analysis count: {analysisMode.analysis_count} (Unlimited in test mode)
                </Text>
                
                <TouchableOpacity
                  style={[styles.forceResetButton, isResetting && styles.forceResetButtonDisabled]}
                  onPress={handleForceReset}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={18} color={COLORS.white} />
                      <Text style={styles.forceResetText}>Force New Analysis (Test)</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <Text style={styles.testModeWarning}>
                  ⚠️ This will clear all analysis data and start fresh
                </Text>
              </View>
            </View>
          )}

          {/* REGENERATION OPTION - For normal users with remaining regens */}
          {!analysisMode?.is_test_mode && analysisMode?.remaining_regenerations > 0 && (
            <View style={styles.section}>
              <View style={styles.regenCard}>
                <Text style={styles.regenTitle}>Need to update your profile?</Text>
                <Text style={styles.regenDesc}>
                  You have {analysisMode.remaining_regenerations} regeneration{analysisMode.remaining_regenerations > 1 ? 's' : ''} remaining.
                </Text>
                <TouchableOpacity
                  style={styles.regenButton}
                  onPress={handleBeginAnalysis}
                >
                  <Ionicons name="refresh-outline" size={16} color={COLORS.accent} />
                  <Text style={styles.regenButtonText}>Regenerate Analysis</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* LOCKED MESSAGE - For users who exceeded limit */}
          {!analysisMode?.is_test_mode && analysisMode?.locked_message && (
            <View style={styles.section}>
              <View style={styles.lockedLimitCard}>
                <Ionicons name="lock-closed" size={20} color={COLORS.muted} />
                <Text style={styles.lockedLimitText}>{analysisMode.locked_message}</Text>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  // Locked state styles
  lockedContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  lockedContent: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  lockedIconContainer: {
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
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  featuresList: {
    width: '100%',
    marginBottom: 28,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: COLORS.muted,
  },
  beginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 16,
  },
  beginButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 10,
  },
  timeEstimate: {
    fontSize: 12,
    color: COLORS.muted,
  },
  // Empty state styles
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyContent: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 40,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '300',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  // Profile display styles
  header: {
    marginTop: 16,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '300',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 8,
  },
  paletteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF8E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  paletteBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
    marginLeft: 6,
  },
  identityCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  identityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  identityLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 1.5,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
    marginLeft: 4,
  },
  identityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  identityItem: {
    flex: 1,
    alignItems: 'center',
  },
  identityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  identityItemLabel: {
    fontSize: 10,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  identityItemValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
  },
  identityItemSub: {
    fontSize: 11,
    color: COLORS.accent,
    marginTop: 2,
  },
  identityDivider: {
    width: 1,
    backgroundColor: COLORS.lightBorder,
    marginVertical: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 1.5,
  },
  approvedBadge: {
    marginLeft: 8,
  },
  bannedBadge: {
    marginLeft: 8,
  },
  colorPaletteCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  colorSwatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorSwatchItem: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 16,
  },
  colorSwatch: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  colorSwatchLabel: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  bannedColorsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  bannedSwatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bannedSwatchItem: {
    alignItems: 'center',
    width: '33%',
    marginBottom: 12,
  },
  bannedSwatchContainer: {
    position: 'relative',
  },
  bannedSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.6,
    borderWidth: 2,
    borderColor: COLORS.lightBorder,
  },
  bannedX: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannedSwatchLabel: {
    fontSize: 10,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 6,
  },
  barberCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  barberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  barberIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  barberTitleContainer: {
    flex: 1,
  },
  barberName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 2,
  },
  barberFaceShape: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '500',
  },
  barberDescription: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
    marginBottom: 16,
  },
  barberTips: {
    backgroundColor: '#F9F8F4',
    borderRadius: 12,
    padding: 16,
  },
  barberTipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 10,
  },
  barberTipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  barberTipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginRight: 10,
  },
  barberTipText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  listCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  listDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  listText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  // Test Mode Styles
  testModeSection: {
    marginBottom: 24,
  },
  testModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 12,
    alignSelf: 'center',
  },
  testModeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B00',
    letterSpacing: 1,
    marginLeft: 6,
  },
  testModeCard: {
    backgroundColor: '#FFF8F0',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  testModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  testModeDesc: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
  },
  forceResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 12,
  },
  forceResetButtonDisabled: {
    opacity: 0.6,
  },
  forceResetText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 8,
  },
  testModeWarning: {
    fontSize: 11,
    color: '#FF6B00',
    textAlign: 'center',
  },
  // Regeneration Styles (for normal users)
  regenCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    alignItems: 'center',
  },
  regenTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 6,
  },
  regenDesc: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
    textAlign: 'center',
  },
  regenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  regenButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.accent,
    marginLeft: 6,
  },
  // Locked Limit Styles
  lockedLimitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  lockedLimitText: {
    fontSize: 13,
    color: COLORS.muted,
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
  },
  // Hairstyle & Beard Style Card Styles
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 16,
    marginTop: -8,
  },
  styleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    marginBottom: 16,
  },
  styleCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  styleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  styleTitleContainer: {
    flex: 1,
  },
  styleName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 6,
  },
  styleDescription: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 19,
  },
  styleWhyWorks: {
    backgroundColor: '#F9F8F4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  styleWhyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  styleWhyText: {
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 19,
  },
  styleImageSection: {
    alignItems: 'center',
    minHeight: 200,
  },
  styleImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: COLORS.lightBorder,
  },
  styleImagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F9F8F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    borderStyle: 'dashed',
  },
  generatingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.muted,
  },
  generateButton: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
  },
  generateButtonText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  // Blurred preview styles for locked state
  blurredPreviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    position: 'relative',
    overflow: 'hidden',
  },
  blurredRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  blurredBox: {
    height: 16,
    backgroundColor: '#E8E6E1',
    borderRadius: 8,
    marginRight: 10,
  },
  blurredColors: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  blurredColorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D4D4D4',
    marginHorizontal: 4,
  },
  lockOverlaySmall: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
});
