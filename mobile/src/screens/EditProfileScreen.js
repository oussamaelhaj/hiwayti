/**
 * EditProfileScreen.js — Modifier le profil utilisateur
 * Permet de changer le nom, bio, et surtout la photo de profil.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator, SafeAreaView,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radius, typography } from '../utils/theme';
import { haptic } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, uploadImage } from '../services/api';
import AppButton from '../components/ui/AppButton';
import GlassCard from '../components/ui/GlassCard';

export default function EditProfileScreen({ navigation }) {
  const { user, userProfile, refreshUser } = useAuth();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio]                 = useState(userProfile?.bio || '');
  const [phone, setPhone]             = useState(userProfile?.phone || '');
  const [photoUri, setPhotoUri]       = useState(user?.photoURL || null);
  const [saving, setSaving]           = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) return Alert.alert('Erreur', 'Le nom est obligatoire.');
    
    setSaving(true);
    haptic.medium();
    try {
      let finalPhotoURL = photoUri;

      // Si l'image est locale (commence par file://), on l'upload
      if (photoUri && photoUri.startsWith('file://')) {
        try {
          finalPhotoURL = await uploadImage(photoUri, `avatars/${user.uid}/profile_${Date.now()}.jpg`);
        } catch (storageErr) {
          console.warn('[STORAGE_ERROR]', storageErr);
          throw new Error("Erreur Firebase Storage : Assurez-vous d'avoir activé le stockage dans la console Firebase et vérifié vos règles.");
        }
      }

      await updateUserProfile(user.uid, {
        displayName,
        bio,
        phone,
        photoURL: finalPhotoURL,
      });

      haptic.success();
      Alert.alert('Succès', 'Profil mis à jour avec succès.');
      await refreshUser();
      navigation.goBack();
    } catch (e) {
      console.error(e);
      haptic.error();
      Alert.alert('Erreur', e.message);
    }
    setSaving(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier le profil</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarPicker}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={16} color={colors.bg} />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHelp}>Appuyez pour changer la photo</Text>
          </View>

          <GlassCard style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.label}>Nom d'affichage</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Votre nom complet"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+212 6..."
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Dites-en plus sur vous..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>
          </GlassCard>

          <AppButton
            title={saving ? "Enregistrement..." : "Enregistrer les modifications"}
            onPress={handleSave}
            loading={saving}
            size="lg"
            style={{ marginTop: spacing.xl }}
          />
          
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            <Text style={styles.infoText}>
              Si vous rencontrez une erreur lors de l'upload de l'image, vérifiez que votre bucket Firebase Storage est activé.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  
  content: { padding: spacing.lg },
  
  avatarSection: { alignItems: 'center', marginBottom: spacing.xl },
  avatarPicker: { position: 'relative' },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: colors.goldBorder },
  avatarPlaceholder: { 
    width: 120, height: 120, borderRadius: 60, 
    backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  cameraIcon: {
    position: 'absolute', bottom: 5, right: 5,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.bg,
  },
  avatarHelp: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  
  formCard: { padding: spacing.md },
  field: { marginBottom: spacing.md },
  label: { ...typography.captionBold, color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' },
  input: {
    ...typography.body, color: colors.textPrimary,
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 50,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  
  infoBox: { 
    flexDirection: 'row', gap: 8, marginTop: spacing.xl, 
    padding: spacing.md, backgroundColor: colors.bgElevated, 
    borderRadius: radius.md, alignItems: 'flex-start' 
  },
  infoText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
});
