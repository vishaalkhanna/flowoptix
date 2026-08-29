import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ThemeProvider } from '../context/ThemeContext';

export default function RootLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let done = false;
    let initialDone = false;

    const finish = (hasSession: boolean) => {
      if (done) return;
      done = true;
      initialDone = true;
      setChecking(false);
      if (hasSession) router.replace('/(tabs)');
      else router.replace('/login');
    };

    const timeout = setTimeout(() => finish(false), 2000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeout);
        finish(!!session);
      })
      .catch(() => {
        clearTimeout(timeout);
        finish(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!initialDone) return;
      if (event === 'SIGNED_IN' && session) router.replace('/(tabs)');
      if (event === 'SIGNED_OUT') router.replace('/login');
    });

    return () => {
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy" />
      </Stack>
      {checking && (
        <View style={styles.overlay}>
          <ActivityIndicator color="#7C5CFF" size="large" />
        </View>
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
