import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../utils/theme';
import { fetchUserBookings, addReview } from '../services/api';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/ui/GlassCard';
import ZelligePattern from '../components/ui/ZelligePattern';
import StarRating from '../components/ui/StarRating';
import AppButton from '../components/ui/AppButton';
import { haptic, formatDate, formatCurrency } from '../utils/helpers';
import { Modal, TextInput, Alert } from 'react-native';

export default function MyBookingsScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchUserBookings(user.uid);
      // Sort by date (descending)
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setBookings(data);
    } catch (error) {
      console.error('[BOOKINGS] Load error:', error);
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return colors.success;
      case 'pending':   return colors.gold;
      case 'cancelled': return colors.danger;
      case 'completed': return colors.info;
      default:          return colors.textMuted;
    }
  };

  const handleReview = (booking) => {
    setSelectedBooking(booking);
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!comment.trim()) return Alert.alert('Attention', 'Veuillez laisser un petit commentaire.');
    setSubmitting(true);
    try {
      await addReview({
        targetId: selectedBooking.activityId || selectedBooking.providerId,
        bookingId: selectedBooking.id,
        rating,
        comment,
        userName: user.displayName || 'Utilisateur',
      });
      haptic.success();
      Alert.alert('Merci !', 'Votre avis a été publié avec succès.');
      setShowReviewModal(false);
      setComment('');
      setRating(5);
      // Refresh bookings to hide the "Rate" button (if we added a "reviewed" flag)
      loadBookings();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de publier votre avis.');
    }
    setSubmitting(false);
  };

  const renderBooking = ({ item }) => (
    <GlassCard style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <View style={styles.activityInfo}>
          <Text style={styles.providerName}>{item.providerName}</Text>
          <Text style={styles.activityName}>{item.activityName || 'Réservation Service'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '22' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status || 'En attente'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.bookingDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.gold} />
          <Text style={styles.detailText}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={14} color={colors.gold} />
          <Text style={styles.detailText}>{item.time}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="people-outline" size={14} color={colors.gold} />
          <Text style={styles.detailText}>{item.participants} {item.participants > 1 ? 'pers.' : 'pers.'}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.priceLabel}>Prix Total</Text>
        <Text style={styles.priceValue}>{item.totalPrice} MAD</Text>
      </View>

      {item.status === 'completed' && !item.reviewed && (
        <TouchableOpacity 
          style={styles.reviewBtn}
          onPress={() => handleReview(item)}
        >
          <Ionicons name="star" size={16} color={colors.gold} />
          <Text style={styles.reviewBtnText}>Laisser un avis</Text>
        </TouchableOpacity>
      )}
    </GlassCard>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ZelligePattern opacity={0.03} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Mes Réservations</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={80} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Aucune réservation</Text>
          <Text style={styles.emptyText}>Vos prochaines aventures apparaîtront ici.</Text>
          <TouchableOpacity 
            style={styles.exploreBtn}
            onPress={() => navigation.navigate('Discover')}
          >
            <Text style={styles.exploreBtnText}>Réserver maintenant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBooking}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={loadBookings}
          refreshing={loading}
        />
      )}

      {/* Review Modal */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Votre Avis</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>Comment était votre expérience chez {selectedBooking?.providerName} ?</Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <TouchableOpacity key={s} onPress={() => { haptic.light(); setRating(s); }}>
                  <Ionicons 
                    name={s <= rating ? "star" : "star-outline"} 
                    size={36} 
                    color={colors.gold} 
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Partagez votre expérience..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
            />

            <AppButton
              title={submitting ? "Publication..." : "Publier mon avis"}
              onPress={submitReview}
              loading={submitting}
              variant="sahara"
            />
          </GlassCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  bookingCard: {
    padding: spacing.md,
    borderRadius: radius.xl,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  activityInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activityName: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 12,
    fontFamily: typography.bold,
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  bookingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgElevated + '88',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: colors.textMuted,
  },
  priceValue: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 50,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: typography.bold,
    color: colors.textPrimary,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: typography.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  exploreBtn: {
    marginTop: 30,
    backgroundColor: colors.gold,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: radius.lg,
  },
  exploreBtnText: {
    color: colors.bg,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.goldGlow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
  reviewBtnText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    padding: spacing.lg,
    borderRadius: radius.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  modalSub: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: spacing.xl,
  },
  reviewInput: {
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.regular,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
