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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const inTabs = segmentsRef.current[0] === '(tabs)';
      if (session && !inTabs) {
        router.replace('/(tabs)');
      } else if (!session && inTabs) {
        router.replace('/login');
      }
    });

    // On /auth/callback the page itself handles the redirect after
    // extracting the OAuth token from the URL hash. Calling getSession()
    // here would see no session yet and wrongly send the user to /login.
    if ((segments[0] as string) !== 'auth') {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) router.replace('/(tabs)');
        else router.replace('/login');
        setInitialized(true);
      });
    } else {
      setInitialized(true);
    }

    return () => subscription.unsubscribe();
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
