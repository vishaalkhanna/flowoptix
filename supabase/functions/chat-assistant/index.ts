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

    const [tasksRes, patternsRes, scoresRes] = await Promise.all([
      supabase.from('task_logs').select('task_name,category,duration_seconds,started_at').eq('user_id', user.id).order('started_at', { ascending: false }).limit(20),
      supabase.from('task_patterns').select('pattern_name,frequency,confidence_score').eq('user_id', user.id).limit(10),
      supabase.from('productivity_scores').select('score,score_date,tasks_completed').eq('user_id', user.id).order('score_date', { ascending: false }).limit(7),
    ]);

    const latest = scoresRes.data?.[0];
    const tasksByCategory: Record<string, number> = {};
    tasksRes.data?.forEach((t: any) => { tasksByCategory[t.category] = (tasksByCategory[t.category] || 0) + 1; });

    const context = `
User FlowOptix data:
- Productivity score: ${latest?.score ?? 'N/A'}/100
- Tasks completed: ${latest?.tasks_completed ?? 'N/A'}
- Category distribution: ${JSON.stringify(tasksByCategory)}
- Recent tasks: ${JSON.stringify(tasksRes.data?.slice(0, 10)?.map((t: any) => ({ name: t.task_name, cat: t.category, dur: t.duration_seconds + 's' })))}
- Detected patterns: ${JSON.stringify(patternsRes.data?.map((p: any) => ({ pattern: p.pattern_name, freq: p.frequency, conf: Math.round(p.confidence_score * 100) + '%' })))}
- Score history: ${JSON.stringify(scoresRes.data?.map((s: any) => ({ date: s.score_date, score: s.score })))}
    `.trim();

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
          {
            role: 'system',
            content: `You are FlowOptix AI, a productivity assistant with access to the user's real workflow data. Give specific, data-driven advice. Be concise (2-4 sentences) and actionable.\n\n${context}`,
          },
          { role: 'user', content: message },
        ],
        max_tokens: 350,
      }),
    });

    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content;
    if (!reply) {
      return new Response(JSON.stringify({ error: 'No AI response' }), {
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
