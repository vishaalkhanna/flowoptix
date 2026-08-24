import { useEffect, useRef, useState } from 'react';
import {
    View, Text, TextInput, StyleSheet, Animated, Easing,
    Platform, Pressable, TouchableOpacity, KeyboardAvoidingView,
    ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'landing' | 'email' | 'otp' | 'password';

// ─── Constants ────────────────────────────────────────────────────────────────
const SITE_URL     = process.env.EXPO_PUBLIC_SITE_URL || 'https://flowoptix-ten.vercel.app';
const CALLBACK_URL = `${SITE_URL}/auth/callback`;
const TAGLINE      = 'Your productivity intelligence';

// ─── Web CSS ──────────────────────────────────────────────────────────────────
if (Platform.OS === 'web') {
    const el = document.createElement('style');
    el.textContent = `
        @keyframes aurora1 {
            0%,100% { transform: translate(-10%, 0%)  scale(1.0);  opacity: 0.70; }
            40%     { transform: translate(8%,  -12%) scale(1.18); opacity: 0.95; }
            70%     { transform: translate(-6%, 8%)   scale(0.92); opacity: 0.75; }
        }
        @keyframes aurora2 {
            0%,100% { transform: translate(12%, 5%)   scale(1.05); opacity: 0.60; }
            35%     { transform: translate(-10%,-8%)  scale(1.15); opacity: 0.85; }
            70%     { transform: translate(15%, 4%)   scale(0.95); opacity: 0.65; }
        }
        @keyframes aurora3 {
            0%,100% { transform: translate(0%,  0%)   scale(1.0);  opacity: 0.55; }
            50%     { transform: translate(-14%,-10%) scale(1.22); opacity: 0.80; }
        }
        @keyframes aurora4 {
            0%,100% { transform: translate(5%,  3%)   scale(1.0);  opacity: 0.45; }
            40%     { transform: translate(-6%, -6%)  scale(1.12); opacity: 0.70; }
            75%     { transform: translate(10%, 5%)   scale(0.90); opacity: 0.50; }
        }
        @keyframes borderFlow {
            0%   { background-position: 0%   50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0%   50%; }
        }
        @keyframes pulseDot {
            0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.8); }
            60%     { box-shadow: 0 0 0 7px rgba(34,197,94,0);  }
        }
        @keyframes sparkle {
            0%,100% { opacity:1;   transform: scale(1)   rotate(0deg);   }
            50%     { opacity:0.5; transform: scale(1.4) rotate(180deg); }
        }
        @keyframes btnShimmer {
            0%   { background-position: -200% center; }
            100% { background-position:  200% center; }
        }

        .fo-aurora1 { animation: aurora1 10s ease-in-out infinite; }
        .fo-aurora2 { animation: aurora2 13s ease-in-out infinite; }
        .fo-aurora3 { animation: aurora3  8s ease-in-out infinite; }
        .fo-aurora4 { animation: aurora4 15s ease-in-out infinite; }

        .fo-pulse { animation: pulseDot 2s ease-in-out infinite; }
        .fo-sparkle { animation: sparkle 2.5s ease-in-out infinite; }

        /* Card — animated gradient border via padding trick */
        .fo-card-wrap {
            background: linear-gradient(90deg, #A855F7, #EC4899, #3B82F6, #06B6D4, #A855F7);
            background-size: 300% 100%;
            animation: borderFlow 5s linear infinite;
            border-radius: 22px;
            padding: 1px;
            transition: box-shadow 0.4s ease;
        }
        .fo-card-wrap:hover {
            box-shadow: 0 0 50px rgba(168,85,247,0.45), 0 0 100px rgba(236,72,153,0.20);
        }

        /* Google button — gradient bg + shimmer */
        .fo-google {
            background: linear-gradient(90deg, #A855F7 0%, #EC4899 40%, #ffffff22 55%, #EC4899 70%, #A855F7 100%);
            background-size: 200% auto;
            animation: btnShimmer 3.5s linear infinite;
            transition: box-shadow 0.25s ease, transform 0.2s ease;
        }
        .fo-google:hover {
            box-shadow: 0 0 30px rgba(168,85,247,0.7), 0 0 60px rgba(236,72,153,0.35);
            transform: scale(1.025);
        }

        /* Email button — gradient border via wrapper */
        .fo-email-wrap {
            background: linear-gradient(90deg, #A855F7, #EC4899, #3B82F6, #06B6D4, #A855F7);
            background-size: 300% 100%;
            animation: borderFlow 5s linear infinite;
            border-radius: 14px;
            padding: 1px;
            transition: box-shadow 0.25s ease;
        }
        .fo-email-wrap:hover {
            box-shadow: 0 0 20px rgba(168,85,247,0.4);
        }
        .fo-email-inner {
            background: #111111 !important;
            border-radius: 13px;
        }
        .fo-email-inner:hover {
            background: rgba(168,85,247,0.12) !important;
        }

        .fo-input {
            background: transparent !important;
            color: #ffffff !important;
            border: none !important;
            outline: none !important;
            width: 100%;
            font-size: 15px;
            padding: 0 !important;
        }
        .fo-input::placeholder { color: rgba(255,255,255,0.28) !important; }

        @media (min-width: 769px) {
            .fo-orb1 { width: 250px !important; height: 200px !important; }
            .fo-orb2 { width: 220px !important; height: 180px !important; }
            .fo-orb3 { width: 200px !important; height: 160px !important; }
            .fo-orb4 { width: 180px !important; height: 140px !important; }
        }
    `;
    document.head.appendChild(el);
}

const wc = (...c: string[]) => Platform.OS === 'web' ? ({ className: c.join(' ') } as any) : {};

// ─── Component ────────────────────────────────────────────────────────────────
export default function LoginScreen() {
    const router = useRouter();
    const [step, setStep]           = useState<Step>(Platform.OS === 'web' ? 'landing' : 'password');
    const [email, setEmail]         = useState('');
    const [password, setPassword]   = useState('');
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');
    const [typeText, setTypeText]   = useState('');
    const [focused, setFocused]     = useState(false);

    // Animated values
    const logoOpacity   = useRef(new Animated.Value(0)).current;
    const logoY         = useRef(new Animated.Value(24)).current;
    const cardOpacity   = useRef(new Animated.Value(0)).current;
    const cardY         = useRef(new Animated.Value(60)).current;
    const fieldsOpacity = useRef(new Animated.Value(0)).current;
    const btnsOpacity   = useRef(new Animated.Value(0)).current;
    const pulse         = useRef(new Animated.Value(1)).current;
    const borderAnim    = useRef(new Animated.Value(0)).current; // native border color
    const borderGlow    = useRef(new Animated.Value(0)).current; // input focus
    const googleScale   = useRef(new Animated.Value(1)).current;
    const emailBtnScale = useRef(new Animated.Value(1)).current;
    const pwdBtnScale   = useRef(new Animated.Value(1)).current;
    const submitScale   = useRef(new Animated.Value(1)).current;
    const aurora1Scale  = useRef(new Animated.Value(1)).current;
    const aurora2Scale  = useRef(new Animated.Value(1)).current;
    const aurora3Scale  = useRef(new Animated.Value(1)).current;
    const aurora1Op     = useRef(new Animated.Value(0.7)).current;
    const aurora2Op     = useRef(new Animated.Value(0.55)).current;
    const aurora3Op     = useRef(new Animated.Value(0.45)).current;

    // ── Typewriter ──
    useEffect(() => {
        let i = 0;
        const id = setInterval(() => {
            i++;
            setTypeText(TAGLINE.slice(0, i));
            if (i >= TAGLINE.length) clearInterval(id);
        }, 52);
        return () => clearInterval(id);
    }, []);

    // ── Entrance stagger ──
    useEffect(() => {
        Animated.parallel([
            Animated.timing(logoOpacity, { toValue: 1, duration: 700, delay: 200, useNativeDriver: true }),
            Animated.spring(logoY, { toValue: 0, speed: 14, bounciness: 6, delay: 200, useNativeDriver: true }),
        ]).start();
        Animated.parallel([
            Animated.timing(cardOpacity, { toValue: 1, duration: 600, delay: 700, useNativeDriver: true }),
            Animated.spring(cardY, { toValue: 0, speed: 10, bounciness: 10, delay: 700, useNativeDriver: true }),
        ]).start();
        Animated.timing(fieldsOpacity, { toValue: 1, duration: 500, delay: 1100, useNativeDriver: true }).start();
        Animated.timing(btnsOpacity,   { toValue: 1, duration: 500, delay: 1300, useNativeDriver: true }).start();
    }, []);

    // ── Heartbeat pulse ──
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.5, duration: 340, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1.0, duration: 340, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
                Animated.delay(1100),
            ])
        ).start();
    }, []);

    // ── Native aurora float ──
    useEffect(() => {
        if (Platform.OS === 'web') return;
        const pulse2 = (v: Animated.Value, a: number, b: number, d: number) =>
            Animated.loop(Animated.sequence([
                Animated.timing(v, { toValue: a, duration: d,         easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(v, { toValue: b, duration: d * 1.2,   easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])).start();
        pulse2(aurora1Scale, 1.15, 0.92, 4500);
        pulse2(aurora2Scale, 0.90, 1.12, 5200);
        pulse2(aurora3Scale, 1.10, 0.88, 3800);
        pulse2(aurora1Op, 0.95, 0.55, 4000);
        pulse2(aurora2Op, 0.80, 0.40, 5500);
        pulse2(aurora3Op, 0.70, 0.35, 4200);
    }, []);

    // ── Native animated card border ──
    useEffect(() => {
        if (Platform.OS === 'web') return;
        Animated.loop(
            Animated.timing(borderAnim, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: false })
        ).start();
    }, []);

    // ── Input focus glow ──
    useEffect(() => {
        Animated.timing(borderGlow, {
            toValue: focused ? 1 : 0, duration: 260, useNativeDriver: false,
        }).start();
    }, [focused]);

    const inputBorderColor = borderGlow.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255,255,255,0.15)', '#A855F7'],
    });
    const nativeCardBorder = borderAnim.interpolate({
        inputRange: [0, 0.33, 0.66, 1],
        outputRange: ['#A855F7', '#EC4899', '#3B82F6', '#A855F7'],
    });

    // ── Button micro ──
    const pressIn  = (v: Animated.Value) => Animated.spring(v, { toValue: 0.95, useNativeDriver: true }).start();
    const pressOut = (v: Animated.Value) => Animated.spring(v, { toValue: 1, friction: 4, useNativeDriver: true }).start();

    // ── Auth ──
    const signInWithGoogle = async () => {
        setLoading(true); setError('');
        const { error: err } = await supabase.auth.signInWithOAuth({
            provider: 'google', options: { redirectTo: CALLBACK_URL },
        });
        setLoading(false);
        if (err) setError(err.message);
    };

    const sendOtp = async () => {
        if (!email.trim()) { setError('Please enter your email.'); return; }
        setLoading(true); setError('');
        const { error: err } = await supabase.auth.signInWithOtp({
            email: email.trim(), options: { emailRedirectTo: CALLBACK_URL },
        });
        setLoading(false);
        if (err) setError(err.message);
        else setStep('otp');
    };

    const signInWithPassword = async () => {
        if (!email.trim()) { setError('Please enter your email.'); return; }
        if (!password) { setError('Please enter your password.'); return; }
        setLoading(true); setError('');
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        setLoading(false);
        if (err) setError(err.message);
    };

    // ─── Card inner content (shared between web wrapper and native) ───────────
    const cardContent = (
        <>
            {/* Heading */}
            <Text style={s.cardTitle}>
                {step === 'landing'  ? 'Welcome back' :
                 step === 'email'    ? 'Enter your email' :
                 step === 'password' ? 'Sign in' : 'Check your inbox'}
            </Text>
            <Text style={s.cardSub}>
                {step === 'landing'  ? 'Sign in to continue your flow' :
                 step === 'email'    ? "We'll send a magic link — no password" :
                 step === 'password' ? 'Enter your email and password' :
                                      `Link sent to ${email}`}
            </Text>

            {/* ── LANDING ── */}
            {step === 'landing' && (
                <Animated.View style={[s.btnGroup, { opacity: btnsOpacity }]}>

                    {/* Google — web only */}
                    {Platform.OS === 'web' && (
                        <Pressable
                            onPressIn={() => pressIn(googleScale)}
                            onPressOut={() => pressOut(googleScale)}
                            onPress={signInWithGoogle}
                            style={{ width: '100%' }}
                        >
                            <Animated.View
                                style={[s.googleBtn, { transform: [{ scale: googleScale }] }]}
                                {...wc('fo-google')}
                            >
                                <Text style={s.gIcon}>G</Text>
                                <Text style={s.googleText}>Continue with Google</Text>
                            </Animated.View>
                        </Pressable>
                    )}

                    {Platform.OS === 'web' && (
                        <View style={s.divider}>
                            <View style={s.divLine} />
                            <Text style={s.divLabel}>or</Text>
                            <View style={s.divLine} />
                        </View>
                    )}

                    {/* Email magic-link button — web only */}
                    {Platform.OS === 'web' && (
                        <Pressable
                            onPressIn={() => pressIn(emailBtnScale)}
                            onPressOut={() => pressOut(emailBtnScale)}
                            onPress={() => { setError(''); setStep('email'); }}
                            style={{ width: '100%' }}
                        >
                            <Animated.View style={{ transform: [{ scale: emailBtnScale }], width: '100%' }}>
                                <View {...wc('fo-email-wrap')}>
                                    <View {...wc('fo-email-inner')} style={s.emailBtnInner}>
                                        <Ionicons name="mail-outline" size={17} color="#fff" style={{ marginRight: 9 }} />
                                        <Text style={s.emailBtnText}>Sign in with Email</Text>
                                    </View>
                                </View>
                            </Animated.View>
                        </Pressable>
                    )}

                    {/* Password button — web only, for automated / programmatic sign-in */}
                    {Platform.OS === 'web' && (
                        <Pressable
                            onPressIn={() => pressIn(pwdBtnScale)}
                            onPressOut={() => pressOut(pwdBtnScale)}
                            onPress={() => { setError(''); setStep('password'); }}
                            style={{ width: '100%', marginTop: 10 }}
                        >
                            <Animated.View style={{ transform: [{ scale: pwdBtnScale }], width: '100%' }}>
                                <View {...wc('fo-email-wrap')}>
                                    <View {...wc('fo-email-inner')} style={s.emailBtnInner}>
                                        <Ionicons name="lock-closed-outline" size={17} color="#fff" style={{ marginRight: 9 }} />
                                        <Text style={s.emailBtnText}>Sign in with Password</Text>
                                    </View>
                                </View>
                            </Animated.View>
                        </Pressable>
                    )}

                    <View style={s.termsRow}>
                        <Text style={s.terms}>No password needed · By continuing you agree to our </Text>
                        <TouchableOpacity onPress={() => router.push('/terms' as any)}>
                            <Text style={s.termLink}>Terms</Text>
                        </TouchableOpacity>
                        <Text style={s.terms}> &amp; </Text>
                        <TouchableOpacity onPress={() => router.push('/privacy' as any)}>
                            <Text style={s.termLink}>Privacy</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}

            {/* ── EMAIL ── */}
            {step === 'email' && (
                <Animated.View style={[s.formGroup, { opacity: fieldsOpacity }]}>
                    <Animated.View style={[s.inputWrap, { borderBottomColor: inputBorderColor }]}>
                        <Ionicons
                            name="mail-outline" size={16}
                            color={focused ? '#A855F7' : 'rgba(255,255,255,0.3)'}
                            style={{ marginRight: 10 }}
                        />
                        <TextInput
                            style={s.input}
                            placeholder="you@example.com"
                            placeholderTextColor="rgba(255,255,255,0.28)"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            value={email}
                            onChangeText={t => { setEmail(t); setError(''); }}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            editable={!loading}
                            {...(Platform.OS === 'web' ? wc('fo-input') : {})}
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
                        <Animated.View style={[s.submitBtn, loading && s.btnDisabled,
                                               { transform: [{ scale: submitScale }] }]}>
                            {loading
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <>
                                    <Ionicons name="send-outline" size={15} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={s.submitText}>Send Magic Link</Text>
                                  </>
                            }
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
                        <Animated.View style={[s.submitBtn, s.submitSecondary,
                                               { transform: [{ scale: submitScale }] }]}>
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

            {/* ── PASSWORD ── */}
            {step === 'password' && (
                <Animated.View style={[s.formGroup, { opacity: fieldsOpacity }]}>
                    <Animated.View style={[s.inputWrap, { borderBottomColor: inputBorderColor }]}>
                        <Ionicons
                            name="mail-outline" size={16}
                            color={focused ? '#A855F7' : 'rgba(255,255,255,0.3)'}
                            style={{ marginRight: 10 }}
                        />
                        <TextInput
                            style={s.input}
                            placeholder="you@example.com"
                            placeholderTextColor="rgba(255,255,255,0.28)"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            secureTextEntry={false}
                            value={email}
                            onChangeText={t => { setEmail(t); setError(''); }}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            editable={!loading}
                            {...(Platform.OS === 'web' ? wc('fo-input') : {})}
                        />
                    </Animated.View>

                    <Animated.View style={[s.inputWrap, { borderBottomColor: inputBorderColor, marginTop: 16 }]}>
                        <Ionicons
                            name="lock-closed-outline" size={16}
                            color={focused ? '#A855F7' : 'rgba(255,255,255,0.3)'}
                            style={{ marginRight: 10 }}
                        />
                        <TextInput
                            style={s.input}
                            placeholder="Password"
                            placeholderTextColor="rgba(255,255,255,0.28)"
                            secureTextEntry={true}
                            autoCapitalize="none"
                            autoCorrect={false}
                            value={password}
                            onChangeText={t => { setPassword(t); setError(''); }}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            editable={!loading}
                            {...(Platform.OS === 'web' ? wc('fo-input') : {})}
                        />
                    </Animated.View>

                    {!!error && <Text style={s.errText}>{error}</Text>}

                    <Pressable
                        onPressIn={() => pressIn(submitScale)}
                        onPressOut={() => pressOut(submitScale)}
                        onPress={signInWithPassword}
                        disabled={loading}
                        style={{ width: '100%' }}
                    >
                        <Animated.View style={[s.submitBtn, loading && s.btnDisabled,
                                               { transform: [{ scale: submitScale }] }]}>
                            {loading
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <>
                                    <Ionicons name="log-in-outline" size={15} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={s.submitText}>Sign in</Text>
                                  </>
                            }
                        </Animated.View>
                    </Pressable>

                    {Platform.OS === 'web' && (
                        <Pressable onPress={() => { setError(''); setStep('landing'); }} style={s.backWrap}>
                            <Text style={s.backText}>← Back</Text>
                        </Pressable>
                    )}
                </Animated.View>
            )}
        </>
    );

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <View style={s.root}>

            {/* Aurora bands */}
            <View style={s.auroraContainer} pointerEvents="none">
                <Animated.View
                    style={[s.aurora, s.aurora1,
                            { opacity: aurora1Op, transform: [{ scale: aurora1Scale }] }]}
                    {...wc('fo-aurora1', 'fo-orb1')}
                />
                <Animated.View
                    style={[s.aurora, s.aurora2,
                            { opacity: aurora2Op, transform: [{ scale: aurora2Scale }] }]}
                    {...wc('fo-aurora2', 'fo-orb2')}
                />
                <Animated.View
                    style={[s.aurora, s.aurora3,
                            { opacity: aurora3Op, transform: [{ scale: aurora3Scale }] }]}
                    {...wc('fo-aurora3', 'fo-orb3')}
                />
                <View style={[s.aurora, s.aurora4]} {...wc('fo-aurora4', 'fo-orb4')} />
                {/* Fade-to-black gradient over aurora */}
                <View style={s.auroraFade} pointerEvents="none" />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
                <ScrollView
                    contentContainerStyle={s.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >

                    {/* ── LOGO ── */}
                    <Animated.View style={[s.logoSection, {
                        opacity: logoOpacity, transform: [{ translateY: logoY }],
                    }]}>
                        <View style={s.logoRow}>
                            {/* Live pulse dot */}
                            <Animated.View style={[s.pulseDotWrap, { transform: [{ scale: pulse }] }]}
                                           {...wc('fo-pulse')}>
                                <View style={s.pulseDot} />
                            </Animated.View>

                            {/* Title */}
                            <Text style={s.title}>FlowOptix</Text>
                        </View>

                        {/* Typewriter */}
                        <Text style={s.tagline}>
                            {typeText}<Text style={s.cursor}>_</Text>
                        </Text>
                    </Animated.View>

                    {/* ── CARD ── */}
                    <Animated.View style={[s.cardAnim, {
                        opacity: cardOpacity, transform: [{ translateY: cardY }],
                    }]}>
                        {Platform.OS === 'web' ? (
                            /* Web: animated gradient border wrapper */
                            <View {...wc('fo-card-wrap')}>
                                <View style={s.cardInnerWeb}>{cardContent}</View>
                            </View>
                        ) : (
                            /* Native: animated border color */
                            <Animated.View style={[s.cardNative, { borderColor: nativeCardBorder }]}>
                                {cardContent}
                            </Animated.View>
                        )}
                    </Animated.View>

                    {/* Footer */}
                    <Animated.View style={[s.footerRow, { opacity: btnsOpacity }]}>
                        <Text style={s.footerText}>FlowOptix · v1.0 · Powered by AI </Text>
                        <Text style={s.sparkle} {...wc('fo-sparkle')}>✦</Text>
                    </Animated.View>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000000' },
    flex: { flex: 1 },
    scroll: {
        flexGrow: 1, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 20, paddingVertical: 70,
    },

    // Aurora
    auroraContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', zIndex: 0 },
    aurora: { position: 'absolute', borderRadius: 9999 },
    aurora1: {
        width: 520, height: 380, top: -120, left: -60,
        backgroundColor: 'rgba(168,85,247,0.55)',
    },
    aurora2: {
        width: 440, height: 320, top: -80, right: -80,
        backgroundColor: 'rgba(236,72,153,0.45)',
    },
    aurora3: {
        width: 380, height: 280, top: 60, left: '20%',
        backgroundColor: 'rgba(59,130,246,0.40)',
    },
    aurora4: {
        width: 300, height: 220, top: 40, left: '55%',
        backgroundColor: 'rgba(6,182,212,0.35)',
    },
    auroraFade: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: 300,
        // Web: CSS gradient; native: black overlay
        backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(0,0,0,0.6)',
        ...(Platform.OS === 'web' ? {
            backgroundImage: 'linear-gradient(to bottom, transparent 0%, #000000 100%)',
        } as any : {}),
    },

    // Logo
    logoSection: { alignItems: 'center', marginBottom: 44, zIndex: 10 },
    logoRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
    pulseDotWrap:{ width: 12, height: 12, justifyContent: 'center', alignItems: 'center' },
    pulseDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E' },
    title: {
        fontSize: 52, fontWeight: '900', letterSpacing: -2,
        includeFontPadding: false,
        color: '#ffffff',
        textShadowColor: 'rgba(168,85,247,0.85)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 28,
    },
    tagline: { fontSize: 15, color: '#06B6D4', letterSpacing: 0.4, textAlign: 'center' },
    cursor:  { color: '#06B6D4', opacity: 0.7 },

    // Card animation wrapper
    cardAnim: { width: '100%', maxWidth: 420 },

    // Card — web inner (inside the gradient border wrapper)
    cardInnerWeb: {
        backgroundColor: '#111111',
        borderRadius: 21,
        padding: 36,
        alignItems: 'center',
    },

    // Card — native (has animated borderColor)
    cardNative: {
        backgroundColor: '#111111',
        borderRadius: 22, borderWidth: 1,
        padding: 36, alignItems: 'center',
        shadowColor: '#A855F7', shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4, shadowRadius: 40, elevation: 20,
    },

    cardTitle: { fontSize: 26, fontWeight: '700', color: '#ffffff', marginBottom: 8, textAlign: 'center' },
    cardSub:   { fontSize: 14, color: '#888888', marginBottom: 30, textAlign: 'center', lineHeight: 20 },

    // Groups
    btnGroup:  { width: '100%', alignItems: 'center' },
    formGroup: { width: '100%', alignItems: 'center' },

    // Google button (web gets CSS gradient, native gets solid)
    googleBtn: {
        width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 15, borderRadius: 14, gap: 12, marginBottom: 18,
    },
    googleBtnNative: {
        backgroundColor: '#A855F7',
    },
    gIcon:      { fontSize: 21, fontWeight: '700', color: '#ffffff' },
    googleText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },

    // Divider
    divider: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 18 },
    divLine:  { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
    divLabel: { color: '#555555', marginHorizontal: 14, fontSize: 12 },

    // Email button
    emailBtnInner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 15,
    },
    emailBtnNative: {
        width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 15, borderRadius: 14,
        borderWidth: 1, borderColor: 'rgba(168,85,247,0.6)',
        backgroundColor: 'transparent', marginBottom: 20,
    },
    emailBtnText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },

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
        backgroundColor: '#A855F7', paddingVertical: 16, borderRadius: 14,
        marginTop: 22, marginBottom: 6,
        shadowColor: '#A855F7', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
    },
    submitSecondary: { backgroundColor: 'rgba(168,85,247,0.5)' },
    btnDisabled:     { opacity: 0.6 },
    submitText:      { color: '#fff', fontSize: 15, fontWeight: '700' },

    // Back
    backWrap: { marginTop: 10, paddingVertical: 8, width: '100%', alignItems: 'center' },
    backText: { color: '#A855F7', fontSize: 14, fontWeight: '500' },

    // Error
    errText: { color: '#ff6b6b', fontSize: 13, marginTop: 8, marginBottom: 4, textAlign: 'center' },

    // Info (OTP step)
    infoBox:   {
        width: '100%', borderRadius: 16, padding: 22, marginBottom: 22,
        borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)',
        backgroundColor: 'rgba(168,85,247,0.06)',
    },
    infoEmoji: { fontSize: 36, textAlign: 'center', marginBottom: 12 },
    infoText:  { color: '#888888', fontSize: 14, lineHeight: 21, textAlign: 'center' },
    infoHL:    { color: '#A855F7', fontWeight: '600' },

    // Terms
    termsRow: {
        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
        alignItems: 'center', marginTop: 6,
    },
    terms:    { fontSize: 12, color: '#555555', lineHeight: 18 },
    termLink: { fontSize: 12, color: '#A855F7', lineHeight: 18, textDecorationLine: 'underline' },

    // Footer
    footerRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 44 },
    footerText: { fontSize: 11, color: '#333333', letterSpacing: 0.5 },
    sparkle:    { fontSize: 12, color: '#A855F7' },
});
