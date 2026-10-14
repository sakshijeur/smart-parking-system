import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button, Input, ErrorBox } from '../components/UI';
import { errMsg } from '../api';
import { colors } from '../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim() || !password) return setError('Enter email and password');
    setError(''); setLoading(true);
    try { await login(email.trim(), password); }
    catch (e) { setError(errMsg(e)); setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.primary }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
        <View style={{ padding: 28, paddingTop: 80 }}>
          <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800' }}>Smart Parking</Text>
          <Text style={{ color: '#E4DCF7', marginTop: 6, fontSize: 16 }}>Find. Park. Go.</Text>
        </View>
        <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, marginTop: 24 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 18 }}>Welcome back</Text>
          <ErrorBox text={error} />
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" />
          <Button title="Login" onPress={submit} loading={loading} />
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: 18, alignItems: 'center' }}>
            <Text style={{ color: colors.muted }}>New here? <Text style={{ color: colors.primary, fontWeight: '700' }}>Create account</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
