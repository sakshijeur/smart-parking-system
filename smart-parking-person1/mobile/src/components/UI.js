import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme';

export function Button({ title, onPress, loading, variant = 'primary', style, disabled }) {
  const outline = variant === 'outline';
  const danger = variant === 'danger';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
      style={[
        s.btn,
        outline && { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
        danger && { backgroundColor: colors.danger },
        (loading || disabled) && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? colors.primary : '#fff'} />
      ) : (
        <Text style={[s.btnText, outline && { color: colors.primary }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

export function Input({ label, error, style, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[s.input, error && { borderColor: colors.danger }, style]}
        {...props}
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function Card({ children, onPress, style }) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap onPress={onPress} activeOpacity={0.85} style={[s.card, style]}>
      {children}
    </Wrap>
  );
}

export function Badge({ status }) {
  const map = {
    pending: [colors.warning, 'Pending'],
    approved: [colors.success, 'Approved'],
    rejected: [colors.danger, 'Rejected'],
  };
  const [c, t] = map[status] || [colors.muted, status];
  return (
    <View style={[s.badge, { backgroundColor: c + '22' }]}>
      <Text style={{ color: c, fontWeight: '700', fontSize: 12 }}>{t}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      <Text style={{ color: active ? '#fff' : colors.primary, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Empty({ text }) {
  return <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 40, paddingHorizontal: 24 }}>{text}</Text>;
}

export function ErrorBox({ text }) {
  return text ? (
    <View style={s.errBox}><Text style={{ color: colors.danger }}>{text}</Text></View>
  ) : null;
}

const s = StyleSheet.create({
  btn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  label: { color: colors.text, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text },
  error: { color: colors.danger, marginTop: 4, fontSize: 12 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary, marginRight: 8, marginBottom: 8 },
  errBox: { backgroundColor: '#FDECEC', padding: 12, borderRadius: 10, marginBottom: 12 },
});
