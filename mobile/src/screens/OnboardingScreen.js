/**
 * OnboardingScreen.js — HIWAYTI Premium Animated Onboarding
 * 4 slides: mission | discovery | booking | role selection
 */
import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, FlatList, Animated,
  TouchableOpacity, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius, typography, gradients } from '../utils/theme';
import { haptic } from '../utils/helpers';
import GoldButton from '../components/ui/GoldButton';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🌍',
    gradient: [colors.bg, '#0a0614'],
    icon: 'earth',
    accentColor: colors.gold,
  },
  {
    id: '2',
    emoji: '🏄‍♂️',
    gradient: ['#030d0a', colors.bg],
    icon: 'compass',
    accentColor: colors.accent,
  },
  {
    id: '3',
    emoji: '🛒',
    gradient: ['#0a0500', colors.bg],
    icon: 'bag',
    accentColor: colors.goldLight,
  },
  {
    id: '4',
    emoji: '🎭',
    gradient: [colors.bg, '#070010'],
    icon: 'people',
    accentColor: colors.gold,
    isRoleSlide: true,
  },
];

const ROLES = [
  { key: 'tourist',  icon: 'map', accentKey: 'roleTourist', subKey: 'roleTouristSub',  color: colors.accent },
  { key: 'artisan',  icon: 'color-palette', accentKey: 'roleArtisan', subKey: 'roleArtisanSub', color: colors.gold },
  { key: 'provider', icon: 'tennisball', accentKey: 'roleProvider', subKey: 'roleProviderSub', color: colors.info },
  { key: 'commune',  icon: 'business', accentKey: 'roleCommune', subKey: 'roleCommuneSub', color: colors.success },
];

export default function OnboardingScreen({ onFinish }) {
  const { t } = useTranslation();
  const { updateUserRole } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRole, setSelectedRole] = useState('tourist');
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatRef = useRef(null);

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      haptic.light();
      flatRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const handleFinish = async () => {
    haptic.success();
    await updateUserRole?.(selectedRole);
    onFinish?.();
  };

  const renderSlide = ({ item, index }) => {
    const isLast = item.isRoleSlide;
    return (
      <View style={styles.slide}>
        <LinearGradient colors={item.gradient} style={StyleSheet.absoluteFillObject} />

        {/* Background decorative circle */}
        <Animated.View style={[styles.bgCircle, { backgroundColor: item.accentColor + '10' }]} />

        {/* Big emoji */}
        <View style={[styles.emojiWrap, { backgroundColor: item.accentColor + '18' }]}>
          <Text style={styles.emoji}>{item.emoji}</Text>
        </View>

        {/* Text content */}
        {!isLast ? (
          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: item.accentColor }]}>
              {t(`onboarding.slide${index + 1}Title`)}
            </Text>
            <Text style={styles.subtitle}>{t(`onboarding.slide${index + 1}Sub`)}</Text>
          </View>
        ) : (
          <View style={styles.roleBlock}>
            <Text style={styles.roleTitle}>{t('onboarding.slide4Title')}</Text>
            <Text style={styles.roleSub}>{t('onboarding.slide4Sub')}</Text>
            <View style={styles.roleGrid}>
              {ROLES.map(role => (
                <TouchableOpacity
                  key={role.key}
                  style={[
                    styles.roleCard,
                    selectedRole === role.key && {
                      borderColor: role.color,
                      backgroundColor: role.color + '15',
                    },
                  ]}
                  onPress={() => { haptic.select(); setSelectedRole(role.key); }}
                >
                  <View style={[styles.roleIcon, { backgroundColor: role.color + '22' }]}>
                    <Ionicons name={role.icon} size={24} color={role.color} />
                  </View>
                  <Text style={[styles.roleName, selectedRole === role.key && { color: role.color }]}>
                    {t(`onboarding.${role.accentKey}`)}
                  </Text>
                  <Text style={styles.roleDesc} numberOfLines={2}>
                    {t(`onboarding.${role.subKey}`)}
                  </Text>
                  {selectedRole === role.key && (
                    <View style={[styles.roleCheck, { backgroundColor: role.color }]}>
                      <Ionicons name="checkmark" size={10} color={colors.bg} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Slide list */}
      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={s => s.id}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={e => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
      />

      {/* Bottom controls */}
      <View style={styles.controls}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const w = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' });
            const opacity = scrollX.interpolate({ inputRange, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: w, opacity, backgroundColor: colors.gold }]}
              />
            );
          })}
        </View>

        {/* Buttons */}
        {currentIndex < SLIDES.length - 1 ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={() => { haptic.light(); onFinish?.(); }}>
              <Text style={styles.skipText}>{t('common.skip')}</Text>
            </TouchableOpacity>
            <GoldButton title={t('common.next')} onPress={goNext} size="md" />
          </View>
        ) : (
          <GoldButton
            title={t('onboarding.getStarted')}
            onPress={handleFinish}
            size="lg"
            style={{ marginTop: 8 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  bgCircle: {
    position: 'absolute',
    width: 320, height: 320,
    borderRadius: 160,
    top: height * 0.1,
  },
  emojiWrap: {
    width: 120, height: 120,
    borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emoji: { fontSize: 56 },
  textBlock: { alignItems: 'center', paddingHorizontal: spacing.md },
  title: { ...typography.h1, textAlign: 'center', marginBottom: spacing.md },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  // Role slide
  roleBlock: { width: '100%', alignItems: 'center' },
  roleTitle: { ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  roleSub: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  roleGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing.sm, justifyContent: 'center', width: '100%',
  },
  roleCard: {
    width: (width - spacing.xl * 2 - spacing.sm) / 2,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.07)',
    minHeight: 120,
    alignItems: 'flex-start',
    position: 'relative',
  },
  roleIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  roleName: { ...typography.h4, color: colors.textPrimary, marginBottom: 4 },
  roleDesc: { ...typography.caption, color: colors.textMuted, lineHeight: 16 },
  roleCheck: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  // Controls
  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.lg,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: spacing.lg },
  dot: { height: 8, borderRadius: 4 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipText: { ...typography.body, color: colors.textMuted, fontWeight: '500' },
});
