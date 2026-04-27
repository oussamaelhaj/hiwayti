/**
 * ZelligePattern.js — Moroccan Geometric Background
 * A subtle, procedural geometric pattern inspired by Moroccan Zellige.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, Pattern, Rect } from 'react-native-svg';
import { colors } from '../../utils/theme';

export default function ZelligePattern({ 
  color = colors.goldGlow, 
  opacity = 0.3,
  size = 60,
  style 
}) {
  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="zellige"
            viewBox="0 0 60 60"
            width={size}
            height={size}
            patternUnits="userSpaceOnUse"
          >
            {/* 
              Procedural Geometric Pattern 
              Combining squares and octagons to create a Moroccan feel
            */}
            <Path
              d="M30 0 L60 30 L30 60 L0 30 Z" // Diamond
              fill="none"
              stroke={color}
              strokeWidth="0.5"
            />
            <Path
              d="M0 0 L15 0 L15 15 L0 15 Z" // Small corner squares
              fill="none"
              stroke={color}
              strokeWidth="0.5"
            />
            <Path
              d="M45 45 L60 45 L60 60 L45 60 Z"
              fill="none"
              stroke={color}
              strokeWidth="0.5"
            />
            <Path
              d="M30 15 L45 30 L30 45 L15 30 Z"
              fill="none"
              stroke={color}
              strokeWidth="0.5"
            />
            <Rect
              x="25" y="25" width="10" height="10"
              fill="none"
              stroke={color}
              strokeWidth="0.8"
              transform="rotate(45, 30, 30)"
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#zellige)" opacity={opacity} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
