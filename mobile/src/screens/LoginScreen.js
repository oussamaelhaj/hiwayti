/**
 * LoginScreen.js — HIWAYTI Premium Authentication Screen
 * Email/Password + Google Sign-In with Role Selection
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Animated, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius, typography, shadow, USER_ROLES } from '../utils/theme';
import { haptic } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import GoldButton from '../components/ui/GoldButton';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(USER_ROLES.TOURIST); // Default role
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const switchMode = (newMode) => {
    haptic.light();
    Animated.parallel([
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
    setMode(newMode);
  };

  const handleSubmit = async () => {
    if (!email.trim()) return Alert.alert('Email requis', 'Veuillez saisir votre email.');
    if (mode !== 'reset' && !password) return Alert.alert('Mot de passe requis');
    setLoading(true);
    haptic.light();
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        haptic.success();
      } else if (mode === 'register') {
        if (!name.trim()) return Alert.alert('Nom requis');
        await signUp(email.trim(), password, name.trim(), role);
        haptic.success();
        Alert.alert('Compte créé !', 'Vérifiez votre email pour confirmer votre compte.');
      } else {
        await resetPassword(email.trim());
        haptic.success();
        Alert.alert(t('auth.resetSent'), 'Un lien de réinitialisation vous a été envoyé.');
        setMode('login');
      }
    } catch (err) {
      haptic.error();
      let msg = err.message;
      if (msg.includes('auth/email-already-in-use')) msg = 'Cet email est déjà utilisé.';
      else if (msg.includes('auth/invalid-email')) msg = 'Format d\'email invalide.';
      else if (msg.includes('auth/weak-password')) msg = 'Mot de passe trop faible (6 caractères min).';
      else if (msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) msg = 'Email ou mot de passe incorrect.';
      
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    haptic.medium();
    try {
      await signInWithGoogle(); // Default role is Tourist from Google, can be changed later
      haptic.success();
    } catch (err) {
      haptic.error();
      Alert.alert('Erreur Google', err.message || 'Connexion Google impossible.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const ROLES = [
    { id: USER_ROLES.TOURIST, label: 'Passager', icon: 'map' },
    { id: USER_ROLES.PROVIDER, label: 'Prestataire', icon: 'briefcase' },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#06060e', '#0a0614', '#06060e']} style={StyleSheet.absoluteFillObject} />

      {/* Decorative orbs */}
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>🌍</Text>
          </View>
          <Text style={styles.appName}>HIWAYTI</Text>
          <Text style={styles.tagline}>{t('common.tagline')}</Text>
        </Animated.View>

        {/* Card */}
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Mode title */}
          <Text style={styles.cardTitle}>
            {mode === 'login' ? t('auth.login') : mode === 'register' ? t('auth.register') : 'Mot de passe oublié'}
          </Text>

          {/* Role Selection (register only) */}
          {mode === 'register' && (
            <View style={styles.roleContainer}>
              <Text style={styles.roleLabel}>Je suis :</Text>
              <View style={styles.roleRow}>
                {ROLES.map(r => {
                  const isActive = role === r.id;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.roleBtn, isActive && styles.roleBtnActive]}
                      onPress={() => { haptic.select(); setRole(r.id); }}
                    >
                      <Ionicons name={r.icon} size={16} color={isActive ? colors.bg : colors.gold} />
                      <Text style={[styles.roleBtnText, isActive && { color: colors.bg }]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Name (register) */}
          {mode === 'register' && (
            <View style={styles.field}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.name')}
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          {/* Email */}
          <View style={styles.field}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.fieldIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.email')}
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password */}
          {mode !== 'reset' && (
            <View style={styles.field}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.fieldIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder={t('auth.password')}
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ padding: 4 }}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={18} color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Forgot password */}
          {mode === 'login' && (
            <TouchableOpacity onPress={() => switchMode('reset')} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>
          )}

          {/* Submit */}
          <GoldButton
            title={mode === 'login' ? t('auth.login') : mode === 'register' ? t('auth.register') : 'Envoyer'}
            onPress={handleSubmit}
            loading={loading}
            size="lg"
            style={{ marginTop: spacing.md }}
          />

          {/* Divider */}
          {mode !== 'reset' && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google */}
              <TouchableOpacity style={styles.googleBtn} onPress={handleGoogle} disabled={googleLoading}>
                <Text style={styles.googleIcon}>🅖</Text>
                <Text style={styles.googleText}>
                  {googleLoading ? 'Connexion…' : t('auth.google')}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Switch mode */}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>
              {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
            </Text>
            <TouchableOpacity onPress={() => switchMode(mode === 'login' ? 'register' : 'login')}>
              <Text style={styles.switchAction}>
                {mode === 'login' ? t('auth.register') : t('auth.login')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logoWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.goldGlow,
    borderWidth: 1.5, borderColor: colors.goldBorder,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadow.gold,
  },
  logoEmoji: { fontSize: 36 },
  appName: { ...typography.h1, color: colors.gold, letterSpacing: 3 },
  tagline: { ...typography.caption, color: colors.textMuted, marginTop: 4, letterSpacing: 1 },

  card: {
    backgroundColor: 'rgba(14,14,28,0.88)',
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    ...shadow.gold,
  },
  cardTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg },

  roleContainer: { marginBottom: spacing.lg },
  roleLabel: { ...typography.captionBold, color: colors.textSecondary, marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  roleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.goldBorder,
    backgroundColor: colors.bgElevated,
    minWidth: '30%',
  },
  roleBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  roleBtnText: { ...typography.captionBold, color: colors.gold },

  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.md, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  fieldIcon: { marginRight: spacing.sm },
  input: { flex: 1, ...typography.body, color: colors.textPrimary },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: spacing.sm },
  forgotText: { ...typography.caption, color: colors.gold },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg, gap: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { ...typography.caption, color: colors.textMuted },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full, height: 52,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    gap: spacing.sm,
  },
  googleIcon: { fontSize: 20 },
  googleText: { ...typography.bodyMd, color: colors.textPrimary, fontWeight: '600' },

  switchRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    marginTop: spacing.lg,
  },
  switchLabel: { ...typography.body, color: colors.textMuted },
  switchAction: { ...typography.body, color: colors.gold, fontWeight: '700' },

  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 280, height: 280, top: -80, left: -80, backgroundColor: colors.goldGlow },
  orb2: { width: 200, height: 200, bottom: 60, right: -60, backgroundColor: colors.accentGlow },
});
