require('dotenv').config();
const express = require('express');
const cors = require('cors');
const supabase = require('./supabaseClient');
const { detectPatterns, calculateProductivityScore } = require('./patternDetection');
const { analyzePatternWithAI, getProductivityInsight } = require('./aiEngine');
const { sendEmail, openApp, executeAutomation, generateTaskReport, logToSupabase } = require('./executionEngine');

const app = express();
app.use(cors({
    origin: [
        'http://localhost:8081',
        'http://localhost:3000',
        'http://localhost:19006',
        /^https:\/\/.*\.vercel\.app$/,
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ message: 'FlowOptix API is running!', version: '2.0.0' }));

// ── Tasks ──────────────────────────────────────────────────────────────────
app.post('/tasks/log', async (req, res) => {
    const { user_id, task_name, category, duration_seconds } = req.body;
    if (!user_id || !task_name) return res.status(400).json({ error: 'user_id and task_name are required' });
    const { data, error } = await supabase
        .from('task_logs')
        .insert([{ user_id, task_name, category, duration_seconds, started_at: new Date(), ended_at: new Date() }])
        .select();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, task: data[0] });
});

app.get('/tasks/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const { data, error } = await supabase
        .from('task_logs').select('*').eq('user_id', user_id)
        .order('started_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ tasks: data });
});

app.delete('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('task_logs').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
});

// ── Patterns ───────────────────────────────────────────────────────────────
app.get('/patterns/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const { data: tasks, error } = await supabase
        .from('task_logs').select('*').eq('user_id', user_id)
        .order('started_at', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });

    const patterns = detectPatterns(tasks);
    const topPatterns = patterns.slice(0, 3);
    const aiPatterns = [];

    for (const p of topPatterns) {
        const aiAnalysis = await analyzePatternWithAI(p);
        aiPatterns.push({ ...p, ai: aiAnalysis });
    }
    res.json({ patterns: aiPatterns });
});

// ── Productivity ───────────────────────────────────────────────────────────
app.get('/productivity/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const { data: tasks, error } = await supabase.from('task_logs').select('*').eq('user_id', user_id);
    if (error) return res.status(400).json({ error: error.message });

    const result = calculateProductivityScore(tasks);
    const aiInsight = await getProductivityInsight(result);
    result.ai = aiInsight;
    res.json(result);
});

// ── Execute: Email ─────────────────────────────────────────────────────────
app.post('/execute/email', async (req, res) => {
    const { to, subject, body, user_id } = req.body;
    try {
        await sendEmail(to, subject, body, user_id);
        res.json({ success: true, message: 'Email sent successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ── Execute: Open App ──────────────────────────────────────────────────────
app.post('/execute/app', async (req, res) => {
    const { appName, user_id } = req.body;
    if (!appName) return res.status(400).json({ error: 'appName is required' });

    const result = openApp(appName);
    if (user_id) {
        await logToSupabase(user_id, 'open_app', `Opened ${appName}`, { appName, url: result.url }, 'success');
    }
    res.json({ success: true, ...result });
});

// ── Execute: Automation ────────────────────────────────────────────────────
app.post('/execute/automation', async (req, res) => {
    const { pattern, user_id } = req.body;
    if (!pattern || !user_id) return res.status(400).json({ error: 'pattern and user_id are required' });

    try {
        const result = await executeAutomation(pattern, user_id);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Execute: Log Action ────────────────────────────────────────────────────
app.post('/execute/action', async (req, res) => {
    const { user_id, action_type, action_name, action_details, status } = req.body;
    if (!user_id || !action_type || !status) {
        return res.status(400).json({ error: 'user_id, action_type, and status are required' });
    }
    const { data, error } = await supabase.from('execution_logs').insert({
        user_id, action_type, action_name: action_name || action_type,
        action_details: action_details ?? {}, status,
        executed_at: new Date().toISOString(),
    }).select();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, log: data[0] });
});

// ── Execute: History ───────────────────────────────────────────────────────
app.get('/execute/history/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const { data, error } = await supabase
        .from('execution_logs').select('*').eq('user_id', user_id)
        .order('executed_at', { ascending: false }).limit(100);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ history: data });
});

app.delete('/execute/history/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const { error } = await supabase.from('execution_logs').delete().eq('user_id', user_id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
});

// ── Export ─────────────────────────────────────────────────────────────────
app.get('/export/tasks/:user_id', async (req, res) => {
    try {
        const report = await generateTaskReport(req.params.user_id);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="flowoptix_tasks_${new Date().toISOString().slice(0,10)}.csv"`);
        res.send(report.csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/export/patterns/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const { data, error } = await supabase
        .from('task_patterns').select('*').eq('user_id', user_id)
        .order('detected_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });

    const header = 'pattern_name,frequency,confidence_score,detected_at';
    const lines = (data ?? []).map(r =>
        [r.pattern_name, r.frequency, r.confidence_score, r.detected_at]
            .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
            .join(',')
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="flowoptix_patterns_${new Date().toISOString().slice(0,10)}.csv"`);
    res.send([header, ...lines].join('\n'));
});

app.get('/export/report/:user_id', async (req, res) => {
    try {
        const report = await generateTaskReport(req.params.user_id);
        const { data: patterns } = await supabase
            .from('task_patterns').select('*').eq('user_id', req.params.user_id);
        const { data: execLogs } = await supabase
            .from('execution_logs').select('*').eq('user_id', req.params.user_id);
        res.json({
            ...report,
            patterns: patterns ?? [],
            executionLogs: execLogs ?? [],
            userId: req.params.user_id,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Automation Rules ───────────────────────────────────────────────────────
app.post('/automation/rules', async (req, res) => {
    const { user_id, rule_name, trigger_pattern, action_type, action_config } = req.body;
    if (!user_id || !rule_name || !trigger_pattern || !action_type) {
        return res.status(400).json({ error: 'user_id, rule_name, trigger_pattern, and action_type are required' });
    }
    const { data, error } = await supabase.from('automation_rules').insert({
        user_id, rule_name, trigger_pattern, action_type,
        action_config: action_config ?? {}, is_active: true,
    }).select();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, rule: data[0] });
});

app.get('/automation/rules/:user_id', async (req, res) => {
    const { data, error } = await supabase
        .from('automation_rules').select('*').eq('user_id', req.params.user_id)
        .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ rules: data });
});

app.put('/automation/rules/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    delete updates.id; delete updates.user_id; delete updates.created_at;
    const { data, error } = await supabase
        .from('automation_rules').update(updates).eq('id', id).select();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, rule: data[0] });
});

app.delete('/automation/rules/:id', async (req, res) => {
    const { error } = await supabase.from('automation_rules').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
});

// ── Delete all user data ───────────────────────────────────────────────────
app.delete('/users/:user_id/data', async (req, res) => {
    const { user_id } = req.params;
    try {
        await Promise.all([
            supabase.from('task_logs').delete().eq('user_id', user_id),
            supabase.from('task_patterns').delete().eq('user_id', user_id),
            supabase.from('automation_suggestions').delete().eq('user_id', user_id),
            supabase.from('productivity_scores').delete().eq('user_id', user_id),
            supabase.from('execution_logs').delete().eq('user_id', user_id),
            supabase.from('automation_rules').delete().eq('user_id', user_id),
        ]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 FlowOptix API v2 running on port ${PORT}`));
