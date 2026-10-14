import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, errMsg } from '../api';
import { Button, Card, Input, Empty, ErrorBox } from '../components/UI';
import { colors } from '../theme';

export default function AdminPendingScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectId, setRejectId] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try { setError(''); const { data } = await api.get('/parking/admin/pending'); setItems(data); }
    catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const approve = async (id) => {
    try { await api.patch(`/parking/admin/${id}/approve`); load(); } catch (e) { Alert.alert('Error', errMsg(e)); }
  };
  const reject = async (id) => {
    if (!reason.trim()) return Alert.alert('Reason needed', 'Write why this listing is rejected.');
    try {
      await api.patch(`/parking/admin/${id}/reject`, { reason });
      setRejectId(null); setReason(''); load();
    } catch (e) { Alert.alert('Error', errMsg(e)); }
  };

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={items}
      keyExtractor={(i) => String(i.id)}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={<ErrorBox text={error} />}
      ListEmptyComponent={!error && <Empty text="No listings waiting for approval." />}
      renderItem={({ item }) => (
        <Card>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{item.name}</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>{item.address}</Text>
          <Text style={{ color: colors.text, marginTop: 8 }}>{item.total_slots} slots · ₹{item.price_per_hour}/hr</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>
            Owner: {item.owner_name}{item.owner_phone ? ` (${item.owner_phone})` : ''}
          </Text>
          {item.description ? <Text style={{ color: colors.text, marginTop: 6 }}>{item.description}</Text> : null}

          {rejectId === item.id ? (
            <View style={{ marginTop: 12 }}>
              <Input label="Reason for rejection" value={reason} onChangeText={setReason} placeholder="e.g. Address could not be verified" />
              <View style={{ flexDirection: 'row' }}>
                <Button title="Cancel" variant="outline" style={{ flex: 1, marginRight: 8, paddingVertical: 10 }} onPress={() => { setRejectId(null); setReason(''); }} />
                <Button title="Confirm reject" variant="danger" style={{ flex: 1, paddingVertical: 10 }} onPress={() => reject(item.id)} />
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <Button title="Reject" variant="danger" style={{ flex: 1, marginRight: 8, paddingVertical: 10 }} onPress={() => { setRejectId(item.id); setReason(''); }} />
              <Button title="Approve" style={{ flex: 1, paddingVertical: 10, backgroundColor: colors.success }} onPress={() => approve(item.id)} />
            </View>
          )}
        </Card>
      )}
    />
  );
}
