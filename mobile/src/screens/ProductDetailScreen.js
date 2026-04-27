import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../utils/theme';
import AppButton from '../components/ui/AppButton';

export default function ProductDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { product } = route.params;

  const handleBuy = () => {
    Alert.alert('Achat en cours', 'Redirection vers la passerelle de paiement Stripe...');
  };

  return (
    <View style={styles.container}>
      {/* Header Image */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: product.imageUrl }} style={styles.image} />
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 220 }}>
        {/* Title & Price */}
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.price}>{product.price} DHS</Text>
        </View>

        {/* Artisan Info */}
        <View style={styles.artisanRow}>
          <Ionicons name="color-palette-outline" size={20} color={colors.gold} />
          <Text style={styles.artisanName}>Créé par {product.artisanName}</Text>
        </View>

        {/* Rating & Sales */}
        <View style={styles.statsRow}>
          <Ionicons name="star" size={16} color={colors.gold} />
          <Text style={styles.statsText}>{product.rating} ({product.reviewCount} avis)</Text>
          <Text style={styles.statsDot}> • </Text>
          <Text style={styles.statsText}>{product.soldCount} vendus</Text>
        </View>

        <View style={styles.divider} />

        {/* Description */}
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{product.description}</Text>
      </ScrollView>

      {/* Floating Buy Button */}
      <View style={styles.footer}>
        <AppButton title="Acheter Maintenant" onPress={handleBuy} variant="marrakech" style={{ width: '100%' }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  imageContainer: {
    width: '100%',
    height: 350,
    backgroundColor: colors.bgCard,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginRight: 10,
  },
  price: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.gold,
  },
  artisanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  artisanName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  statsDot: {
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: 5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 105,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(6, 6, 14, 0.95)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
});
