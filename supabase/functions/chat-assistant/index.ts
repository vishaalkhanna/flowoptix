import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    if (!message) {
      return new Response(JSON.stringify({ error: 'No message provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all user data in parallel
    const [tasksRes, patternsRes, scoresRes, integrationsRes, execLogsRes, rulesRes] = await Promise.all([
      supabase.from('task_logs')
        .select('task_name, category, duration_seconds, source, started_at')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(20),
      supabase.from('task_patterns')
        .select('pattern_name, frequency, confidence_score, detected_at, description, ai_analysis')
        .eq('user_id', user.id)
        .order('detected_at', { ascending: false })
        .limit(10),
      supabase.from('productivity_scores')
        .select('score, score_date, tasks_completed, breakdown')
        .eq('user_id', user.id)
        .order('score_date', { ascending: false })
        .limit(1),
      supabase.from('user_integrations')
        .select('integration_type, is_connected, connected_at')
        .eq('user_id', user.id),
      supabase.from('execution_logs')
        .select('action_type, action_name, status, executed_at')
        .eq('user_id', user.id)
        .order('executed_at', { ascending: false })
        .limit(10),
      supabase.from('automation_rules')
        .select('rule_name, trigger_pattern, action_type, is_active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const tasks       = tasksRes.data ?? [];
    const patterns    = patternsRes.data ?? [];
    const latestScore = scoresRes.data?.[0];
    const execLogs    = execLogsRes.data ?? [];
    const rules       = rulesRes.data ?? [];

    const integrations: Record<string, boolean> = {};
    (integrationsRes.data ?? []).forEach((i: any) => {
      integrations[i.integration_type] = i.is_connected;
    });

    // ── Format task list ──────────────────────────────────────────────────────
    const taskLines = tasks.length > 0
      ? tasks.map((t: any) => {
          const mins = t.duration_seconds > 60
            ? `${Math.round(t.duration_seconds / 60)}m`
            : `${t.duration_seconds ?? 0}s`;
          const src  = t.source ? ` [${t.source}]` : '';
          const date = t.started_at ? new Date(t.started_at).toLocaleDateString() : '';
          return `  • ${t.task_name} (${t.category ?? 'general'}${src}, ${mins}${date ? ', ' + date : ''})`;
        }).join('\n')
      : '  • No tasks logged yet';

    // ── Category breakdown ────────────────────────────────────────────────────
    const catCounts: Record<string, number> = {};
    tasks.forEach((t: any) => {
      catCounts[t.category ?? 'general'] = (catCounts[t.category ?? 'general'] || 0) + 1;
    });
    const catSummary = Object.entries(catCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, n]) => `${cat}: ${n}`)
      .join(', ') || 'none';

    // ── Format patterns ───────────────────────────────────────────────────────
    const patternLines = patterns.length > 0
      ? patterns.map((p: any) => {
          const conf     = Math.round((p.confidence_score ?? 0) * 100);
          const descLine = p.description  ? `\n    Description: ${p.description}` : '';
          const aiLine   = p.ai_analysis  ? `\n    AI insight: ${p.ai_analysis}`  : '';
          const date     = p.detected_at  ? ` (detected ${new Date(p.detected_at).toLocaleDateString()})` : '';
          return `  • ${p.pattern_name}${date} — ${p.frequency ?? 0}x, ${conf}% confidence${descLine}${aiLine}`;
        }).join('\n')
      : '  • No patterns detected yet — try logging more tasks or running "Analyze Patterns"';

    // ── Format integrations ───────────────────────────────────────────────────
    const integrationLines = [
      `  • Gmail: ${integrations['gmail'] ? '✓ Connected' : '✗ Not connected'}`,
      `  • Google Calendar: ${integrations['calendar'] ? '✓ Connected' : '✗ Not connected'}`,
      `  • Chrome Extension: ${integrations['browser'] ? '✓ Connected' : '✗ Not connected'}`,
    ].join('\n');

    // ── Format execution history ──────────────────────────────────────────────
    const execLines = execLogs.length > 0
      ? execLogs.map((e: any) => {
          const date = e.executed_at ? new Date(e.executed_at).toLocaleDateString() : '';
          return `  • ${e.action_name ?? e.action_type} — ${e.status}${date ? ' on ' + date : ''}`;
        }).join('\n')
      : '  • No automations run yet';

    // ── Format automation rules ───────────────────────────────────────────────
    const ruleLines = rules.length > 0
      ? rules.map((r: any) =>
          `  • "${r.rule_name}": trigger="${r.trigger_pattern}", action=${r.action_type}, ${r.is_active ? 'active' : 'disabled'}`
        ).join('\n')
      : '  • No automation rules configured yet';

    // ── Productivity score ────────────────────────────────────────────────────
    const scoreText = latestScore
      ? `${latestScore.score}/100 — ${latestScore.tasks_completed ?? 0} tasks completed (as of ${latestScore.score_date})`
      : 'Not yet calculated — log some tasks to get a score';

    // ── Build system prompt ───────────────────────────────────────────────────
    const systemPrompt = `You are FlowOptix AI, a personal productivity intelligence assistant.
You have full access to the user's real workflow data shown below. Use it to give specific, accurate answers.

USER ACCOUNT: ${user.email}

PRODUCTIVITY SCORE: ${scoreText}

RECENT TASKS (last 20):
${taskLines}

TASK CATEGORY BREAKDOWN: ${catSummary}

DETECTED PATTERNS:
${patternLines}

CONNECTED INTEGRATIONS:
${integrationLines}

RECENT AUTOMATION HISTORY:
${execLines}

AUTOMATION RULES:
${ruleLines}

HOW TO RESPOND:
- Answer any question — productivity, tasks, patterns, general knowledge, whatever the user asks
- When data exists, be specific: use real task names, exact scores, actual dates, pattern names
- When data is sparse or empty, acknowledge it honestly and suggest how to get more (e.g. "connect Gmail to get email patterns")
- Do not give generic placeholder answers — if the data says something specific, say it
- For personal info requests: you can see their email (${user.email}) but don't have their full name
- Be conversational and natural — no artificial length limits`;

    const OPENROUTER_API_KEY = (Deno.env.get('OPENROUTER_API_KEY') ?? '').trim();
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://flowoptix.app',
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
    const reply = aiData.choices?.[0]?.message?.content;
    if (!reply) {
      const detail = aiData.error ? JSON.stringify(aiData.error) : 'No reply from AI';
      return new Response(JSON.stringify({ error: detail }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
