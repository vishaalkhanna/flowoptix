import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ThemeProvider } from '../context/ThemeContext';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Check session in background — default is login screen (from index.tsx)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/(tabs)');
    });

    // Keep watching for login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/(tabs)');
      else router.replace('/login');
    });

    return () => subscription.unsubscribe();
  }, []);

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
