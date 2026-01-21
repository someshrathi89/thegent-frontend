import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackOpenedFormulas, trackOutfitImageGenerated } from '../../utils/analytics';

const COLORS = {
  background: '#F9F8F4',
  primary: '#2C2C2C',
  accent: '#D4AF37',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  lightBorder: '#E8E6E1',
  success: '#4A7C59',
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Icon mapping for contexts
const CONTEXT_ICONS: { [key: string]: string } = {
  'Business': 'briefcase-outline',
  'Casual': 'shirt-outline',
  'Evening': 'moon-outline',
  'Sport/Athleisure': 'fitness-outline',
  'Minimalist': 'remove-outline',
  'Bold/Statement': 'flash-outline',
  'Seasonal': 'leaf-outline',
};

interface OutfitItem {
  title: string;
  head_to_toe: string[];
  why_it_works: string;
  visual_spec: string;
  fragrance?: string;
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

interface GeneratedImage {
  outfit_id: string;
  image_base64: string;
}

export default function FormulasScreen() {
  const insets = useSafeAreaInsets();
  const [expandedContext, setExpandedContext] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<OutfitCatalog | null>(null);
  const [generatedImages, setGeneratedImages] = useState<{ [key: string]: string }>({});
  const [generatingOutfit, setGeneratingOutfit] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [phone, setPhone] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadCatalog();
    // Track opened formulas
    trackOpenedFormulas();
  }, []);

  useEffect(() => {
    if (catalog) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Auto-expand first context
      if (catalog.contexts.length > 0 && !expandedContext) {
        setExpandedContext(catalog.contexts[0].context_name);
        
        // Auto-generate first outfit image if not already generated
        const firstOutfitId = getOutfitId(catalog.contexts[0].context_name, 0);
        if (!generatedImages[firstOutfitId]) {
          generateOutfitImage(catalog.contexts[0].outfits[0], catalog.contexts[0].context_name, 0);
        }
      }
    }
  }, [catalog]);

  const loadCatalog = async () => {
    try {
      const storedPhone = await AsyncStorage.getItem('sgc_phone');
      setPhone(storedPhone?.replace('+1', '') || null);

      // Load from local storage first
      const storedResult = await AsyncStorage.getItem('sgc_brain_result');
      console.log('Formulas - storedResult exists:', !!storedResult);
      
      if (storedResult) {
        const parsed = JSON.parse(storedResult);
        console.log('Formulas - parsed keys:', Object.keys(parsed));
        console.log('Formulas - outfit_catalog_v1 exists:', !!parsed.outfit_catalog_v1);
        
        if (parsed.outfit_catalog_v1) {
          console.log('Formulas - contexts:', parsed.outfit_catalog_v1.contexts?.length || 0);
          // Add outfit_ids to each outfit
          const catalogWithIds = addOutfitIds(parsed.outfit_catalog_v1);
          setCatalog(catalogWithIds);
          return; // Data found locally, we're done
        } else {
          console.log('Formulas - No outfit_catalog_v1 found in parsed data');
        }
      } else {
        console.log('Formulas - No stored result found locally');
      }

      // FALLBACK: Try to fetch from backend if local storage is empty
      if (storedPhone) {
        console.log('Formulas - Trying to fetch from backend...');
        try {
          const response = await fetch(`${BACKEND_URL}/api/sgc-brain/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: storedPhone.replace('+1', '') })
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Formulas - Backend response:', !!data.outfit_catalog_v1);
            
            if (data.outfit_catalog_v1) {
              const catalogWithIds = addOutfitIds(data.outfit_catalog_v1);
              setCatalog(catalogWithIds);
              
              // Also save to local storage for next time
              await AsyncStorage.setItem('sgc_brain_result', JSON.stringify(data));
              console.log('Formulas - Saved backend data to local storage');
              return;
            }
          }
        } catch (backendError) {
          console.log('Formulas - Backend fetch failed:', backendError);
        }
      }

      // Load cached images
      const cachedImagesStr = await AsyncStorage.getItem('sgc_generated_images');
      if (cachedImagesStr) {
        const cachedImages = JSON.parse(cachedImagesStr);
        setGeneratedImages(cachedImages);
      }

      // Also try to get cached images from backend
      if (storedPhone) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/sgc-brain/get-cached-images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: storedPhone.replace('+1', '') })
          });
          if (response.ok) {
            const data = await response.json();
            if (data.images && Object.keys(data.images).length > 0) {
              setGeneratedImages(prev => ({ ...prev, ...data.images }));
            }
          }
        } catch (e) {
          console.log('Could not fetch cached images from backend');
        }
      }
    } catch (error) {
      console.error('Error loading catalog:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addOutfitIds = (catalog: OutfitCatalog): OutfitCatalog => {
    return {
      ...catalog,
      contexts: catalog.contexts.map(ctx => ({
        ...ctx,
        outfits: ctx.outfits.map((outfit, idx) => ({
          ...outfit,
          outfit_id: getOutfitId(ctx.context_name, idx)
        }))
      }))
    };
  };

  const getOutfitId = (contextName: string, index: number): string => {
    return `${contextName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${index}`;
  };

  const generateOutfitImage = async (outfit: OutfitItem, contextName: string, index: number) => {
    const outfitId = getOutfitId(contextName, index);
    
    if (generatedImages[outfitId] || generatingOutfit === outfitId) {
      return; // Already generated or generating
    }

    setGeneratingOutfit(outfitId);

    try {
      const response = await fetch(`${BACKEND_URL}/api/sgc-brain/generate-single-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visual_spec: outfit.visual_spec || '',
          context_name: contextName,
          outfit_index: index,
          outfit_title: outfit.title,
          head_to_toe: outfit.head_to_toe || [],
          phone: phone
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.image_base64) {
          // Track outfit image generation
          trackOutfitImageGenerated(contextName, outfit.title);
          
          // Update state
          const newImages = { ...generatedImages, [outfitId]: data.image_base64 };
          setGeneratedImages(newImages);
          
          // Cache locally
          await AsyncStorage.setItem('sgc_generated_images', JSON.stringify(newImages));
        }
      }
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setGeneratingOutfit(null);
    }
  };

  const toggleContext = (contextName: string) => {
    setExpandedContext(expandedContext === contextName ? null : contextName);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading your formulas...</Text>
      </View>
    );
  }

  if (!catalog || catalog.contexts.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <View style={styles.emptyState}>
          <Ionicons name="shirt-outline" size={64} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>No Outfit Formulas Yet</Text>
          <Text style={styles.emptyText}>
            Complete the Style Identity Engine to unlock your personalized outfit catalog.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Your Outfit Formulas</Text>
            <Text style={styles.subtitle}>
              {catalog.total_outfits} looks tailored to your identity
            </Text>
          </View>

          {/* Context Cards */}
          <View style={styles.contextsList}>
            {catalog.contexts.map((context) => (
              <View key={context.context_name} style={styles.contextCard}>
                {/* Context Header */}
                <TouchableOpacity
                  style={styles.contextHeader}
                  onPress={() => toggleContext(context.context_name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.contextTitleRow}>
                    <View style={styles.contextIconContainer}>
                      <Ionicons 
                        name={(CONTEXT_ICONS[context.context_name] || 'shirt-outline') as any}
                        size={22} 
                        color={COLORS.accent} 
                      />
                    </View>
                    <View>
                      <Text style={styles.contextName}>{context.context_name}</Text>
                      <Text style={styles.contextCount}>{context.outfits.length} looks</Text>
                    </View>
                  </View>
                  <Ionicons 
                    name={expandedContext === context.context_name ? 'chevron-up' : 'chevron-down'} 
                    size={22} 
                    color={COLORS.muted} 
                  />
                </TouchableOpacity>

                {/* Expanded Outfits */}
                {expandedContext === context.context_name && (
                  <View style={styles.outfitsList}>
                    {context.outfits.map((outfit, index) => {
                      const outfitId = getOutfitId(context.context_name, index);
                      const hasImage = !!generatedImages[outfitId];
                      const isGenerating = generatingOutfit === outfitId;

                      return (
                        <View key={outfitId} style={styles.outfitCard}>
                          {/* Outfit Image Area */}
                          <View style={styles.outfitImageContainer}>
                            {hasImage ? (
                              <Image
                                source={{ uri: `data:image/png;base64,${generatedImages[outfitId]}` }}
                                style={styles.outfitImage}
                                resizeMode="contain"
                              />
                            ) : (
                              <View style={styles.outfitPlaceholder}>
                                {isGenerating ? (
                                  <View style={styles.generatingContainer}>
                                    <ActivityIndicator size="large" color={COLORS.accent} />
                                    <Text style={styles.generatingText}>Generating look...</Text>
                                  </View>
                                ) : (
                                  <TouchableOpacity
                                    style={styles.generateButton}
                                    onPress={() => generateOutfitImage(outfit, context.context_name, index)}
                                    activeOpacity={0.8}
                                  >
                                    <Ionicons name="sparkles" size={24} color={COLORS.white} />
                                    <Text style={styles.generateButtonText}>Generate This Look</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            )}
                          </View>

                          {/* Outfit Details */}
                          <View style={styles.outfitDetails}>
                            <Text style={styles.outfitTitle}>{outfit.title}</Text>
                            
                            <View style={styles.outfitDivider} />

                            {/* Head to Toe List */}
                            <View style={styles.headToToeList}>
                              {outfit.head_to_toe.map((item, i) => (
                                <View key={i} style={styles.headToToeItem}>
                                  <View style={styles.bulletPoint} />
                                  <Text style={styles.headToToeText}>{item}</Text>
                                </View>
                              ))}
                            </View>

                            {/* Why It Works */}
                            <View style={styles.whySection}>
                              <Text style={styles.whyLabel}>WHY IT WORKS</Text>
                              <Text style={styles.whyText}>{outfit.why_it_works}</Text>
                            </View>

                            {/* Fragrance */}
                            {outfit.fragrance && (
                              <View style={styles.fragranceSection}>
                                <Ionicons name="flask-outline" size={16} color={COLORS.accent} />
                                <Text style={styles.fragranceText}>{outfit.fragrance}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Pro Tip */}
          <View style={styles.proTip}>
            <View style={styles.proTipHeader}>
              <Ionicons name="bulb-outline" size={16} color={COLORS.accent} />
              <Text style={styles.proTipLabel}>Pro Tip</Text>
            </View>
            <Text style={styles.proTipText}>
              Generate images for outfits you're considering. Each look is designed specifically for your body type and coloring.
            </Text>
          </View>

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
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.muted,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  contextsList: {
    marginBottom: 24,
  },
  contextCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    overflow: 'hidden',
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  contextTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  contextName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.primary,
  },
  contextCount: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  outfitsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  outfitCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  outfitImageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#F5F3EF',
  },
  outfitImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F3EF',
  },
  outfitPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0EDE8',
  },
  generatingContainer: {
    alignItems: 'center',
  },
  generatingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.muted,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 30,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 10,
  },
  outfitDetails: {
    padding: 20,
  },
  outfitTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  outfitDivider: {
    height: 1,
    backgroundColor: COLORS.lightBorder,
    marginBottom: 16,
  },
  headToToeList: {
    marginBottom: 16,
  },
  headToToeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginRight: 12,
    marginTop: 6,
  },
  headToToeText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.primary,
    lineHeight: 22,
  },
  whySection: {
    backgroundColor: '#FDF8E8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  whyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1,
    marginBottom: 8,
  },
  whyText: {
    fontSize: 14,
    color: COLORS.primary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  fragranceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  fragranceText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 10,
    fontWeight: '500',
  },
  proTip: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  proTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  proTipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  proTipText: {
    fontSize: 14,
    color: COLORS.primary,
    lineHeight: 22,
  },
});
