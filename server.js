require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const supabase = require('./supabaseClient');

// Service-role client bypasses RLS — used only for server-side writes like OAuth token storage.
// Falls back to anon client if SUPABASE_SERVICE_ROLE_KEY is not set (will fail RLS).
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.SUPABASE_URL.trim(),
        process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
    : supabase;
const { detectPatterns, calculateProductivityScore } = require('./patternDetection');
const { analyzePatternWithAI, getProductivityInsight } = require('./aiEngine');
const { sendEmail, sendViaResend, openApp, executeAutomation, generateTaskReport, logToSupabase } = require('./executionEngine');

// ── ML category predictor ──────────────────────────────────────────────────
let modelWeights = null;
try {
    modelWeights = require('./model_weights.json');
    console.log(`[ML] Model loaded — classes: ${modelWeights.classes.join(', ')}`);
} catch (e) {
    console.error('[ML] model_weights.json not found — run: npm run train:model');
}

// ── Startup config check ───────────────────────────────────────────────────
(function checkEmailConfig() {
    if (process.env.RESEND_API_KEY) {
        console.log('[Config] RESEND_API_KEY set');
    } else {
        console.log('[Config] WARNING: RESEND_API_KEY missing — emails will fail');
    }
    if (process.env.NOTIFY_EMAIL) {
        console.log(`[Config] NOTIFY_EMAIL set to ${process.env.NOTIFY_EMAIL}`);
    } else {
        console.log('[Config] WARNING: NOTIFY_EMAIL missing — task notifications disabled');
    }
    const effectiveFrom = process.env.RESEND_FROM_EMAIL || 'FlowOptix <onboarding@resend.dev> (Resend sandbox fallback)';
    console.log(`[Config] RESEND_FROM_EMAIL: ${effectiveFrom}`);
})();

function predictCategory(taskName) {
    if (!modelWeights || !modelWeights.categoryWeights) {
        return { category: 'general', confidence: 0 };
    }
    const text = taskName.toLowerCase();
    let maxScore = -Infinity;
    let predictedCategory = 'general';
    let confidence = 0;

    for (const [category, weights] of Object.entries(modelWeights.categoryWeights)) {
        let score = weights.prior;
        for (const word of text.split(/\s+/)) {
            if (weights.vocab[word]) {
                score += weights.vocab[word];
            }
        }
        if (score > maxScore) {
            maxScore = score;
            predictedCategory = category;
            confidence = Math.min(0.99, Math.exp(score) / (1 + Math.exp(score)));
        }
    }
    return { category: predictedCategory, confidence: parseFloat(confidence.toFixed(4)) };
}

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

// ── ML: Predict Category ───────────────────────────────────────────────────
app.post('/predict/category', (req, res) => {
    const { task_name } = req.body;
    if (!task_name || typeof task_name !== 'string' || !task_name.trim()) {
        return res.status(400).json({ error: 'task_name is required' });
    }
    if (!modelWeights) {
        return res.status(503).json({ error: 'ML model not loaded — run: npm run train:model' });
    }
    try {
        const prediction = predictCategory(task_name.trim());
        res.json({ task_name: task_name.trim(), ...prediction });
    } catch (err) {
        console.error('[/predict/category] Error:', err.message);
        res.status(500).json({ error: 'Prediction failed', details: err.message });
    }
});

// ── Task notification email (non-blocking) ─────────────────────────────────
function sendTaskNotificationEmail(task) {
    const notifyEmail = process.env.NOTIFY_EMAIL;
    if (!notifyEmail) {
        console.log('[Email] NOTIFY_EMAIL not set — skipping task notification');
        return;
    }
    const subject = `FlowOptix: task logged — ${task.task_name}`;
    const body = [
        `Task: ${task.task_name}`,
        `Category: ${task.category || 'general'}`,
        `Source: ${task.source || 'manual'}`,
        `Logged at: ${task.created_at || new Date().toISOString()}`,
    ].join('\n');
    sendViaResend(notifyEmail, subject, body)
        .then(() => console.log(`[Email] Task notification sent — task: "${task.task_name}"`))
        .catch(err => console.error(`[Email] Task notification failed (task still saved): ${err.message}`));
}

