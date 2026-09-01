import { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Alert, ScrollView, ActivityIndicator, Platform, Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { logTask, logExecution, exportTasksCSV } from '../api';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import Toast, { ToastType } from '../../components/Toast';
import EmailModal from '../../components/EmailModal';

const haptic = {
    light:   () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); },
    medium:  () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); },
    success: () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
    error:   () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); },
};

// ── action map ─────────────────────────────────────────────────────────────
type ActionType = 'url' | 'email' | 'file_picker' | 'report' | 'workspace';
interface QuickAction { type: ActionType; url?: string; subject?: string; body?: string }

const TASK_ACTIONS: Record<string, QuickAction> = {
    'Open Excel':          { type: 'url', url: 'https://www.office.com/launch/excel' },
    'Copy Data':           { type: 'url', url: 'https://www.office.com/launch/excel' },
    'Upload File':         { type: 'file_picker' },
    'Download Report':     { type: 'report' },
    'Send Email':          { type: 'email', subject: 'Following up', body: 'Hi,\n\n' },
    'Reply to Email':      { type: 'email', subject: 'Re: ', body: 'Thanks for your email.\n\n' },
    'Check Slack':         { type: 'url', url: 'https://app.slack.com' },
    'Join Meeting':        { type: 'url', url: 'https://meet.google.com' },
    'Write Code':          { type: 'url', url: 'https://vscode.dev' },
    'Review PR':           { type: 'url', url: 'https://github.com' },
    'Fix Bug':             { type: 'url', url: 'https://vscode.dev' },
    'Deploy App':          { type: 'url', url: 'https://github.com' },
    'Generate Report':     { type: 'report' },
    'Update Dashboard':    { type: 'url', url: 'https://docs.google.com/spreadsheets' },
    'Create Presentation': { type: 'url', url: 'https://www.office.com/launch/powerpoint' },
    'Update Jira Ticket':  { type: 'url', url: 'https://www.atlassian.com/software/jira' },
    'Fill Timesheet':      { type: 'url', url: 'https://docs.google.com/spreadsheets' },
    'Attend Standup':      { type: 'url', url: 'https://meet.google.com' },
};

const ACTION_ICON: Record<ActionType, string> = {
    url: '↗', email: '✉', file_picker: '📁', report: '⬇', workspace: '⊞',
};

const QUICK_TASKS = [
    { name: 'Open Excel',          category: 'file ops' },
    { name: 'Copy Data',           category: 'file ops' },
    { name: 'Upload File',         category: 'file ops' },
    { name: 'Download Report',     category: 'file ops' },
    { name: 'Send Email',          category: 'communication' },
    { name: 'Reply to Email',      category: 'communication' },
    { name: 'Check Slack',         category: 'communication' },
    { name: 'Join Meeting',        category: 'communication' },
    { name: 'Write Code',          category: 'development' },
    { name: 'Review PR',           category: 'development' },
    { name: 'Fix Bug',             category: 'development' },
    { name: 'Deploy App',          category: 'development' },
    { name: 'Generate Report',     category: 'reporting' },
    { name: 'Update Dashboard',    category: 'reporting' },
    { name: 'Create Presentation', category: 'reporting' },
    { name: 'Update Jira Ticket',  category: 'admin' },
    { name: 'Fill Timesheet',      category: 'admin' },
    { name: 'Attend Standup',      category: 'admin' },
];

type Tab = 'log' | 'timer' | 'history';

