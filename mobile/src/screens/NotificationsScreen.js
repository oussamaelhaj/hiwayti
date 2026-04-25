/**
 * NotificationsScreen.js — HIWAYTI Notification Center
 * Booking alerts, promotions, commune updates
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../utils/theme';
import { haptic, getRelativeTime } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { fetchNotifications, markNotificationRead } from '../services/api';
import GlassCard from '../components/ui/GlassCard';

const NOTIF_ICONS = {
  booking:   { icon: 'calendar',        color: colors.accent },
  reminder:  { icon: 'alarm',           color: colors.warning },
  promo:     { icon: 'pricetag',        color: colors.gold },
  commune:   { icon: 'business',        color: colors.success },
  review:    { icon: 'star',            color: colors.goldLight },
  system:    { icon: 'information-circle', color: colors.info },
};

export default function NotificationsScreen({ navigation }) {
  const { user } = useAuth();
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchNotifications(user.uid)
      .then(setNotifs)
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [user]);

  const handleRead = async (notif) => {
    if (notif.read) return;
    haptic.light();
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    await markNotificationRead(notif.id).catch(console.warn);
  };

  const unreadCount = notifs.filter(n => !n.read).length;
  const meta = (type) => NOTIF_ICONS[type] || NOTIF_ICONS.system;

  const DEMO_NOTIFS = [
    { id: '1', type: 'booking',  title: 'Réservation confirmée', body: 'Votre session de surf à Asilah est confirmée pour demain à 10h00.', createdAt: new Date(Date.now() - 60000 * 30), read: false },
    { id: '2', type: 'promo',    title: '🎉 Offre spéciale weekend', body: '-20% sur toutes les activités padel ce weekend !', createdAt: new Date(Date.now() - 3600000), read: false },
    { id: '3', type: 'commune',  title: 'Nouvelle activité à Fès', body: 'La commune de Fès a ajouté 3 nouveaux artisans à la plateforme.', createdAt: new Date(Date.now() - 86400000), read: true },
    { id: '4', type: 'reminder', title: 'Rappel — Demain à 14h', body: 'Votre cours de poterie à Safi commence dans 24h. N\'oubliez pas !', createdAt: new Date(Date.now() - 86400000 * 2), read: true },
    { id: '5', type: 'review',   title: 'Un avis vous a été laissé', body: 'Ahmed B. a laissé un avis 5 étoiles sur votre prestation.', createdAt: new Date(Date.now() - 86400000 * 3), read: true },
  ];

  const displayNotifs = notifs.length > 0 ? notifs : DEMO_NOTIFS;

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.gold} size="large" />
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
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => {
            haptic.light();
            setNotifs(prev => prev.map(n => ({ ...n, read: true })));
          }}
        >
          <Text style={styles.markAll}>Tout lire</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayNotifs}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const { icon, color } = meta(item.type);
          return (
            <TouchableOpacity onPress={() => handleRead(item)} activeOpacity={0.85}>
              <GlassCard style={[styles.notifCard, !item.read && styles.unread]}>
                {/* Unread dot */}
                {!item.read && <View style={styles.unreadDot} />}
                <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
                  <Ionicons name={icon} size={22} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>{item.title}</Text>
                  <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                  <Text style={styles.notifTime}>
                    {getRelativeTime(item.createdAt)}
                  </Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🔔</Text>
            <Text style={styles.emptyText}>Aucune notification</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  headerSub:   { ...typography.caption, color: colors.gold },
  markAll:     { ...typography.captionBold, color: colors.gold },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    padding: spacing.md, marginBottom: spacing.sm,
    position: 'relative',
  },
  unread: { borderColor: colors.goldBorder },
  unreadDot: {
    position: 'absolute', top: spacing.md, right: spacing.md,
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold,
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  notifTitle: { ...typography.bodyMd, color: colors.textPrimary, marginBottom: 3 },
  notifBody:  { ...typography.caption, color: colors.textMuted, lineHeight: 18, marginBottom: 4 },
  notifTime:  { ...typography.caption, color: colors.textMuted + 'aa' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted },
});
