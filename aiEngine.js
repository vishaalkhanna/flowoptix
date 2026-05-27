require('dotenv').config();
const OpenAI = require('openai');

const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
});

async function callAI(prompt) {
    try {
        const response = await client.chat.completions.create({
            model: 'openrouter/free',
            messages: [{ role: 'user', content: prompt }],
        });
        const text = response.choices[0].message.content.replace(/```json|```/g, '').trim();
        console.log('✅ AI Response received');
        return JSON.parse(text);
    } catch (err) {
        console.log('❌ AI Error:', err.message);
        return null;
    }
}

async function analyzePatternWithAI(pattern) {
    const prompt = `You are FlowOptix, an AI workflow automation advisor. Analyze this repeated task pattern. Respond in ONLY valid JSON (no markdown, no backticks, no extra text).

Pattern: "${pattern.pattern_name}"
Tasks: ${JSON.stringify(pattern.task_sequence)}
Frequency: ${pattern.frequency} times
Confidence: ${Math.round(pattern.confidence_score * 100)}%

Respond with ONLY:
{"explanation":"1-2 sentence explanation","automation_suggestion":"specific recommendation","tool":"specific tool name","time_saved_per_week":"number in minutes","difficulty":"easy or medium or hard"}`;

    const result = await callAI(prompt);
    return result || {
        explanation: `You repeat "${pattern.pattern_name}" frequently.`,
        automation_suggestion: 'Consider automating this workflow.',
        tool: 'Custom script',
        time_saved_per_week: '15-30',
        difficulty: 'medium'
    };
}

async function getProductivityInsight(scoreData) {
    const prompt = `You are FlowOptix, an AI productivity coach. Respond in ONLY valid JSON (no markdown, no backticks).

Score: ${scoreData.score}/100, Tasks: ${scoreData.tasks_completed}, Repetitive: ${scoreData.repetitive_count}

Respond with ONLY:
{"insight":"2-3 sentence analysis","top_tip":"one actionable tip","rating":"poor or fair or good or excellent"}`;

    const result = await callAI(prompt);
    return result || {
        insight: `Your productivity score is ${scoreData.score}/100.`,
        top_tip: 'Focus on automating your most frequent patterns.',
        rating: scoreData.score > 70 ? 'good' : scoreData.score > 40 ? 'fair' : 'poor'
    };
}

module.exports = { analyzePatternWithAI, getProductivityInsight };