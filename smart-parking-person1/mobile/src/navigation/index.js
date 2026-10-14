import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import NearbyScreen from '../screens/NearbyScreen';
import ParkingDetailScreen from '../screens/ParkingDetailScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import VehicleFormScreen from '../screens/VehicleFormScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OwnerListingsScreen from '../screens/OwnerListingsScreen';
import AddListingScreen from '../screens/AddListingScreen';
import AdminPendingScreen from '../screens/AdminPendingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const header = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
};

// Builds a bottom-tab navigator from a list of {name,title,icon,component}
const makeTabs = (items) =>
  function Tabs() {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          ...header,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={items.find((i) => i.name === route.name).icon} size={size} color={color} />
          ),
        })}
      >
        {items.map((i) => (
          <Tab.Screen key={i.name} name={i.name} component={i.component} options={{ title: i.title }} />
        ))}
      </Tab.Navigator>
    );
  };

const DriverTabs = makeTabs([
  { name: 'Nearby', title: 'Nearby Parking', icon: 'location-outline', component: NearbyScreen },
  { name: 'Vehicles', title: 'My Vehicles', icon: 'car-outline', component: VehiclesScreen },
  { name: 'Profile', title: 'Profile', icon: 'person-outline', component: ProfileScreen },
]);
const OwnerTabs = makeTabs([
  { name: 'Listings', title: 'My Parking', icon: 'business-outline', component: OwnerListingsScreen },
  { name: 'Profile', title: 'Profile', icon: 'person-outline', component: ProfileScreen },
]);
const AdminTabs = makeTabs([
  { name: 'Pending', title: 'Pending Approvals', icon: 'shield-checkmark-outline', component: AdminPendingScreen },
  { name: 'Profile', title: 'Profile', icon: 'person-outline', component: ProfileScreen },
]);

export default function RootNavigator() {
  const { user, booting } = useAuth();

  if (booting)
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={header}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: '', headerTransparent: true, headerTintColor: colors.primary }} />
          </>
        ) : user.role === 'driver' ? (
          <>
            <Stack.Screen name="DriverTabs" component={DriverTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ParkingDetail" component={ParkingDetailScreen} options={{ title: 'Parking Details' }} />
            <Stack.Screen name="VehicleForm" component={VehicleFormScreen} options={{ title: 'Vehicle' }} />
          </>
        ) : user.role === 'owner' ? (
          <>
            <Stack.Screen name="OwnerTabs" component={OwnerTabs} options={{ headerShown: false }} />
            <Stack.Screen name="AddListing" component={AddListingScreen} options={{ title: 'Add Parking' }} />
          </>
        ) : (
          <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
