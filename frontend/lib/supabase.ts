import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://cdhichktpjedtjbbqhsf.supabase.co';
const supabaseAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaGljaGt0cGplZHRqYmJxaHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTc2MDgsImV4cCI6MjA5MzA5MzYwOH0.uWsjsZPU8XD1trpfY75qmRksukOhQsLSSAq9GawrHWw';

// During expo's static prerender (Node), window is not defined and AsyncStorage
// would throw. Provide a no-op stub so the module imports cleanly; the real
// browser / native environment still uses AsyncStorage normally.
const isServer = typeof window === 'undefined';
const storage = isServer
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
