/**
 * App.js — HIWAYTI Root Navigator
 * Role-based navigation: Tourist | Artisan | Provider | Commune | Admin
 * Floating blur tab bar, animated tab icons, full screen hierarchy
 */
import React, { useRef, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet, Animated } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import './src/i18n';
import { colors, USER_ROLES } from './src/utils/theme';

// ── Screens ──────────────────────────────────────────────────────────────────
import LoginScreen             from './src/screens/LoginScreen';
import OnboardingScreen        from './src/screens/OnboardingScreen';
import HomeScreen              from './src/screens/HomeScreen';
import DiscoverScreen          from './src/screens/DiscoverScreen';
import MapDiscoverScreen       from './src/screens/MapDiscoverScreen';
import ShopScreen              from './src/screens/ShopScreen';
import ProductDetailScreen     from './src/screens/ProductDetailScreen';
import BookingScreen           from './src/screens/BookingScreen';
import ProfileScreen           from './src/screens/ProfileScreen';
import ProviderDetailScreen    from './src/screens/ProviderDetailScreen';
import ProviderDashboardScreen   from './src/screens/ProviderDashboardScreen';
import CommuneDashboardScreen    from './src/screens/CommuneDashboardScreen';
import NotificationsScreen       from './src/screens/NotificationsScreen';
import ProviderActivitiesScreen  from './src/screens/ProviderActivitiesScreen';
import EditProfileScreen         from './src/screens/EditProfileScreen';
import ActivityDetailScreen      from './src/screens/ActivityDetailScreen';
import FavoritesScreen           from './src/screens/FavoritesScreen';
import MyBookingsScreen          from './src/screens/MyBookingsScreen';

// ── Navigators ────────────────────────────────────────────────────────────────
const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Dark Nav Theme ────────────────────────────────────────────────────────────
const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card:        colors.bgCard,
    text:        colors.textPrimary,
    border:      'transparent',
    primary:     colors.gold,
  },
};

// ── Animated Tab Icon ─────────────────────────────────────────────────────────
function TabIcon({ name, focused, color, size }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(scale, {
      toValue:     focused ? 1.25 : 1,
      friction:    5,
      useNativeDriver: true,
    }).start();
  }, [focused]);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons
        name={name}
        size={size}
        color={color}
        style={focused ? styles.iconGlow : null}
      />
    </Animated.View>
  );
}

// ── Tab icon map per role screen ──────────────────────────────────────────────
const TAB_ICONS = {
  Home:      ['home',        'home-outline'],
  Discover:  ['compass',     'compass-outline'],
  MapTab:    ['map',         'map-outline'],
  Shop:      ['bag',         'bag-outline'],
  Booking:   ['calendar',    'calendar-outline'],
  Profile:   ['person',      'person-outline'],
  Dashboard: ['grid',        'grid-outline'],
  Commune:   ['business',    'business-outline'],
};

function getIcon(route, focused) {
  const [on, off] = TAB_ICONS[route.name] || ['ellipse', 'ellipse-outline'];
  return focused ? on : off;
}

// ── HOME STACK ────────────────────────────────────────────────────────────────
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain"        component={HomeScreen} />
    </Stack.Navigator>
  );
}

// ── DISCOVER STACK ────────────────────────────────────────────────────────────
function DiscoverStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DiscoverMain"   component={DiscoverScreen} />
    </Stack.Navigator>
  );
}

// ── SHOP STACK ────────────────────────────────────────────────────────────────
function ShopStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ShopMain" component={ShopScreen} />
    </Stack.Navigator>
  );
}

// ── BOOKING STACK ─────────────────────────────────────────────────────────────
function BookingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BookingMain"    component={BookingScreen} />
      <Stack.Screen name="MyBookings"     component={MyBookingsScreen} />
    </Stack.Navigator>
  );
}

