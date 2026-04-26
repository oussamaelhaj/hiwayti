/**
 * ProviderActivitiesScreen.js — Gestion des Activités du Prestataire
 * CRUD complet : créer, modifier, supprimer, activer/désactiver
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, SafeAreaView, Switch, Modal,
  KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography, CATEGORIES } from '../utils/theme';
import { haptic, formatPrice } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import {
  fetchProviderActivities, createActivity, updateActivity, deleteActivity, uploadImage
} from '../services/api';
import GlassCard from '../components/ui/GlassCard';
import GoldButton from '../components/ui/GoldButton';

const ACTIVITY_TYPES = [
  { id: 'session', label: 'Session', icon: 'time-outline' },
  { id: 'course', label: 'Cours', icon: 'school-outline' },
  { id: 'stage', label: 'Stage', icon: 'calendar-outline' },
  { id: 'tour', label: 'Circuit', icon: 'map-outline' },
  { id: 'workshop', label: 'Atelier', icon: 'construct-outline' },
  { id: 'rental', label: 'Location', icon: 'key-outline' },
];

const DIFFICULTY = ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'];
const LANGUAGES_OPTS = ['Français', 'العربية', 'English', 'Español', 'Deutsch'];
const DURATIONS = ['30 min', '1h', '1h30', '2h', '3h', 'Demi-journée', 'Journée complète', '2 jours', '1 semaine'];

const EMPTY_FORM = {
  name: '',
  description: '',
  category: '',
  type: 'session',
  price: '',
  priceUnit: 'personne',
  duration: '1h',
  maxParticipants: '8',
  minParticipants: '1',
  difficulty: 'Débutant',
  languages: ['Français'],
  included: '',
  excluded: '',
  requirements: '',
  meetingPoint: '',
  active: true,
  imageUrl: null,
};

export default function ProviderActivitiesScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const providerId = userProfile?.providerId || user?.uid;

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProviderActivities(providerId);
      setActivities(data);
    } catch (e) { console.warn(e); }
    setLoading(false);
  }, [providerId]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (act) => {
    setForm({
      name: act.name || '',
      description: act.description || '',
      category: act.category || '',
      type: act.type || 'session',
      price: act.price?.toString() || '',
      priceUnit: act.priceUnit || 'personne',
      duration: act.duration || '1h',
      maxParticipants: act.maxParticipants?.toString() || '8',
      minParticipants: act.minParticipants?.toString() || '1',
      difficulty: act.difficulty || 'Débutant',
      languages: act.languages || ['Français'],
      included: Array.isArray(act.included) ? act.included.join('\n') : act.included || '',
      excluded: Array.isArray(act.excluded) ? act.excluded.join('\n') : act.excluded || '',
      requirements: Array.isArray(act.requirements) ? act.requirements.join('\n') : act.requirements || '',
      meetingPoint: act.meetingPoint || '',
      active: act.active !== false,
      imageUrl: act.imageUrl || null,
    });
    setEditingId(act.id);
    setShowModal(true);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setForm(f => ({ ...f, imageUrl: result.assets[0].uri }));
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return Alert.alert('Erreur', 'Le nom est obligatoire.');
    if (!form.category) return Alert.alert('Erreur', 'Sélectionnez une catégorie.');
    haptic.medium();
    setSaving(true);
    try {
      let finalImageUrl = form.imageUrl;
      if (form.imageUrl && form.imageUrl.startsWith('file://')) {
        finalImageUrl = await uploadImage(form.imageUrl, `activities/${providerId}/${Date.now()}`);
      }

      const payload = {
        ...form,
        imageUrl: finalImageUrl,
        providerId,
        price: parseFloat(form.price) || 0,
        maxParticipants: parseInt(form.maxParticipants) || 8,
        minParticipants: parseInt(form.minParticipants) || 1,
        included: form.included ? form.included.split('\n').filter(Boolean) : [],
        excluded: form.excluded ? form.excluded.split('\n').filter(Boolean) : [],
        requirements: form.requirements ? form.requirements.split('\n').filter(Boolean) : [],
      };
      if (editingId) {
        await updateActivity(editingId, payload);
      } else {
        await createActivity(payload);
      }
      haptic.success();
      setShowModal(false);
      await load();
    } catch (e) {
      haptic.error();
      Alert.alert('Erreur', e.message);
    }
    setSaving(false);
  };

  const handleDelete = (act) => {
    Alert.alert('Supprimer', `Supprimer "${act.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        haptic.heavy();
        await deleteActivity(act.id, providerId);
        await load();
      }},
    ]);
  };

  const handleToggleActive = async (act) => {
    haptic.select();
    await updateActivity(act.id, { active: !act.active });
    setActivities(prev => prev.map(a => a.id === act.id ? { ...a, active: !a.active } : a));
  };

  const toggleLanguage = (lang) => {
    setForm(f => ({
      ...f,
      languages: f.languages.includes(lang)
        ? f.languages.filter(l => l !== lang)
        : [...f.languages, lang],
    }));
  };

  const F = ({ label, children }) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerSub}>Mes Activités</Text>
          <Text style={styles.headerTitle}>{activities.length} activité{activities.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <LinearGradient colors={[colors.gold, colors.goldDim]} style={styles.addBtnGrad}>
            <Ionicons name="add" size={22} color={colors.bg} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}>
          {activities.length === 0 && (
            <View style={styles.empty}>
              <Text style={{ fontSize: 52 }}>🎯</Text>
              <Text style={styles.emptyTitle}>Aucune activité</Text>
              <Text style={styles.emptyText}>Ajoutez vos premières activités pour attirer des clients</Text>
              <GoldButton title="+ Créer une activité" onPress={openCreate} size="md" style={{ marginTop: spacing.lg }} />
            </View>
          )}

          {activities.map(act => {
            const cat = CATEGORIES.find(c => c.id === act.category);
            return (
              <GlassCard key={act.id} style={styles.actCard}>
                <View style={styles.actTop}>
                  {act.imageUrl ? (
                    <Image source={{ uri: act.imageUrl }} style={styles.actEmoji} />
                  ) : (
                    <View style={[styles.actEmoji, { backgroundColor: (colors[act.category] || colors.gold) + '22' }]}>
                      <Text style={{ fontSize: 22 }}>{cat?.emoji || '🎯'}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actName}>{act.name}</Text>
                    <Text style={styles.actMeta}>{cat?.labelFr || act.category} • {act.duration} • {act.difficulty}</Text>
                    <Text style={styles.actPrice}>{act.price ? `${act.price} MAD/${act.priceUnit}` : 'Sur devis'}</Text>
                  </View>
                  <Switch
                    value={act.active !== false}
                    onValueChange={() => handleToggleActive(act)}
                    trackColor={{ false: colors.bgElevated, true: colors.success + '88' }}
                    thumbColor={act.active !== false ? colors.success : colors.textMuted}
                  />
                </View>

                {act.languages?.length > 0 && (
                  <View style={styles.langRow}>
                    <Ionicons name="language-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.langText}>{act.languages.join(' • ')}</Text>
                  </View>
                )}

                <View style={styles.actStats}>
                  <View style={styles.actStat}>
                    <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.actStatText}>{act.minParticipants}–{act.maxParticipants} pers.</Text>
                  </View>
                  <View style={styles.actStat}>
                    <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.actStatText}>{act.bookingCount || 0} réservation{(act.bookingCount || 0) !== 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.actStat}>
                    <Ionicons name="star-outline" size={13} color={colors.gold} />
                    <Text style={styles.actStatText}>{act.rating ? act.rating.toFixed(1) : '—'}</Text>
                  </View>
                </View>

                <View style={styles.actActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(act)}>
                    <Ionicons name="pencil-outline" size={16} color={colors.gold} />
                    <Text style={styles.editBtnText}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(act)}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text style={styles.deleteBtnText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            );
          })}
        </ScrollView>
      )}

      {/* ── MODAL FORM ── */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingId ? 'Modifier l\'activité' : 'Nouvelle activité'}</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">

              {/* Image */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Image de couverture</Text>
                <TouchableOpacity style={styles.imageUploadBtn} onPress={pickImage}>
                  {form.imageUrl ? (
                    <Image source={{ uri: form.imageUrl }} style={styles.previewImg} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                      <Text style={styles.imagePlaceholderText}>Ajouter une photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Nom */}
              <F label="Nom de l'activité *">
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={v => setForm(f => ({ ...f, name: v }))}
                  placeholder="Ex: Cours de surf débutants"
                  placeholderTextColor={colors.textMuted}
                />
              </F>

              {/* Description */}
              <F label="Description">
                <TextInput
                  style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                  value={form.description}
                  onChangeText={v => setForm(f => ({ ...f, description: v }))}
                  placeholder="Décrivez votre activité..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </F>

              {/* Catégorie */}
              <F label="Catégorie *">
                <View style={styles.pillGrid}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.pill, form.category === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                      onPress={() => setForm(f => ({ ...f, category: cat.id }))}
                    >
                      <Text>{cat.emoji}</Text>
                      <Text style={[styles.pillText, form.category === cat.id && { color: colors.bg }]}>{cat.labelFr}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </F>

              {/* Type */}
              <F label="Type d'activité">
                <View style={styles.pillGrid}>
                  {ACTIVITY_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.pill, form.type === t.id && styles.pillActive]}
                      onPress={() => setForm(f => ({ ...f, type: t.id }))}
                    >
                      <Ionicons name={t.icon} size={14} color={form.type === t.id ? colors.bg : colors.textMuted} />
                      <Text style={[styles.pillText, form.type === t.id && { color: colors.bg }]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </F>

              {/* Prix + Unité */}
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <F label="Prix (MAD)">
                  <TextInput
                    style={[styles.input, { width: 120 }]}
                    value={form.price}
                    onChangeText={v => setForm(f => ({ ...f, price: v }))}
                    placeholder="300"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </F>
                <F label="Par">
                  <TextInput
                    style={[styles.input, { width: 120 }]}
                    value={form.priceUnit}
                    onChangeText={v => setForm(f => ({ ...f, priceUnit: v }))}
                    placeholder="personne"
                    placeholderTextColor={colors.textMuted}
                  />
                </F>
              </View>

              {/* Durée */}
              <F label="Durée">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                    {DURATIONS.map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.pill, form.duration === d && styles.pillActive]}
                        onPress={() => setForm(f => ({ ...f, duration: d }))}
                      >
                        <Text style={[styles.pillText, form.duration === d && { color: colors.bg }]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </F>

              {/* Participants */}
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <F label="Min participants">
                  <TextInput
                    style={[styles.input, { width: 110 }]}
                    value={form.minParticipants}
                    onChangeText={v => setForm(f => ({ ...f, minParticipants: v }))}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                  />
                </F>
                <F label="Max participants">
                  <TextInput
                    style={[styles.input, { width: 110 }]}
                    value={form.maxParticipants}
                    onChangeText={v => setForm(f => ({ ...f, maxParticipants: v }))}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                  />
                </F>
              </View>

              {/* Difficulté */}
              <F label="Niveau de difficulté">
                <View style={styles.pillGrid}>
                  {DIFFICULTY.map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.pill, form.difficulty === d && styles.pillActive]}
                      onPress={() => setForm(f => ({ ...f, difficulty: d }))}
                    >
                      <Text style={[styles.pillText, form.difficulty === d && { color: colors.bg }]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </F>

              {/* Langues */}
              <F label="Langues proposées">
                <View style={styles.pillGrid}>
                  {LANGUAGES_OPTS.map(lang => (
                    <TouchableOpacity
                      key={lang}
                      style={[styles.pill, form.languages.includes(lang) && styles.pillActive]}
                      onPress={() => toggleLanguage(lang)}
                    >
                      <Text style={[styles.pillText, form.languages.includes(lang) && { color: colors.bg }]}>{lang}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </F>

              {/* Inclus */}
              <F label="Ce qui est inclus (une ligne par item)">
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={form.included}
                  onChangeText={v => setForm(f => ({ ...f, included: v }))}
                  placeholder="Équipement&#10;Moniteur&#10;Assurance"
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </F>

              {/* Non inclus */}
              <F label="Non inclus">
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  value={form.excluded}
                  onChangeText={v => setForm(f => ({ ...f, excluded: v }))}
                  placeholder="Transport&#10;Repas"
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </F>

              {/* Prérequis */}
              <F label="Prérequis / À savoir">
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  value={form.requirements}
                  onChangeText={v => setForm(f => ({ ...f, requirements: v }))}
                  placeholder="Savoir nager&#10;Minimum 12 ans"
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </F>

              {/* Point de rencontre */}
              <F label="Point de rencontre">
                <TextInput
                  style={styles.input}
                  value={form.meetingPoint}
                  onChangeText={v => setForm(f => ({ ...f, meetingPoint: v }))}
                  placeholder="Adresse ou GPS"
                  placeholderTextColor={colors.textMuted}
                />
              </F>

              {/* Active */}
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Activité visible sur la plateforme</Text>
                <Switch
                  value={form.active}
                  onValueChange={v => setForm(f => ({ ...f, active: v }))}
                  trackColor={{ false: colors.bgElevated, true: colors.success + '88' }}
                  thumbColor={form.active ? colors.success : colors.textMuted}
                />
              </View>

              <GoldButton
                title={saving ? 'Enregistrement…' : (editingId ? 'Sauvegarder' : 'Créer l\'activité')}
                onPress={handleSave}
                loading={saving}
                size="lg"
                style={{ marginTop: spacing.xl, marginBottom: spacing.xxl }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center',
  },
  headerSub: { ...typography.caption, color: colors.textMuted },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  addBtn: { borderRadius: radius.full, overflow: 'hidden' },
  addBtnGrad: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyTitle: { ...typography.h3, color: colors.textPrimary },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },

  actCard: { padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  actTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  actEmoji: { width: 50, height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  actName: { ...typography.h4, color: colors.textPrimary },
  actMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  actPrice: { ...typography.captionBold, color: colors.gold, marginTop: 3 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  langText: { ...typography.caption, color: colors.textMuted },
  actStats: { flexDirection: 'row', gap: spacing.lg },
  actStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actStatText: { ...typography.caption, color: colors.textMuted },
  actActions: {
    flexDirection: 'row', gap: spacing.sm,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingTop: spacing.sm,
  },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: spacing.sm, borderRadius: radius.sm,
    backgroundColor: colors.goldGlow, borderWidth: 1, borderColor: colors.goldBorder,
  },
  editBtnText: { ...typography.captionBold, color: colors.gold },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: spacing.sm, borderRadius: radius.sm,
    backgroundColor: colors.dangerGlow, borderWidth: 1, borderColor: colors.danger + '33',
  },
  deleteBtnText: { ...typography.captionBold, color: colors.danger },

  // Modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  modalTitle: { ...typography.h4, color: colors.textPrimary },
  modalContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  field: { marginBottom: spacing.md },
  fieldLabel: { ...typography.captionBold, color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    ...typography.body, color: colors.textPrimary,
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 48,
  },

  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  imageUploadBtn: { width: '100%', height: 160, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.bgInput, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  previewImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  imagePlaceholderText: { ...typography.caption, color: colors.textMuted },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.full,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  pillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  pillText: { ...typography.captionBold, color: colors.textSecondary },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
});
