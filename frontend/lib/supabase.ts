import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://cdhichktpjedtjbbqhsf.supabase.co';
const supabaseAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaGljaGt0cGplZHRqYmJxaHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTc2MDgsImV4cCI6MjA5MzA5MzYwOH0.uWsjsZPU8XD1trpfY75qmRksukOhQsLSSAq9GawrHWw';

// During Expo's static web prerender (Node.js), window is not defined and
// AsyncStorage would throw. Provide a no-op stub so the module imports cleanly.
// Native builds (Android/iOS) always use AsyncStorage; only the web SSR pass
// gets the stub, so a successful signInWithPassword is never silently discarded.
const isWebPrerender = Platform.OS === 'web' && typeof window === 'undefined';
const storage = isWebPrerender
    ? {
          getItem:    async (_key: string) => null,
          setItem:    async (_key: string, _value: string) => {},
          removeItem: async (_key: string) => {},
      }
    : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        // Must be true on web so the magic-link token in the URL hash is picked up
        detectSessionInUrl: Platform.OS === 'web',
    },
});
