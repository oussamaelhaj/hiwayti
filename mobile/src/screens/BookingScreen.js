/**
 * BookingScreen.js — HIWAYTI Booking Flow
 * Date selection, time slots, participants, checkout
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius, typography, shadow } from '../utils/theme';
import { haptic, formatPrice, getBookingStatusColor } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { createBooking, fetchUserBookings } from '../services/api';
import AppButton from '../components/ui/AppButton';
import GlassCard from '../components/ui/GlassCard';

const TIME_SLOTS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

function generateNext14Days() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function BookingScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const activity = route?.params?.activity || null;
  const provider = route?.params?.provider || null;

  const [tab, setTab] = useState('new'); // 'new' | 'my'
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [participants, setParticipants] = useState(1);
  const [loading, setLoading] = useState(false);
  const [myBookings, setMyBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const days = generateNext14Days();
  const totalPrice = (activity?.price || provider?.price || 0) * participants;

  useEffect(() => {
    if (tab === 'my' && user) {
      setLoadingBookings(true);
      fetchUserBookings(user.uid)
        .then(setMyBookings)
        .catch(console.warn)
        .finally(() => setLoadingBookings(false));
    }
  }, [tab, user]);

  const handleBook = async () => {
    if (!user) return Alert.alert('Non connecté', 'Veuillez vous connecter.');
    if (!provider) return Alert.alert('Erreur', 'Aucun prestataire sélectionné.');
    haptic.medium();
    setLoading(true);
    try {
      const selectedDay = days[selectedDate];
      const [hours, minutes] = selectedTime.split(':');
      const bookingDate = new Date(
        selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(),
        parseInt(hours), parseInt(minutes)
      );
      await createBooking({
        providerId: provider?.id,
        activityId: activity?.id,
        providerName: provider?.name,
        activityName: activity?.name,
        communeId: activity?.communeId || provider?.communeId,
        date: bookingDate.toISOString(),
        time: selectedTime,
        participants,
        totalPrice,
        currency: 'MAD',
        category: activity?.category || provider?.category,
      });
      haptic.success();
      Alert.alert(
        t('booking.bookingSuccess') + ' 🎉',
        `Votre réservation chez ${provider.name} le ${selectedDay.toLocaleDateString('fr-MA')} à ${selectedTime} a été confirmée.`,
        [{ text: 'Voir mes réservations', onPress: () => setTab('my') }]
      );
    } catch (err) {
      haptic.error();
      Alert.alert(t('booking.bookingError'), err.message || 'Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('booking.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {['new', 'my'].map(t_ => (
          <TouchableOpacity
            key={t_}
            style={[styles.tab, tab === t_ && styles.tabActive]}
            onPress={() => { haptic.select(); setTab(t_); }}
          >
            <Text style={[styles.tabText, tab === t_ && styles.tabTextActive]}>
              {t_ === 'new' ? 'Nouvelle Réservation' : t('booking.myBookings')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'new' ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Provider header */}
          {provider && (
            <GlassCard style={styles.providerBanner} goldBorder>
              <View style={[styles.providerIcon, { backgroundColor: (colors[provider.category] || colors.gold) + '22' }]}>
                <Text style={{ fontSize: 28 }}>{provider.category === 'padel' ? '🎾' : '🌍'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{provider.name || 'Sélectionnez un prestataire'}</Text>
                <Text style={styles.providerCommune}>{provider.commune || ''}</Text>
              </View>
              <Text style={styles.providerPrice}>{formatPrice(provider.price)}<Text style={styles.priceSub}>/session</Text></Text>
            </GlassCard>
          )}

          {/* Date picker */}
          <Text style={styles.sectionTitle}>{t('booking.selectDate')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
            {days.map((d, i) => {
              const active = selectedDate === i;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dateCard, active && styles.dateCardActive]}
                  onPress={() => { haptic.select(); setSelectedDate(i); }}
                >
                  <Text style={[styles.dateDow, active && { color: colors.bg }]}>
                    {d.toLocaleDateString('fr-MA', { weekday: 'short' }).toUpperCase()}
                  </Text>
                  <Text style={[styles.dateNum, active && { color: colors.bg }]}>
                    {d.getDate()}
                  </Text>
                  <Text style={[styles.dateMon, active && { color: colors.bg + 'aa' }]}>
                    {d.toLocaleDateString('fr-MA', { month: 'short' })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Time slots */}
          <Text style={styles.sectionTitle}>{t('booking.selectTime')}</Text>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map(slot => {
              const active = selectedTime === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.timeSlot, active && styles.timeSlotActive]}
                  onPress={() => { haptic.select(); setSelectedTime(slot); }}
                >
                  <Text style={[styles.timeSlotText, active && { color: colors.bg }]}>{slot}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Participants */}
          <Text style={styles.sectionTitle}>{t('booking.participants')}</Text>
          <View style={styles.participantsRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => { haptic.select(); setParticipants(p => Math.max(1, p - 1)); }}
            >
              <Ionicons name="remove" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{participants}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => { haptic.select(); setParticipants(p => Math.min(10, p + 1)); }}
            >
              <Ionicons name="add" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Summary */}
          <GlassCard style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>
                {days[selectedDate].toLocaleDateString('fr-MA', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Heure</Text>
              <Text style={styles.summaryValue}>{selectedTime}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Participants</Text>
              <Text style={styles.summaryValue}>{participants}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.totalLabel}>{t('booking.totalPrice')}</Text>
              <Text style={styles.totalValue}>{formatPrice(totalPrice)}</Text>
            </View>
          </GlassCard>

          <AppButton
            title={t('booking.bookNow')}
            onPress={handleBook}
            loading={loading}
            size="lg"
            variant="sahara"
            style={{ marginTop: spacing.lg, marginBottom: spacing.xxl }}
          />
        </ScrollView>
      ) : (
        /* MY BOOKINGS */
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loadingBookings ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} />
          ) : myBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>📅</Text>
              <Text style={styles.emptyTitle}>Aucune réservation</Text>
              <Text style={styles.emptyText}>Commencez à explorer et réservez votre première expérience !</Text>
            </View>
          ) : (
            myBookings.map(booking => (
              <GlassCard key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View style={[styles.bookingStatus, { backgroundColor: getBookingStatusColor(booking.status) + '22' }]}>
                    <View style={[styles.statusDot, { backgroundColor: getBookingStatusColor(booking.status) }]} />
                    <Text style={[styles.statusText, { color: getBookingStatusColor(booking.status) }]}>
                      {booking.status === 'pending' ? 'En attente'
                        : booking.status === 'confirmed' ? 'Confirmé'
                        : booking.status === 'completed' ? 'Terminé' : 'Annulé'}
                    </Text>
                  </View>
                  <Text style={styles.bookingPrice}>{formatPrice(booking.totalPrice)}</Text>
                </View>
                <Text style={styles.bookingProvider}>{booking.providerName}</Text>
                <View style={styles.bookingMeta}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.bookingMetaText}>
                    {booking.date ? new Date(booking.date).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </Text>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
                  <Text style={styles.bookingMetaText}>{booking.time || '—'}</Text>
                </View>
              </GlassCard>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { ...typography.h3, color: colors.textPrimary },

  tabRow: {
    flexDirection: 'row', marginHorizontal: spacing.lg,
    backgroundColor: colors.bgCard, borderRadius: radius.full, padding: 4,
    marginBottom: spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.full },
  tabActive: { backgroundColor: colors.gold },
  tabText: { ...typography.bodyMd, color: colors.textMuted },
  tabTextActive: { color: colors.bg, fontWeight: '700' },

  content: { paddingHorizontal: spacing.lg, paddingBottom: 120 },

  providerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  providerIcon: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  providerName: { ...typography.h4, color: colors.textPrimary },
  providerCommune: { ...typography.caption, color: colors.textMuted },
  providerPrice: { ...typography.h3, color: colors.gold },
  priceSub: { ...typography.caption, color: colors.textMuted, fontWeight: '400' },

  sectionTitle: { ...typography.h4, color: colors.textSecondary, marginBottom: spacing.md, marginTop: spacing.lg },

  dateScroll: { gap: spacing.sm, paddingVertical: spacing.xs },
  dateCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    alignItems: 'center', minWidth: 62,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  dateCardActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  dateDow: { ...typography.tag, color: colors.textMuted, marginBottom: 4 },
  dateNum: { ...typography.h3, color: colors.textPrimary },
  dateMon: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeSlot: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  timeSlotActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  timeSlotText: { ...typography.bodyMd, color: colors.textPrimary },

  participantsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  counterBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  counterValue: { ...typography.h2, color: colors.gold, minWidth: 40, textAlign: 'center' },

  summary: { padding: spacing.md, marginTop: spacing.lg, gap: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  summaryLabel: { ...typography.body, color: colors.textMuted },
  summaryValue: { ...typography.bodyMd, color: colors.textPrimary },
  summaryTotal: { borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingTop: spacing.sm, marginTop: spacing.xs },
  totalLabel: { ...typography.h4, color: colors.textPrimary },
  totalValue: { ...typography.h3, color: colors.gold },

  // My bookings
  emptyState: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyTitle: { ...typography.h3, color: colors.textPrimary },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },

  bookingCard: { padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...typography.captionBold },
  bookingPrice: { ...typography.h4, color: colors.gold },
  bookingProvider: { ...typography.h4, color: colors.textPrimary },
  bookingMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookingMetaText: { ...typography.caption, color: colors.textMuted },
});
