import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        // supabase.ts has detectSessionInUrl:true — it auto-extracts the
        // access_token from the URL hash. We listen for the resulting SIGNED_IN.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) router.replace('/(tabs)');
        });
        return () => subscription.unsubscribe();
    }, []);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#7C5CFF" />
            <Text style={styles.text}>Signing you in…</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0F',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    text: { color: '#A0A0B0', fontSize: 15 },
});
