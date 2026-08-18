import { supabase } from '../lib/supabase';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// ── Email (proxied through backend to avoid CORS) ──────────────────────────
export const sendEmail = async (to: string, subject: string, body: string): Promise<void> => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
        throw new Error('To, subject, and body are all required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to.trim())) throw new Error('Invalid recipient email address');

    const res = await fetch(`${BACKEND_URL}/execute/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim(), body: body.trim() }),
    });
    if (!res.ok) {
        let msg = 'Email could not be sent.';
        try { const d = await res.json(); if (d.error) msg = d.error; } catch { /* ignore */ }
        throw new Error(msg);
    }
};

// ── Execution Logs ─────────────────────────────────────────────────────────
export const logExecution = async (
    action_type: string,
    action_details: Record<string, any>,
    status: 'success' | 'failed',
    action_name?: string,
): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('execution_logs').insert({
        user_id: user.id,
        action_type,
        action_details,
        action_name: action_name ?? action_type,
        status,
    });
    if (error) console.error('[execution_logs] insert error:', error.message);
};

export const getExecutionHistory = async (): Promise<any[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
        .from('execution_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('executed_at', { ascending: false })
        .limit(100);
    if (error) throw error;
    return data ?? [];
};

export const clearExecutionHistory = async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('execution_logs').delete().eq('user_id', user.id);
    if (error) throw error;
};

// ── Tasks ──────────────────────────────────────────────────────────────────
export const logTask = async (task_name: string, category: string, duration?: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const res = await fetch(`${BACKEND_URL}/tasks/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, task_name, category, ...(duration != null ? { duration } : {}) }),
    });
    if (!res.ok) {
        let msg = 'Could not log task';
        try { const d = await res.json(); if (d.error) msg = d.error; } catch { /* ignore */ }
        throw new Error(msg);
    }
    return res.json() as Promise<{ success: boolean; task: Record<string, unknown> }>;
};

export const getTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
        .from('task_logs').select('*').eq('user_id', user.id)
        .order('started_at', { ascending: false }).limit(50);
    if (error) throw error;
    return { data: { tasks: data } };
};

// ── Productivity — live calculation from task_logs ─────────────────────────
export const getProductivity = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const [tasksRes, patternsRes, scoresRes] = await Promise.all([
        supabase.from('task_logs').select('task_name, category').eq('user_id', user.id),
        supabase.from('task_patterns').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('productivity_scores').select('*').eq('user_id', user.id)
            .order('score_date', { ascending: false }).limit(7),
    ]);

    if (tasksRes.error) throw tasksRes.error;

    const taskList = tasksRes.data ?? [];
    const totalTasks = taskList.length;

    const nameCounts: Record<string, number> = {};
    taskList.forEach((t: any) => { nameCounts[t.task_name] = (nameCounts[t.task_name] || 0) + 1; });

    const uniqueTasks = Object.keys(nameCounts).length;
    const repetitiveCount = taskList.filter((t: any) => nameCounts[t.task_name] > 1).length;
    const repetitiveRatio = totalTasks > 0 ? repetitiveCount / totalTasks : 0;
    const score = Math.round((1 - repetitiveRatio * 0.5) * 100);
    const patternsFound = patternsRes.count ?? 0;

    const latest = scoresRes.data?.[0];
    return {
        data: {
            score,
            tasks_completed: totalTasks,
            repetitive_count: repetitiveCount,
            breakdown: {
                total_tasks: totalTasks,
                repetitive_ratio: `${Math.round(repetitiveRatio * 100)}%`,
                unique_tasks: uniqueTasks,
                patterns_found: patternsFound,
            },
            history: scoresRes.data ?? [],
            ai: latest?.breakdown?.ai ?? null,
        },
    };
};

// ── Patterns ───────────────────────────────────────────────────────────────
export const getPatterns = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
        .from('task_patterns')
        .select('*, automation_suggestions (*)')
        .eq('user_id', user.id)
        .order('detected_at', { ascending: false });
    if (error) throw error;
    return { data: { patterns: data } };
};

export const analyzePatterns = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    const { data, error } = await supabase.functions.invoke('analyze-patterns', {
        headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
};

// ── AI Chat ────────────────────────────────────────────────────────────────
export const chatWithAI = async (message: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const res = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, message }),
    });
    if (!res.ok) {
        let msg = 'Chat request failed';
        try { const d = await res.json(); if (d.error) msg = d.error; } catch { /* ignore */ }
        throw new Error(msg);
    }
    const data = await res.json();
    return data.reply as string;
};

