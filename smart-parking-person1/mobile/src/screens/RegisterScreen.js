import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button, Input, ErrorBox, Chip } from '../components/UI';
import { errMsg } from '../api';
import { colors } from '../theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'driver' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) return setError('Fill name, email and password');
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('Enter a valid email');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setError(''); setLoading(true);
    try { await register({ ...form, email: form.email.trim(), name: form.name.trim() }); }
    catch (e) { setError(errMsg(e)); setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 6 }}>Create account</Text>
        <Text style={{ color: colors.muted, marginBottom: 20 }}>I want to join as</Text>
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <Chip label="Driver" active={form.role === 'driver'} onPress={() => set('role')('driver')} />
          <Chip label="Parking Owner" active={form.role === 'owner'} onPress={() => set('role')('owner')} />
        </View>
        <ErrorBox text={error} />
        <Input label="Full name" value={form.name} onChangeText={set('name')} placeholder="Your name" />
        <Input label="Email" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
        <Input label="Phone (optional)" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="10-digit number" />
        <Input label="Password" value={form.password} onChangeText={set('password')} secureTextEntry placeholder="At least 6 characters" />
        <Button title="Sign up" onPress={submit} loading={loading} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 18, alignItems: 'center' }}>
          <Text style={{ color: colors.muted }}>Already have an account? <Text style={{ color: colors.primary, fontWeight: '700' }}>Login</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
