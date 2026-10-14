import React from 'react';
import { View, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components/UI';
import { colors } from '../theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const Row = ({ k, v }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text style={{ color: colors.muted }}>{k}</Text>
      <Text style={{ color: colors.text, fontWeight: '600' }}>{v}</Text>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <Card>
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 30, fontWeight: '800', color: colors.primary }}>{user.name[0].toUpperCase()}</Text>
          </View>
        </View>
        <Row k="Name" v={user.name} />
        <Row k="Email" v={user.email} />
        {user.phone ? <Row k="Phone" v={user.phone} /> : null}
        <Row k="Role" v={user.role.toUpperCase()} />
      </Card>
      <Button title="Logout" variant="danger" onPress={logout} />
    </View>
  );
}
