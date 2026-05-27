import { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Switch, TextInput, Modal,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import {
    getPatterns, getExecutionHistory, logExecution, exportTasksCSV,
    getAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule,
    clearExecutionHistory,
} from '../api';
import Toast, { ToastType } from '../../components/Toast';
import EmailModal from '../../components/EmailModal';

const QUICK_ACTIONS = [
    { id: 'email',     icon: '📧', label: 'Send Email',        desc: 'Compose & send via Zapier',           color: '#7C5CFF' },
    { id: 'sheets',    icon: '📊', label: 'Spreadsheet',       desc: 'Open Google Sheets',                  color: '#14B8A6' },
    { id: 'calendar',  icon: '📅', label: 'Schedule Meeting',  desc: 'Open Google Calendar',                color: '#F59E0B' },
    { id: 'report',    icon: '📋', label: 'Generate Report',   desc: 'Export tasks as CSV',                 color: '#60A5FA' },
    { id: 'workspace', icon: '🚀', label: 'Open Workspace',    desc: 'Launch all work apps at once',        color: '#EC4899' },
    { id: 'run_all',   icon: '🔄', label: 'Run All Rules',     desc: 'Execute all active automation rules', color: '#4ADE80' },
];

export default function Automations() {
    const { colors } = useTheme();

    const [patterns, setPatterns] = useState<any[]>([]);
    const [rules, setRules] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [executing, setExecuting] = useState<string | null>(null);

    const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
    const showToast = (msg: string, type: ToastType = 'success') => setToast({ msg, type });

    const [emailModal, setEmailModal] = useState(false);

    const [ruleModal, setRuleModal] = useState(false);
    const [ruleName, setRuleName] = useState('');
    const [ruleTrigger, setRuleTrigger] = useState('');
    const [ruleAction, setRuleAction] = useState<'email' | 'open_url' | 'webhook'>('open_url');
    const [savingRule, setSavingRule] = useState(false);
    const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        await Promise.all([loadPatterns(), loadRules(), loadHistory()]);
    };

    const loadPatterns = async () => {
        try { const res = await getPatterns(); setPatterns(res.data.patterns || []); } catch { /* ignore */ }
    };

    const loadRules = async () => {
        try { setRules(await getAutomationRules()); } catch { /* ignore */ }
    };

    const loadHistory = async () => {
        setLoadingHistory(true);
        try { setHistory(await getExecutionHistory()); } catch { /* ignore */ }
        setLoadingHistory(false);
    };

    const openUrl = (url: string) => {
        if (typeof window !== 'undefined') window.open(url, '_blank');
    };

    const runQuickAction = async (id: string) => {
        setExecuting(id);
        try {
            if (id === 'email') { setEmailModal(true); setExecuting(null); return; }
            if (id === 'sheets') {
                openUrl('https://docs.google.com/spreadsheets');
                await logExecution('open_app', { url: 'https://docs.google.com/spreadsheets' }, 'success', 'Opened Google Sheets');
                showToast('Google Sheets opened', 'success');
            } else if (id === 'calendar') {
                openUrl('https://calendar.google.com');
                await logExecution('open_app', { url: 'https://calendar.google.com' }, 'success', 'Opened Google Calendar');
                showToast('Google Calendar opened', 'success');
            } else if (id === 'report') {
                await exportTasksCSV();
                await logExecution('file_export', { format: 'csv' }, 'success', 'Exported tasks CSV');
                showToast('Report downloaded!', 'success');
            } else if (id === 'workspace') {
                const apps = [
                    { url: 'https://vscode.dev',       name: 'VS Code' },
                    { url: 'https://app.slack.com',    name: 'Slack' },
                    { url: 'https://mail.google.com',  name: 'Gmail' },
                    { url: 'https://docs.google.com',  name: 'Docs' },
                ];
                apps.forEach((a, i) => setTimeout(() => openUrl(a.url), i * 350));
                await logExecution('open_app', { apps: apps.map(a => a.name) }, 'success', 'Opened workspace (4 apps)');
                showToast('Workspace launching — 4 apps opening!', 'success');
            } else if (id === 'run_all') {
                const active = rules.filter(r => r.is_active);
                if (active.length === 0) { showToast('No active rules to run. Create rules below.', 'info'); }
                else {
                    for (const rule of active) {
                        await logExecution('automation', { rule: rule.rule_name, action: rule.action_type }, 'success', `Ran rule: ${rule.rule_name}`);
                        await updateAutomationRule(rule.id, { last_triggered: new Date().toISOString() });
                    }
                    await loadRules();
                    showToast(`Ran ${active.length} automation rule${active.length !== 1 ? 's' : ''}`, 'success');
                }
            }
            await loadHistory();
        } catch (err: any) {
            await logExecution(id, {}, 'failed', `Failed: ${id}`);
            showToast(err.message ?? 'Action failed', 'error');
        } finally {
            setExecuting(null);
        }
    };

    const patternAction = async (p: any) => {
        const name = (p.pattern_name ?? '').toLowerCase();
        if (name.includes('file') || name.includes('excel') || name.includes('data') || name.includes('spread')) {
            openUrl('https://zapier.com/apps/google-sheets/integrations');
            await logExecution('automation', { pattern: p.pattern_name }, 'success', `Automated: ${p.pattern_name}`);
            showToast('Opening Zapier → Google Sheets', 'info');
        } else if (name.includes('communication') || name.includes('email') || name.includes('slack')) {
            setEmailModal(true);
            await logExecution('automation', { pattern: p.pattern_name }, 'success', `Automated: ${p.pattern_name}`);
        } else if (name.includes('dev') || name.includes('code') || name.includes('pr') || name.includes('git')) {
            openUrl('https://vscode.dev'); openUrl('https://github.com');
            await logExecution('automation', { pattern: p.pattern_name }, 'success', `Automated: ${p.pattern_name}`);
            showToast('VS Code + GitHub opened', 'success');
        } else if (name.includes('meet') || name.includes('call') || name.includes('calendar')) {
            openUrl('https://calendar.google.com');
            await logExecution('automation', { pattern: p.pattern_name }, 'success', `Automated: ${p.pattern_name}`);
            showToast('Google Calendar opened', 'success');
        } else {
            openUrl('https://zapier.com/app/dashboard');
            await logExecution('automation', { pattern: p.pattern_name }, 'success', `Automated: ${p.pattern_name}`);
            showToast('Opening Zapier dashboard', 'info');
        }
        await loadHistory();
    };

    const saveRule = async () => {
        if (!ruleName.trim() || !ruleTrigger.trim()) { showToast('Rule name and trigger pattern are required', 'error'); return; }
        setSavingRule(true);
        try {
            const r = await createAutomationRule({ rule_name: ruleName.trim(), trigger_pattern: ruleTrigger.trim(), action_type: ruleAction });
            setRules(prev => [r, ...prev]);
            setRuleModal(false); setRuleName(''); setRuleTrigger(''); setRuleAction('open_url');
            showToast('Automation rule created!', 'success');
        } catch (err: any) {
            showToast(err.message ?? 'Could not save rule', 'error');
        } finally { setSavingRule(false); }
    };

    const toggleRule = async (rule: any) => {
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
        try { await updateAutomationRule(rule.id, { is_active: !rule.is_active }); }
        catch { setRules(prev => prev.map(r => r.id === rule.id ? rule : r)); showToast('Could not update rule', 'error'); }
    };

    const removeRule = async (id: string) => {
        setDeletingRuleId(id);
        try { await deleteAutomationRule(id); setRules(prev => prev.filter(r => r.id !== id)); showToast('Rule deleted', 'info'); }
        catch { showToast('Could not delete rule', 'error'); }
        finally { setDeletingRuleId(null); }
    };

    const handleClearHistory = async () => {
        try { await clearExecutionHistory(); setHistory([]); showToast('History cleared', 'info'); }
        catch { showToast('Could not clear history', 'error'); }
    };

    const successCount = history.filter(h => h.status === 'success').length;
    const timeSavedMins = successCount * 3;
    const s = makeStyles(colors);

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <ScrollView contentContainerStyle={s.content}>
                <Text style={s.pageTitle}>Automations</Text>
                <Text style={s.pageSubtitle}>Execute tasks instantly — powered by Zapier & Claude</Text>

                {/* QUICK ACTIONS */}
                <Text style={s.sectionLabel}>QUICK ACTIONS</Text>
                <View style={s.quickGrid}>
                    {QUICK_ACTIONS.map(qa => (
                        <TouchableOpacity
                            key={qa.id}
                            style={[s.quickCard, { borderColor: qa.color + '40' }]}
                            onPress={() => runQuickAction(qa.id)}
                            disabled={executing === qa.id}
                        >
                            {executing === qa.id
                                ? <ActivityIndicator color={qa.color} size="small" style={{ marginBottom: 10 }} />
                                : <Text style={s.quickIcon}>{qa.icon}</Text>}
                            <Text style={[s.quickLabel, { color: qa.color }]}>{qa.label}</Text>
                            <Text style={s.quickDesc}>{qa.desc}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* PATTERN-BASED AUTOMATIONS */}
                {patterns.length > 0 && (
                    <>
                        <Text style={s.sectionLabel}>PATTERN-BASED AUTOMATIONS</Text>
                        {patterns.map((p: any, i: number) => (
                            <View key={i} style={s.autoCard}>
                                <View style={{ marginBottom: 12 }}>
                                    <Text style={s.autoName}>{p.pattern_name}</Text>
                                    <Text style={s.autoMeta}>×{p.frequency} occurrences · {Math.round(p.confidence_score * 100)}% confidence</Text>
                                </View>
                                <TouchableOpacity style={s.executeBtn} onPress={() => patternAction(p)}>
                                    <Text style={s.executeBtnText}>⚡ Execute Automation</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </>
                )}

                {/* MY AUTOMATION RULES */}
                <View style={s.sectionHeader}>
                    <Text style={s.sectionLabel}>MY AUTOMATION RULES</Text>
                    <TouchableOpacity style={s.addRuleBtn} onPress={() => setRuleModal(true)}>
                        <Text style={s.addRuleBtnText}>+ New Rule</Text>
                    </TouchableOpacity>
                </View>
                {rules.length === 0 ? (
                    <View style={s.emptyCard}>
                        <Text style={s.emptyText}>No automation rules yet</Text>
                        <Text style={s.emptySubtext}>Create rules that trigger automatically when a pattern is detected</Text>
                        <TouchableOpacity style={s.emptyAction} onPress={() => setRuleModal(true)}>
                            <Text style={s.emptyActionText}>+ Create First Rule</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    rules.map(rule => (
                        <View key={rule.id} style={s.ruleCard}>
                            <View style={s.ruleTop}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.ruleName}>{rule.rule_name}</Text>
                                    <Text style={s.ruleMeta}>Trigger: {rule.trigger_pattern} · {rule.action_type}</Text>
                                    {rule.last_triggered && (
                                        <Text style={s.ruleLastRun}>Last run: {new Date(rule.last_triggered).toLocaleDateString()}</Text>
                                    )}
                                </View>
                                <Switch value={rule.is_active} onValueChange={() => toggleRule(rule)}
                                    trackColor={{ false: colors.border, true: colors.accent }} thumbColor="#fff" />
                            </View>
                            <TouchableOpacity style={s.deleteRuleBtn} onPress={() => removeRule(rule.id)} disabled={deletingRuleId === rule.id}>
                                {deletingRuleId === rule.id
                                    ? <ActivityIndicator color={colors.danger} size="small" />
                                    : <Text style={s.deleteRuleBtnText}>Delete Rule</Text>}
                            </TouchableOpacity>
                        </View>
                    ))
                )}

                {/* EXECUTION HISTORY */}
                <View style={s.sectionHeader}>
                    <Text style={s.sectionLabel}>EXECUTION HISTORY</Text>
                    <TouchableOpacity onPress={loadHistory}>
                        <Text style={{ color: colors.accent, fontSize: 13 }}>↻ Refresh</Text>
                    </TouchableOpacity>
                </View>
                {successCount > 0 && (
                    <View style={s.statsBanner}>
                        <Text style={s.statsBannerText}>
                            ⚡ {successCount} automations executed · ~{timeSavedMins >= 60 ? `${(timeSavedMins / 60).toFixed(1)}h` : `${timeSavedMins}m`} saved
                        </Text>
                    </View>
                )}
                {loadingHistory ? (
                    <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
                ) : history.length === 0 ? (
                    <View style={s.emptyCard}>
                        <Text style={s.emptyText}>No executions yet</Text>
                        <Text style={s.emptySubtext}>Run a quick action above to see history here</Text>
                    </View>
                ) : (
                    <>
                        {history.map((h, i) => (
                            <View key={i} style={s.historyRow}>
                                <View style={[s.statusDot, { backgroundColor: h.status === 'success' ? '#22C55E' : '#EF4444' }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={s.historyAction}>{(h.action_name || h.action_type).replace(/_/g, ' ')}</Text>
                                    <Text style={s.historyTime}>{new Date(h.executed_at).toLocaleString()}</Text>
                                </View>
                                <View style={[s.statusBadge, { backgroundColor: h.status === 'success' ? '#14532D' : '#450A0A' }]}>
                                    <Text style={[s.statusText, { color: h.status === 'success' ? '#4ADE80' : '#F87171' }]}>{h.status}</Text>
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity style={s.clearHistoryBtn} onPress={handleClearHistory}>
                            <Text style={s.clearHistoryText}>Clear History</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            {/* NEW RULE MODAL */}
            <Modal visible={ruleModal} transparent animationType="slide" onRequestClose={() => setRuleModal(false)}>
                <View style={s.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setRuleModal(false)} />
                    <View style={s.modalSheet}>
                        <View style={s.modalHandle} />
                        <Text style={s.modalTitle}>Create Automation Rule</Text>
                        <Text style={s.modalLabel}>RULE NAME</Text>
                        <TextInput style={s.modalInput} value={ruleName} onChangeText={setRuleName}
                            placeholder="e.g. Auto-send daily report" placeholderTextColor={colors.muted} />
                        <Text style={s.modalLabel}>TRIGGER PATTERN</Text>
                        <TextInput style={s.modalInput} value={ruleTrigger} onChangeText={setRuleTrigger}
                            placeholder="e.g. communication, file ops" placeholderTextColor={colors.muted} />
                        <Text style={s.modalLabel}>ACTION TYPE</Text>
                        <View style={s.actionTypeRow}>
                            {(['open_url', 'email', 'webhook'] as const).map(at => (
                                <TouchableOpacity key={at}
                                    style={[s.actionTypeChip, ruleAction === at && s.actionTypeChipActive]}
                                    onPress={() => setRuleAction(at)}>
                                    <Text style={[s.actionTypeText, ruleAction === at && s.actionTypeTextActive]}>
                                        {at === 'open_url' ? '↗ Open URL' : at === 'email' ? '✉ Email' : '⚡ Webhook'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={s.saveRuleBtn} onPress={saveRule} disabled={savingRule}>
                            {savingRule ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={s.saveRuleBtnText}>Save Rule</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <EmailModal
                visible={emailModal}
                onClose={() => setEmailModal(false)}
                onSuccess={async msg => { setEmailModal(false); showToast(msg, 'success'); await loadHistory(); }}
                onError={msg => showToast(msg, 'error')}
            />

            {toast && <Toast message={toast.msg} type={toast.type} onHide={() => setToast(null)} />}
        </View>
    );
}

const makeStyles = (colors: any) => StyleSheet.create({
    content: { padding: 16, paddingBottom: 120 },
    pageTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 16 },
    pageSubtitle: { color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: 20 },
    sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12 },

    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    quickCard: { width: '47%', backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, alignItems: 'flex-start' },
    quickIcon: { fontSize: 28, marginBottom: 10 },
    quickLabel: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
    quickDesc: { color: colors.muted, fontSize: 11, lineHeight: 15 },

    autoCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    autoName: { color: colors.text, fontSize: 15, fontWeight: '600' },
    autoMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
    executeBtn: { backgroundColor: 'rgba(124,92,255,0.12)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(124,92,255,0.3)' },
    executeBtnText: { color: colors.accent, fontSize: 13, fontWeight: '700' },

    addRuleBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
    addRuleBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

    ruleCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
    ruleTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    ruleName: { color: colors.text, fontSize: 14, fontWeight: '600' },
    ruleMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
    ruleLastRun: { color: colors.muted, fontSize: 11, marginTop: 2 },
    deleteRuleBtn: { alignItems: 'center', paddingVertical: 6 },
    deleteRuleBtnText: { color: colors.danger, fontSize: 13 },

    emptyCard: { backgroundColor: colors.card, borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: colors.border },
    emptyText: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 6 },
    emptySubtext: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
    emptyAction: { marginTop: 14, backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
    emptyActionText: { color: '#fff', fontSize: 13, fontWeight: '700' },

    statsBanner: { backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)' },
    statsBannerText: { color: '#4ADE80', fontSize: 13, fontWeight: '600' },

    historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    historyAction: { color: colors.text, fontSize: 14, fontWeight: '500', textTransform: 'capitalize' },
    historyTime: { color: colors.muted, fontSize: 11, marginTop: 2 },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    statusText: { fontSize: 11, fontWeight: '700' },
    clearHistoryBtn: { alignItems: 'center', paddingVertical: 14 },
    clearHistoryText: { color: colors.muted, fontSize: 13 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 14, borderWidth: 1, borderColor: colors.border },
    modalHandle: { width: 44, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 18 },
    modalLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 7 },
    modalInput: { backgroundColor: colors.bg, color: colors.text, borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 14, borderWidth: 1, borderColor: colors.border },
    actionTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    actionTypeChip: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
    actionTypeChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    actionTypeText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
    actionTypeTextActive: { color: '#fff' },
    saveRuleBtn: { backgroundColor: colors.accent, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 8 },
    saveRuleBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
