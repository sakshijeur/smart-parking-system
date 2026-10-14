import React, { useState } from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { api, errMsg } from '../api';
import { Button, Input, Chip, ErrorBox } from '../components/UI';
import { colors } from '../theme';

const TYPES = ['car', 'bike', 'suv', 'ev'];

export default function VehicleFormScreen({ route, navigation }) {
  const v = route.params?.vehicle;
  const [plate, setPlate] = useState(v?.plate_number || '');
  const [type, setType] = useState(v?.type || 'car');
  const [model, setModel] = useState(v?.make_model || '');
  const [color, setColor] = useState(v?.color || '');
  const [isDefault, setIsDefault] = useState(!!v?.is_default);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (plate.replace(/[\s-]/g, '').length < 4) return setError('Enter a valid plate number');
    setError(''); setLoading(true);
    const body = { plate_number: plate, type, make_model: model, color, is_default: isDefault };
    try {
      if (v) await api.put(`/vehicles/${v.id}`, body); else await api.post('/vehicles', body);
      navigation.goBack();
    } catch (e) { setError(errMsg(e)); setLoading(false); }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <ErrorBox text={error} />
      <Input label="Plate number" value={plate} onChangeText={setPlate} autoCapitalize="characters" placeholder="MH12AB1234" />
      <Text style={{ fontWeight: '600', color: colors.text, marginBottom: 8 }}>Type</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
        {TYPES.map((t) => <Chip key={t} label={t.toUpperCase()} active={type === t} onPress={() => setType(t)} />)}
      </View>
      <Input label="Make / model (optional)" value={model} onChangeText={setModel} placeholder="Honda City" />
      <Input label="Color (optional)" value={color} onChangeText={setColor} placeholder="White" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontWeight: '600', color: colors.text }}>Make this my default vehicle</Text>
        <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ true: colors.primary }} />
      </View>
      <Button title={v ? 'Save changes' : 'Add vehicle'} onPress={save} loading={loading} />
    </ScrollView>
  );
}
