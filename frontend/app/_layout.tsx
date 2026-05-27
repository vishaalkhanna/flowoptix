import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ThemeProvider } from '../context/ThemeContext';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const inTabs = segments[0] === '(tabs)';
      if (session && !inTabs) {
        router.replace('/(tabs)');
      } else if (!session && inTabs) {
        router.replace('/login');
      }
    });
    return () => subscription.unsubscribe();
  }, [segments]);

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/callback" />
      </Stack>
    </ThemeProvider>
  );
}