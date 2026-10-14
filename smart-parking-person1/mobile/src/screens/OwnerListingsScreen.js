import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, errMsg } from '../api';
import { Button, Card, Badge, Empty, ErrorBox } from '../components/UI';
import { colors } from '../theme';

export default function OwnerListingsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setError(''); const { data } = await api.get('/parking/mine'); setItems(data); }
    catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={<ErrorBox text={error} />}
        ListEmptyComponent={!error && <Empty text="You have not listed any parking yet. Add your first one." />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 }}>{item.name}</Text>
              <Badge status={item.status} />
            </View>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{item.address}</Text>
            <Text style={{ color: colors.text, marginTop: 8 }}>{item.total_slots} slots · ₹{item.price_per_hour}/hr</Text>
            {item.status === 'rejected' && item.reject_reason ? (
              <Text style={{ color: colors.danger, marginTop: 8 }}>Reason: {item.reject_reason}</Text>
            ) : null}
          </Card>
        )}
      />
      <View style={{ padding: 16 }}><Button title="+ Add parking" onPress={() => navigation.navigate('AddListing')} /></View>
    </View>
  );
}
