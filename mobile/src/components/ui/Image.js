import React, { useState } from 'react';
import { View, Image as RNImage, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius } from '../../utils/theme';
import { resolveImageUrl } from '../../services/api';

const FALLBACK = 'https://images.unsplash.com/photo-1540553016722-983e48a2cd10?w=500';

/**
 * Premium Image Component for HIWAYTI
 * Features: Automatic URL resolution, Loading state, Fallback, Fade-in
 * 
 * Bulletproof URI extraction — handles:
 *   source="https://..."            → string URI
 *   source={{ uri: "https://..." }} → standard RN format
 *   source={{ uri: undefined }}     → graceful fallback
 *   source={{ uri: { ... } }}       → nested object fallback
 *   source={null}                   → graceful fallback
 */
function extractSafeUri(source) {
  // 1) null / undefined → fallback
  if (source == null) return null;

  // 2) Plain string → resolve directly
  if (typeof source === 'string') {
    return resolveImageUrl(source);
  }

  // 3) Object with uri key
  if (typeof source === 'object') {
    const raw = source.uri;

    // uri is a valid string
    if (typeof raw === 'string' && raw.length > 0) {
      return resolveImageUrl(raw);
    }

    // uri is itself an object with a uri string (double-wrapped)
    if (raw && typeof raw === 'object' && typeof raw.uri === 'string') {
      return resolveImageUrl(raw.uri);
    }

    // Check for 'url' key as alternate
    if (typeof source.url === 'string' && source.url.length > 0) {
      return resolveImageUrl(source.url);
    }
  }

  // 4) Any other type → null (will use fallback)
  return null;
}

export default function Image({ source, style, resizeMode = 'cover', showLoader = true, ...props }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [opacity] = useState(new Animated.Value(0));

  const uri = extractSafeUri(source);

  const handleLoad = () => {
    setLoading(false);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  // Always produce a valid string for the native Image
  const finalUri = (!error && uri) ? uri : FALLBACK;

  return (
    <View style={[styles.container, style]}>
      <Animated.Image
        {...props}
        source={{ uri: finalUri }}
        style={[style, { opacity }]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
      />
      
      {loading && showLoader && (
        <View style={StyleSheet.absoluteFill}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.loader}>
            <ActivityIndicator color={colors.gold} size="small" />
          </View>
        </View>
      )}

      {error && !loading && (
        <View style={[StyleSheet.absoluteFill, styles.errorContainer]}>
          <RNImage 
            source={{ uri: FALLBACK }} 
            style={[style, { opacity: 0.3 }]} 
            resizeMode={resizeMode} 
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
  }
});
