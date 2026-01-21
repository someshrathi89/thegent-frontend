import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  lightBorder: '#E8E6E1',
  success: '#4A7C59',
  error: '#C44536',
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
  
  // Common problematic colors to avoid
  'Neon': '#39FF14',
  'Neon Green': '#39FF14',
  'Neon Pink': '#FF6EC7',
  'Neon Yellow': '#FFFF00',
  'Neon Orange': '#FF5F1F',
  'Hot Pink': '#FF69B4',
  'Bright Orange': '#FF5F15',
  'Bright Yellow': '#FFFF00',
  'Bright Red': '#FF0000',
  'Electric Blue': '#7DF9FF',
  'Fluorescent': '#CCFF00',
  'Lime Green': '#32CD32',
  'Bright Green': '#66FF00',
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

interface IdentitySnapshot {
  face_shape: string;
  face_confidence: number;
  body_type: string;
  body_confidence: number;
  skin_tone: string;
  skin_undertone: string;
  skin_confidence: number;
  seasonal_palette: string;
  best_colors: string[];
  avoid_colors: string[];
  overall_archetype: string;
}

interface OutfitItem {
  title: string;
  head_to_toe: string[];
  why_it_works: string;
  visual_spec: string;
  outfit_id?: string;
}

interface OutfitContext {
  context_name: string;
  outfits: OutfitItem[];
}

interface OutfitCatalog {
  contexts: OutfitContext[];
  total_outfits: number;
}

interface SGCBrainResult {
  identity_snapshot_v1: IdentitySnapshot;
  outfit_catalog_v1: OutfitCatalog;
  barber_section?: BarberSection;
  beard_section?: BeardSection;
  analysis_count: number;
  is_test_mode: boolean;
}

