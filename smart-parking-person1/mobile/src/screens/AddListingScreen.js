import React, { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import * as Location from 'expo-location';
import { api, errMsg } from '../api';
import { Button, Input, ErrorBox } from '../components/UI';
import { colors } from '../theme';

export default function AddListingScreen({ navigation }) {
  const [f, setF] = useState({ name: '', address: '', latitude: '', longitude: '', total_slots: '', price_per_hour: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  // Fill latitude/longitude from the phone's GPS
  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission needed', 'Allow location access to use this option.');
      const { coords } = await Location.getCurrentPositionAsync({});
      setF((x) => ({ ...x, latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) }));
    } catch (e) { Alert.alert('Error', errMsg(e)); }
    finally { setLocating(false); }
  };

  const submit = async () => {
    if (!f.name.trim() || !f.address.trim()) return setError('Name and address are required');
    if (!f.latitude || !f.longitude) return setError('Set the parking location');
    if (!(parseInt(f.total_slots, 10) > 0)) return setError('Enter total slots');
    if (f.price_per_hour === '' || isNaN(parseFloat(f.price_per_hour))) return setError('Enter price per hour');
    setError(''); setLoading(true);
    try {
      await api.post('/parking', f);
      Alert.alert('Submitted', 'Your listing was sent for admin approval.');
      navigation.goBack();
    } catch (e) { setError(errMsg(e)); setLoading(false); }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <ErrorBox text={error} />
      <Input label="Parking name" value={f.name} onChangeText={set('name')} placeholder="City Center Parking" />
      <Input label="Address" value={f.address} onChangeText={set('address')} placeholder="Street, area" multiline />
      <Button title="Use my current location" variant="outline" onPress={useMyLocation} loading={locating} style={{ marginBottom: 14 }} />
      <Input label="Latitude" value={f.latitude} onChangeText={set('latitude')} keyboardType="numbers-and-punctuation" />
      <Input label="Longitude" value={f.longitude} onChangeText={set('longitude')} keyboardType="numbers-and-punctuation" />
      <Input label="Total slots" value={f.total_slots} onChangeText={set('total_slots')} keyboardType="number-pad" />
      <Input label="Price per hour (₹)" value={f.price_per_hour} onChangeText={set('price_per_hour')} keyboardType="decimal-pad" />
      <Input label="Description (optional)" value={f.description} onChangeText={set('description')} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
      <Button title="Submit for approval" onPress={submit} loading={loading} />
    </ScrollView>
  );
}
