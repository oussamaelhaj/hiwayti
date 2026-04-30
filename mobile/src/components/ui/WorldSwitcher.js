/**
 * WorldSwitcher.js — Premium Interface Switcher
 * Allows switching between Traveler, Host, and Admin "Worlds"
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, Pressable
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography, shadow, USER_ROLES } from '../../utils/theme';
import { haptic } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export default function WorldSwitcher() {
  const { userRole, currentInterface, switchInterface } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const animation = React.useRef(new Animated.Value(0)).current;

  // Determine if the switcher should even show (only for pros/admins)
  const isHost = [USER_ROLES.PROVIDER, USER_ROLES.ARTISAN].includes(userRole);
  const isAdmin = userRole === USER_ROLES.ADMIN;

  if (!isHost && !isAdmin) return null;

  const toggle = () => {
    haptic.medium();
    const toValue = expanded ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
    setExpanded(!expanded);
  };

  const handleSwitch = (mode) => {
    haptic.success();
    switchInterface(mode);
    toggle();
  };

  const height = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [56, 180],
  });

  const opacity = animation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const rotate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const currentMode = {
    traveler: { label: 'Voyageur', icon: 'airplane', color: colors.accent },
    host:     { label: 'Hôte',     icon: 'business', color: colors.gold },
    admin:    { label: 'Admin',    icon: 'shield-checkmark', color: colors.danger },
  }[currentInterface] || { label: 'Voyageur', icon: 'airplane', color: colors.accent };

  return (
    <Animated.View style={[styles.container, { height }]}>
      <BlurView tint="dark" intensity={95} style={StyleSheet.absoluteFillObject} />
      
      {/* Header / Trigger */}
      <TouchableOpacity style={styles.trigger} onPress={toggle} activeOpacity={0.9}>
        <View style={[styles.iconBox, { backgroundColor: currentMode.color + '22' }]}>
          <Ionicons name={currentMode.icon} size={20} color={currentMode.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.modeLabel}>{currentMode.label}</Text>
          <Text style={styles.modeSub}>Interface active</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </Animated.View>
      </TouchableOpacity>

      {/* Expanded Options */}
      <Animated.View style={[styles.options, { opacity }]}>
        <View style={styles.divider} />
        
        <View style={styles.optionRow}>
          <InterfaceOption 
            label="Voyageur" 
            icon="airplane-outline" 
            active={currentInterface === 'traveler'} 
            color={colors.accent}
            onPress={() => handleSwitch('traveler')}
          />
          
          {isHost || isAdmin ? (
            <InterfaceOption 
              label="Hôte" 
              icon="business-outline" 
              active={currentInterface === 'host'} 
              color={colors.gold}
              onPress={() => handleSwitch('host')}
            />
          ) : null}

          {isAdmin ? (
            <InterfaceOption 
              label="Admin" 
              icon="shield-outline" 
              active={currentInterface === 'admin'} 
              color={colors.danger}
              onPress={() => handleSwitch('admin')}
            />
          ) : null}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function InterfaceOption({ label, icon, active, color, onPress }) {
  return (
    <TouchableOpacity 
      style={[styles.option, active && { borderColor: color + '55', backgroundColor: color + '15' }]} 
      onPress={onPress}
    >
      <Ionicons name={icon} size={24} color={active ? color : colors.textMuted} />
      <Text style={[styles.optionLabel, active && { color }]}>{label}</Text>
      {active && <View style={[styles.activeDot, { backgroundColor: color }]} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60, // Below header
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 1000,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...shadow.card,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    height: 56,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  modeLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  modeSub: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  options: {
    padding: spacing.md,
    paddingTop: 0,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  optionLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginTop: 4,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});
