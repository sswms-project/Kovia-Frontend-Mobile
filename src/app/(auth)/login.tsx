import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authApi } from '@/features/auth/auth.api';
import { useAuth } from '@/features/auth/auth.store';

export default function LoginScreen() {
  const applySignIn = useAuth((s) => s.applySignIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: async () => {
      const res = await authApi.login(email.trim(), password);
      if (res.requires2FA) throw new Error('Tài khoản bật 2FA, chưa hỗ trợ trên mobile');
      await applySignIn(res);
    },
  });

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>SSWMS</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {login.error && <Text style={styles.error}>{login.error.message}</Text>}
      <Pressable
        style={[styles.button, login.isPending && { opacity: 0.6 }]}
        disabled={login.isPending || !email || !password}
        onPress={() => login.mutate()}>
        {login.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Đăng nhập</Text>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#9994', borderRadius: 10, padding: 14, fontSize: 16 },
  error: { color: '#d33' },
  button: { backgroundColor: '#2563eb', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
