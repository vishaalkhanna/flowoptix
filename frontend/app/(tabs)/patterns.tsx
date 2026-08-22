import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { getPatterns, analyzePatterns, logExecution } from '../api';
import { useTheme } from '../../context/ThemeContext';
import Toast, { ToastType } from '../../components/Toast';
import EmailModal from '../../components/EmailModal';

export default function Patterns() {
    const { colors } = useTheme();
    const [patterns, setPatterns] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [executing, setExecuting] = useState<number | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
    const [emailModal, setEmailModal] = useState(false);
    const showToast = (msg: string, type: ToastType = 'success') => setToast({ msg, type });

    const openUrl = async (url: string) => {
        const supported = await Linking.canOpenURL(url);
        if (!supported) throw new Error(`Cannot open ${url}`);
        await Linking.openURL(url);
    };

    const executePattern = async (p: any, i: number) => {
        setExecuting(i);
        try {
            const name: string = (p.pattern_name ?? '').toLowerCase();
            if (name.includes('file') || name.includes('excel') || name.includes('data') || name.includes('spread')) {
                await openUrl('https://docs.google.com/spreadsheets');
                await logExecution('pattern_automation', { pattern: p.pattern_name, action: 'open_sheets' }, 'success');
                showToast('Google Sheets opened', 'success');
            } else if (name.includes('communication') || name.includes('email') || name.includes('slack') || name.includes('message')) {
                setEmailModal(true);
                await logExecution('pattern_automation', { pattern: p.pattern_name, action: 'email_draft' }, 'success');
            } else if (name.includes('dev') || name.includes('code') || name.includes('pr') || name.includes('git')) {
                await openUrl('https://vscode.dev');
                await openUrl('https://github.com');
                await logExecution('pattern_automation', { pattern: p.pattern_name, action: 'open_dev_tools' }, 'success');
                showToast('VS Code + GitHub opened', 'success');
            } else if (name.includes('meet') || name.includes('call') || name.includes('calendar')) {
                await openUrl('https://calendar.google.com');
                await logExecution('pattern_automation', { pattern: p.pattern_name, action: 'open_calendar' }, 'success');
                showToast('Google Calendar opened', 'success');
            } else {
                await openUrl('https://flowoptix-ten.vercel.app');
                await logExecution('pattern_automation', { pattern: p.pattern_name, action: 'open_productivity_hub' }, 'success');
                showToast('Opening FlowOptix dashboard', 'info');
            }
        } catch {
            await logExecution('pattern_automation', { pattern: p.pattern_name }, 'failed');
            showToast('Automation failed', 'error');
        } finally {
            setExecuting(null);
        }
    };

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await getPatterns();
            setPatterns(res.data.patterns || []);
        } catch (err: any) {
            setError(err.message ?? 'Failed to load patterns');
        } finally {
            setLoading(false);
        }
    };

    const notify = (patternCount: number) => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        const send = () => new Notification('FlowOptix — Analysis complete', {
            body: patternCount > 0
                ? `Claude detected ${patternCount} workflow pattern${patternCount > 1 ? 's' : ''}. Tap to review.`
                : 'Analysis complete. Log more tasks to detect patterns.',
            icon: '/favicon.ico',
        });
        if (Notification.permission === 'granted') {
            send();
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(p => { if (p === 'granted') send(); });
        }
    };

    const runAnalysis = async () => {
        setAnalyzing(true);
        setError('');
        try {
            const res = await analyzePatterns();
            const newPatterns = res.patterns || [];
            setPatterns(newPatterns);
            setSuggestions(res.suggestions || []);
            setSummary(res.summary || '');
            notify(newPatterns.length);
        } catch (err: any) {
            setError(err.message ?? 'Analysis failed');
        } finally {
            setAnalyzing(false);
        }
    };

    useEffect(() => { load(); }, []);

    const s = makeStyles(colors);

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <ScrollView style={s.container}>
                <Text style={s.title}>AI Pattern Analysis</Text>
                <Text style={s.subtitle}>Powered by Claude — real insights from your workflow</Text>

                <TouchableOpacity
                    style={[s.analyzeBtn, analyzing && s.btnDisabled]}
                    onPress={runAnalysis}
                    disabled={analyzing}
                >
                    {analyzing
                        ? <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                        : <Text style={s.analyzeBtnIcon}>✦</Text>
                    }
                    <Text style={s.analyzeBtnText}>
                        {analyzing ? 'Claude is analysing...' : 'Analyse with Claude'}
                    </Text>
                </TouchableOpacity>

                {error ? <Text style={s.errorText}>{error}</Text> : null}

                {summary ? (
                    <View style={s.summaryCard}>
                        <Text style={s.summaryLabel}>🧠 Claude's Summary</Text>
                        <Text style={s.summaryText}>{summary}</Text>
                    </View>
                ) : null}

                {loading ? (
                    <Text style={s.loading}>Loading patterns...</Text>
                ) : patterns.length === 0 ? (
                    <View style={s.emptyBox}>
                        <Text style={s.emptyTitle}>No patterns yet</Text>
                        <Text style={s.emptyDesc}>Log some tasks, then tap "Analyse with Claude" to detect your workflow patterns.</Text>
                    </View>
                ) : (
                    <>
                        <Text style={s.sectionLabel}>DETECTED PATTERNS</Text>
                        {patterns.map((p: any, i: number) => (
                            <View key={i} style={s.card}>
                                <View style={s.cardHeader}>
                                    <Text style={s.patternName}>{p.pattern_name}</Text>
                                    <Text style={s.frequency}>×{p.frequency}</Text>
                                </View>

                                {p.task_sequence?.length > 0 && (
                                    <View style={s.sequenceRow}>
                                        {p.task_sequence.map((t: string, j: number) => (
                                            <View key={j} style={s.sequenceChip}>
                                                <Text style={s.sequenceText}>{t}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                <View style={s.statsRow}>
                                    <View style={s.statChip}>
                                        <Text style={s.statVal}>{Math.round(p.confidence_score * 100)}%</Text>
                                        <Text style={s.statLabel}>confidence</Text>
                                    </View>
                                    <View style={s.statChip}>
                                        <Text style={s.statVal}>×{p.frequency}</Text>
                                        <Text style={s.statLabel}>occurrences</Text>
                                    </View>
                                </View>

                                {p.automation_suggestions?.map((sg: any, j: number) => (
                                    <View key={j} style={s.suggestionBox}>
                                        <Text style={s.suggestionLabel}>💡 {sg.suggestion_text}</Text>
                                        {sg.tool_hint && (
                                            <View style={s.toolBadge}>
                                                <Text style={s.toolText}>🔧 {sg.tool_hint}</Text>
                                            </View>
                                        )}
                                    </View>
                                ))}

                                <TouchableOpacity
                                    style={s.executeBtn}
                                    onPress={() => executePattern(p, i)}
                                    disabled={executing === i}
                                >
                                    {executing === i ? (
                                        <ActivityIndicator color={colors.accent} size="small" />
                                    ) : (
                                        <Text style={s.executeBtnText}>⚡ Execute Automation</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ))}
                    </>
                )}

                {suggestions.length > 0 && (
                    <>
                        <Text style={s.sectionLabel}>AUTOMATION SUGGESTIONS</Text>
                        {suggestions.map((sg: any, i: number) => (
                            <View key={i} style={s.suggestionCard}>
                                <Text style={s.suggestionCardText}>{sg.suggestion_text}</Text>
                                {sg.tool_hint && (
                                    <View style={s.toolBadge}>
                                        <Text style={s.toolText}>🔧 {sg.tool_hint}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>

            <EmailModal
                visible={emailModal}
                onClose={() => setEmailModal(false)}
                onSuccess={msg => { setEmailModal(false); showToast(msg, 'success'); }}
                onError={msg => showToast(msg, 'error')}
            />

            {toast && <Toast message={toast.msg} type={toast.type} onHide={() => setToast(null)} />}
        </View>
    );
}

const makeStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginTop: 20 },
    subtitle: { color: colors.accent, fontSize: 13, marginBottom: 20, marginTop: 4 },

    analyzeBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16,
        marginBottom: 16, gap: 8,
    },
    btnDisabled: { opacity: 0.6 },
    analyzeBtnIcon: { color: '#fff', fontSize: 16 },
    analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

    errorText: { color: colors.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' },

    summaryCard: {
        backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 16,
        borderWidth: 1, borderColor: 'rgba(124,92,255,0.3)',
    },
    summaryLabel: { color: colors.accent, fontSize: 12, fontWeight: '600', marginBottom: 8 },
    summaryText: { color: colors.subtext, fontSize: 13, lineHeight: 20 },

    loading: { color: colors.muted, textAlign: 'center', marginTop: 40, fontSize: 14 },

    emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
    emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 8 },
    emptyDesc: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },

    sectionLabel: {
        color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1.5,
        marginBottom: 10, marginTop: 4,
    },
    card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    patternName: { color: colors.text, fontSize: 15, fontWeight: 'bold', flex: 1 },
    frequency: { color: colors.accent, fontSize: 18, fontWeight: 'bold' },

    sequenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    sequenceChip: { backgroundColor: colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    sequenceText: { color: colors.subtext, fontSize: 11 },

    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    statChip: { flex: 1, backgroundColor: colors.bg, borderRadius: 8, padding: 8, alignItems: 'center' },
    statVal: { color: colors.text, fontSize: 14, fontWeight: 'bold' },
    statLabel: { color: colors.muted, fontSize: 10, marginTop: 2 },

    suggestionBox: { backgroundColor: colors.bg, borderRadius: 10, padding: 12, marginTop: 4 },
    suggestionLabel: { color: colors.subtext, fontSize: 13, lineHeight: 20, marginBottom: 6 },

    suggestionCard: {
        backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: colors.border,
    },
    suggestionCardText: { color: colors.subtext, fontSize: 13, lineHeight: 20, marginBottom: 8 },

    toolBadge: { backgroundColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start', marginTop: 4 },
    toolText: { color: colors.accent, fontSize: 12, fontWeight: '500' },

    executeBtn: {
        backgroundColor: 'rgba(124,92,255,0.12)', borderRadius: 10,
        paddingVertical: 10, alignItems: 'center', marginTop: 12,
        borderWidth: 1, borderColor: 'rgba(124,92,255,0.3)',
    },
    executeBtnText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
});
