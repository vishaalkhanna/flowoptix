// Pattern Detection Engine - Core AI Logic of FlowOptix

function detectPatterns(taskLogs) {
    if (taskLogs.length < 3) {
        return []; // Need at least 3 tasks to detect a pattern
    }

    const patternMap = {};

    // Slide a window of 2-3 tasks and look for repeating sequences
    for (let i = 0; i < taskLogs.length - 1; i++) {
        // 2-task sequences
        const seq2 = [taskLogs[i].task_name, taskLogs[i + 1].task_name];
        const key2 = seq2.join(' → ');
        patternMap[key2] = patternMap[key2] || { sequence: seq2, count: 0 };
        patternMap[key2].count++;

        // 3-task sequences
        if (i < taskLogs.length - 2) {
            const seq3 = [
                taskLogs[i].task_name,
                taskLogs[i + 1].task_name,
                taskLogs[i + 2].task_name
            ];
            const key3 = seq3.join(' → ');
            patternMap[key3] = patternMap[key3] || { sequence: seq3, count: 0 };
            patternMap[key3].count++;
        }
    }

    // Filter patterns that repeat at least twice
    const detected = Object.entries(patternMap)
        .filter(([_, val]) => val.count >= 2)
        .map(([key, val]) => ({
            pattern_name: key,
            task_sequence: val.sequence,
            frequency: val.count,
            confidence_score: Math.min(val.count / 10, 1.0) // max 1.0
        }))
        .sort((a, b) => b.frequency - a.frequency);

    return detected;
}

function generateSuggestion(pattern) {
    const seq = pattern.task_sequence.join(', ');
    return {
        suggestion_text: `You repeatedly do: "${seq}". This can be automated!`,
        tool_hint: suggestTool(pattern.task_sequence)
    };
}

function suggestTool(sequence) {
    const joined = sequence.join(' ').toLowerCase();
    if (joined.includes('email') || joined.includes('message')) return 'Zapier or Gmail filters';
    if (joined.includes('file') || joined.includes('copy') || joined.includes('paste')) return 'AutoHotkey script';
    if (joined.includes('report') || joined.includes('excel') || joined.includes('sheet')) return 'Excel Macro or Python script';
    if (joined.includes('upload') || joined.includes('download')) return 'Scheduled Node.js script';
    return 'Custom automation script';
}

function calculateProductivityScore(taskLogs) {
    if (taskLogs.length === 0) return 0;

    const totalTasks = taskLogs.length;
    const patterns = detectPatterns(taskLogs);
    const repetitiveCount = patterns.reduce((sum, p) => sum + p.frequency, 0);
    const repetitiveRatio = repetitiveCount / totalTasks;

    // Higher score = more productive (less repetitive work)
    const score = Math.round((1 - repetitiveRatio * 0.5) * 100);

    return {
        score: Math.min(Math.max(score, 0), 100), // clamp 0-100
        tasks_completed: totalTasks,
        repetitive_count: repetitiveCount,
        breakdown: {
            total_tasks: totalTasks,
            repetitive_ratio: Math.round(repetitiveRatio * 100) + '%',
            unique_tasks: totalTasks - repetitiveCount,
            patterns_found: patterns.length
        }
    };
}

module.exports = { detectPatterns, generateSuggestion, calculateProductivityScore };