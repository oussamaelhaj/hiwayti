/**
 * MapDiscoverScreen.js v2 — Interactive Map
 * Fixed clustering, real provider pins, activity overlay, proper stats
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Dimensions, Animated, TextInput, StatusBar,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius, typography, CATEGORIES } from '../utils/theme';
import { haptic } from '../utils/helpers';
import {
  fetchNearbyProviders, fetchProvidersByCategory,
} from '../services/api';
import ProviderCard from '../components/cards/ProviderCard';

const { width, height } = Dimensions.get('window');

const MOROCCO_REGION = {
  latitude: 31.7917,
  longitude: -7.0926,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

export default function MapDiscoverScreen({ navigation }) {
  const { t } = useTranslation();
  const mapRef = useRef(null);

  const [location, setLocation]               = useState(null);
  const [providers, setProviders]             = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [activeCategory, setActiveCategory]   = useState(null);
  const [searchText, setSearchText]           = useState('');
  const [loading, setLoading]                 = useState(false);
  const [showList, setShowList]               = useState(false);
  const [mapReady, setMapReady]               = useState(false);
  const [likelyPlaces, setLikelyPlaces]       = useState([]);
  const [showPlacesModal, setShowPlacesModal] = useState(false);
  const [placedMarkers, setPlacedMarkers]     = useState([]);

  const cardAnim = useRef(new Animated.Value(300)).current;

  // -- Location + initial load --
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLocation(loc);
          await loadNearby(loc);
        } else {
          await loadAll();
        }
      } catch (e) {
        await loadAll();
      }
    })();
  }, []);

  // Animate map to user location once mapReady
  useEffect(() => {
    if (mapReady && location) {
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }, 1000);
    }
  }, [mapReady, location]);

  const loadNearby = async (loc) => {
    setLoading(true);
    try {
      const data = await fetchNearbyProviders(loc.coords.latitude, loc.coords.longitude, 100);
      setProviders(data.filter(p => p.location));
    } catch (e) { console.warn('[MAP]', e.message); }
    setLoading(false);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const data = await fetchNearbyProviders(31.7917, -7.0926, 2000);
      setProviders(data.filter(p => p.location));
    } catch (e) { console.warn('[MAP]', e.message); }
    setLoading(false);
  };

  const filterByCategory = useCallback(async (cat) => {
    haptic.select();
    setActiveCategory(cat);
    setSelectedProvider(null);
    setLoading(true);
    try {
      if (cat) {
        const data = await fetchProvidersByCategory(cat, 100);
        setProviders(data.filter(p => p.location));
      } else {
        if (location) await loadNearby(location);
        else await loadAll();
      }
    } catch (e) { console.warn('[MAP]', e.message); }
    setLoading(false);
  }, [location]);

  const selectProvider = (provider) => {
    haptic.light();
    setSelectedProvider(provider);
    Animated.spring(cardAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    mapRef.current?.animateToRegion({
      latitude: parseFloat(provider.location.latitude),
      longitude: parseFloat(provider.location.longitude),
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 600);
  };

  const dismissCard = () => {
    Animated.timing(cardAnim, { toValue: 300, duration: 250, useNativeDriver: true }).start(() => {
      setSelectedProvider(null);
    });
  };

  const findCurrentPlaces = async () => {
    haptic.select();
    setLoading(true);
    try {
      let loc = location;
      if (!loc) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('Permission refusée');
        loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      }

      const API_KEY = "AIzaSyBIMXq0wBiP3T0RESNUZ5S91p4lK8BjMbM";
      const url = `https://places.googleapis.com/v1/places:searchNearby`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types'
        },
        body: JSON.stringify({
          maxResultCount: 10,
          locationRestriction: {
            circle: {
              center: {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
              },
              radius: 500.0
            }
          }
        })
      });
      
      const data = await res.json();
      
      if (data.places && data.places.length > 0) {
        setLikelyPlaces(data.places);
        setShowPlacesModal(true);
      } else {
        console.warn('[PLACES]', data);
        alert('Aucun lieu trouvé à proximité avec la nouvelle API.');
      }
    } catch (e) {
      console.warn('[PLACES_ERROR]', e.message);
    }
    setLoading(false);
  };

  const selectLikelyPlace = (place) => {
    haptic.success();
    setShowPlacesModal(false);
    const newMarker = {
      id: place.id,
      title: place.displayName?.text || 'Lieu sans nom',
      address: place.formattedAddress,
      coordinate: {
        latitude: place.location.latitude,
        longitude: place.location.longitude,
      }
    };
    setPlacedMarkers(prev => [...prev, newMarker]);
    
    mapRef.current?.animateToRegion({
      ...newMarker.coordinate,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 600);
  };

  const filteredProviders = providers.filter(p => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    const nameMatch     = (p.name || '').toLowerCase().includes(q);
    const communeMatch  = (p.commune || '').toLowerCase().includes(q);
    const categoryMatch = (p.category || '').toLowerCase().includes(q);
    return nameMatch || communeMatch || categoryMatch;
  });

  const getCatColor = (cat) => colors[cat] || colors.gold;
  const getCatEmoji = (cat) => CATEGORIES.find(c => c.id === cat)?.emoji || '📍';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* MAP */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={MOROCCO_REGION}
        customMapStyle={darkMapStyle}
        showsUserLocation
        showsMyLocationButton={false}
        onMapReady={() => setMapReady(true)}
        onPress={() => selectedProvider && dismissCard()}
      >
        {filteredProviders
          .filter(p => p.location?.latitude && p.location?.longitude)
          .map(p => {
            const catColor = getCatColor(p.category);
            const isSelected = selectedProvider?.id === p.id;
            return (
              <Marker
                key={p.id}
                coordinate={{ 
                   latitude: parseFloat(p.location.latitude), 
                   longitude: parseFloat(p.location.longitude) 
                }}
                onPress={() => selectProvider(p)}
              >
                <View style={[
                  styles.pin,
                  { backgroundColor: catColor, borderColor: isSelected ? '#fff' : catColor },
                  isSelected && styles.pinSelected,
                ]}>
                  <Text style={styles.pinEmoji}>{getCatEmoji(p.category)}</Text>
                </View>
              </Marker>
            );
          })}

        {/* CUSTOM PLACES MARKERS */}
        {placedMarkers.map(m => (
          <Marker
            key={m.id}
            coordinate={m.coordinate}
            pinColor={colors.accent}
            title={m.title}
            description={m.address}
          />
        ))}
      </MapView>

      {/* SEARCH BAR */}
      <View style={styles.searchWrap}>
        <BlurView tint="dark" intensity={90} style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher lieu, activité, prestataire..."
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </BlurView>

        <FlatList
          data={[{ id: null, emoji: '🌐', labelFr: 'Tous', color: colors.gold }, ...CATEGORIES]}
          horizontal
          keyExtractor={(_, i) => `cat-${i}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, paddingBottom: 4 }}
          renderItem={({ item }) => {
            const active = activeCategory === item.id;
            return (
              <TouchableOpacity
                style={[styles.filterPill, { borderColor: (item.color || colors.gold) + '55' }, active && { backgroundColor: item.color || colors.gold }]}
                onPress={() => filterByCategory(item.id)}
              >
                <Text style={styles.filterEmoji}>{item.emoji}</Text>
                <Text style={[styles.filterText, active && { color: colors.bg }]}>{item.labelFr}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* COUNT BADGE */}
      <View style={styles.countBadge}>
        <BlurView tint="dark" intensity={80} style={styles.countBlur}>
          {loading ? (
            <Text style={styles.countText}>Chargement...</Text>
          ) : (
            <Text style={styles.countText}>
              {filteredProviders.length} prestataire{filteredProviders.length !== 1 ? 's' : ''}
              {activeCategory ? ` · ${CATEGORIES.find(c => c.id === activeCategory)?.labelFr}` : ''}
            </Text>
          )}
        </BlurView>
      </View>

      {/* LIST TOGGLE */}
      <TouchableOpacity
        style={styles.listToggle}
        onPress={() => { haptic.light(); setShowList(v => !v); }}
      >
        <BlurView tint="dark" intensity={90} style={styles.listToggleBlur}>
          <Ionicons name={showList ? 'map-outline' : 'list-outline'} size={20} color={colors.gold} />
        </BlurView>
      </TouchableOpacity>

      {/* MY LOCATION */}
      {location && (
        <TouchableOpacity
          style={styles.myLocBtn}
          onPress={() => {
            haptic.light();
            mapRef.current?.animateToRegion({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.1, longitudeDelta: 0.1,
            }, 800);
          }}
        >
          <BlurView tint="dark" intensity={90} style={styles.myLocBlur}>
            <Ionicons name="locate" size={20} color={colors.accent} />
          </BlurView>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.myLocBtn, { bottom: 270 }]}
        onPress={findCurrentPlaces}
      >
        <BlurView tint="dark" intensity={90} style={styles.myLocBlur}>
          <Ionicons name="search-circle" size={24} color={colors.gold} />
        </BlurView>
      </TouchableOpacity>

      {/* SELECTED PROVIDER CARD */}
      {selectedProvider && (
        <Animated.View style={[styles.selectedCard, { transform: [{ translateY: cardAnim }] }]}>
          <BlurView tint="dark" intensity={95} style={styles.selectedBlur}>
            <TouchableOpacity onPress={dismissCard} style={styles.dismissBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <ProviderCard
              provider={selectedProvider}
              horizontal={false}
              showDistance
              onPress={() => {
                dismissCard();
                navigation.navigate('ProviderDetail', { provider: selectedProvider });
              }}
            />
          </BlurView>
        </Animated.View>
      )}

      {/* LIST OVERLAY */}
      {showList && (
        <View style={styles.listOverlay}>
          <BlurView tint="dark" intensity={95} style={styles.listBlur}>
            <View style={styles.listHandle} />
            <Text style={styles.listTitle}>
              Prestataires ({filteredProviders.length})
              {activeCategory ? ` — ${CATEGORIES.find(c => c.id === activeCategory)?.labelFr}` : ''}
            </Text>
            <FlatList
              data={filteredProviders}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <ProviderCard
                  provider={item}
                  horizontal={false}
                  showDistance
                  onPress={() => { setShowList(false); selectProvider(item); }}
                />
              )}
              contentContainerStyle={{ paddingBottom: spacing.xxl }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl }}>
                  {loading ? 'Chargement...' : 'Aucun résultat'}
                </Text>
              }
            />
          </BlurView>
        </View>
      )}

      {/* LIKELY PLACES MODAL */}
      {showPlacesModal && (
        <View style={styles.listOverlay}>
          <BlurView tint="dark" intensity={98} style={styles.listBlur}>
            <TouchableOpacity onPress={() => setShowPlacesModal(false)} style={styles.dismissBtn}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.listTitle}>Lieux à proximité</Text>
            <FlatList
              data={likelyPlaces}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.placeItem} 
                  onPress={() => selectLikelyPlace(item)}
                >
                  <Ionicons name="location-outline" size={20} color={colors.gold} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.placeName}>{item.displayName?.text}</Text>
                    <Text style={styles.placeAddress}>{item.formattedAddress}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </BlurView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    position: 'absolute', top: 55, left: spacing.md, right: spacing.md,
    gap: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, height: 50,
    borderRadius: radius.full, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary },

  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: radius.full, backgroundColor: 'rgba(14,14,28,0.85)',
    borderWidth: 1,
  },
  filterEmoji: { fontSize: 13 },
  filterText: { ...typography.captionBold, color: colors.textSecondary },

  pin: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 6,
  },
  pinSelected: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
  pinEmoji: { fontSize: 16 },

  countBadge: {
    position: 'absolute', bottom: 210, alignSelf: 'center',
    borderRadius: radius.full, overflow: 'hidden',
  },
  countBlur: { paddingVertical: 6, paddingHorizontal: 14 },
  countText: { ...typography.captionBold, color: colors.gold },

  listToggle: {
    position: 'absolute', bottom: 145, right: spacing.lg,
    borderRadius: radius.full, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.goldBorder,
  },
  listToggleBlur: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },

  myLocBtn: {
    position: 'absolute', bottom: 205, right: spacing.lg,
    borderRadius: radius.full, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(29,214,195,0.3)',
  },
  myLocBlur: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },

  selectedCard: {
    position: 'absolute', bottom: 110, left: spacing.md, right: spacing.md,
    borderRadius: radius.xl, overflow: 'hidden',
  },
  selectedBlur: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.goldBorder },
  dismissBtn: { padding: spacing.md, alignSelf: 'flex-end' },

  listOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: height * 0.65,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  listBlur: {
    flex: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderTopWidth: 1, borderColor: colors.goldBorder,
    paddingTop: spacing.md, paddingHorizontal: spacing.md,
  },
  listHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.textMuted, alignSelf: 'center', marginBottom: spacing.md,
  },
  listTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  placeItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  placeName: { ...typography.bodyBold, color: colors.textPrimary },
  placeAddress: { ...typography.caption, color: colors.textMuted },
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0e0e1c' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8888aa' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#06060e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#161628' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a30' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0a14' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#161628' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#0e0e1c' }] },
];
