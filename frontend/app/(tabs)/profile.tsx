import { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, TextInput, Switch, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { exportTasksCSV, exportPatternsCSV, deleteAllUserData, getIntegrations, connectGmail, analyzeGmail, connectCalendar, analyzeCalendar, disconnectIntegration } from '../api';
import Toast, { ToastType } from '../../components/Toast';

export default function Profile() {
    const router = useRouter();
    const { isDark, toggleTheme, colors } = useTheme();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState({ tasks: 0, patterns: 0, daysActive: 0, automations: 0 });
    const [loading, setLoading] = useState(true);
    const [signingOut, setSigningOut] = useState(false);
    const [exportingTasks, setExportingTasks] = useState(false);
    const [exportingPatterns, setExportingPatterns] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [savingName, setSavingName] = useState(false);
    const [deletingData, setDeletingData] = useState(false);
    const [integrations, setIntegrations] = useState<Record<string, boolean>>({});
    const [analyzingGmail, setAnalyzingGmail] = useState(false);
    const [analyzingCalendar, setAnalyzingCalendar] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
    const showToast = (msg: string, type: ToastType = 'success') => setToast({ msg, type });

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUser(user);

            const [profileRes, taskRes, patternRes, scoreRes, execRes] = await Promise.all([
                supabase.from('users').select('*').eq('id', user.id).single(),
                supabase.from('task_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('task_patterns').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('productivity_scores').select('score_date').eq('user_id', user.id),
                supabase.from('execution_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
            ]);

            setProfile(profileRes.data);
            setNameInput(profileRes.data?.name ?? user.email?.split('@')[0] ?? '');
            setStats({
                tasks: taskRes.count ?? 0,
                patterns: patternRes.count ?? 0,
                daysActive: scoreRes.data?.length ?? 0,
                automations: execRes.count ?? 0,
            });
            const integMap = await getIntegrations();
            setIntegrations(integMap);
            setLoading(false);
        };
        load();
    }, []);

    const saveName = async () => {
        if (!nameInput.trim()) return;
        setSavingName(true);
        const { error } = await supabase.from('users').update({ name: nameInput.trim() }).eq('id', user.id);
        setSavingName(false);
        if (error) {
            showToast('Could not update name', 'error');
        } else {
            setProfile((p: any) => ({ ...p, name: nameInput.trim() }));
            setEditingName(false);
            showToast('Name updated!', 'success');
        }
    };

    const handleExportTasks = async () => {
        setExportingTasks(true);
        try { await exportTasksCSV(); showToast('Tasks exported!', 'success'); }
        catch { showToast('Could not export tasks', 'error'); }
        finally { setExportingTasks(false); }
    };

    const handleExportPatterns = async () => {
        setExportingPatterns(true);
        try { await exportPatternsCSV(); showToast('Patterns exported!', 'success'); }
        catch { showToast('Could not export patterns', 'error'); }
        finally { setExportingPatterns(false); }
    };

    const handleDeleteData = () => {
        if (typeof window !== 'undefined') {
            const confirmed = window.confirm(
                'This will permanently delete ALL your tasks, patterns, scores, and automation history. This cannot be undone. Continue?'
            );
            if (!confirmed) return;
        } else {
            Alert.alert('Delete All Data', 'This will permanently delete all your data. This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: doDeleteData },
            ]);
            return;
        }
        doDeleteData();
    };

    const doDeleteData = async () => {
        setDeletingData(true);
        try {
            await deleteAllUserData();
            setStats({ tasks: 0, patterns: 0, daysActive: 0, automations: 0 });
            showToast('All data deleted successfully', 'info');
        } catch {
            showToast('Could not delete data — please try again', 'error');
        } finally {
            setDeletingData(false);
        }
    };

    const handleConnectGmail = async () => {
        try {
            await connectGmail();
            showToast('Gmail auth opened — authorise in the new tab, then tap Refresh below', 'info');
        } catch (e: any) { showToast(e.message || 'Could not connect Gmail', 'error'); }
    };

    const handleAnalyzeGmail = async () => {
        setAnalyzingGmail(true);
        try {
            const r = await analyzeGmail();
            showToast(`Gmail analysed — ${r.tasks_logged} patterns logged`, 'success');
            setStats(s => ({ ...s, tasks: s.tasks + r.tasks_logged }));
        } catch (e: any) { showToast(e.message || 'Gmail analysis failed', 'error'); }
        finally { setAnalyzingGmail(false); }
    };

    const handleConnectCalendar = async () => {
        try {
            await connectCalendar();
            showToast('Calendar auth opened — authorise in the new tab, then tap Refresh below', 'info');
        } catch (e: any) { showToast(e.message || 'Could not connect Calendar', 'error'); }
    };

    const handleAnalyzeCalendar = async () => {
        setAnalyzingCalendar(true);
        try {
            const r = await analyzeCalendar();
            showToast(`Calendar analysed — ${r.tasks_logged} patterns logged (${r.meeting_percent}% meeting time)`, 'success');
            setStats(s => ({ ...s, tasks: s.tasks + r.tasks_logged }));
        } catch (e: any) { showToast(e.message || 'Calendar analysis failed', 'error'); }
        finally { setAnalyzingCalendar(false); }
    };

    const handleDisconnect = async (type: string) => {
        try {
            await disconnectIntegration(type);
            setIntegrations(prev => ({ ...prev, [type]: false }));
            showToast(`${type} disconnected`, 'info');
        } catch { showToast('Could not disconnect', 'error'); }
    };

    const refreshIntegrations = async () => {
        const map = await getIntegrations();
        setIntegrations(map);
        showToast('Integration status refreshed', 'info');
    };

    const handleSignOut = async () => {
        setSigningOut(true);
        await supabase.auth.signOut();
        router.replace('/login');
    };

    const initials = (name: string) =>
        name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';

    const displayName = profile?.name ?? user?.email?.split('@')[0] ?? 'User';
    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : '—';

    const s = makeStyles(colors);

    if (loading) {
        return <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <ScrollView style={s.container}>
                {/* Avatar + name */}
                <View style={s.avatarSection}>
                    <View style={s.avatar}>
                        <Text style={s.avatarText}>{initials(displayName)}</Text>
                    </View>
                    {editingName ? (
                        <View style={s.nameEditRow}>
                            <TextInput
                                style={s.nameInput} value={nameInput} onChangeText={setNameInput}
                                autoFocus placeholder="Your name" placeholderTextColor={colors.muted}
                                testID="profile-name-input" accessibilityLabel="profile-name-input"
                            />
                            <TouchableOpacity style={s.saveBtn} onPress={saveName} disabled={savingName} testID="profile-save-name-button" accessibilityLabel="profile-save-name-button">
                                {savingName ? <ActivityIndicator color="#fff" size="small" />
                                    : <Text style={s.saveBtnText}>Save</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity style={s.cancelBtn} onPress={() => setEditingName(false)} testID="profile-cancel-name-button" accessibilityLabel="profile-cancel-name-button">
                                <Text style={s.cancelBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={s.nameRow} onPress={() => setEditingName(true)} testID="profile-edit-name-button" accessibilityLabel="profile-edit-name-button">
                            <Text style={s.name}>{displayName}</Text>
                            <Text style={s.editIcon}>✎</Text>
                        </TouchableOpacity>
                    )}
                    <Text style={s.email}>{user?.email}</Text>
                    <Text style={s.since}>Member since {memberSince}</Text>
                </View>

                {/* Stats */}
                <View style={s.statsRow}>
                    <View style={s.statBox}>
                        <Text style={s.statVal}>{stats.tasks}</Text>
                        <Text style={s.statLabel}>Tasks</Text>
                    </View>
                    <View style={s.statBox}>
                        <Text style={[s.statVal, { color: colors.accent }]}>{stats.patterns}</Text>
                        <Text style={s.statLabel}>Patterns</Text>
                    </View>
                    <View style={s.statBox}>
                        <Text style={[s.statVal, { color: '#14B8A6' }]}>{stats.daysActive}</Text>
                        <Text style={s.statLabel}>Days Active</Text>
                    </View>
                    <View style={s.statBox}>
                        <Text style={[s.statVal, { color: '#4ADE80' }]}>{stats.automations}</Text>
                        <Text style={s.statLabel}>Automations</Text>
                    </View>
                </View>

                {/* Account */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>ACCOUNT</Text>
                    <View style={s.infoRow}>
                        <Text style={s.infoLabel}>Email</Text>
                        <Text style={s.infoValue}>{user?.email}</Text>
                    </View>
                    <View style={s.infoRow}>
                        <Text style={s.infoLabel}>Auth method</Text>
                        <Text style={s.infoValue}>Magic link</Text>
                    </View>
                    <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
                        <Text style={s.infoLabel}>User ID</Text>
                        <Text style={[s.infoValue, { fontSize: 11 }]}>{user?.id?.slice(0, 16)}…</Text>
                    </View>
                </View>

                {/* Appearance */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>APPEARANCE</Text>
                    <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
                        <Text style={s.infoLabel}>Dark mode</Text>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: '#3A3A4A', true: colors.accent }}
                            thumbColor="#fff"
                            testID="profile-dark-mode-switch"
                            accessibilityLabel="profile-dark-mode-switch"
                        />
                    </View>
                </View>

                {/* Connected Services */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>CONNECTED SERVICES</Text>
                    {[
                        { name: 'Zapier', status: 'connected', desc: 'Email automation via webhook', color: '#FF4A00' },
                        { name: 'AI Engine', status: 'connected', desc: 'Pattern analysis & chat', color: '#7C5CFF' },
                        { name: 'Supabase', status: 'connected', desc: 'Database & authentication', color: '#3ECF8E' },
                    ].map((svc, i, arr) => (
                        <View key={svc.name} style={[s.serviceRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                            <View style={[s.serviceIcon, { backgroundColor: svc.color + '20' }]}>
                                <Text style={{ fontSize: 14 }}>
                                    {svc.name === 'Zapier' ? '⚡' : svc.name === 'AI Engine' ? '✦' : '🗄'}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.serviceName}>{svc.name}</Text>
                                <Text style={s.serviceDesc}>{svc.desc}</Text>
                            </View>
                            <View style={s.connectedBadge}>
                                <Text style={s.connectedText}>✓ connected</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Auto-Detection Sources */}
                <View style={s.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 }}>
                        <Text style={s.sectionTitle}>AUTO-DETECTION SOURCES</Text>
                        <TouchableOpacity onPress={refreshIntegrations} testID="profile-refresh-integrations-button" accessibilityLabel="profile-refresh-integrations-button">
                            <Text style={{ color: colors.accent, fontSize: 12 }}>↻ Refresh</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Gmail */}
                    <View style={s.serviceRow}>
                        <View style={[s.serviceIcon, { backgroundColor: '#FF4A0020' }]}>
                            <Text style={{ fontSize: 16 }}>📧</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.serviceName}>Gmail</Text>
                            <Text style={s.serviceDesc}>Detect email patterns automatically</Text>
                        </View>
                        {integrations.gmail ? (
                            <View style={{ gap: 6 }}>
                                <TouchableOpacity style={s.analyseBtn} onPress={handleAnalyzeGmail} disabled={analyzingGmail} testID="profile-gmail-analyse-button" accessibilityLabel="profile-gmail-analyse-button">
                                    {analyzingGmail
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Text style={s.analyseBtnText}>Analyse</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDisconnect('gmail')} testID="profile-gmail-disconnect-button" accessibilityLabel="profile-gmail-disconnect-button">
                                    <Text style={s.disconnectText}>Disconnect</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={s.connectBtn} onPress={handleConnectGmail} testID="profile-gmail-connect-button" accessibilityLabel="profile-gmail-connect-button">
                                <Text style={s.connectBtnText}>Connect</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Google Calendar */}
                    <View style={s.serviceRow}>
                        <View style={[s.serviceIcon, { backgroundColor: '#4285F420' }]}>
                            <Text style={{ fontSize: 16 }}>📅</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.serviceName}>Google Calendar</Text>
                            <Text style={s.serviceDesc}>Detect meeting patterns + time usage</Text>
                        </View>
                        {integrations.calendar ? (
                            <View style={{ gap: 6 }}>
                                <TouchableOpacity style={s.analyseBtn} onPress={handleAnalyzeCalendar} disabled={analyzingCalendar} testID="profile-calendar-analyse-button" accessibilityLabel="profile-calendar-analyse-button">
                                    {analyzingCalendar
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Text style={s.analyseBtnText}>Analyse</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDisconnect('calendar')} testID="profile-calendar-disconnect-button" accessibilityLabel="profile-calendar-disconnect-button">
                                    <Text style={s.disconnectText}>Disconnect</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={s.connectBtn} onPress={handleConnectCalendar} testID="profile-calendar-connect-button" accessibilityLabel="profile-calendar-connect-button">
                                <Text style={s.connectBtnText}>Connect</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Browser Extension */}
                    <View style={s.serviceRow}>
                        <View style={[s.serviceIcon, { backgroundColor: '#14B8A620' }]}>
                            <Text style={{ fontSize: 16 }}>🌐</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.serviceName}>Browser Extension</Text>
                            <Text style={s.serviceDesc}>Auto-tracks websites visited (Chrome)</Text>
                        </View>
                        <View style={s.connectedBadge}>
                            <Text style={{ color: '#60A5FA', fontSize: 11, fontWeight: '600' }}>Install from repo</Text>
                        </View>
                    </View>

                    {/* Android Screen Time */}
                    <View style={[s.serviceRow, { borderBottomWidth: 0 }]}>
                        <View style={[s.serviceIcon, { backgroundColor: '#4ADE8020' }]}>
                            <Text style={{ fontSize: 16 }}>📱</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.serviceName}>Android Screen Time</Text>
                            <Text style={s.serviceDesc}>Auto-detect app usage patterns</Text>
                        </View>
                        <View style={[s.connectedBadge, { backgroundColor: '#1E1E2E' }]}>
                            <Text style={{ color: '#6A6A7A', fontSize: 11, fontWeight: '600' }}>Coming soon</Text>
                        </View>
                    </View>
                </View>

                {/* App Info */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>APP INFO</Text>
                    <View style={s.infoRow}>
                        <Text style={s.infoLabel}>Version</Text>
                        <Text style={s.infoValue}>2.0.0</Text>
                    </View>
                    <View style={s.infoRow}>
                        <Text style={s.infoLabel}>AI Engine</Text>
                        <Text style={s.infoValue}>Claude 3.5 Haiku (via OpenRouter)</Text>
                    </View>
                    <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
                        <Text style={s.infoLabel}>Database</Text>
                        <Text style={s.infoValue}>Supabase PostgreSQL</Text>
                    </View>
                </View>

                {/* Export Data */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>EXPORT DATA</Text>
                    <TouchableOpacity style={s.exportRow} onPress={handleExportTasks} disabled={exportingTasks} testID="profile-export-tasks-button" accessibilityLabel="profile-export-tasks-button">
                        {exportingTasks ? <ActivityIndicator color={colors.accent} size="small" />
                            : <Text style={s.exportIcon}>⬇</Text>}
                        <View style={{ flex: 1 }}>
                            <Text style={s.exportLabel}>Export Tasks as CSV</Text>
                            <Text style={s.exportDesc}>{stats.tasks} tasks</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.exportRow, { borderBottomWidth: 0 }]} onPress={handleExportPatterns} disabled={exportingPatterns} testID="profile-export-patterns-button" accessibilityLabel="profile-export-patterns-button">
                        {exportingPatterns ? <ActivityIndicator color={colors.accent} size="small" />
                            : <Text style={s.exportIcon}>⬇</Text>}
                        <View style={{ flex: 1 }}>
                            <Text style={s.exportLabel}>Export Patterns as CSV</Text>
                            <Text style={s.exportDesc}>{stats.patterns} patterns</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Data & Privacy */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>DATA & PRIVACY</Text>
                    <TouchableOpacity style={[s.dangerRow, { borderBottomWidth: 0 }]} onPress={handleDeleteData} disabled={deletingData} testID="profile-delete-data-button" accessibilityLabel="profile-delete-data-button">
                        {deletingData ? <ActivityIndicator color={colors.danger} size="small" />
                            : <Text style={s.dangerIcon}>🗑</Text>}
                        <View style={{ flex: 1 }}>
                            <Text style={s.dangerLabel}>Delete All My Data</Text>
                            <Text style={s.dangerDesc}>Permanently removes all tasks, patterns, and history</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Sign Out */}
                <TouchableOpacity
                    style={[s.signOutBtn, signingOut && s.btnDisabled]}
                    onPress={handleSignOut}
                    disabled={signingOut}
                    testID="profile-signout-button"
                    accessibilityLabel="profile-signout-button"
                >
                    {signingOut ? <ActivityIndicator color="#FF6B6B" />
                        : <Text style={s.signOutText}>Sign Out</Text>}
                </TouchableOpacity>

                <Text style={s.footer}>FlowOptix v2 · Powered by AI + Supabase</Text>
            </ScrollView>

            {toast && <Toast message={toast.msg} type={toast.type} onHide={() => setToast(null)} />}
        </View>
    );
}

const makeStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, padding: 20 },
    center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },

    avatarSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 28 },
    avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },

    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    name: { color: colors.text, fontSize: 24, fontWeight: '700' },
    editIcon: { color: colors.muted, fontSize: 16 },
    nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    nameInput: { backgroundColor: colors.card, color: colors.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 18, fontWeight: '600', borderWidth: 1, borderColor: colors.accent, minWidth: 160 },
    saveBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
    saveBtnText: { color: '#fff', fontWeight: '600' },
    cancelBtn: { padding: 8 },
    cancelBtnText: { color: colors.muted, fontSize: 16 },
    email: { color: colors.subtext, fontSize: 14, marginBottom: 4 },
    since: { color: colors.muted, fontSize: 12 },

    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    statBox: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    statVal: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
    statLabel: { color: colors.muted, fontSize: 10, marginTop: 3, textAlign: 'center' },

    section: { backgroundColor: colors.card, borderRadius: 16, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    sectionTitle: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, padding: 14, paddingBottom: 4 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    infoLabel: { color: colors.subtext, fontSize: 14 },
    infoValue: { color: colors.text, fontSize: 14, fontWeight: '500' },

    serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    serviceIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    serviceName: { color: colors.text, fontSize: 14, fontWeight: '500' },
    serviceDesc: { color: colors.muted, fontSize: 12, marginTop: 1 },
    connectedBadge: { backgroundColor: '#14532D', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    connectedText: { color: '#4ADE80', fontSize: 11, fontWeight: '600' },
    connectBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    connectBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    analyseBtn: { backgroundColor: '#14532D', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    analyseBtnText: { color: '#4ADE80', fontSize: 12, fontWeight: '600' },
    disconnectText: { color: colors.muted, fontSize: 11, textAlign: 'center' },

    exportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    exportIcon: { color: colors.accent, fontSize: 18, width: 24, textAlign: 'center' },
    exportLabel: { color: colors.text, fontSize: 14 },
    exportDesc: { color: colors.muted, fontSize: 12, marginTop: 1 },

    dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    dangerIcon: { fontSize: 18, width: 24, textAlign: 'center' },
    dangerLabel: { color: colors.danger, fontSize: 14, fontWeight: '500' },
    dangerDesc: { color: colors.muted, fontSize: 12, marginTop: 1 },

    signOutBtn: { borderWidth: 1, borderColor: '#FF6B6B', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
    btnDisabled: { opacity: 0.5 },
    signOutText: { color: '#FF6B6B', fontSize: 16, fontWeight: '600' },
    footer: { color: colors.muted, fontSize: 11, textAlign: 'center', paddingBottom: 40, marginTop: 8 },
});
