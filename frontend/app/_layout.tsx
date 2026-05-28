import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ThemeProvider } from '../context/ThemeContext';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const isCallback = (segments[0] as string) === 'auth';

    // Hard 3-second timeout — the spinner must never hang forever
    const timer = setTimeout(() => {
      setInitialized(prev => {
        if (!prev) router.replace('/login');
        return true;
      });
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION fires immediately on subscription using local storage —
      // no network call, so it's reliable even when Supabase is unreachable.
      if (event === 'INITIAL_SESSION') {
        clearTimeout(timer);
        if (isCallback) {
          // auth/callback page processes the OAuth token itself; don't redirect
          setInitialized(true);
        } else if (session) {
          router.replace('/(tabs)');
          setInitialized(true);
        } else {
          router.replace('/login');
          setInitialized(true);
        }
        return;
      }

      // Subsequent changes: login, logout, token refresh
      const inTabs = segmentsRef.current[0] === '(tabs)';
      if (session && !inTabs) router.replace('/(tabs)');
      else if (!session && inTabs) router.replace('/login');
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#7C5CFF" size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/callback" />
      </Stack>
    </ThemeProvider>
  );
}
