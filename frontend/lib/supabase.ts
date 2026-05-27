import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cdhichktpjedtjbbqhsf.supabase.co';
const supabaseAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaGljaGt0cGplZHRqYmJxaHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTc2MDgsImV4cCI6MjA5MzA5MzYwOH0.uWsjsZPU8XD1trpfY75qmRksukOhQsLSSAq9GawrHWw';

// Web uses localStorage with SSR guard; native uses AsyncStorage
const webStorage = {
    getItem: (key: string) => {
        if (typeof window === 'undefined') return Promise.resolve(null);
        return Promise.resolve(window.localStorage.getItem(key));
    },
    setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
        return Promise.resolve();
    },
    removeItem: (key: string) => {
        if (typeof window !== 'undefined') window.localStorage.removeItem(key);
        return Promise.resolve();
    },
};

const storage =
    Platform.OS === 'web'
        ? webStorage
        : require('@react-native-async-storage/async-storage').default;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        // Must be true on web so the magic-link token in the URL hash is picked up
        detectSessionInUrl: Platform.OS === 'web',
    },
});
