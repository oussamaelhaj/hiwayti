/**
 * StarRating.js — Interactive & display star rating component
 * Enriched with animations and premium aesthetics
 */
import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../utils/theme';
import { haptic } from '../../utils/helpers';

export default function StarRating({
  rating = 0,
  maxStars = 5,
  size = 18,
  color = colors.gold,
  interactive = false,
  onRate,
  style,
}) {
  return (
    <View style={[styles.row, style]}>
      {Array.from({ length: maxStars }, (_, i) => {
        const value = i + 1;
        return (
          <StarItem
            key={i}
            index={i}
            value={value}
            rating={rating}
            size={size}
            color={color}
            interactive={interactive}
            onRate={onRate}
          />
        );
      })}
    </View>
  );
}

function StarItem({ index, value, rating, size, color, interactive, onRate }) {
  const scale = useRef(new Animated.Value(1)).current;

  // Visual logic for the icon
  let icon = 'star-outline';
  if (value <= Math.floor(rating)) {
    icon = 'star';
  } else if (value - 0.5 <= rating) {
    icon = 'star-half';
  }

  const handlePress = () => {
    if (!interactive) return;
    haptic.select();
    
    // Bounce animation
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    onRate?.(value);
  };

  const content = (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons 
        name={icon} 
        size={size} 
        color={value <= rating ? color : colors.textMuted + '44'} 
      />
    </Animated.View>
  );

  if (interactive) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.6}
        style={styles.starContainer}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.starContainerDisplay}>{content}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  starContainer: {
    padding: 4,
    marginRight: 2,
  },
  starContainerDisplay: {
    marginRight: 2,
  }
});
