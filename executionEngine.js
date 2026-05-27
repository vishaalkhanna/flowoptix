require('dotenv').config();
const supabase = require('./supabaseClient');

const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_EMAIL || 'https://hooks.zapier.com/hooks/catch/27732258/4oxjwdm/';

const APP_URLS = {
    'Open Excel':          'https://www.office.com/launch/excel',
    'Open Word':           'https://www.office.com/launch/word',
    'Open PowerPoint':     'https://www.office.com/launch/powerpoint',
    'Copy Data':           'https://www.office.com/launch/excel',
    'Upload File':         'https://drive.google.com',
    'Download Report':     'GENERATE_CSV',
    'Send Email':          'SHOW_EMAIL_MODAL',
    'Reply to Email':      'https://mail.google.com',
    'Check Slack':         'https://app.slack.com',
    'Join Meeting':        'https://meet.google.com',
    'Write Code':          'https://vscode.dev',
    'Review PR':           'https://github.com/pulls',
    'Fix Bug':             'https://github.com/issues',
    'Deploy App':          'https://vercel.com/dashboard',
    'Generate Report':     'GENERATE_REPORT',
    'Update Dashboard':    'https://lookerstudio.google.com',
    'Create Presentation': 'https://docs.google.com/presentation',
    'Update Jira Ticket':  'https://www.atlassian.com/software/jira',
    'Fill Timesheet':      'https://www.office.com/launch/excel',
    'Attend Standup':      'https://meet.google.com',
};

async function logToSupabase(userId, actionType, actionName, actionDetails, status) {
    try {
        await supabase.from('execution_logs').insert({
            user_id: userId,
            action_type: actionType,
            action_name: actionName,
            action_details: actionDetails || {},
            status,
            executed_at: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Failed to log execution:', err.message);
    }
}

async function sendEmail(to, subject, body, userId) {
    if (!to?.trim())      throw new Error('Recipient email is required');
    if (!subject?.trim()) throw new Error('Email subject is required');
    if (!body?.trim())    throw new Error('Email body is required');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to.trim())) throw new Error('Invalid recipient email address');

    const response = await fetch(ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim(), body: body.trim() }),
    });

    if (!response.ok) {
        await logToSupabase(userId, 'email', `Failed email to ${to}`, { to, subject }, 'failed');
        throw new Error(`Email service unavailable (${response.status}). Task logged but email not sent.`);
    }

    await logToSupabase(userId, 'email', `Sent email to ${to}`, { to, subject }, 'success');
    return { success: true };
}

function openApp(appName) {
    const url = APP_URLS[appName] || null;
    if (!url) return { url: null, type: 'unknown' };
    if (url === 'GENERATE_CSV' || url === 'GENERATE_REPORT') return { url: null, type: url };
    return { url, type: 'url' };
}

async function executeAutomation(pattern, userId) {
    const name = (pattern.pattern_name || '').toLowerCase();
    let action = 'zapier_dashboard';
    let url = 'https://zapier.com/app/dashboard';

    if (name.includes('file') || name.includes('excel') || name.includes('data') || name.includes('spread')) {
        action = 'zapier_sheets';
        url = 'https://zapier.com/apps/google-sheets/integrations';
    } else if (name.includes('communication') || name.includes('email') || name.includes('slack')) {
        action = 'email_modal';
        url = 'SHOW_EMAIL_MODAL';
    } else if (name.includes('dev') || name.includes('code') || name.includes('pr') || name.includes('git')) {
        action = 'open_dev_tools';
        url = 'https://vscode.dev';
    } else if (name.includes('meet') || name.includes('call') || name.includes('calendar')) {
        action = 'open_calendar';
        url = 'https://calendar.google.com';
    }

    await logToSupabase(userId, 'automation', `Executed ${pattern.pattern_name}`,
        { pattern: pattern.pattern_name, action }, 'success');
    return { url, action };
}

async function generateTaskReport(userId) {
    const { data, error } = await supabase
        .from('task_logs')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const nameCounts = {};
    rows.forEach(t => { nameCounts[t.task_name] = (nameCounts[t.task_name] || 0) + 1; });

    const totalTasks = rows.length;
    const uniqueTasks = Object.keys(nameCounts).length;
    const repetitiveTasks = rows.filter(t => nameCounts[t.task_name] > 1).length;
    const repetitiveRatio = totalTasks > 0 ? repetitiveTasks / totalTasks : 0;
    const score = Math.round((1 - repetitiveRatio * 0.5) * 100);

    const catCounts = {};
    rows.forEach(t => { catCounts[t.category || 'general'] = (catCounts[t.category || 'general'] || 0) + 1; });

    const header = 'task_name,category,duration_seconds,started_at,ended_at';
    const lines = rows.map(r =>
        [r.task_name, r.category, r.duration_seconds, r.started_at, r.ended_at]
            .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
            .join(',')
    );

    return {
        csv: [header, ...lines].join('\n'),
        stats: { totalTasks, uniqueTasks, repetitiveTasks, repetitiveRatio, score, categories: catCounts },
        generatedAt: new Date().toISOString(),
    };
}

module.exports = { sendEmail, openApp, executeAutomation, generateTaskReport, logToSupabase };
