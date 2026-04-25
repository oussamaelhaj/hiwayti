/**
 * ProfileScreen.js — HIWAYTI User Profile
 * Avatar, settings, language, notifications, logout
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, SafeAreaView, Alert, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius, typography, shadow, USER_ROLES } from '../utils/theme';
import { haptic, getInitials } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/ui/GlassCard';
import GoldButton from '../components/ui/GoldButton';
import i18n from '../i18n';

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية',  flag: '🇲🇦' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
];

const ROLE_LABELS = {
  [USER_ROLES.TOURIST]:  { label: 'Touriste',            icon: 'map', color: colors.accent },
  [USER_ROLES.ARTISAN]:  { label: 'Artisan',             icon: 'color-palette', color: colors.gold },
  [USER_ROLES.PROVIDER]: { label: 'Prestataire Sportif', icon: 'tennisball', color: colors.info },
  [USER_ROLES.COMMUNE]:  { label: 'Partenaire Commune',  icon: 'business', color: colors.success },
  [USER_ROLES.ADMIN]:    { label: 'Administrateur',      icon: 'shield', color: colors.danger },
};

export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, userRole, userProfile, signOut } = useAuth();
  const [notifs, setNotifs] = useState(true);

  const roleInfo = ROLE_LABELS[userRole] || ROLE_LABELS[USER_ROLES.TOURIST];

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnecter', style: 'destructive', onPress: async () => {
        haptic.medium();
        await signOut();
      }},
    ]);
  };

  const changeLanguage = (code) => {
    haptic.select();
    i18n.changeLanguage(code);
  };

  const MenuRow = ({ icon, label, onPress, rightElement, color = colors.textPrimary, chevron = true }) => (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      {rightElement || (chevron && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />)}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── PROFILE HERO ── */}
        <LinearGradient colors={['#0a0500', '#06060e']} style={styles.hero}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
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

          {/* Role badge */}
          <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '22', borderColor: roleInfo.color + '55' }]}>
            <Ionicons name={roleInfo.icon} size={14} color={roleInfo.color} />
            <Text style={[styles.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { label: 'Réservations', value: '12' },
              { label: 'Favoris', value: '8' },
              { label: 'Avis', value: '5' },
            ].map((s, i) => (
              <View key={i} style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── MENU SECTIONS ── */}
        <Text style={styles.sectionLabel}>MON COMPTE</Text>
        <GlassCard style={styles.menuCard}>
          <MenuRow icon="person-outline" label={t('profile.edit')} onPress={() => navigation.navigate('EditProfile')} />
          <View style={styles.divider} />
          <MenuRow icon="calendar-outline" label={t('booking.myBookings')} onPress={() => navigation.navigate('MyBookings')} />
          <View style={styles.divider} />
          <MenuRow icon="heart-outline" label={t('shop.favorites')} onPress={() => navigation.navigate('Favorites')} />
        </GlassCard>

        {/* Dashboard shortcut based on role */}
        {(userRole === USER_ROLES.ARTISAN || userRole === USER_ROLES.PROVIDER) && (
          <>
            <Text style={styles.sectionLabel}>MON ESPACE PRO</Text>
            <GlassCard style={styles.menuCard} goldBorder>
              <MenuRow
                icon="grid-outline"
                label="Tableau de bord prestataire"
                color={colors.gold}
                onPress={() => navigation.navigate('ProviderDashboard')}
              />
            </GlassCard>
          </>
        )}
        {userRole === USER_ROLES.COMMUNE && (
          <>
            <Text style={styles.sectionLabel}>ESPACE COMMUNE</Text>
            <GlassCard style={styles.menuCard} goldBorder>
              <MenuRow
                icon="business-outline"
                label="Tableau de bord commune"
                color={colors.gold}
                onPress={() => navigation.navigate('CommuneDashboard')}
              />
            </GlassCard>
          </>
        )}

        <Text style={styles.sectionLabel}>PRÉFÉRENCES</Text>
        <GlassCard style={styles.menuCard}>
          {/* Language */}
          <View style={styles.langRow}>
            <View style={[styles.menuIcon, { backgroundColor: colors.accent + '18' }]}>
              <Ionicons name="language-outline" size={18} color={colors.accent} />
            </View>
            <Text style={styles.menuLabel}>{t('profile.language')}</Text>
          </View>
          <View style={styles.langPills}>
            {LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langPill, i18n.language === lang.code && styles.langPillActive]}
                onPress={() => changeLanguage(lang.code)}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, i18n.language === lang.code && { color: colors.bg }]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />
          {/* Notifications toggle */}
          <View style={styles.menuRow}>
            <View style={[styles.menuIcon, { backgroundColor: colors.gold + '18' }]}>
              <Ionicons name="notifications-outline" size={18} color={colors.gold} />
            </View>
            <Text style={styles.menuLabel}>{t('profile.notifications')}</Text>
            <Switch
              value={notifs}
              onValueChange={v => { haptic.select(); setNotifs(v); }}
              trackColor={{ false: colors.bgElevated, true: colors.gold + '88' }}
              thumbColor={notifs ? colors.gold : colors.textMuted}
            />
          </View>
        </GlassCard>

        <Text style={styles.sectionLabel}>AIDE & LÉGAL</Text>
        <GlassCard style={styles.menuCard}>
          <MenuRow icon="help-circle-outline" label={t('profile.help')} onPress={() => {}} />
          <View style={styles.divider} />
          <MenuRow icon="shield-checkmark-outline" label={t('profile.privacy')} onPress={() => {}} />
          <View style={styles.divider} />
          <MenuRow icon="information-circle-outline" label={t('profile.about')} onPress={() => {}} />
        </GlassCard>

        {/* Logout */}
        <GoldButton
          title={t('profile.logout')}
          onPress={handleSignOut}
          variant="outline"
          size="lg"
          style={{ marginTop: spacing.lg }}
        />

        <TouchableOpacity style={styles.deleteBtn}>
          <Text style={styles.deleteText}>{t('profile.deleteAccount')}</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.version}>HIWAYTI v1.0.0 • Maroc 🇲🇦</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },

  hero: {
    alignItems: 'center', paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
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
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.full,
    borderWidth: 1, marginBottom: spacing.lg,
  },
  roleText: { ...typography.captionBold },
  statsRow: { flexDirection: 'row', gap: spacing.xxl },
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
  menuIcon: {
    width: 36, height: 36, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: spacing.md },

  langRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  langPills: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  langPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: radius.full,
    backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  langPillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  langFlag: { fontSize: 14 },
  langLabel: { ...typography.captionBold, color: colors.textSecondary },

  deleteBtn: { alignItems: 'center', marginTop: spacing.lg },
  deleteText: { ...typography.body, color: colors.danger + 'bb' },
  version: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