// ── PROFILE STACK ─────────────────────────────────────────────────────────────
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain"           component={ProfileScreen} />
      <Stack.Screen name="ProviderDashboard"     component={ProviderDashboardScreen} />
      <Stack.Screen name="ProviderActivities"    component={ProviderActivitiesScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="CommuneDashboard"      component={CommuneDashboardScreen} />
      <Stack.Screen name="Favorites"             component={FavoritesScreen} />
    </Stack.Navigator>
  );
}

// ── SHARED SCREENS (Accessible from any tab) ──────────────────────────────────
// We put these here so MapTab, ShopTab, etc. can all reach them.
function AuthenticatedStack({ userRole }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs">
        {props => <MainTabs {...props} userRole={userRole} />}
      </Stack.Screen>
      <Stack.Screen 
        name="ProviderDetail" 
        component={ProviderDetailScreen} 
        options={{ presentation: 'card', animation: 'slide_from_right' }} 
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen} 
        options={{ presentation: 'card' }} 
      />
      <Stack.Screen 
        name="ActivityDetail" 
        component={ActivityDetailScreen} 
        options={{ presentation: 'card', animation: 'slide_from_right' }} 
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen} 
        options={{ presentation: 'modal' }} 
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ presentation: 'modal' }} 
      />
    </Stack.Navigator>
  );
}

// ── PROVIDER STACK (for Tab) ──────────────────────────────────────────────────
function ProviderStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain"      component={ProviderDashboardScreen} />
      <Stack.Screen name="ProviderActivities" component={ProviderActivitiesScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

// ── COMMUNE STACK (for Tab) ───────────────────────────────────────────────────
function CommuneStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CommuneMain"     component={CommuneDashboardScreen} />
    </Stack.Navigator>
  );
}

// ── MAIN TABS ─────────────────────────────────────────────────────────────────
function MainTabs({ userRole }) {
  const isDashboardRole = [USER_ROLES.ARTISAN, USER_ROLES.PROVIDER].includes(userRole);
  const isCommuneRole   = [USER_ROLES.COMMUNE, USER_ROLES.ADMIN].includes(userRole);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   colors.gold,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarStyle:             styles.floatingTabBar,
        tabBarShowLabel:         false,
        tabBarBackground: () => (
          <BlurView tint="dark" intensity={90} style={StyleSheet.absoluteFillObject} />
        ),
        tabBarIcon: ({ focused, color, size }) => (
          <TabIcon
            name={getIcon(route, focused)}
            focused={focused}
            color={color}
            size={26}
          />
        ),
      })}
    >
      <Tab.Screen name="Home"     component={HomeStack} />
      <Tab.Screen name="Discover" component={DiscoverStack} />
      <Tab.Screen name="MapTab"   component={MapDiscoverScreen} />
      <Tab.Screen name="Shop"     component={ShopStack} />
      <Tab.Screen name="Booking"  component={BookingStack} />
      <Tab.Screen name="Profile"  component={ProfileStack} />

      {/* Provider Dashboard tab — only for artisans & sports providers */}
      {isDashboardRole && (
        <Tab.Screen name="Dashboard" component={ProviderStack} />
      )}

      {/* Commune Dashboard tab — only for commune partners */}
      {isCommuneRole && (
        <Tab.Screen name="Commune" component={CommuneStack} />
      )}
    </Tab.Navigator>
  );
}

// ── ROOT NAVIGATOR ────────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, userRole, loading, hasSeenOnboarding, completeOnboarding } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      {!user ? (
        // Unauthenticated
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      ) : !hasSeenOnboarding ? (
        // First-time onboarding
        <OnboardingScreen onFinish={completeOnboarding} />
      ) : (
        // Authenticated — global stack + role-based tabs
        <AuthenticatedStack userRole={userRole} />
      )}
    </NavigationContainer>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" translucent />
        <RootNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingTabBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    elevation: 0,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    overflow: 'hidden',
  },
  iconGlow: {
    textShadowColor: colors.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
});
