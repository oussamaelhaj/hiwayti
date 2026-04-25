/**
 * StarRating.js — Interactive & display star rating component
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
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
        let icon = 'star-outline';
        if (value <= Math.floor(rating)) icon = 'star';
        else if (value - 0.5 <= rating) icon = 'star-half';

        if (interactive) {
          return (
            <TouchableOpacity
              key={i}
              onPress={() => { haptic.select(); onRate?.(value); }}
              activeOpacity={0.7}
              style={{ marginRight: 3 }}
            >
              <Ionicons name={icon} size={size} color={color} />
            </TouchableOpacity>
          );
        }
        return <Ionicons key={i} name={icon} size={size} color={color} style={{ marginRight: 2 }} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