// ── Tasks ──────────────────────────────────────────────────────────────────
app.post('/tasks/log', async (req, res) => {
    const { user_id, task_name, category, duration } = req.body;
    if (!user_id || !task_name) return res.status(400).json({ error: 'user_id and task_name are required' });
    const row = { user_id, task_name, category: category || 'general' };
    if (duration != null) row.duration = duration;
    const { data, error } = await supabase.from('task_logs').insert([row]).select();
    if (error) return res.status(400).json({ error: error.message });
    // Fire email notification after response — failure here never blocks the save
    sendTaskNotificationEmail(data[0]);
    res.json({ success: true, task: data[0] });
});

app.get('/tasks/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const { data, error } = await supabase
        .from('task_logs').select('*').eq('user_id', user_id)
        .order('created_at', { ascending: false });
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
        .order('created_at', { ascending: true });
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

// ── AI Chat ────────────────────────────────────────────────────────────────
app.post('/chat', async (req, res) => {
    const { user_id, message } = req.body;
    if (!user_id || !message) {
        return res.status(400).json({ error: 'user_id and message are required' });
    }

    try {
        const [userRes, tasksRes, patternsRes, integrationsRes, execLogsRes] = await Promise.all([
            supabaseAdmin.auth.admin.getUserById(user_id),
            supabase.from('task_logs')
                .select('task_name, category, source, created_at')
                .eq('user_id', user_id)
                .order('created_at', { ascending: false })
                .limit(20),
            supabase.from('task_patterns')
                .select('pattern_name, frequency, confidence, ai_analysis')
                .eq('user_id', user_id)
                .order('created_at', { ascending: false })
                .limit(10),
            supabaseAdmin.from('user_integrations')
                .select('integration_type, is_connected')
                .eq('user_id', user_id),
            supabase.from('execution_logs')
                .select('action_type, action_description, status, created_at')
                .eq('user_id', user_id)
                .order('created_at', { ascending: false })
                .limit(10),
        ]);

        const user         = userRes.data?.user;
        const tasks        = tasksRes.data ?? [];
        const execLogs     = execLogsRes.data ?? [];
        const integrations = {};
        if (patternsRes.error) console.error('[/chat] task_patterns query error:', patternsRes.error.message);
        if (execLogsRes.error) console.error('[/chat] execution_logs query error:', execLogsRes.error.message);
        const patterns     = patternsRes.data ?? [];
        (integrationsRes.data ?? []).forEach(i => { integrations[i.integration_type] = i.is_connected; });

        // User name from Google OAuth metadata
        const userName  = user?.user_metadata?.full_name
            || user?.user_metadata?.name
            || user?.email?.split('@')[0]
            || 'Unknown';
        const userEmail = user?.email || 'Unknown';

        // Productivity score from live task data
        const productivity = calculateProductivityScore(tasks);
        const score        = productivity?.score ?? 0;

        // Format tasks
        const taskLines = tasks.length > 0
            ? tasks.map(t => {
                const src  = t.source ? ` [${t.source}]` : '';
                const date = t.created_at ? new Date(t.created_at).toLocaleDateString() : '';
                return `  • ${t.task_name} (${t.category || 'general'}${src}${date ? ', ' + date : ''})`;
            }).join('\n')
            : '  • No tasks logged yet';

        // Category breakdown
        const catCounts = {};
        tasks.forEach(t => { catCounts[t.category || 'general'] = (catCounts[t.category || 'general'] || 0) + 1; });
        const catSummary = Object.entries(catCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([c, n]) => `${c}: ${n}`).join(', ') || 'none';

        // Format patterns
        const patternLines = patterns.length > 0
            ? patterns.map(p => {
                const conf   = Math.round((p.confidence ?? 0) * 100);
                const aiLine = p.ai_analysis ? `\n    AI insight: ${p.ai_analysis}` : '';
                return `  • ${p.pattern_name} — ${p.frequency ?? 0}x, ${conf}% confidence${aiLine}`;
            }).join('\n')
            : '  • No patterns detected yet — user should run Analyze Patterns';

        // Format integrations
        const integrationLines = [
            `  • Gmail: ${integrations['gmail'] ? '✓ Connected' : '✗ Not connected'}`,
            `  • Google Calendar: ${integrations['calendar'] ? '✓ Connected' : '✗ Not connected'}`,
            `  • Chrome Extension: ${integrations['browser'] ? '✓ Connected' : '✗ Not connected'}`,
        ].join('\n');

        // Format execution history
        const execLines = execLogs.length > 0
            ? execLogs.map(e => {
                const date = e.created_at ? new Date(e.created_at).toLocaleDateString() : '';
                return `  • ${e.action_description || e.action_type} — ${e.status}${date ? ' on ' + date : ''}`;
            }).join('\n')
            : '  • No automations executed yet';

        const systemPrompt = `You are FlowOptix AI, a personal productivity intelligence assistant.
You have full, real-time access to the user's actual data. Use it to give specific, accurate answers.

USER PROFILE:
  Name: ${userName}
  Email: ${userEmail}

PRODUCTIVITY SCORE: ${score}/100
  Tasks in history: ${tasks.length}

RECENT TASKS (last 20):
${taskLines}

TASK CATEGORY BREAKDOWN: ${catSummary}

DETECTED PATTERNS:
${patternLines}

CONNECTED INTEGRATIONS:
${integrationLines}

RECENT AUTOMATION HISTORY:
${execLines}

HOW TO RESPOND:
- Answer any question — productivity, tasks, patterns, general knowledge, anything
- Use specific names, numbers, and dates from the real data above when relevant
- When asked "What is my name?", answer: ${userName}
- When data is sparse, acknowledge it honestly and suggest how to get more data
- Be conversational and natural — no length restrictions`;

        const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
        const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://flowoptix-ten.vercel.app',
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3.5-haiku',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message },
                ],
                max_tokens: 1000,
            }),
        });

        const aiData = await aiRes.json();
        const reply  = aiData.choices?.[0]?.message?.content;
        if (!reply) {
            const detail = aiData.error ? JSON.stringify(aiData.error) : 'No reply from AI';
            console.error('[/chat] OpenRouter error:', detail);
            return res.status(500).json({ error: detail });
        }

        res.json({ reply });
    } catch (err) {
        console.error('[/chat] Exception:', err);
        res.status(500).json({ error: err.message });
    }
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

