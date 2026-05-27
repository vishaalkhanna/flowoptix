import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';

type Step = 'landing' | 'email' | 'otp';

export default function LoginScreen() {
    const [step, setStep] = useState<Step>('landing');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const sendOtp = async () => {
        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }
        setLoading(true);
        setError('');
        const { error: err } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
                emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081',
            },
        });
        setLoading(false);
        if (err) {
            setError(err.message);
        } else {
            setStep('otp');
        }
    };

    const resendOtp = async () => {
        setError('');
        await sendOtp();
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.glow} />

            <View style={styles.logoBox}>
                <Text style={styles.logoIcon}>◎</Text>
            </View>

            <Text style={styles.title}>FlowOptix</Text>
            <Text style={styles.tagline}>Workflow Intelligence System</Text>

            {step === 'landing' && (
                <>
                    <Text style={styles.desc}>
                        Observe your workflow. Detect patterns.{'\n'}
                        Get AI-powered automation suggestions.
                    </Text>

                    <TouchableOpacity style={styles.googleBtn} onPress={() => {}}>
                        <Text style={styles.googleG}>G</Text>
                        <Text style={styles.googleText}>Continue with Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.emailBtn}
                        onPress={() => { setError(''); setStep('email'); }}
                    >
                        <Text style={styles.emailText}>Sign in with email</Text>
                    </TouchableOpacity>

                    <Text style={styles.terms}>
                        By continuing, you agree to our{' '}
                        <Text style={styles.link}>Terms</Text> &{' '}
                        <Text style={styles.link}>Privacy Policy</Text>
                    </Text>
                </>
            )}

            {step === 'email' && (
                <View style={styles.formBox}>
                    <Text style={styles.formTitle}>Enter your email</Text>
                    <Text style={styles.formDesc}>
                        We'll send a one-time code to verify your identity.
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="you@example.com"
                        placeholderTextColor="#4A4A5A"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={email}
                        onChangeText={(t: string) => { setEmail(t); setError(''); }}
                        editable={!loading}
                    />

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                        style={[styles.primaryBtn, loading && styles.btnDisabled]}
                        onPress={sendOtp}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.primaryBtnText}>Send OTP</Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => { setError(''); setStep('landing'); }}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                </View>
            )}

            {step === 'otp' && (
                <View style={styles.formBox}>
                    <Text style={styles.formTitle}>Check your inbox</Text>
                    <Text style={styles.formDesc}>
                        We sent a sign-in link to{'\n'}
                        <Text style={styles.emailHighlight}>{email}</Text>
                    </Text>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            Open the email and tap <Text style={styles.infoHighlight}>"Confirm your mail"</Text> — you'll be signed in automatically.
                        </Text>
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                        style={[styles.primaryBtn, loading && styles.btnDisabled]}
                        onPress={resendOtp}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.primaryBtnText}>Resend link</Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => { setError(''); setStep('email'); }}>
                        <Text style={[styles.backText, { marginTop: 8 }]}>← Change email</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Text style={styles.footer}>v1.0.0 · Built with AI</Text>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0F',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
    },
    glow: {
        position: 'absolute',
        top: '20%',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(124, 92, 255, 0.15)',
    },
    logoBox: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: '#7C5CFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    logoIcon: {
        fontSize: 40,
        color: 'white',
        fontWeight: 'bold',
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#F5F5F7',
        letterSpacing: -1,
        marginBottom: 6,
    },
    tagline: {
        fontSize: 14,
        color: '#6A6A7A',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 24,
    },
    desc: {
        fontSize: 15,
        color: '#A0A0B0',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40,
    },
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        marginBottom: 12,
        gap: 12,
    },
    googleG: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#4285F4',
    },
    googleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    emailBtn: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#2A2A38',
        backgroundColor: '#14141C',
        alignItems: 'center',
        marginBottom: 24,
    },
    emailText: {
        fontSize: 15,
        color: '#F5F5F7',
        fontWeight: '500',
    },
    terms: {
        fontSize: 12,
        color: '#6A6A7A',
        textAlign: 'center',
        lineHeight: 18,
    },
    link: {
        color: '#7C5CFF',
        textDecorationLine: 'underline',
    },
    formBox: {
        width: '100%',
        alignItems: 'center',
    },
    formTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#F5F5F7',
        marginBottom: 8,
    },
    formDesc: {
        fontSize: 14,
        color: '#A0A0B0',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    emailHighlight: {
        color: '#7C5CFF',
        fontWeight: '600',
    },
    input: {
        width: '100%',
        backgroundColor: '#14141C',
        borderWidth: 1,
        borderColor: '#2A2A38',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 18,
        color: '#F5F5F7',
        fontSize: 16,
        marginBottom: 12,
    },
    otpInput: {
        letterSpacing: 8,
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
    },
    errorText: {
        color: '#FF6B6B',
        fontSize: 13,
        marginBottom: 12,
        textAlign: 'center',
    },
    primaryBtn: {
        width: '100%',
        backgroundColor: '#7C5CFF',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 16,
    },
    btnDisabled: {
        opacity: 0.6,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    backText: {
        color: '#7C5CFF',
        fontSize: 14,
        fontWeight: '500',
    },
    infoBox: {
        width: '100%',
        backgroundColor: '#14141C',
        borderWidth: 1,
        borderColor: '#2A2A38',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    infoText: {
        color: '#A0A0B0',
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    infoHighlight: {
        color: '#7C5CFF',
        fontWeight: '600',
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        fontSize: 11,
        color: '#3A3A4A',
        letterSpacing: 1,
    },
});