// ── CSV Exports ────────────────────────────────────────────────────────────
export const exportTasksCSV = async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
        .from('task_logs').select('id, task_name, category, source, duration_seconds, started_at, ended_at').eq('user_id', user.id)
        .order('started_at', { ascending: false });
    if (error) throw error;
    const rows = data ?? [];
    const header = 'task_name,category,source,duration_seconds,started_at,ended_at';
    const lines = rows.map((r: any) =>
        [r.task_name, r.category, r.source, r.duration_seconds, r.started_at, r.ended_at]
            .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
            .join(',')
    );
    triggerDownload([header, ...lines].join('\n'), 'text/csv',
        `flowoptix_tasks_${new Date().toISOString().slice(0, 10)}.csv`);
};

export const exportPatternsCSV = async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
        .from('task_patterns').select('*').eq('user_id', user.id)
        .order('detected_at', { ascending: false });
    if (error) throw error;
    const rows = data ?? [];
    const header = 'pattern_name,frequency,confidence_score,detected_at';
    const lines = rows.map((r: any) =>
        [r.pattern_name, r.frequency, r.confidence_score, r.detected_at]
            .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
            .join(',')
    );
    triggerDownload([header, ...lines].join('\n'), 'text/csv',
        `flowoptix_patterns_${new Date().toISOString().slice(0, 10)}.csv`);
};

function triggerDownload(content: string, mimeType: string, filename: string) {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

// ── Auto-detection integrations ───────────────────────────────────────────
export const getIntegrations = async (): Promise<Record<string, boolean>> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};
    const { data, error } = await supabase
        .from('user_integrations')
        .select('integration_type, is_connected')
        .eq('user_id', user.id);
    if (error) return {};
    const map: Record<string, boolean> = {};
    (data ?? []).forEach((r: any) => { map[r.integration_type] = r.is_connected; });
    return map;
};

export const connectGmail = async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const url = `${BACKEND_URL}/gmail/authorize?user_id=${user.id}`;
    if (typeof window !== 'undefined') window.open(url, '_blank', 'width=500,height=650');
};

export const analyzeGmail = async (): Promise<{ patterns: any[]; tasks_logged: number }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const res = await fetch(`${BACKEND_URL}/gmail/analyze/${user.id}`);
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Gmail analysis failed'); }
    return res.json();
};

export const connectCalendar = async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const url = `${BACKEND_URL}/calendar/authorize?user_id=${user.id}`;
    if (typeof window !== 'undefined') window.open(url, '_blank', 'width=500,height=650');
};

export const analyzeCalendar = async (): Promise<{ patterns: any[]; tasks_logged: number; meeting_percent: number }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const res = await fetch(`${BACKEND_URL}/calendar/analyze/${user.id}`);
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Calendar analysis failed'); }
    return res.json();
};

export const disconnectIntegration = async (type: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const res = await fetch(`${BACKEND_URL}/integrations/${user.id}/${type}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to disconnect');
};

// ── Automation Rules ───────────────────────────────────────────────────────
export const getAutomationRules = async (): Promise<any[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
        .from('automation_rules').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
};

export const createAutomationRule = async (rule: {
    rule_name: string;
    trigger_pattern: string;
    action_type: 'email' | 'webhook' | 'open_url';
    action_config?: Record<string, any>;
}): Promise<any> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase.from('automation_rules').insert({
        user_id: user.id,
        ...rule,
        action_config: rule.action_config ?? {},
        is_active: true,
    }).select().single();
    if (error) throw error;
    return data;
};

export const updateAutomationRule = async (id: string, updates: Record<string, any>): Promise<void> => {
    const { error } = await supabase.from('automation_rules').update(updates).eq('id', id);
    if (error) throw error;
};

export const deleteAutomationRule = async (id: string): Promise<void> => {
    const { error } = await supabase.from('automation_rules').delete().eq('id', id);
    if (error) throw error;
};

// ── Delete all user data ───────────────────────────────────────────────────
export const deleteAllUserData = async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    await Promise.all([
        supabase.from('task_logs').delete().eq('user_id', user.id),
        supabase.from('task_patterns').delete().eq('user_id', user.id),
        supabase.from('automation_suggestions').delete().eq('user_id', user.id),
        supabase.from('productivity_scores').delete().eq('user_id', user.id),
        supabase.from('execution_logs').delete().eq('user_id', user.id),
        supabase.from('automation_rules').delete().eq('user_id', user.id),
    ]);
};
