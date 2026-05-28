import { useEffect, useRef, useState } from 'react';
import {
    View, Text, TextInput, StyleSheet, Animated, Easing,
    Platform, Pressable, KeyboardAvoidingView, ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'landing' | 'email' | 'otp';

// ─── Constants ────────────────────────────────────────────────────────────────
const SITE_URL     = process.env.EXPO_PUBLIC_SITE_URL || 'https://flowoptix-ten.vercel.app';
const CALLBACK_URL = `${SITE_URL}/auth/callback`;
const TAGLINE      = 'Your productivity intelligence';

// ─── Web-only CSS (injected once at module load) ───────────────────────────────
if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const el = document.createElement('style');
    el.textContent = `
        @keyframes meshMove {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        @keyframes shimmerSweep {
            0%   { background-position: -200% center; }
            100% { background-position:  200% center; }
        }
        @keyframes orbFloat1 {
            0%,100% { transform: translate(0px, 0px); }
            40%     { transform: translate(22px, -32px); }
            70%     { transform: translate(-16px, 14px); }
        }
        @keyframes orbFloat2 {
            0%,100% { transform: translate(0px, 0px); }
            35%     { transform: translate(-28px, 22px); }
            65%     { transform: translate(20px, -20px); }
        }
        @keyframes orbFloat3 {
            0%,100% { transform: translate(0px, 0px); }
            50%     { transform: translate(24px, -28px); }
        }
        @keyframes borderPulse {
            0%,100% { border-color: rgba(255,255,255,0.10); }
            50%     { border-color: rgba(124,92,255,0.35); }
        }
        .fo-bg {
            background-color: #0a0a0f;
            background-image: radial-gradient(ellipse 60% 50% at 15% 20%, rgba(108,43,217,0.30) 0%, transparent 70%),
                              radial-gradient(ellipse 55% 45% at 85% 80%, rgba(30,58,95,0.25) 0%, transparent 70%),
                              radial-gradient(ellipse 50% 40% at 50% 50%, rgba(13,79,79,0.18) 0%, transparent 70%);
        }
        .fo-shimmer {
            background: linear-gradient(
                90deg,
                #ffffff 0%, #a78bff 30%, #ffffff 50%, #a78bff 70%, #ffffff 100%
            );
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: shimmerSweep 4s linear infinite;
        }
        .fo-orb1 { animation: orbFloat1 10s ease-in-out infinite; }
        .fo-orb2 { animation: orbFloat2 13s ease-in-out infinite; }
        .fo-orb3 { animation: orbFloat3  8s ease-in-out infinite; }
        .fo-glass {
            background: rgba(255,255,255,0.055) !important;
            backdrop-filter: blur(28px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(28px) saturate(160%) !important;
        }
        .fo-card-hover {
            transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .fo-card-hover:hover {
            border-color: rgba(124,92,255,0.3) !important;
            box-shadow: 0 24px 64px rgba(108,43,217,0.25) !important;
        }
        .fo-google-btn {
            transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .fo-google-btn:hover {
            background: rgba(255,255,255,0.12) !important;
            border-color: rgba(255,255,255,0.28) !important;
            box-shadow: 0 0 20px rgba(124,92,255,0.18) !important;
        }
        .fo-magic-btn {
            transition: background 0.25s ease, border-color 0.25s ease;
        }
        .fo-magic-btn:hover {
            background: rgba(124,92,255,0.18) !important;
            border-color: rgba(124,92,255,0.5) !important;
        }
        .fo-submit-btn {
            transition: box-shadow 0.2s ease;
        }
        .fo-submit-btn:hover {
            box-shadow: 0 12px 40px rgba(124,92,255,0.55) !important;
        }
        .fo-input-native {
            background: transparent !important;
            color: #f5f5f7 !important;
            border: none !important;
            outline: none !important;
            width: 100%;
            font-size: 15px;
            padding: 0 !important;
        }
        .fo-input-native::placeholder { color: rgba(160,160,180,0.45) !important; }
        .fo-grid {
            background-image:
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
            background-size: 52px 52px;
        }
    `;
    document.head.appendChild(el);
}

// ─── Helper: spread className only on web ─────────────────────────────────────
const wc = (...classes: string[]) =>
    Platform.OS === 'web' ? ({ className: classes.join(' ') } as any) : {};