// ── Auto-log (browser extension / screen time) ────────────────────────────
app.post('/tasks/auto-log', async (req, res) => {
    const { user_id, tasks } = req.body;
    if (!user_id || !Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ error: 'user_id and tasks array required' });
    }
    const rows = tasks.map(t => ({
        user_id,
        task_name: t.task_name,
        category: t.category || 'general',
        source: ['manual','gmail','calendar','browser','screen_time'].includes(t.source) ? t.source : 'browser',
    }));
    const { data, error } = await supabase.from('task_logs').insert(rows).select();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, logged: data.length });
});

// ── Integrations status ────────────────────────────────────────────────────
app.get('/integrations/:user_id', async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('user_integrations')
        .select('integration_type, is_connected, connected_at')
        .eq('user_id', req.params.user_id);
    if (error) return res.status(400).json({ error: error.message });
    const map = {};
    (data ?? []).forEach(r => { map[r.integration_type] = r.is_connected; });
    res.json({ integrations: map });
});

// ── Google OAuth helpers ───────────────────────────────────────────────────
function googleOAuthUrl(scope, redirectUri, state) {
    const p = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope,
        access_type: 'offline',
        prompt: 'consent',
        state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function exchangeGoogleCode(code, redirectUri) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        }),
    });
    if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
    return res.json();
}

const SELF_URL = process.env.BACKEND_URL || 'https://flowoptix.onrender.com';
const APP_URL  = process.env.FRONTEND_URL || 'https://flowoptix-ten.vercel.app';

// ── Gmail OAuth ────────────────────────────────────────────────────────────
app.get('/gmail/authorize', (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(503).json({ error: 'Google OAuth not configured — add GOOGLE_CLIENT_ID to Render env vars' });
    }
    res.redirect(googleOAuthUrl(
        'https://www.googleapis.com/auth/gmail.readonly',
        `${SELF_URL}/gmail/callback`,
        user_id
    ));
});

