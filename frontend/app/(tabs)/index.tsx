import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getProductivity, getTasks } from '../api';
import { useTheme } from '../../context/ThemeContext';

export default function Dashboard() {
    const { colors } = useTheme();
    const [data, setData] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        Promise.all([getProductivity(), getTasks()])
            .then(([prodRes, taskRes]) => {
                setData(prodRes.data);
                setTasks(taskRes.data.tasks || []);
            })
            .catch(() => {/* silent — already handled via empty state */})
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const getCategoryData = () => {
        const cats: Record<string, number> = {};
        tasks.forEach((t: any) => { const c = t.category || 'general'; cats[c] = (cats[c] || 0) + 1; });
        const total = tasks.length || 1;
        const catColors = ['#7C5CFF', '#14B8A6', '#F59E0B', '#EF4444', '#60A5FA', '#EC4899'];
        return Object.entries(cats).map(([name, count], i) => ({
            name, count, percent: Math.round((count / total) * 100),
            color: catColors[i % catColors.length],
        }));
    };

    const getDailyData = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayCounts: Record<string, number> = {};
        days.forEach(d => { dayCounts[d] = 0; });
        tasks.forEach((t: any) => { const day = days[new Date(t.started_at).getDay()]; dayCounts[day]++; });
        const maxCount = Math.max(...Object.values(dayCounts), 1);
        return days.map(day => ({
            day, count: dayCounts[day],
            height: Math.max((dayCounts[day] / maxCount) * 100, 8),
        }));
    };

    const scoreColor = (score: number) => score >= 70 ? '#4ADE80' : score >= 40 ? '#F59E0B' : '#EF4444';

    const getStreak = () => {
        const history: any[] = data?.history ?? [];
        if (!history.length) return 0;
        const sorted = [...history].sort((a, b) => b.score_date.localeCompare(a.score_date));
        let streak = 0;
        for (let i = 0; i < sorted.length; i++) {
            const expected = new Date();
            expected.setDate(expected.getDate() - i);
            if (sorted[i].score_date === expected.toISOString().slice(0, 10)) streak++;
            else break;
        }
        return streak;
    };

    const getTrendData = () => {
        const history: any[] = data?.history ?? [];
        return [...history]
            .sort((a, b) => a.score_date.localeCompare(b.score_date))
            .map(h => ({
                score: h.score ?? 0,
                date: new Date(h.score_date).toLocaleDateString('en-US', { weekday: 'short' }),
                color: scoreColor(h.score ?? 0),
            }));
    };

    const getTimeSaved = () => {
        const repetitive = data?.repetitive_count ?? 0;
        const minutesSaved = repetitive * 3;
        if (minutesSaved < 60) return `${minutesSaved} min`;
        return `${(minutesSaved / 60).toFixed(1)} hrs`;
    };

    const categoryData = getCategoryData();
    const dailyData = getDailyData();
    const streak = getStreak();
    const trendData = getTrendData();
    const s = makeStyles(colors);

    if (loading) {
        return (
            <View style={[s.container, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
                <ActivityIndicator color={colors.accent} size="large" />
                <Text style={[s.loadingText, { marginTop: 16 }]}>Loading your productivity data…</Text>
            </View>
        );
    }

    return (
        <ScrollView style={s.container}>
            <View style={s.header}>
                <View>
                    <Text style={s.greeting}>FlowOptix</Text>
                    <Text style={s.subtitle}>Your productivity intelligence</Text>
                </View>
                <TouchableOpacity onPress={load} style={s.refreshBtn} testID="dashboard-refresh-button" accessibilityLabel="dashboard-refresh-button">
                    <Text style={s.refreshText}>↻</Text>
                </TouchableOpacity>
            </View>

            {/* Score Card */}
            <View style={s.scoreCard}>
                <Text style={s.scoreLabel}>PRODUCTIVITY SCORE</Text>
                <Text style={[s.scoreValue, { color: scoreColor(data?.score ?? 0) }]}>
                    {data?.score ?? 0}
                </Text>
                <Text style={s.scoreMax}>/100</Text>
                {data?.ai?.rating && (
                    <View style={[s.ratingBadge, {
                        backgroundColor: data.ai.rating === 'poor' ? '#2D1515' :
                            data.ai.rating === 'fair' ? '#2D2515' : '#152D1B',
                    }]}>
                        <Text style={[s.ratingText, {
                            color: data.ai.rating === 'poor' ? '#F87171' :
                                data.ai.rating === 'fair' ? '#FBBF24' : '#4ADE80',
                        }]}>
                            {data.ai.rating.toUpperCase()}
                        </Text>
                    </View>
                )}
            </View>

            {/* AI Insight */}
            {data?.ai?.insight && (
                <View style={s.insightCard}>
                    <Text style={s.insightLabel}>🧠 AI Insight</Text>
                    <Text style={s.insightText}>{data.ai.insight}</Text>
                    {data.ai.top_tip && (
                        <View style={s.tipBox}>
                            <Text style={s.tipLabel}>💡 Tip</Text>
                            <Text style={s.tipText}>{data.ai.top_tip}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Stats Row */}
            <View style={s.statsRow}>
                <View style={s.statBox}>
                    <Text style={s.statVal}>{data?.tasks_completed ?? 0}</Text>
                    <Text style={s.statLabel}>Tasks</Text>
                </View>
                <View style={s.statBox}>
                    <Text style={[s.statVal, { color: '#F59E0B' }]}>{data?.repetitive_count ?? 0}</Text>
                    <Text style={s.statLabel}>Repetitive</Text>
                </View>
                <View style={s.statBox}>
                    <Text style={[s.statVal, { color: colors.accent }]}>{data?.breakdown?.patterns_found ?? 0}</Text>
                    <Text style={s.statLabel}>Patterns</Text>
                </View>
                <View style={s.statBox}>
                    <Text style={[s.statVal, { color: '#14B8A6' }]}>{streak}</Text>
                    <Text style={s.statLabel}>🔥 Streak</Text>
                </View>
            </View>

            {/* Time Saved Widget */}
            {(data?.repetitive_count ?? 0) > 0 && (
                <View style={s.timeSavedCard}>
                    <Text style={s.timeSavedIcon}>⚡</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={s.timeSavedTitle}>Potential Time Savings</Text>
                        <Text style={s.timeSavedSub}>Automating repetitive tasks could save you ~{getTimeSaved()} per week</Text>
                    </View>
                </View>
            )}

            {/* Score Trend */}
            {trendData.length > 1 && (
                <View style={s.chartCard}>
                    <View style={s.chartHeader}>
                        <Text style={s.chartTitle}>Score Trend</Text>
                        <Text style={s.chartFilter}>{trendData.length} DAYS</Text>
                    </View>
                    <View style={s.trendChart}>
                        {trendData.map((d, i) => (
                            <View key={i} style={s.trendCol}>
                                <Text style={s.trendVal}>{d.score}</Text>
                                <View style={[s.trendBar, {
                                    height: Math.max((d.score / 100) * 80, 6),
                                    backgroundColor: d.color,
                                }]} />
                                <Text style={s.trendLabel}>{d.date.slice(0, 2)}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Weekly Activity */}
            <View style={s.chartCard}>
                <View style={s.chartHeader}>
                    <Text style={s.chartTitle}>Weekly Activity</Text>
                    <Text style={s.chartFilter}>7 DAYS</Text>
                </View>
                <View style={s.barChart}>
                    {dailyData.map((d, i) => (
                        <View key={i} style={s.barCol}>
                            <View style={[s.bar, {
                                height: d.height,
                                backgroundColor: d.count > 0 ? colors.accent : colors.border,
                            }]}>
                                {d.count > 0 && <Text style={s.barValue}>{d.count}</Text>}
                            </View>
                            <Text style={s.barLabel}>{d.day}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Category Breakdown */}
            <View style={s.chartCard}>
                <View style={s.chartHeader}>
                    <Text style={s.chartTitle}>Category Breakdown</Text>
                    <Text style={s.chartFilter}>{tasks.length} TASKS</Text>
                </View>
                {categoryData.length === 0 ? (
                    <Text style={s.emptyChart}>No tasks logged yet</Text>
                ) : (
                    categoryData.map((cat, i) => (
                        <View key={i} style={s.catRow}>
                            <View style={s.catInfo}>
                                <View style={[s.catDot, { backgroundColor: cat.color }]} />
                                <Text style={s.catName}>{cat.name}</Text>
                            </View>
                            <View style={s.catBarBg}>
                                <View style={[s.catBarFill, { width: `${cat.percent}%`, backgroundColor: cat.color }]} />
                            </View>
                            <Text style={s.catPercent}>{cat.percent}%</Text>
                        </View>
                    ))
                )}
            </View>

            {/* Score Breakdown — live data from task_logs */}
            <View style={s.chartCard}>
                <View style={s.chartHeader}>
                    <Text style={s.chartTitle}>Score Breakdown</Text>
                </View>
                <View style={s.breakdownList}>
                    <View style={s.breakdownRow}>
                        <Text style={s.breakdownLabel}>Total Tasks</Text>
                        <Text style={s.breakdownVal}>{data?.breakdown?.total_tasks ?? 0}</Text>
                    </View>
                    <View style={s.breakdownRow}>
                        <Text style={s.breakdownLabel}>Unique Tasks</Text>
                        <Text style={s.breakdownVal}>{data?.breakdown?.unique_tasks ?? 0}</Text>
                    </View>
                    <View style={s.breakdownRow}>
                        <Text style={s.breakdownLabel}>Repetitive Tasks</Text>
                        <Text style={[s.breakdownVal, { color: '#F59E0B' }]}>{data?.repetitive_count ?? 0}</Text>
                    </View>
                    <View style={s.breakdownRow}>
                        <Text style={s.breakdownLabel}>Repetitive Ratio</Text>
                        <Text style={[s.breakdownVal, { color: '#F59E0B' }]}>{data?.breakdown?.repetitive_ratio ?? '0%'}</Text>
                    </View>
                    <View style={[s.breakdownRow, { borderBottomWidth: 0 }]}>
                        <Text style={s.breakdownLabel}>Patterns Found</Text>
                        <Text style={[s.breakdownVal, { color: colors.accent }]}>{data?.breakdown?.patterns_found ?? 0}</Text>
                    </View>
                </View>
            </View>

            {/* Recent Tasks */}
            <View style={s.chartCard}>
                <View style={s.chartHeader}>
                    <Text style={s.chartTitle}>Recent Tasks</Text>
                    <Text style={s.chartFilter}>{tasks.length} TOTAL</Text>
                </View>
                {tasks.length === 0 ? (
                    <Text style={s.emptyChart}>No tasks yet — go to Log Task to start</Text>
                ) : (
                    tasks.slice(0, 8).map((t: any, i: number) => (
                        <View key={i} style={[s.taskRow, i === Math.min(tasks.length, 8) - 1 && { borderBottomWidth: 0 }]}>
                            <View style={[s.taskDot, { backgroundColor: catColor(t.category) }]} />
                            <View style={{ flex: 1 }}>
                                <Text style={s.taskName}>{t.task_name}</Text>
                                <Text style={s.taskCat}>{t.category}</Text>
                            </View>
                            {t.source && t.source !== 'manual' && (
                                <View style={[s.sourceBadge, { backgroundColor: SOURCE_COLORS[t.source]?.bg ?? '#1E1E2E' }]}>
                                    <Text style={{ fontSize: 10 }}>{SOURCE_ICONS[t.source] ?? '🤖'}</Text>
                                    <Text style={[s.sourceBadgeText, { color: SOURCE_COLORS[t.source]?.text ?? '#6A6A7A' }]}>{t.source}</Text>
                                </View>
                            )}
                            <Text style={s.taskTime}>
                                {t.duration_seconds >= 60
                                    ? `${Math.round(t.duration_seconds / 60)}m`
                                    : `${t.duration_seconds}s`}
                            </Text>
                        </View>
                    ))
                )}
            </View>

            {/* Auto-detected summary */}
            {tasks.filter((t: any) => t.source && t.source !== 'manual').length > 0 && (
                <View style={s.autoDetectCard}>
                    <Text style={s.autoDetectTitle}>Auto-detected this session</Text>
                    <View style={s.autoDetectRow}>
                        {(['gmail', 'calendar', 'browser', 'screen_time'] as const).map(src => {
                            const count = tasks.filter((t: any) => t.source === src).length;
                            if (count === 0) return null;
                            return (
                                <View key={src} style={s.autoDetectChip}>
                                    <Text style={{ fontSize: 14 }}>{SOURCE_ICONS[src]}</Text>
                                    <Text style={s.autoDetectCount}>{count}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const SOURCE_ICONS: Record<string, string> = {
    gmail: '📧', calendar: '📅', browser: '🌐', screen_time: '📱',
};
const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
    gmail:       { bg: '#2D0F0F', text: '#F87171' },
    calendar:    { bg: '#0F1A2D', text: '#60A5FA' },
    browser:     { bg: '#0F2D2A', text: '#14B8A6' },
    screen_time: { bg: '#152D1B', text: '#4ADE80' },
};

const CAT_COLORS: Record<string, string> = {
    'file ops': '#14B8A6', communication: '#F59E0B', development: '#7C5CFF',
    reporting: '#60A5FA', admin: '#EC4899', general: '#6A6A7A',
};
const catColor = (cat: string) => CAT_COLORS[cat] ?? '#7C5CFF';

const makeStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 20 },
    greeting: { fontSize: 28, fontWeight: 'bold', color: colors.accent },
    subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
    refreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' },
    refreshText: { color: colors.accent, fontSize: 20 },
    loadingText: { color: colors.muted, textAlign: 'center' },

    scoreCard: { backgroundColor: colors.card, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: colors.border },
    scoreLabel: { color: colors.muted, fontSize: 11, fontWeight: '500', letterSpacing: 2, marginBottom: 8 },
    scoreValue: { fontSize: 80, fontWeight: 'bold', lineHeight: 88 },
    scoreMax: { color: colors.muted, fontSize: 16, marginTop: -4 },
    ratingBadge: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 100, marginTop: 10 },
    ratingText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },

    insightCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(124,92,255,0.2)' },
    insightLabel: { color: colors.accent, fontSize: 12, fontWeight: '600', marginBottom: 8 },
    insightText: { color: colors.subtext, fontSize: 13, lineHeight: 20 },
    tipBox: { backgroundColor: colors.bg, borderRadius: 10, padding: 12, marginTop: 10 },
    tipLabel: { color: '#F59E0B', fontSize: 11, fontWeight: '600', marginBottom: 4 },
    tipText: { color: colors.text, fontSize: 12, lineHeight: 18 },

    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    statBox: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    statVal: { color: colors.text, fontSize: 26, fontWeight: 'bold' },
    statLabel: { color: colors.muted, fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

    timeSavedCard: {
        backgroundColor: 'rgba(20,184,166,0.1)', borderRadius: 14, padding: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14,
        borderWidth: 1, borderColor: 'rgba(20,184,166,0.3)',
    },
    timeSavedIcon: { fontSize: 26 },
    timeSavedTitle: { color: '#14B8A6', fontSize: 13, fontWeight: '700', marginBottom: 3 },
    timeSavedSub: { color: colors.subtext, fontSize: 12, lineHeight: 17 },

    chartCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    chartTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
    chartFilter: { color: colors.muted, fontSize: 10, letterSpacing: 1 },
    emptyChart: { color: colors.muted, textAlign: 'center', padding: 20, fontSize: 13 },

    trendChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 110, paddingTop: 8 },
    trendCol: { alignItems: 'center', flex: 1 },
    trendVal: { color: colors.muted, fontSize: 9, marginBottom: 4 },
    trendBar: { width: 26, borderRadius: 5, minHeight: 6 },
    trendLabel: { color: colors.muted, fontSize: 10, marginTop: 6 },

    barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, paddingTop: 10 },
    barCol: { alignItems: 'center', flex: 1 },
    bar: { width: 28, borderRadius: 6, minHeight: 8, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 4 },
    barValue: { color: '#fff', fontSize: 10, fontWeight: '700' },
    barLabel: { color: colors.muted, fontSize: 10, marginTop: 6 },

    catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    catInfo: { flexDirection: 'row', alignItems: 'center', width: 110, gap: 6 },
    catDot: { width: 8, height: 8, borderRadius: 4 },
    catName: { color: colors.subtext, fontSize: 12 },
    catBarBg: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
    catBarFill: { height: 8, borderRadius: 4 },
    catPercent: { color: colors.text, fontSize: 12, fontWeight: '600', width: 36, textAlign: 'right' },

    breakdownList: {},
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    breakdownLabel: { color: colors.subtext, fontSize: 13 },
    breakdownVal: { color: colors.text, fontSize: 14, fontWeight: '600' },

    taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
    taskDot: { width: 7, height: 7, borderRadius: 4 },
    taskName: { color: colors.text, fontSize: 13 },
    taskCat: { color: colors.muted, fontSize: 11, marginTop: 2 },
    taskTime: { color: colors.muted, fontSize: 12 },

    sourceBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    sourceBadgeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

    autoDetectCard: {
        backgroundColor: 'rgba(124,92,255,0.08)', borderRadius: 14, padding: 14,
        marginBottom: 14, borderWidth: 1, borderColor: 'rgba(124,92,255,0.2)',
    },
    autoDetectTitle: { color: colors.accent, fontSize: 12, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5 },
    autoDetectRow: { flexDirection: 'row', gap: 10 },
    autoDetectChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
        borderWidth: 1, borderColor: colors.border,
    },
    autoDetectCount: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
