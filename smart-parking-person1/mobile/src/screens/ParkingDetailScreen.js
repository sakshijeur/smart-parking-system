import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { api, errMsg } from '../api';
import { Button, Card, ErrorBox } from '../components/UI';
import { colors } from '../theme';

export default function ParkingDetailScreen({ route }) {
  const [lot, setLot] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/parking/${route.params.id}`).then((r) => setLot(r.data)).catch((e) => setError(errMsg(e)));
  }, [route.params.id]);

  if (error) return <View style={{ padding: 16 }}><ErrorBox text={error} /></View>;
  if (!lot) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  const Row = ({ k, v }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text style={{ color: colors.muted }}>{k}</Text>
      <Text style={{ color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{v}</Text>
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>{lot.name}</Text>
      <Text style={{ color: colors.muted, marginTop: 4, marginBottom: 16 }}>{lot.address}</Text>
      <Card>
        <Row k="Price" v={`₹${lot.price_per_hour} / hour`} />
        <Row k="Total slots" v={lot.total_slots} />
        <Row k="Owner" v={lot.owner_name} />
        {lot.owner_phone ? <Row k="Contact" v={lot.owner_phone} /> : null}
      </Card>
      {lot.description ? <Card><Text style={{ color: colors.text }}>{lot.description}</Text></Card> : null}
      <Button
        title="Open in Maps"
        onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lot.latitude},${lot.longitude}`)}
      />
    </ScrollView>
  );
}
