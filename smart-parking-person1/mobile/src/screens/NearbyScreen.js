import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import * as Location from 'expo-location';
import { api, errMsg } from '../api';
import { Card, Chip, Empty, ErrorBox, Button } from '../components/UI';
import { colors } from '../theme';

const RADII = [2, 5, 10, 25];

export default function NearbyScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [radius, setRadius] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Ask for GPS permission, read location, then fetch approved lots near it
  const load = useCallback(async () => {
    setError(''); setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setItems([]);
        setError('Location permission is off. Allow it in phone settings to find parking near you.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      const { data } = await api.get('/parking/nearby', { params: { lat: latitude, lng: longitude, radius_km: radius } });
      setItems(data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [radius]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 16, paddingBottom: 4, alignItems: 'center' }}>
        <Text style={{ color: colors.muted, marginRight: 10, marginBottom: 8 }}>Within</Text>
        {RADII.map((r) => <Chip key={r} label={`${r} km`} active={radius === r} onPress={() => setRadius(r)} />)}
      </View>
      {loading && !items.length ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
          ListHeaderComponent={<ErrorBox text={error} />}
          ListEmptyComponent={!error && <Empty text="No parking found in this range. Try a bigger distance." />}
          renderItem={({ item }) => (
            <Card onPress={() => navigation.navigate('ParkingDetail', { id: item.id })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 }}>{item.name}</Text>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{item.distance_km.toFixed(1)} km</Text>
              </View>
              <Text style={{ color: colors.muted, marginTop: 4 }}>{item.address}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <Text style={{ color: colors.text }}>₹{item.price_per_hour}/hr</Text>
                <Text style={{ color: colors.muted }}>{item.total_slots} slots</Text>
              </View>
            </Card>
          )}
        />
      )}
      {error && !loading ? <View style={{ padding: 16 }}><Button title="Try again" onPress={load} variant="outline" /></View> : null}
    </View>
  );
}