interface OutfitImage {
  success: boolean;
  context: string;
  outfit_index: number;
  title: string;
  image_base64?: string;
  outfit_id?: string;
}

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const [result, setResult] = useState<SGCBrainResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnims = useRef([...Array(5)].map(() => new Animated.Value(30))).current;

  useEffect(() => {
    loadResults();
  }, []);

  useEffect(() => {
    if (result) {
      // Start entrance animations
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      slideAnims.forEach((anim, index) => {
        Animated.timing(anim, {
          toValue: 0,
          duration: 400,
          delay: index * 100,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [result]);

  const loadResults = async () => {
    try {
      const storedResult = await AsyncStorage.getItem('sgc_brain_result');
      if (storedResult) {
        const parsed = JSON.parse(storedResult);
        
        // Add stable outfit_ids to each outfit if not present
        if (parsed.outfit_catalog_v1?.contexts) {
          parsed.outfit_catalog_v1.contexts = parsed.outfit_catalog_v1.contexts.map(
            (ctx: OutfitContext, ctxIdx: number) => ({
              ...ctx,
              outfits: ctx.outfits.map((outfit: OutfitItem, outfitIdx: number) => ({
                ...outfit,
                outfit_id: outfit.outfit_id || `${ctx.context_name.toLowerCase().replace(/\s+/g, '-')}-${outfitIdx}`,
              })),
            })
          );
        }
        
        setResult(parsed);
      }
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = async () => {
    // Mark analysis as complete and go to tabs
    await AsyncStorage.setItem('sgc_has_completed_analysis', 'true');
    router.replace('/(tabs)');
  };

  if (isLoading || !result) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading your blueprint...</Text>
      </View>
    );
  }

  const identity = result.identity_snapshot_v1;
  const catalog = result.outfit_catalog_v1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.successBadge}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.successText}>IDENTITY UNLOCKED</Text>
            </View>
            <Text style={styles.title}>Your Style Blueprint</Text>
            <Text style={styles.subtitle}>
              Personalized recommendations powered by TheGent AI
            </Text>
          </View>

          {/* Physical Profile Card */}
          <Animated.View style={[styles.section, { transform: [{ translateY: slideAnims[0] }] }]}>
            <Text style={styles.sectionLabel}>PHYSICAL PROFILE</Text>
            <View style={styles.profileCard}>
              <View style={styles.profileGrid}>
                <View style={styles.profileItem}>
                  <View style={styles.profileIconContainer}>
                    <Ionicons name="happy-outline" size={22} color={COLORS.accent} />
                  </View>
                  <Text style={styles.profileLabel}>Face Shape</Text>
                  <Text style={styles.profileValue}>{identity.face_shape}</Text>
                  <Text style={styles.profileConfidence}>
                    {Math.round(identity.face_confidence * 100)}% confidence
                  </Text>
                </View>

                <View style={styles.profileDivider} />

                <View style={styles.profileItem}>
                  <View style={styles.profileIconContainer}>
                    <Ionicons name="body-outline" size={22} color={COLORS.accent} />
                  </View>
                  <Text style={styles.profileLabel}>Body Type</Text>
                  <Text style={styles.profileValue}>{identity.body_type}</Text>
                  <Text style={styles.profileConfidence}>
                    {Math.round(identity.body_confidence * 100)}% confidence
                  </Text>
                </View>

                <View style={styles.profileDivider} />

                <View style={styles.profileItem}>
                  <View style={styles.profileIconContainer}>
                    <Ionicons name="color-fill-outline" size={22} color={COLORS.accent} />
                  </View>
                  <Text style={styles.profileLabel}>Skin Tone</Text>
                  <Text style={styles.profileValue}>{identity.skin_tone}</Text>
                  <Text style={styles.profileSub}>{identity.skin_undertone} Undertone</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Archetype & Palette */}
          <Animated.View style={[styles.section, { transform: [{ translateY: slideAnims[1] }] }]}>
            <Text style={styles.sectionLabel}>STYLE ARCHETYPE</Text>
            <View style={styles.archetypeCard}>
              <View style={styles.archetypeIcon}>
                <Ionicons name="diamond" size={28} color={COLORS.accent} />
              </View>
              <Text style={styles.archetypeName}>{identity.overall_archetype}</Text>
              <View style={styles.paletteBadge}>
                <Ionicons name="color-palette" size={14} color={COLORS.accent} />
                <Text style={styles.paletteText}>{identity.seasonal_palette} Palette</Text>
              </View>
            </View>
          </Animated.View>

          {/* Color Palette */}
          <Animated.View style={[styles.section, { transform: [{ translateY: slideAnims[2] }] }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>YOUR COLOR PALETTE</Text>
              <View style={styles.approvedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              </View>
            </View>
            <View style={styles.colorsCard}>
              <View style={styles.colorSwatches}>
                {identity.best_colors.slice(0, 5).map((color, index) => {
                  const hexColor = getColorHex(color);
                  return (
                    <View key={index} style={styles.colorItem}>
                      <View
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: hexColor },
                        ]}
                      />
                      <Text style={styles.colorName}>{color}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Avoid Colors */}
          {identity.avoid_colors && identity.avoid_colors.length > 0 && (
            <Animated.View style={[styles.section, { transform: [{ translateY: slideAnims[3] }] }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>COLORS TO AVOID</Text>
                <View style={styles.avoidBadge}>
                  <Ionicons name="close-circle" size={14} color={COLORS.error} />
                </View>
              </View>
              <View style={styles.avoidColorsCard}>
                <View style={styles.avoidColorSwatches}>
                  {identity.avoid_colors.map((color, index) => (
                    <View key={index} style={styles.avoidColorItem}>
                      <View style={styles.avoidSwatchContainer}>
                        <View
                          style={[
                            styles.avoidColorSwatch,
                            { backgroundColor: getColorHex(color) },
                          ]}
                        />
                        <View style={styles.avoidSwatchX}>
                          <Ionicons name="close" size={14} color={COLORS.white} />
                        </View>
                      </View>
                      <Text style={styles.avoidColorName}>{color}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>
          )}

          {/* Hairstyle Recommendations */}
          {result.barber_section && result.barber_section.hairstyles && result.barber_section.hairstyles.length > 0 && (
            <Animated.View style={[styles.section, { transform: [{ translateY: slideAnims[4] }] }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>HAIRSTYLE RECOMMENDATIONS</Text>
                <View style={styles.approvedBadge}>
                  <Ionicons name="cut" size={14} color={COLORS.accent} />
                </View>
              </View>
              <Text style={styles.sectionSubtitle}>Based on your {result.barber_section.face_shape} face shape</Text>
              
              {result.barber_section.hairstyles.map((style, index) => (
                <View key={index} style={styles.styleCard}>
                  <View style={styles.styleCardHeader}>
                    <View style={styles.styleIconContainer}>
                      <Ionicons name="cut-outline" size={22} color={COLORS.accent} />
                    </View>
                    <View style={styles.styleTitleContainer}>
                      <Text style={styles.styleName}>{style.name}</Text>
                      <Text style={styles.styleDescription}>{style.description}</Text>
                    </View>
                  </View>
                  
                  {/* Image placeholder - to be generated in My Style tab */}
                  <View style={styles.styleImagePlaceholder}>
                    <Ionicons name="image-outline" size={32} color={COLORS.muted} />
                    <Text style={styles.imagePlaceholderText}>View in My Style tab to generate</Text>
                  </View>
                  
                  <View style={styles.styleWhyWorks}>
                    <Text style={styles.styleWhyLabel}>Why it works:</Text>
                    <Text style={styles.styleWhyText}>{style.why_it_works}</Text>
                  </View>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Beard Style Recommendations */}
          {result.beard_section && result.beard_section.beard_styles && result.beard_section.beard_styles.length > 0 && (
            <Animated.View style={[styles.section, { transform: [{ translateY: slideAnims[4] }] }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>BEARD STYLE RECOMMENDATIONS</Text>
                <View style={styles.approvedBadge}>
                  <Ionicons name="person" size={14} color={COLORS.accent} />
                </View>
              </View>
              <Text style={styles.sectionSubtitle}>Styles that complement your features</Text>
              
              {result.beard_section.beard_styles.map((style, index) => (
                <View key={index} style={styles.styleCard}>
                  <View style={styles.styleCardHeader}>
                    <View style={styles.styleIconContainer}>
                      <Ionicons name="man-outline" size={22} color={COLORS.accent} />
                    </View>
                    <View style={styles.styleTitleContainer}>
                      <Text style={styles.styleName}>{style.name}</Text>
                      <Text style={styles.styleDescription}>{style.description}</Text>
                    </View>
                  </View>
                  
                  {/* Image placeholder - to be generated in My Style tab */}
                  <View style={styles.styleImagePlaceholder}>
                    <Ionicons name="image-outline" size={32} color={COLORS.muted} />
                    <Text style={styles.imagePlaceholderText}>View in My Style tab to generate</Text>
                  </View>
                  
                  <View style={styles.styleWhyWorks}>
                    <Text style={styles.styleWhyLabel}>Why it works:</Text>
                    <Text style={styles.styleWhyText}>{style.why_it_works}</Text>
                  </View>
                </View>
              ))}
            </Animated.View>
          )}

          {/* CTA Section */}
          <Animated.View style={[styles.ctaSection, { transform: [{ translateY: slideAnims[4] }] }]}>
            {/* View Formulas Button */}
            <TouchableOpacity
              style={styles.formulasButton}
              onPress={() => router.replace('/(tabs)/formulas')}
              activeOpacity={0.9}
            >
              <Ionicons name="shirt-outline" size={20} color={COLORS.accent} />
              <Text style={styles.formulasButtonText}>View Your Outfit Formulas</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.accent} />
            </TouchableOpacity>

            {/* Continue to Dashboard */}
            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleDone}
              activeOpacity={0.9}
            >
              <Text style={styles.doneButtonText}>Continue to Dashboard</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function getContextIcon(contextName: string): any {
  const icons: { [key: string]: string } = {
    'Business': 'briefcase-outline',
    'Casual': 'shirt-outline',
    'Evening': 'moon-outline',
    'Sport/Athleisure': 'fitness-outline',
    'Minimalist': 'remove-outline',
    'Bold/Statement': 'flash-outline',
    'Seasonal': 'leaf-outline',
  };
  return icons[contextName] || 'shirt-outline';
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
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.muted,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  successText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.success,
    letterSpacing: 1,
    marginLeft: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  approvedBadge: {
    marginLeft: 8,
  },
  avoidBadge: {
    marginLeft: 8,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  profileGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileItem: {
    flex: 1,
    alignItems: 'center',
  },
  profileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileLabel: {
    fontSize: 10,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
  },
  profileConfidence: {
    fontSize: 10,
    color: COLORS.success,
    marginTop: 2,
  },
  profileSub: {
    fontSize: 10,
    color: COLORS.accent,
    marginTop: 2,
  },
  profileDivider: {
    width: 1,
    backgroundColor: COLORS.lightBorder,
    marginVertical: 10,
  },
  archetypeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  archetypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  archetypeName: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  paletteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF8E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  paletteText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
    marginLeft: 6,
  },
  colorsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  colorSwatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  colorItem: {
    alignItems: 'center',
    marginBottom: 12,
    width: '30%',
  },
  colorSwatch: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  colorName: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  avoidColorsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  avoidColorSwatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 16,
  },
  avoidColorItem: {
    alignItems: 'center',
    width: 60,
  },
  avoidSwatchContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  avoidColorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  avoidSwatchX: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avoidColorName: {
    fontSize: 10,
    color: COLORS.error,
    fontWeight: '500',
    textAlign: 'center',
  },
  imageProgressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  imageProgressText: {
    fontSize: 11,
    color: COLORS.accent,
    marginLeft: 6,
  },
  contextCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    overflow: 'hidden',
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  contextTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 10,
  },
  contextMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextCount: {
    fontSize: 12,
    color: COLORS.muted,
    marginRight: 8,
  },
  outfitsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  outfitItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  outfitImageContainer: {
    width: 80,
    height: 100,
    marginRight: 12,
  },
  outfitImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  outfitImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: COLORS.lightBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitDetails: {
    flex: 1,
  },
  outfitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  outfitWhy: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 8,
    lineHeight: 16,
  },
  outfitPieces: {
    marginTop: 4,
  },
  outfitPiece: {
    fontSize: 11,
    color: COLORS.primary,
    marginBottom: 2,
  },
  ctaSection: {
    marginTop: 8,
  },
  formulasButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 18,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.accent,
    marginBottom: 14,
  },
  formulasButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accent,
    marginHorizontal: 10,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    borderRadius: 30,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginRight: 8,
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
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    marginBottom: 14,
  },
  styleCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  styleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  styleTitleContainer: {
    flex: 1,
  },
  styleName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  styleDescription: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  styleWhyWorks: {
    backgroundColor: '#F9F8F4',
    borderRadius: 10,
    padding: 12,
  },
  styleWhyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  styleWhyText: {
    fontSize: 12,
    color: COLORS.primary,
    lineHeight: 17,
  },
  styleImagePlaceholder: {
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F9F8F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.muted,
  },
});