export default function TaskLogger() {
    const { colors } = useTheme();
    const [activeTab, setActiveTab] = useState<Tab>('log');

    // toast
    const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
    const showToast = (msg: string, type: ToastType = 'success') => setToast({ msg, type });

    // email modal
    const [emailModal, setEmailModal] = useState<{ subject: string; body: string } | null>(null);

    // log tab
    const [taskName, setTaskName] = useState('');
    const [category, setCategory] = useState('');

    // timer tab
    const [timerRunning, setTimerRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [timerTask, setTimerTask] = useState('');
    const [timerCat, setTimerCat] = useState('');
    const startTime = useRef(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // history tab
    const [allTasks, setAllTasks] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [historyLoading, setHistoryLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const historyLoaded = useRef(false);

    useEffect(() => {
        if (activeTab === 'history' && !historyLoaded.current) loadHistory();
    }, [activeTab]);

    useEffect(() => {
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    const loadHistory = async () => {
        setHistoryLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setHistoryLoading(false); return; }
        const { data } = await supabase
            .from('task_logs').select('*').eq('user_id', user.id)
            .order('started_at', { ascending: false });
        const fetched = data ?? [];
        const fetchedIds = new Set(fetched.map((r: any) => r.id));
        // Preserve in-flight optimistic rows that haven't landed yet
        setAllTasks(prev => {
            const stillPending = prev.filter(t => t._pending && !fetchedIds.has(t.id));
            return [...stillPending, ...fetched];
        });
        historyLoaded.current = true;
        setHistoryLoading(false);
    };

    // ── execute real action ────────────────────────────────────────────────
    const executeAction = async (taskNameKey: string) => {
        const action = TASK_ACTIONS[taskNameKey];
        if (!action) return;

        if (action.type === 'url' && action.url) {
            const supported = await Linking.canOpenURL(action.url);
            if (!supported) { showToast(`Cannot open ${taskNameKey}`, 'error'); return; }
            await Linking.openURL(action.url);
            await logExecution('open_app', { url: action.url }, 'success', `Opened ${taskNameKey}`);
            showToast(`✓ Logged + ${taskNameKey} opened`, 'success');
        } else if (action.type === 'email') {
            setEmailModal({ subject: action.subject ?? '', body: action.body ?? '' });
        } else if (action.type === 'file_picker') {
            if (typeof window !== 'undefined') {
                const input = document.createElement('input');
                input.type = 'file';
                input.onchange = async () => {
                    const fname = input.files?.[0]?.name ?? 'file';
                    await logExecution('file_export', { filename: fname }, 'success', `Uploaded ${fname}`);
                    showToast(`✓ Logged + ${fname} selected`, 'success');
                };
                input.click();
            }
        } else if (action.type === 'report') {
            try {
                await exportTasksCSV();
                await logExecution('file_export', { format: 'csv' }, 'success', 'Exported tasks CSV');
                showToast('✓ Logged + Report downloaded!', 'success');
            } catch {
                showToast('Logged — but report download failed. Try again from Automations.', 'warning');
            }
        }
    };

    const handleLog = (name = taskName, cat = category) => {
        const trimmed = name.trim();
        if (!trimmed) return Alert.alert('Task name required', 'Please enter a task name');

        haptic.light();

        // Optimistic: show row and clear inputs immediately
        const tempId = `temp-${Date.now()}`;
        setAllTasks(prev => [{
            id: tempId,
            task_name: trimmed,
            category: cat || 'general',
            duration_seconds: 30,
            started_at: new Date().toISOString(),
            source: 'manual',
            _pending: true,
        }, ...prev]);
        setTaskName(''); setCategory('');

        // Trigger URL/email/etc. action without blocking
        const action = TASK_ACTIONS[trimmed];
        if (!action) {
            showToast(`✓ "${trimmed}" logged`, 'success');
        } else {
            executeAction(trimmed);
        }

        // Background network call — replace or remove temp row on settle
        logTask(trimmed, cat || 'general', 30)
            .then(result => {
                const real = result?.task as any;
                setAllTasks(prev => prev.map(t =>
                    t.id === tempId ? (real ?? { ...t, _pending: false }) : t
                ));
                haptic.success();
            })
            .catch((err: any) => {
                setAllTasks(prev => prev.filter(t => t.id !== tempId));
                showToast(err?.message || 'Could not log task — please try again.', 'error');
                haptic.error();
            });
    };

    const startTimer = () => {
        if (!timerTask.trim()) { showToast('Enter a task name first', 'info'); return; }
        haptic.medium();
        startTime.current = Date.now();
        setElapsed(0);
        setTimerRunning(true);
        intervalRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
        }, 1000);
    };

    const stopTimer = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimerRunning(false);
        const duration = Math.max(elapsed, 1);
        const name = timerTask.trim();
        const cat = timerCat.trim() || 'general';

        haptic.medium();

        // Optimistic: show row and clear inputs immediately
        const tempId = `temp-${Date.now()}`;
        setAllTasks(prev => [{
            id: tempId,
            task_name: name,
            category: cat,
            duration_seconds: duration,
            started_at: new Date().toISOString(),
            source: 'manual',
            _pending: true,
        }, ...prev]);
        setTimerTask(''); setTimerCat(''); setElapsed(0);

        logTask(name, cat, duration)
            .then(result => {
                const real = result?.task as any;
                setAllTasks(prev => prev.map(t =>
                    t.id === tempId ? (real ?? { ...t, _pending: false }) : t
                ));
                showToast(`Saved "${name}" — ${formatTime(duration)}`, 'success');
                haptic.success();
            })
            .catch((err: any) => {
                setAllTasks(prev => prev.filter(t => t.id !== tempId));
                showToast(err?.message || 'Could not save task', 'error');
                haptic.error();
            });
    };

    const deleteTask = async (id: string) => {
        setDeletingId(id);
        try {
            await supabase.from('task_logs').delete().eq('id', id);
            setAllTasks(prev => prev.filter(t => t.id !== id));
            showToast('Task deleted', 'info');
        } catch {
            showToast('Could not delete task', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const handleImportCSV = () => {
        if (Platform.OS !== 'web') { Alert.alert('Web only', 'CSV import only works on web'); return; }
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.csv';
        input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const text = await file.text();
            const lines = text.split('\n').filter((l: string) => l.trim());
            const header = lines[0].toLowerCase().split(',').map((h: string) => h.trim().replace(/"/g, ''));
            const nameIdx = header.indexOf('task_name');
            const catIdx = header.indexOf('category');
            const durIdx = header.indexOf('duration_seconds');
            if (nameIdx === -1) { showToast('CSV must have a task_name column', 'error'); return; }
            let imported = 0;
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map((c: string) => c.trim().replace(/"/g, ''));
                const name = cols[nameIdx];
                if (!name) continue;
                try {
                    await logTask(name, catIdx >= 0 ? cols[catIdx] || 'import' : 'import', durIdx >= 0 ? parseInt(cols[durIdx]) || 30 : 30);
                    imported++;
                } catch { /* skip */ }
            }
            showToast(`${imported} tasks imported`, 'success');
            setAllTasks([]);
        };
        input.click();
    };

    const categories = [...new Set(allTasks.map(t => t.category).filter(Boolean))];
    const filtered = allTasks.filter(t => {
        const ms = !search || t.task_name.toLowerCase().includes(search.toLowerCase());
        const mc = !filterCat || t.category === filterCat;
        return ms && mc;
    });
    const formatDur = (s: number) => s >= 60 ? `${Math.round(s / 60)}m` : `${s}s`;
    const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const s = makeStyles(colors);

    return (
        <View style={s.outer}>
            {/* ── tab switcher ── */}
            <View style={s.switcher}>
                {(['log', 'timer', 'history'] as Tab[]).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[s.switchBtn, activeTab === tab && s.switchBtnActive]}
                        onPress={() => setActiveTab(tab)}
                        testID={`tasks-tab-${tab}`}
                        accessibilityLabel={`tasks-tab-${tab}`}
                    >
                        <Text style={[s.switchBtnText, activeTab === tab && s.switchBtnTextActive]}>
                            {tab === 'log' ? '✏ Log' : tab === 'timer' ? '⏱ Timer' : '📋 History'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── LOG TAB ── */}
            {activeTab === 'log' && (
                <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
                    <Text style={s.label}>Task Name</Text>
                    <TextInput
                        style={s.input} placeholder="e.g. Write proposal"
                        placeholderTextColor={colors.muted} value={taskName} onChangeText={setTaskName}
                        testID="tasks-name-input" accessibilityLabel="tasks-name-input"
                    />
                    <Text style={s.label}>Category</Text>
                    <TextInput
                        style={s.input} placeholder="e.g. reporting"
                        placeholderTextColor={colors.muted} value={category} onChangeText={setCategory}
                        testID="tasks-category-input" accessibilityLabel="tasks-category-input"
                    />
                    <TouchableOpacity style={s.primaryBtn} onPress={() => handleLog()} testID="tasks-log-button" accessibilityLabel="tasks-log-button">
                        <Text style={s.primaryBtnText}>Log Task</Text>
                    </TouchableOpacity>

                    <Text style={s.sectionLabel}>QUICK LOG  <Text style={{ color: colors.muted, fontWeight: '400', letterSpacing: 0 }}>— logs + launches the real app</Text></Text>
                    {QUICK_TASKS.map((task, i) => {
                        const action = TASK_ACTIONS[task.name];
                        return (
                            <TouchableOpacity key={i} style={s.quickBtn} onPress={() => handleLog(task.name, task.category)} testID={`tasks-quicklog-${task.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`} accessibilityLabel={`tasks-quicklog-${task.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.quickBtnText}>{task.name}</Text>
                                    <Text style={s.quickBtnCat}>{task.category}</Text>
                                </View>
                                {action && (
                                    <View style={s.actionBadge}>
                                        <Text style={s.actionBadgeText}>{ACTION_ICON[action.type]}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}

            {/* ── TIMER TAB ── */}
            {activeTab === 'timer' && (
                <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
                    <TextInput
                        style={s.input} placeholder="What are you working on?"
                        placeholderTextColor={colors.muted} value={timerTask} onChangeText={setTimerTask}
                        editable={!timerRunning}
                        testID="tasks-timer-name-input" accessibilityLabel="tasks-timer-name-input"
                    />
                    <TextInput
                        style={s.input} placeholder="Category (e.g. development)"
                        placeholderTextColor={colors.muted} value={timerCat} onChangeText={setTimerCat}
                        editable={!timerRunning}
                        testID="tasks-timer-category-input" accessibilityLabel="tasks-timer-category-input"
                    />
                    <View style={s.timerCard}>
                        <Text style={[s.timerDisplay, timerRunning && { color: colors.accent }]}>
                            {formatTime(elapsed)}
                        </Text>
                        {timerRunning && <View style={s.liveDot} />}
                        <Text style={s.timerHint}>{timerRunning ? 'Recording…' : elapsed > 0 ? 'Stopped' : 'Ready'}</Text>
                    </View>
                    {!timerRunning ? (
                        <TouchableOpacity style={s.primaryBtn} onPress={startTimer} testID="tasks-timer-start-button" accessibilityLabel="tasks-timer-start-button">
                            <Text style={s.primaryBtnText}>▶  Start Timer</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[s.primaryBtn, { backgroundColor: '#EF4444' }]}
                            onPress={stopTimer}
                            testID="tasks-timer-stop-button"
                            accessibilityLabel="tasks-timer-stop-button"
                        >
                            <Text style={s.primaryBtnText}>■  Stop & Save</Text>
                        </TouchableOpacity>
                    )}
                    <View style={s.timerTips}>
                        <Text style={s.timerTipRow}>• Start when you begin a task</Text>
                        <Text style={s.timerTipRow}>• Stop when done — real duration is saved</Text>
                        <Text style={s.timerTipRow}>• Real durations improve pattern detection</Text>
                    </View>
                </ScrollView>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === 'history' && (
                <View style={s.historyOuter}>
                    <View style={s.historyHeader}>
                        <TextInput
                            style={s.searchInput} placeholder="Search tasks…"
                            placeholderTextColor={colors.muted} value={search} onChangeText={setSearch}
                            testID="tasks-search-input" accessibilityLabel="tasks-search-input"
                        />
                        <TouchableOpacity style={s.importBtn} onPress={handleImportCSV} testID="tasks-import-csv-button" accessibilityLabel="tasks-import-csv-button">
                            <Text style={s.importBtnText}>⬆ CSV</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.importBtn} onPress={loadHistory} testID="tasks-refresh-button" accessibilityLabel="tasks-refresh-button">
                            <Text style={s.importBtnText}>↻</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterContent}>
                        <TouchableOpacity
                            style={[s.filterChip, !filterCat && s.filterChipActive]}
                            onPress={() => setFilterCat('')}
                            testID="tasks-filter-all"
                            accessibilityLabel="tasks-filter-all"
                        >
                            <Text style={[s.filterChipText, !filterCat && s.filterChipTextActive]}>All</Text>
                        </TouchableOpacity>
                        {categories.map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={[s.filterChip, filterCat === cat && s.filterChipActive]}
                                onPress={() => setFilterCat(filterCat === cat ? '' : cat)}
                                testID={`tasks-filter-${cat}`}
                                accessibilityLabel={`tasks-filter-${cat}`}
                            >
                                <Text style={[s.filterChipText, filterCat === cat && s.filterChipTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <ScrollView style={s.scroll}>
                        {historyLoading ? (
                            <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
                        ) : filtered.length === 0 ? (
                            <Text style={s.emptyText}>
                                {allTasks.length === 0 ? 'No tasks yet — log some first' : 'No matching tasks'}
                            </Text>
                        ) : (
                            <>
                                <Text style={s.historyCount}>{filtered.length} task{filtered.length !== 1 ? 's' : ''}</Text>
                                {filtered.map(t => (
                                    <View key={t.id} style={[s.historyRow, t._pending && { opacity: 0.6 }]} testID={`tasks-row-${t.id}`} accessibilityLabel={`tasks-row-${t.id}`}>
                                        <View style={[s.historyDot, { backgroundColor: catColor(t.category) }]} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.historyName}>{t.task_name}</Text>
                                            <Text style={s.historyMeta}>{t.category} · {formatDate(t.started_at)}</Text>
                                        </View>
                                        {t.source && t.source !== 'manual' && (
                                            <View style={[s.sourceBadge, { backgroundColor: SRC_COLORS[t.source]?.bg ?? '#1E1E2E' }]}>
                                                <Text style={{ fontSize: 9 }}>{SRC_ICONS[t.source] ?? '🤖'}</Text>
                                                <Text style={[s.sourceBadgeText, { color: SRC_COLORS[t.source]?.text ?? '#6A6A7A' }]}>{t.source}</Text>
                                            </View>
                                        )}
                                        <Text style={s.historyDur}>{formatDur(t.duration_seconds)}</Text>
                                        <TouchableOpacity
                                            onPress={() => deleteTask(t.id)}
                                            style={s.deleteBtn}
                                            disabled={!!t._pending || deletingId === t.id}
                                            testID={`tasks-delete-${t.id}`}
                                            accessibilityLabel={`tasks-delete-${t.id}`}
                                        >
                                            {deletingId === t.id
                                                ? <ActivityIndicator color={colors.danger} size="small" />
                                                : <Text style={s.deleteBtnText}>✕</Text>}
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </>
                        )}
                    </ScrollView>
                </View>
            )}

            {/* ── Email Modal ── */}
            <EmailModal
                visible={!!emailModal}
                onClose={() => setEmailModal(null)}
                defaultSubject={emailModal?.subject ?? ''}
                defaultBody={emailModal?.body ?? ''}
                onSuccess={msg => { setEmailModal(null); showToast(msg, 'success'); }}
                onError={msg => showToast(msg, 'error')}
            />

            {/* ── Toast ── */}
            {toast && (
                <Toast message={toast.msg} type={toast.type} onHide={() => setToast(null)} />
            )}
        </View>
    );
}

const SRC_ICONS: Record<string, string> = {
    gmail: '📧', calendar: '📅', browser: '🌐', screen_time: '📱',
};
const SRC_COLORS: Record<string, { bg: string; text: string }> = {
    gmail:       { bg: '#2D0F0F', text: '#F87171' },
    calendar:    { bg: '#0F1A2D', text: '#60A5FA' },
    browser:     { bg: '#0F2D2A', text: '#14B8A6' },
    screen_time: { bg: '#152D1B', text: '#4ADE80' },
};

const CAT_COLORS: Record<string, string> = {
    'file ops': '#14B8A6', communication: '#F59E0B', development: '#7C5CFF',
    reporting: '#60A5FA', admin: '#EC4899', general: '#6A6A7A', import: '#4ADE80',
};
const catColor = (cat: string) => CAT_COLORS[cat] ?? '#7C5CFF';

const makeStyles = (colors: any) => StyleSheet.create({
    outer: { flex: 1, backgroundColor: colors.bg },
    switcher: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
    switchBtn: { flex: 1, paddingVertical: 13, alignItems: 'center' },
    switchBtnActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
    switchBtnText: { color: colors.muted, fontSize: 13, fontWeight: '500' },
    switchBtnTextActive: { color: colors.accent, fontWeight: '700' },

    scroll: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 120 },
    label: { color: colors.muted, fontSize: 13, marginBottom: 6 },
    sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, marginTop: 8, marginBottom: 12 },
    input: {
        backgroundColor: colors.card, color: colors.text, borderRadius: 12,
        padding: 14, marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: colors.border,
    },
    primaryBtn: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 24 },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    quickBtn: {
        backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8,
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: colors.border,
    },
    quickBtnText: { color: colors.text, fontSize: 14, fontWeight: '500' },
    quickBtnCat: { color: colors.muted, fontSize: 11, marginTop: 2 },
    actionBadge: {
        width: 30, height: 30, borderRadius: 8,
        backgroundColor: 'rgba(124,92,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    actionBadgeText: { color: colors.accent, fontSize: 14 },

    timerCard: {
        backgroundColor: colors.card, borderRadius: 20, padding: 32,
        alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: colors.border,
    },
    timerDisplay: { fontSize: 64, fontWeight: '700', color: colors.text },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginTop: 8, marginBottom: 4 },
    timerHint: { color: colors.muted, fontSize: 13, marginTop: 4 },
    timerTips: { backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
    timerTipRow: { color: colors.subtext, fontSize: 13, lineHeight: 22 },

    historyOuter: { flex: 1 },
    historyHeader: { flexDirection: 'row', gap: 8, padding: 14, paddingBottom: 8 },
    searchInput: {
        flex: 1, backgroundColor: colors.card, color: colors.text, borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
        borderWidth: 1, borderColor: colors.border,
    },
    importBtn: {
        backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12,
        paddingVertical: 10, borderWidth: 1, borderColor: colors.border, justifyContent: 'center',
    },
    importBtnText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
    filterRow: { paddingVertical: 6 },
    filterContent: { paddingHorizontal: 14, gap: 8 },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100,
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    },
    filterChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    filterChipText: { color: colors.muted, fontSize: 13 },
    filterChipTextActive: { color: '#fff', fontWeight: '600' },
    emptyText: { color: colors.muted, textAlign: 'center', marginTop: 48, fontSize: 14 },
    historyCount: { color: colors.muted, fontSize: 11, letterSpacing: 1, marginBottom: 6, paddingHorizontal: 14, paddingTop: 8 },
    historyRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 14, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    historyDot: { width: 8, height: 8, borderRadius: 4 },
    historyName: { color: colors.text, fontSize: 14 },
    historyMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
    historyDur: { color: colors.subtext, fontSize: 13, fontWeight: '600' },
    deleteBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', justifyContent: 'center', alignItems: 'center' },
    deleteBtnText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
    sourceBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
    sourceBadgeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: 0.4 },
});
