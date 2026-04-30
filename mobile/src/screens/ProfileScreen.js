/**
 * ProfileScreen.js v2 — HIWAYTI User Profile
 * Language preference persisted to Firestore userPreferences
 * Real booking/favorites counts from Firestore
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, Switch, ActivityIndicator, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius, typography, shadow, USER_ROLES, CATEGORIES } from '../utils/theme';
import { haptic, getInitials } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import {
  getUserPreferences, updateUserPreferences,
  fetchUserBookings, fetchFavorites,
} from '../services/api';
import GlassCard from '../components/ui/GlassCard';
import AppButton from '../components/ui/AppButton';
import i18n from '../i18n';
import Image from '../components/ui/Image';
import WorldSwitcher from '../components/ui/WorldSwitcher';

const LANGUAGES = [
  { code: 'fr', label: 'Français',  flag: '🇫🇷' },
  { code: 'ar', label: 'العربية',   flag: '🇲🇦' },
  { code: 'en', label: 'English',   flag: '🇬🇧' },
  { code: 'es', label: 'Español',   flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch',   flag: '🇩🇪' },
];

const TRAVEL_STYLES = [
  { id: 'adventure', label: 'Aventure', emoji: '🏔️' },
  { id: 'culture',   label: 'Culture',  emoji: '🎭' },
  { id: 'relax',     label: 'Détente',  emoji: '🌊' },
  { id: 'sport',     label: 'Sport',    emoji: '🏆' },
  { id: 'gastro',    label: 'Gastronomie', emoji: '🍽️' },
];

const ROLE_LABELS = {
  [USER_ROLES.TOURIST]:  { label: 'Touriste',            icon: 'map',           color: colors.accent },
  [USER_ROLES.ARTISAN]:  { label: 'Artisan',             icon: 'color-palette', color: colors.gold },
  [USER_ROLES.PROVIDER]: { label: 'Prestataire Sportif', icon: 'tennisball',    color: colors.info },
  [USER_ROLES.COMMUNE]:  { label: 'Partenaire Commune',  icon: 'business',      color: colors.success },
  [USER_ROLES.ADMIN]:    { label: 'Administrateur',      icon: 'shield',        color: colors.danger },
};

export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, userRole, userProfile, signOut, currentInterface, switchInterface } = useAuth();

  const [prefs, setPrefs]         = useState(null);
  const [notifs, setNotifs]       = useState(true);
  const [saving, setSaving]       = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats]         = useState({ bookings: 0, favorites: 0, reviews: 0 });

  const roleInfo = ROLE_LABELS[userRole] || ROLE_LABELS[USER_ROLES.TOURIST];

  // Load preferences + stats from Firestore
  useEffect(() => {
    if (!user) return;
    getUserPreferences(user.uid).then(p => {
      setPrefs(p);
      // Sync UI language with stored preference
      if (p?.languages?.[0] && p.languages[0] !== i18n.language) {
        i18n.changeLanguage(p.languages[0]);
      }
    });
    Promise.all([
      fetchUserBookings(user.uid),
      fetchFavorites(user.uid),
    ]).then(([bookings, favs]) => {
      setStats({ bookings: bookings.length, favorites: favs.length, reviews: 0 });
      setLoadingStats(false);
    }).catch(() => setLoadingStats(false));
  }, [user]);

  // Persist a preference change
  const savePrefs = async (patch) => {
    if (!user) return;
    const updated = { ...(prefs || {}), ...patch };
    setPrefs(updated);
    setSaving(true);
    try {
      await updateUserPreferences(user.uid, updated);
    } catch (e) {
      console.warn('[PREFS]', e.message);
    }
    setSaving(false);
  };

  const changeLanguage = (code) => {
    haptic.select();
    i18n.changeLanguage(code);
    // Store primary language as first element
    const langs = [code, ...(prefs?.languages || []).filter(l => l !== code)];
    savePrefs({ languages: langs });
  };

  const toggleCategory = (catId) => {
    haptic.select();
    const cats = prefs?.preferredCategories || [];
    const updated = cats.includes(catId) ? cats.filter(c => c !== catId) : [...cats, catId];
    savePrefs({ preferredCategories: updated });
  };

  const setTravelStyle = (style) => {
    haptic.select();
    savePrefs({ travelStyle: style });
  };

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnecter', style: 'destructive', onPress: async () => {
        haptic.medium();
        await signOut();
      }},
    ]);
  };

  const MenuRow = ({ icon, label, onPress, rightElement, color = colors.textPrimary }) => (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      {rightElement || <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </TouchableOpacity>
  );

  const currentLang = i18n.language || 'fr';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── HERO ── */}
        <View style={styles.heroWrap}>
          <ImageBackground source={require('../../assets/profile_bg.jpg')} style={styles.hero} resizeMode="cover">
            <LinearGradient colors={['rgba(6, 6, 14, 0.4)', 'rgba(6, 6, 14, 0.8)']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.avatarWrap}>
              {userProfile?.photoURL ? (
                <Image 
                  source={{ uri: userProfile.photoURL }} 
                  style={styles.avatar} 
                />
              ) : (
                <LinearGradient colors={[colors.goldLight, colors.gold]} style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(user?.displayName || 'U')}</Text>
                </LinearGradient>
              )}
              <TouchableOpacity style={styles.editAvatarBtn} onPress={() => navigation.navigate('EditProfile')}>
                <Ionicons name="camera" size={14} color={colors.bg} />
              </TouchableOpacity>
            </View>

          <Text style={styles.displayName}>{user?.displayName || 'Utilisateur'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>

            <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '22', borderColor: roleInfo.color + '55' }]}>
              <Ionicons name={roleInfo.icon} size={14} color={roleInfo.color} />
              <Text style={[styles.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
              {saving && <ActivityIndicator size="small" color={roleInfo.color} style={{ marginLeft: 6 }} />}
            </View>

            {/* Real stats */}
            <View style={styles.statsRow}>
              {loadingStats ? (
                <ActivityIndicator color={colors.gold} />
              ) : [
                { label: 'Réservations', value: stats.bookings },
                { label: 'Favoris',      value: stats.favorites },
              ].map((s, i) => (
                <View key={i} style={styles.statItem}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </ImageBackground>
        </View>
        {/* ── MODES D'INTERFACE ── */}
        <Text style={styles.sectionLabel}>MODES D'INTERFACE</Text>
        <View style={styles.interfaceGrid}>
          {[
            { id: 'traveler', label: 'Voyageur', icon: 'airplane', desc: 'Explorer & Réserver', color: colors.accent },
            { id: 'host', label: 'Hôte', icon: 'business', desc: 'Gérer mes activités', color: colors.gold, roleRequired: [USER_ROLES.PROVIDER, USER_ROLES.ARTISAN, USER_ROLES.ADMIN] },
            { id: 'admin', label: 'Admin', icon: 'shield-checkmark', desc: 'Contrôle plateforme', color: colors.danger, roleRequired: [USER_ROLES.ADMIN] },
          ].map(mode => {
            const isAccessible = !mode.roleRequired || (mode.roleRequired || []).includes(userRole);
            const isActive = currentInterface === mode.id;
            
            if (!isAccessible) return null;

            return (
              <TouchableOpacity 
                key={mode.id}
                style={[styles.interfaceCard, isActive && { borderColor: mode.color }]}
                onPress={() => { haptic.select(); switchInterface(mode.id); }}
              >
                <GlassCard style={styles.interfaceCardInner} noBlur={!isActive}>
                  <View style={[styles.interfaceIcon, { backgroundColor: mode.color + '22' }]}>
                    <Ionicons name={mode.icon} size={24} color={isActive ? mode.color : colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.interfaceLabel, isActive && { color: mode.color }]}>{mode.label}</Text>
                    <Text style={styles.interfaceDesc}>{mode.desc}</Text>
                  </View>
                  {isActive && (
                    <View style={[styles.activeDot, { backgroundColor: mode.color }]} />
                  )}
                </GlassCard>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── MON COMPTE ── */}
        <Text style={styles.sectionLabel}>MON COMPTE</Text>
        <GlassCard style={styles.menuCard}>
          <MenuRow icon="person-outline"   label={t('profile.edit')}         onPress={() => navigation.navigate('EditProfile')} />
          <View style={styles.divider} />
          <MenuRow icon="calendar-outline" label={t('booking.myBookings')}   onPress={() => navigation.navigate('MyBookings')} />
          <View style={styles.divider} />
          <MenuRow icon="heart-outline"    label={t('shop.favorites')}       onPress={() => navigation.navigate('Favorites')} />
          <View style={styles.divider} />
          <MenuRow icon="notifications-outline" label={t('profile.notifications')}
            rightElement={
              <Switch
                value={notifs}
                onValueChange={v => { haptic.select(); setNotifs(v); savePrefs({ notificationsEnabled: v }); }}
                trackColor={{ false: colors.bgElevated, true: colors.gold + '88' }}
                thumbColor={notifs ? colors.gold : colors.textMuted}
              />
            }
          />
        </GlassCard>

        {/* ── ESPACE PRO ── */}
        {(userRole === USER_ROLES.ARTISAN || userRole === USER_ROLES.PROVIDER) && (
          <>
            <Text style={styles.sectionLabel}>MON ESPACE PRO</Text>
            <GlassCard style={styles.menuCard} goldBorder>
              <MenuRow icon="grid-outline"         label="Tableau de bord"  color={colors.gold}   onPress={async () => { haptic.select(); await switchInterface('host'); navigation.navigate('ProviderDashboard'); }} />
              <View style={styles.divider} />
              <MenuRow icon="tennisball-outline"   label="Mes Activités"    color={colors.accent} onPress={async () => { haptic.select(); await switchInterface('host'); navigation.navigate('ProviderActivities'); }} />
            </GlassCard>
          </>
        )}
        {userRole === USER_ROLES.COMMUNE && (
          <>
            <Text style={styles.sectionLabel}>ESPACE COMMUNE</Text>
            <GlassCard style={styles.menuCard} goldBorder>
              <MenuRow icon="business-outline" label="Tableau de bord commune" color={colors.gold} onPress={() => { haptic.select(); switchInterface('admin'); }} />
            </GlassCard>
          </>
        )}

        {/* ── LANGUE ── */}
        <Text style={styles.sectionLabel}>LANGUE</Text>
        <GlassCard style={styles.menuCard}>
          <View style={styles.langHeader}>
            <View style={[styles.menuIcon, { backgroundColor: colors.accent + '18' }]}>
              <Ionicons name="language-outline" size={18} color={colors.accent} />
            </View>
            <Text style={styles.menuLabel}>{t('profile.language')}</Text>
          </View>
          <View style={styles.langPills}>
            {LANGUAGES.map(lang => {
              const active = currentLang === lang.code || prefs?.languages?.[0] === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langPill, active && styles.langPillActive]}
                  onPress={() => changeLanguage(lang.code)}
                >
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <Text style={[styles.langLabel, active && { color: colors.bg }]}>{lang.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        {/* ── PRÉFÉRENCES ── */}
        <Text style={styles.sectionLabel}>PRÉFÉRENCES DE VOYAGE</Text>
        <GlassCard style={styles.menuCard}>
          <Text style={styles.prefSub}>Style de voyage</Text>
          <View style={styles.pillRow}>
            {TRAVEL_STYLES.map(s => {
              const active = prefs?.travelStyle === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setTravelStyle(s.id)}
                >
                  <Text>{s.emoji}</Text>
                  <Text style={[styles.pillText, active && { color: colors.bg }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.divider} />
          <Text style={styles.prefSub}>Catégories favorites</Text>
          <View style={styles.pillRow}>
            {CATEGORIES.map(cat => {
              const active = prefs?.preferredCategories?.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.pill, { borderColor: cat.color + '55' }, active && { backgroundColor: cat.color }]}
                  onPress={() => toggleCategory(cat.id)}
                >
                  <Text style={{ fontSize: 13 }}>{cat.emoji}</Text>
                  <Text style={[styles.pillText, active && { color: colors.bg }]}>{cat.labelFr}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        {/* ── AIDE & LÉGAL ── */}
        <Text style={styles.sectionLabel}>AIDE & LÉGAL</Text>
        <GlassCard style={styles.menuCard}>
          <MenuRow icon="help-circle-outline"       label={t('profile.help')}    onPress={() => {}} />
          <View style={styles.divider} />
          <MenuRow icon="shield-checkmark-outline"  label={t('profile.privacy')} onPress={() => {}} />
          <View style={styles.divider} />
          <MenuRow icon="information-circle-outline" label={t('profile.about')}  onPress={() => {}} />
        </GlassCard>

        <AppButton
          title={t('profile.logout')}
          onPress={handleSignOut}
          variant="outline"
          size="md"
          style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg }}
        />

        <TouchableOpacity style={styles.deleteBtn}>
          <Text style={styles.deleteText}>{t('profile.deleteAccount')}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>HIWAYTI v1.0.0 • Maroc 🇲🇦</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },

  heroWrap: {
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderColor: colors.goldBorder,
    overflow: 'hidden',
  },
  hero: {
    alignItems: 'center', paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  avatarWrap: { position: 'relative', marginBottom: spacing.md },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.goldBorder,
    ...shadow.gold,
  },
  avatarText: { ...typography.h1, color: colors.bg },
  editAvatarBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.bg,
  },
  displayName: { ...typography.h2, color: colors.textPrimary, marginBottom: 4 },
  email: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: radius.full, borderWidth: 1, marginBottom: spacing.lg,
  },
  roleText: { ...typography.captionBold },
  statsRow: { flexDirection: 'row', gap: spacing.xxl, minHeight: 40, alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statValue: { ...typography.h3, color: colors.gold },
  statLabel: { ...typography.caption, color: colors.textMuted },

  sectionLabel: {
    ...typography.tag, color: colors.textMuted,
    marginHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm,
  },
  menuCard: { marginHorizontal: spacing.lg, overflow: 'hidden' },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
  },
  menuIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: spacing.md },

  langHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  langPills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  langPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: radius.full,
    backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  langPillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  langFlag: { fontSize: 14 },
  langLabel: { ...typography.captionBold, color: colors.textSecondary },

  prefSub: { ...typography.captionBold, color: colors.textMuted, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.full,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  pillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  pillText: { ...typography.captionBold, color: colors.textSecondary },

  deleteBtn: { alignItems: 'center', marginTop: spacing.lg },
  deleteText: { ...typography.body, color: colors.danger + 'bb' },
  version: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  interfaceGrid: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  interfaceCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  interfaceCardInner: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  interfaceIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  interfaceLabel: { ...typography.bodyBold, color: colors.textPrimary },
  interfaceDesc: { ...typography.caption, color: colors.textMuted },
  activeDot: { width: 8, height: 8, borderRadius: 4, position: 'absolute', top: 12, right: 12 },
});
