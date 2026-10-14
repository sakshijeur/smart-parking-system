import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, errMsg } from '../api';
import { Button, Card, Empty, ErrorBox } from '../components/UI';
import { colors } from '../theme';

export default function VehiclesScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const { data } = await api.get('/vehicles');
      setItems(data);
    } catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = (v) =>
    Alert.alert('Delete vehicle', `Remove ${v.plate_number}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try { await api.delete(`/vehicles/${v.id}`); load(); } catch (e) { Alert.alert('Error', errMsg(e)); }
      } },
    ]);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={<ErrorBox text={error} />}
        ListEmptyComponent={!error && <Empty text="No vehicles yet. Add your first vehicle." />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{item.plate_number}</Text>
              {item.is_default ? <Text style={{ color: colors.primary, fontWeight: '700' }}>Default</Text> : null}
            </View>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              {item.type.toUpperCase()}{item.make_model ? ` · ${item.make_model}` : ''}{item.color ? ` · ${item.color}` : ''}
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <Button title="Edit" variant="outline" style={{ flex: 1, marginRight: 8, paddingVertical: 10 }} onPress={() => navigation.navigate('VehicleForm', { vehicle: item })} />
              <Button title="Delete" variant="danger" style={{ flex: 1, paddingVertical: 10 }} onPress={() => remove(item)} />
            </View>
          </Card>
        )}
      />
      <View style={{ padding: 16 }}>
        <Button title="+ Add vehicle" onPress={() => navigation.navigate('VehicleForm')} />
      </View>
    </View>
  );
}