app.get('/gmail/callback', async (req, res) => {
    const { code, state: user_id } = req.query;
    console.log('[gmail/callback] received — user_id:', user_id, 'code present:', !!code);
    try {
        const tokens = await exchangeGoogleCode(code, `${SELF_URL}/gmail/callback`);
        console.log('[gmail/callback] token exchange OK — access_token present:', !!tokens.access_token);

        const { error: upsertError } = await supabaseAdmin.from('user_integrations').upsert({
            user_id,
            integration_type: 'gmail',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_expiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
            is_connected: true,
            connected_at: new Date().toISOString(),
        }, { onConflict: 'user_id,integration_type' });

        if (upsertError) {
            console.error('[gmail/callback] UPSERT FAILED:', upsertError);
            return res.redirect(`${APP_URL}?gmail_error=${encodeURIComponent(upsertError.message)}`);
        }

        console.log('[gmail/callback] token saved to user_integrations for user:', user_id);
        res.redirect(`${APP_URL}?gmail_connected=1`);
    } catch (err) {
        console.error('[gmail/callback] EXCEPTION:', err);
        res.redirect(`${APP_URL}?gmail_error=${encodeURIComponent(err.message)}`);
    }
});

app.get('/gmail/analyze/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const { data: integ } = await supabaseAdmin
        .from('user_integrations').select('access_token')
        .eq('user_id', user_id).eq('integration_type', 'gmail').single();
    if (!integ?.access_token) return res.status(401).json({ error: 'Gmail not connected' });

    try {
        const listRes = await fetch(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=in:inbox',
            { headers: { Authorization: `Bearer ${integ.access_token}` } }
        );
        const listData = await listRes.json();
        if (listData.error) return res.status(401).json({ error: 'Gmail token expired — reconnect Gmail' });
        if (!listData.messages) return res.json({ patterns: [], tasks_logged: 0 });

        const msgFetches = listData.messages.slice(0, 30).map(m =>
            fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`, {
                headers: { Authorization: `Bearer ${integ.access_token}` }
            }).then(r => r.json())
        );
        const messages = await Promise.all(msgFetches);

        const senderCounts = {};
        let reportCount = 0, notifCount = 0;
        messages.forEach(msg => {
            const headers = msg.payload?.headers || [];
            const from    = headers.find(h => h.name === 'From')?.value || '';
            const subject = headers.find(h => h.name === 'Subject')?.value || '';
            const domain  = from.match(/@([^>]+)/)?.[1]?.trim() || from;
            if (domain) senderCounts[domain] = (senderCounts[domain] || 0) + 1;
            if (/report|digest|summary|daily|weekly/i.test(subject)) reportCount++;
            if (/notification|alert|reminder|no-reply/i.test(subject)) notifCount++;
        });

        const patterns = [];
        Object.entries(senderCounts)
            .filter(([, n]) => n >= 3).sort(([, a], [, b]) => b - a).slice(0, 5)
            .forEach(([domain, n]) => patterns.push({
                description: `${n} emails from ${domain}`,
                suggestion: `Set up a filter or auto-response for ${domain}`,
                category: 'communication', count: n,
            }));
        if (reportCount >= 3) patterns.push({
            description: `${reportCount} report/digest emails in inbox`,
            suggestion: 'Automate report digestion — route to a dedicated folder',
            category: 'reporting', count: reportCount,
        });
        if (notifCount >= 5) patterns.push({
            description: `${notifCount} notification emails cluttering inbox`,
            suggestion: 'Unsubscribe or filter automated notifications',
            category: 'communication', count: notifCount,
        });

        const tasksToLog = patterns.map(p => ({
            user_id, task_name: p.description, category: p.category, source: 'gmail',
        }));
        if (tasksToLog.length > 0) await supabase.from('task_logs').insert(tasksToLog);

        res.json({ patterns, tasks_logged: tasksToLog.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Calendar OAuth ─────────────────────────────────────────────────────────
app.get('/calendar/authorize', (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(503).json({ error: 'Google OAuth not configured — add GOOGLE_CLIENT_ID to Render env vars' });
    }
    res.redirect(googleOAuthUrl(
        'https://www.googleapis.com/auth/calendar.readonly',
        `${SELF_URL}/calendar/callback`,
        user_id
    ));
});

app.get('/calendar/callback', async (req, res) => {
    const { code, state: user_id } = req.query;
    console.log('[calendar/callback] received — user_id:', user_id, 'code present:', !!code);
    try {
        const tokens = await exchangeGoogleCode(code, `${SELF_URL}/calendar/callback`);
        console.log('[calendar/callback] token exchange OK — access_token present:', !!tokens.access_token);

        const { error: upsertError } = await supabaseAdmin.from('user_integrations').upsert({
            user_id,
            integration_type: 'calendar',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_expiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
            is_connected: true,
            connected_at: new Date().toISOString(),
        }, { onConflict: 'user_id,integration_type' });

        if (upsertError) {
            console.error('[calendar/callback] UPSERT FAILED:', upsertError);
            return res.redirect(`${APP_URL}?calendar_error=${encodeURIComponent(upsertError.message)}`);
        }

        console.log('[calendar/callback] token saved to user_integrations for user:', user_id);
        res.redirect(`${APP_URL}?calendar_connected=1`);
    } catch (err) {
        console.error('[calendar/callback] EXCEPTION:', err);
        res.redirect(`${APP_URL}?calendar_error=${encodeURIComponent(err.message)}`);
    }
});

app.get('/calendar/analyze/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const { data: integ } = await supabaseAdmin
        .from('user_integrations').select('access_token')
        .eq('user_id', user_id).eq('integration_type', 'calendar').single();
    if (!integ?.access_token) return res.status(401).json({ error: 'Calendar not connected' });

    try {
        const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const timeMax = new Date().toISOString();
        const calRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=200&singleEvents=true&orderBy=startTime`,
            { headers: { Authorization: `Bearer ${integ.access_token}` } }
        );
        const calData = await calRes.json();
        if (calData.error) return res.status(401).json({ error: 'Calendar token expired — reconnect Calendar' });

        const events = calData.items || [];
        const titleCounts = {};
        let totalMeetingMins = 0, backToBackCount = 0;
        const sortedEvents = [...events].sort((a, b) =>
            new Date(a.start?.dateTime || a.start?.date) - new Date(b.start?.dateTime || b.start?.date)
        );

        sortedEvents.forEach((ev, i) => {
            const title = (ev.summary || 'Meeting').toLowerCase();
            titleCounts[title] = (titleCounts[title] || 0) + 1;
            const start = new Date(ev.start?.dateTime || ev.start?.date);
            const end   = new Date(ev.end?.dateTime   || ev.end?.date);
            const mins  = (end - start) / 60000;
            if (mins > 0 && mins < 480) totalMeetingMins += mins;
            if (i > 0) {
                const prevEnd = new Date(sortedEvents[i-1].end?.dateTime || sortedEvents[i-1].end?.date);
                if ((start - prevEnd) < 5 * 60 * 1000) backToBackCount++;
            }
        });

        const patterns = [];
        Object.entries(titleCounts)
            .filter(([, n]) => n >= 3).sort(([, a], [, b]) => b - a).slice(0, 4)
            .forEach(([title, n]) => patterns.push({
                description: `"${title}" happens ${n} times — recurring meeting`,
                suggestion: 'Create a template agenda to save prep time each week',
                category: 'admin', count: n,
            }));

        const meetingPct = events.length > 0 ? Math.round((totalMeetingMins / (30 * 8 * 60)) * 100) : 0;
        if (meetingPct > 20) patterns.push({
            description: `~${meetingPct}% of work hours spent in meetings (${Math.round(totalMeetingMins / 60)}h/month)`,
            suggestion: 'Block focus-time slots to protect deep work hours',
            category: 'admin', count: Math.round(totalMeetingMins / 60),
        });
        if (backToBackCount >= 3) patterns.push({
            description: `${backToBackCount} back-to-back meetings detected — no buffer time`,
            suggestion: 'Add 5-minute gaps between meetings to reduce stress',
            category: 'admin', count: backToBackCount,
        });

        const tasksToLog = patterns.map(p => ({
            user_id, task_name: p.description, category: p.category, source: 'calendar',
        }));
        if (tasksToLog.length > 0) await supabase.from('task_logs').insert(tasksToLog);

        res.json({ patterns, tasks_logged: tasksToLog.length, meeting_percent: meetingPct });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Disconnect integration ─────────────────────────────────────────────────
app.delete('/integrations/:user_id/:type', async (req, res) => {
    const { user_id, type } = req.params;
    const { error } = await supabaseAdmin.from('user_integrations')
        .update({ is_connected: false, access_token: null, refresh_token: null })
        .eq('user_id', user_id).eq('integration_type', type);
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