// ─── Component ────────────────────────────────────────────────────────────────
export default function LoginScreen() {
    const [step, setStep]             = useState<Step>('landing');
    const [email, setEmail]           = useState('');
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState('');
    const [typeText, setTypeText]     = useState('');
    const [emailFocused, setFocused]  = useState(false);

    // Animated values
    const logoOpacity   = useRef(new Animated.Value(0)).current;
    const logoY         = useRef(new Animated.Value(20)).current;
    const cardOpacity   = useRef(new Animated.Value(0)).current;
    const cardY         = useRef(new Animated.Value(56)).current;
    const fieldsOpacity = useRef(new Animated.Value(0)).current;
    const btnsOpacity   = useRef(new Animated.Value(0)).current;
    const pulse         = useRef(new Animated.Value(1)).current;
    const borderGlow    = useRef(new Animated.Value(0)).current;
    const googleScale   = useRef(new Animated.Value(1)).current;
    const magicScale    = useRef(new Animated.Value(1)).current;
    const submitScale   = useRef(new Animated.Value(1)).current;
    const orb1Y         = useRef(new Animated.Value(0)).current;
    const orb2Y         = useRef(new Animated.Value(0)).current;

    // ── Typewriter ──
    useEffect(() => {
        let i = 0;
        setTypeText('');
        const id = setInterval(() => {
            i++;
            setTypeText(TAGLINE.slice(0, i));
            if (i >= TAGLINE.length) clearInterval(id);
        }, 52);
        return () => clearInterval(id);
    }, []);

    // ── Staggered entrance ──
    useEffect(() => {
        Animated.parallel([
            Animated.timing(logoOpacity, { toValue: 1, duration: 700, delay: 250, useNativeDriver: true }),
            Animated.spring(logoY,       { toValue: 0, speed: 14, bounciness: 6, delay: 250, useNativeDriver: true }),
        ]).start();

        Animated.parallel([
            Animated.timing(cardOpacity, { toValue: 1, duration: 600, delay: 750, useNativeDriver: true }),
            Animated.spring(cardY,       { toValue: 0, speed: 10, bounciness: 10, delay: 750, useNativeDriver: true }),
        ]).start();

        Animated.timing(fieldsOpacity, { toValue: 1, duration: 500, delay: 1100, useNativeDriver: true }).start();
        Animated.timing(btnsOpacity,   { toValue: 1, duration: 500, delay: 1300, useNativeDriver: true }).start();
    }, []);

    // ── Heartbeat pulse ──
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.45, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1.0,  duration: 350, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
                Animated.delay(1000),
            ])
        ).start();
    }, []);

    // ── Native orb float (CSS handles it on web) ──
    useEffect(() => {
        if (Platform.OS === 'web') return;
        const fl = (v: Animated.Value, a: number, b: number, d1: number, d2: number) =>
            Animated.loop(Animated.sequence([
                Animated.timing(v, { toValue: a, duration: d1, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(v, { toValue: b, duration: d2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])).start();
        fl(orb1Y, -24,  16, 4000, 4500);
        fl(orb2Y,  20, -16, 4800, 3800);
    }, []);

    // ── Input border glow ──
    useEffect(() => {
        Animated.timing(borderGlow, {
            toValue: emailFocused ? 1 : 0,
            duration: 260, useNativeDriver: false,
        }).start();
    }, [emailFocused]);

    const borderColor = borderGlow.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255,255,255,0.14)', 'rgba(124,92,255,0.85)'],
    });

    // ── Button micro-interactions ──
    const pressIn  = (v: Animated.Value) => Animated.spring(v, { toValue: 0.955, useNativeDriver: true }).start();
    const pressOut = (v: Animated.Value) => Animated.spring(v, { toValue: 1, friction: 4, useNativeDriver: true }).start();

    // ── Auth handlers ──────────────────────────────────────────────────────────
    const signInWithGoogle = async () => {
        setLoading(true); setError('');
        const { error: err } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: CALLBACK_URL },
        });
        setLoading(false);
        if (err) setError(err.message);
    };

    const sendOtp = async () => {
        if (!email.trim()) { setError('Please enter your email address.'); return; }
        setLoading(true); setError('');
        const { error: err } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: { emailRedirectTo: CALLBACK_URL },
        });
        setLoading(false);
        if (err) setError(err.message);
        else setStep('otp');
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <View style={[s.root, Platform.OS !== 'web' && { backgroundColor: '#0a0a0f' }]}
              {...wc('fo-bg')}>

            {/* Grid lines — web only */}
            {Platform.OS === 'web' && (
                <View style={s.grid} pointerEvents="none" {...wc('fo-grid')} />
            )}

            {/* Floating orbs */}
            <Animated.View style={[s.orb, s.orb1, { transform: [{ translateY: orb1Y }] }]} {...wc('fo-orb1')} />
            <Animated.View style={[s.orb, s.orb2, { transform: [{ translateY: orb2Y }] }]} {...wc('fo-orb2')} />
            <View          style={[s.orb, s.orb3]}                                          {...wc('fo-orb3')} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
                <ScrollView
                    contentContainerStyle={s.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >

                    {/* ────────── LOGO ────────── */}
                    <Animated.View style={[s.logoSection, {
                        opacity: logoOpacity,
                        transform: [{ translateY: logoY }],
                    }]}>

                        <View style={s.logoRow}>
                            {/* Heartbeat dot */}
                            <Animated.View style={[s.pulseWrap, { transform: [{ scale: pulse }] }]}>
                                <View style={s.pulseDot} />
                                <View style={s.pulseRing} />
                            </Animated.View>

                            {/* Title — CSS shimmer on web, tinted on native */}
                            {Platform.OS === 'web'
                                ? <Text style={s.titleBase} {...wc('fo-shimmer')}>FlowOptix</Text>
                                : <Text style={[s.titleBase, s.titleNative]}>FlowOptix</Text>
                            }
                        </View>

                        {/* Typewriter */}
                        <Text style={s.tagline}>
                            {typeText}
                            <Text style={s.cursor}>|</Text>
                        </Text>
                    </Animated.View>

                    {/* ────────── GLASS CARD ────────── */}
                    <Animated.View
                        style={[
                            s.card,
                            { opacity: cardOpacity, transform: [{ translateY: cardY }] },
                            Platform.OS !== 'web' && s.cardNative,
                        ]}
                        {...wc('fo-glass', 'fo-card-hover')}
                    >

                        {/* Dynamic heading by step */}
                        <Text style={s.cardTitle}>
                            {step === 'landing' ? 'Welcome back' :
                             step === 'email'   ? 'Enter your email' :
                                                  'Check your inbox'}
                        </Text>
                        <Text style={s.cardSub}>
                            {step === 'landing' ? 'Sign in to continue your flow' :
                             step === 'email'   ? "We'll send a magic link — no password needed" :
                                                  `Magic link sent to ${email}`}
                        </Text>

                        {/* ── LANDING ── */}
                        {step === 'landing' && (
                            <Animated.View style={[s.btnGroup, { opacity: btnsOpacity }]}>

                                {/* Google */}
                                <Pressable
                                    onPressIn={() => pressIn(googleScale)}
                                    onPressOut={() => pressOut(googleScale)}
                                    onPress={signInWithGoogle}
                                    style={{ width: '100%' }}
                                >
                                    <Animated.View
                                        style={[s.googleBtn, { transform: [{ scale: googleScale }] }]}
                                        {...wc('fo-google-btn')}
                                    >
                                        <Text style={s.gIcon}>G</Text>
                                        <Text style={s.googleText}>Continue with Google</Text>
                                    </Animated.View>
                                </Pressable>

                                <View style={s.divider}>
                                    <View style={s.divLine} />
                                    <Text style={s.divLabel}>or</Text>
                                    <View style={s.divLine} />
                                </View>

                                {/* Email entry */}
                                <Pressable
                                    onPressIn={() => pressIn(magicScale)}
                                    onPressOut={() => pressOut(magicScale)}
                                    onPress={() => { setError(''); setStep('email'); }}
                                    style={{ width: '100%' }}
                                >
                                    <Animated.View
                                        style={[s.magicBtn, { transform: [{ scale: magicScale }] }]}
                                        {...wc('fo-magic-btn')}
                                    >
                                        <Ionicons name="mail-outline" size={17} color="rgba(255,255,255,0.7)" style={{ marginRight: 9 }} />
                                        <Text style={s.magicText}>Sign in with Email</Text>
                                    </Animated.View>
                                </Pressable>

                                <Text style={s.termsText}>
                                    No password. By continuing you agree to our{' '}
                                    <Text style={s.termLink}>Terms</Text>
                                    {' '}&amp;{' '}
                                    <Text style={s.termLink}>Privacy Policy</Text>.
                                </Text>
                            </Animated.View>
                        )}

                        {/* ── EMAIL ── */}
                        {step === 'email' && (
                            <Animated.View style={[s.formGroup, { opacity: fieldsOpacity }]}>

                                <Animated.View style={[s.inputWrap, { borderBottomColor: borderColor }]}>
                                    <Ionicons
                                        name="mail-outline"
                                        size={16}
                                        color={emailFocused ? '#7C5CFF' : 'rgba(255,255,255,0.3)'}
                                        style={{ marginRight: 10 }}
                                    />
                                    <TextInput
                                        style={s.input}
                                        placeholder="you@example.com"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        value={email}
                                        onChangeText={t => { setEmail(t); setError(''); }}
                                        onFocus={() => setFocused(true)}
                                        onBlur={() => setFocused(false)}
                                        editable={!loading}
                                        {...(Platform.OS === 'web' ? wc('fo-input-native') : {})}
                                    />
                                </Animated.View>

                                {!!error && <Text style={s.errText}>{error}</Text>}

                                <Pressable
                                    onPressIn={() => pressIn(submitScale)}
                                    onPressOut={() => pressOut(submitScale)}
                                    onPress={sendOtp}
                                    disabled={loading}
                                    style={{ width: '100%' }}
                                >
                                    <Animated.View
                                        style={[s.submitBtn, loading && s.btnDisabled, { transform: [{ scale: submitScale }] }]}
                                        {...wc('fo-submit-btn')}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <>
                                                <Ionicons name="send-outline" size={15} color="#fff" style={{ marginRight: 8 }} />
                                                <Text style={s.submitText}>Send Magic Link</Text>
                                            </>
                                        )}
                                    </Animated.View>
                                </Pressable>

                                <Pressable onPress={() => { setError(''); setStep('landing'); }} style={s.backWrap}>
                                    <Text style={s.backText}>← Back</Text>
                                </Pressable>
                            </Animated.View>
                        )}

                        {/* ── OTP ── */}
                        {step === 'otp' && (
                            <Animated.View style={[s.formGroup, { opacity: fieldsOpacity }]}>

                                <View style={s.infoBox}>
                                    <Text style={s.infoEmoji}>📬</Text>
                                    <Text style={s.infoText}>
                                        Open the email and tap{' '}
                                        <Text style={s.infoHL}>"Confirm your mail"</Text>
                                        {' '}— you'll be signed in automatically.
                                    </Text>
                                </View>

                                {!!error && <Text style={s.errText}>{error}</Text>}

                                <Pressable
                                    onPressIn={() => pressIn(submitScale)}
                                    onPressOut={() => pressOut(submitScale)}
                                    onPress={sendOtp}
                                    disabled={loading}
                                    style={{ width: '100%' }}
                                >
                                    <Animated.View style={[s.submitBtn, s.submitSecondary, { transform: [{ scale: submitScale }] }]}>
                                        {loading
                                            ? <ActivityIndicator color="#fff" size="small" />
                                            : <Text style={s.submitText}>Resend link</Text>
                                        }
                                    </Animated.View>
                                </Pressable>

                                <Pressable onPress={() => { setError(''); setStep('email'); }} style={s.backWrap}>
                                    <Text style={s.backText}>← Change email</Text>
                                </Pressable>
                            </Animated.View>
                        )}

                    </Animated.View>

                    {/* Footer */}
                    <Text style={s.footer}>FlowOptix · v1.0 · Powered by AI</Text>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root:      { flex: 1 },
    flex:      { flex: 1 },
    grid:      { ...StyleSheet.absoluteFillObject },
    scroll:    {
        flexGrow: 1, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 20, paddingVertical: 64,
    },

    // Orbs
    orb: { position: 'absolute', borderRadius: 9999 },
    orb1: { width: 500, height: 500, top: -160, left: -180,  backgroundColor: 'rgba(108,43,217,0.18)' },
    orb2: { width: 400, height: 400, bottom: 20, right: -130, backgroundColor: 'rgba(30,58,95,0.15)' },
    orb3: { width: 300, height: 300, top: '40%', left: '30%', backgroundColor: 'rgba(13,79,79,0.12)' },

    // Logo
    logoSection: { alignItems: 'center', marginBottom: 44 },
    logoRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
    pulseWrap:   { width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
    pulseDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7C5CFF' },
    pulseRing:   {
        position: 'absolute', width: 20, height: 20, borderRadius: 10,
        borderWidth: 1.5, borderColor: 'rgba(124,92,255,0.45)',
    },
    titleBase: {
        fontSize: 48, fontWeight: '900', letterSpacing: -1.5,
        includeFontPadding: false,
    },
    titleNative: { color: '#ffffff' },
    tagline:  { fontSize: 15, color: '#888888', letterSpacing: 0.2, textAlign: 'center' },
    cursor:   { color: '#7C5CFF', fontWeight: '200' },

    // Card
    card: {
        width: '100%', maxWidth: 420,
        borderRadius: 28, padding: 36,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
        alignItems: 'center',
        shadowColor: '#4a1a8a', shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.45, shadowRadius: 48, elevation: 24,
    },
    cardNative: { backgroundColor: 'rgba(255,255,255,0.05)' },
    cardTitle:  { fontSize: 26, fontWeight: '700', color: '#ffffff', marginBottom: 8, textAlign: 'center' },
    cardSub:    { fontSize: 14, color: '#666666', marginBottom: 30, textAlign: 'center', lineHeight: 20 },

    // Button groups
    btnGroup:  { width: '100%', alignItems: 'center' },
    formGroup: { width: '100%', alignItems: 'center' },

    // Google button
    googleBtn: {
        width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 15, borderRadius: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(255,255,255,0.08)',
        gap: 12, marginBottom: 18,
    },
    gIcon:      { fontSize: 21, fontWeight: '700', color: '#4285F4' },
    googleText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },

    // Divider
    divider: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 18 },
    divLine:  { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
    divLabel: { color: '#555555', marginHorizontal: 14, fontSize: 12 },

    // Magic link / email button
    magicBtn: {
        width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 15, borderRadius: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginBottom: 22,
    },
    magicText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },

    // Input
    inputWrap: {
        width: '100%', flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 1.5, paddingBottom: 12, marginBottom: 6, marginTop: 4,
    },
    input: {
        flex: 1, color: '#ffffff', fontSize: 15,
        paddingVertical: Platform.OS === 'ios' ? 4 : 0,
    },

    // Submit button
    submitBtn: {
        width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#7C5CFF', paddingVertical: 16, borderRadius: 16,
        marginTop: 22, marginBottom: 6,
        shadowColor: '#7C5CFF', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45, shadowRadius: 20, elevation: 10,
    },
    submitSecondary: { backgroundColor: 'rgba(124,92,255,0.55)' },
    btnDisabled:     { opacity: 0.65 },
    submitText:      { color: '#fff', fontSize: 15, fontWeight: '700' },

    // Back
    backWrap: { marginTop: 10, paddingVertical: 8, width: '100%', alignItems: 'center' },
    backText: { color: '#7C5CFF', fontSize: 14, fontWeight: '500' },

    // Error
    errText: { color: '#ff6b6b', fontSize: 13, marginTop: 8, marginBottom: 4, textAlign: 'center' },

    // Info box (OTP)
    infoBox:  {
        width: '100%', borderRadius: 18, padding: 22, marginBottom: 22,
        borderWidth: 1, borderColor: 'rgba(124,92,255,0.18)',
        backgroundColor: 'rgba(124,92,255,0.06)',
    },
    infoEmoji: { fontSize: 36, textAlign: 'center', marginBottom: 12 },
    infoText:  { color: '#888888', fontSize: 14, lineHeight: 21, textAlign: 'center' },
    infoHL:    { color: '#c4a0ff', fontWeight: '600' },

    // Terms
    termsText: { fontSize: 12, color: '#555555', textAlign: 'center', lineHeight: 17, marginTop: 4 },
    termLink:  { color: '#7C5CFF', textDecorationLine: 'underline' },

    // Footer
    footer: { fontSize: 11, color: '#555555', letterSpacing: 0.5, marginTop: 40, textAlign: 'center' },
});
