/**
 * Pure-JS Naive Bayes training script.
 * Generates model_weights.json from seed data — no Python required.
 * Run:  node train_model.js
 */

const fs = require('fs');
const path = require('path');

// ── Seed training data ─────────────────────────────────────────────────────
const TRAINING_DATA = [
    // file ops
    { text: 'open excel',                   label: 'file ops' },
    { text: 'copy data',                    label: 'file ops' },
    { text: 'paste data',                   label: 'file ops' },
    { text: 'upload file',                  label: 'file ops' },
    { text: 'download report',              label: 'file ops' },
    { text: 'save spreadsheet',             label: 'file ops' },
    { text: 'export csv',                   label: 'file ops' },
    { text: 'import data',                  label: 'file ops' },
    { text: 'open word document',           label: 'file ops' },
    { text: 'rename file',                  label: 'file ops' },
    { text: 'delete files',                 label: 'file ops' },
    { text: 'move files',                   label: 'file ops' },
    { text: 'create folder',                label: 'file ops' },
    { text: 'open pdf',                     label: 'file ops' },
    { text: 'merge spreadsheets',           label: 'file ops' },
    { text: 'backup files',                 label: 'file ops' },
    { text: 'extract zip',                  label: 'file ops' },
    { text: 'archive documents',            label: 'file ops' },
    { text: 'open google sheets',           label: 'file ops' },
    { text: 'edit spreadsheet',             label: 'file ops' },
    { text: 'format document',              label: 'file ops' },
    { text: 'convert pdf',                  label: 'file ops' },
    { text: 'sync files',                   label: 'file ops' },
    { text: 'compress files',               label: 'file ops' },

    // communication
    { text: 'send email',                   label: 'communication' },
    { text: 'reply to email',               label: 'communication' },
    { text: 'check slack',                  label: 'communication' },
    { text: 'join meeting',                 label: 'communication' },
    { text: 'schedule meeting',             label: 'communication' },
    { text: 'write email',                  label: 'communication' },
    { text: 'respond to message',           label: 'communication' },
    { text: 'hop on a call',                label: 'communication' },
    { text: 'video call',                   label: 'communication' },
    { text: 'zoom meeting',                 label: 'communication' },
    { text: 'teams call',                   label: 'communication' },
    { text: 'send slack message',           label: 'communication' },
    { text: 'reply to slack',               label: 'communication' },
    { text: 'post in channel',              label: 'communication' },
    { text: 'read emails',                  label: 'communication' },
    { text: 'compose message',              label: 'communication' },
    { text: 'answer phone',                 label: 'communication' },
    { text: 'send notification',            label: 'communication' },
    { text: 'broadcast update',             label: 'communication' },
    { text: 'client call',                  label: 'communication' },
    { text: 'check messages',               label: 'communication' },
    { text: 'respond to comments',          label: 'communication' },
    { text: 'follow up email',              label: 'communication' },
    { text: 'send invite',                  label: 'communication' },

    // development
    { text: 'write code',                   label: 'development' },
    { text: 'review pull request',          label: 'development' },
    { text: 'fix bug',                      label: 'development' },
    { text: 'deploy app',                   label: 'development' },
    { text: 'run tests',                    label: 'development' },
    { text: 'code review',                  label: 'development' },
    { text: 'debug issue',                  label: 'development' },
    { text: 'write unit tests',             label: 'development' },
    { text: 'refactor code',               label: 'development' },
    { text: 'push to github',              label: 'development' },
    { text: 'merge pull request',          label: 'development' },
    { text: 'update api',                  label: 'development' },
    { text: 'build feature',               label: 'development' },
    { text: 'setup environment',           label: 'development' },
    { text: 'install dependencies',        label: 'development' },
    { text: 'optimize query',              label: 'development' },
    { text: 'write documentation',         label: 'development' },
    { text: 'create endpoint',             label: 'development' },
    { text: 'test api',                    label: 'development' },
    { text: 'commit changes',              label: 'development' },
    { text: 'resolve conflicts',           label: 'development' },
    { text: 'configure server',            label: 'development' },
    { text: 'implement feature',           label: 'development' },
    { text: 'fix typescript error',        label: 'development' },
    { text: 'deploy to production',        label: 'development' },
    { text: 'push to production',          label: 'development' },
    { text: 'release to production',       label: 'development' },
    { text: 'deploy to staging',           label: 'development' },
    { text: 'production release',          label: 'development' },
    { text: 'release build',               label: 'development' },
    { text: 'ship feature',                label: 'development' },
    { text: 'hotfix production',           label: 'development' },

    // reporting
    { text: 'generate report',             label: 'reporting' },
    { text: 'update dashboard',            label: 'reporting' },
    { text: 'create presentation',         label: 'reporting' },
    { text: 'analyze data',                label: 'reporting' },
    { text: 'review metrics',              label: 'reporting' },
    { text: 'compile report',              label: 'reporting' },
    { text: 'create charts',               label: 'reporting' },
    { text: 'review kpis',                 label: 'reporting' },
    { text: 'make slides',                 label: 'reporting' },
    { text: 'data analysis',               label: 'reporting' },
    { text: 'write summary',               label: 'reporting' },
    { text: 'prepare report',              label: 'reporting' },
    { text: 'check analytics',             label: 'reporting' },
    { text: 'monthly report',              label: 'reporting' },
    { text: 'weekly report',               label: 'reporting' },
    { text: 'build dashboard',             label: 'reporting' },
    { text: 'performance review',          label: 'reporting' },
    { text: 'track metrics',               label: 'reporting' },
    { text: 'visualize data',              label: 'reporting' },
    { text: 'export analytics',            label: 'reporting' },
    { text: 'create report',               label: 'reporting' },
    { text: 'review report',               label: 'reporting' },

    // admin
    { text: 'update jira ticket',          label: 'admin' },
    { text: 'fill timesheet',              label: 'admin' },
    { text: 'attend standup',              label: 'admin' },
    { text: 'organize calendar',           label: 'admin' },
    { text: 'plan sprint',                 label: 'admin' },
    { text: 'create ticket',               label: 'admin' },
    { text: 'update ticket',               label: 'admin' },
    { text: 'log hours',                   label: 'admin' },
    { text: 'manage backlog',              label: 'admin' },
    { text: 'prioritize tasks',            label: 'admin' },
    { text: 'write spec',                  label: 'admin' },
    { text: 'update roadmap',              label: 'admin' },
    { text: 'book travel',                 label: 'admin' },
    { text: 'submit expense',              label: 'admin' },
    { text: 'review budget',               label: 'admin' },
    { text: 'assign task',                 label: 'admin' },
    { text: 'check in',                    label: 'admin' },
    { text: 'retrospective',               label: 'admin' },
    { text: 'sprint planning',             label: 'admin' },
    { text: 'update confluence',           label: 'admin' },
    { text: 'project planning',            label: 'admin' },
    { text: 'manage team',                 label: 'admin' },
    { text: 'onboard new member',          label: 'admin' },
    { text: 'resource planning',           label: 'admin' },

    // general
    { text: 'read article',                label: 'general' },
    { text: 'research topic',              label: 'general' },
    { text: 'take notes',                  label: 'general' },
    { text: 'learn new skill',             label: 'general' },
    { text: 'personal task',               label: 'general' },
    { text: 'complete task',               label: 'general' },
    { text: 'work on project',             label: 'general' },
    { text: 'finish assignment',           label: 'general' },
    { text: 'review notes',                label: 'general' },
    { text: 'prepare for meeting',         label: 'general' },
    { text: 'think through problem',       label: 'general' },
    { text: 'brainstorm ideas',            label: 'general' },
    { text: 'miscellaneous task',          label: 'general' },
];

// ── Tokenizer ──────────────────────────────────────────────────────────────
function tokenize(text) {
    return text.toLowerCase().split(/[\s\W_]+/).filter(t => t.length > 1);
}

// ── Train Naive Bayes (Laplace smoothed, unigram) ─────────────────────────
function train(data) {
    const classes     = [...new Set(data.map(d => d.label))].sort();
    const classCounts = {};    // total token count per class
    const wordCounts  = {};    // { class: { word: count } }
    const classDocCounts = {}; // number of documents per class
    const vocab       = new Set();

    classes.forEach(c => {
        classCounts[c]     = 0;
        wordCounts[c]      = {};
        classDocCounts[c]  = 0;
    });

    for (const { text, label } of data) {
        classDocCounts[label]++;
        for (const tok of tokenize(text)) {
            vocab.add(tok);
            wordCounts[label][tok] = (wordCounts[label][tok] || 0) + 1;
            classCounts[label]++;
        }
    }

    const vocabSize = vocab.size;

    // Log-likelihood for each (class, word) pair — pre-computed with Laplace smoothing
    const logLikelihood = {};
    classes.forEach(c => {
        logLikelihood[c] = {};
        const total = classCounts[c] + vocabSize; // Laplace denominator
        for (const w of vocab) {
            const count = (wordCounts[c][w] || 0) + 1;
            logLikelihood[c][w] = Math.log(count / total);
        }
        // Unseen token log-likelihood (Laplace: count=1)
        logLikelihood[c]['<UNK>'] = Math.log(1 / total);
    });

    // Class priors
    const total = data.length;
    const logPriors = {};
    classes.forEach(c => { logPriors[c] = Math.log(classDocCounts[c] / total); });

    return {
        classes,
        vocabulary: [...vocab].sort(),
        logLikelihood,
        logPriors,
        vocabSize,
        trainedAt: new Date().toISOString(),
        trainingExamples: data.length,
    };
}

// ── Predict using trained weights ──────────────────────────────────────────
function predict(model, text) {
    const tokens = tokenize(text);
    let best = null, bestScore = -Infinity;
    for (const c of model.classes) {
        let score = model.logPriors[c];
        for (const tok of tokens) {
            score += model.logLikelihood[c][tok] ?? model.logLikelihood[c]['<UNK>'];
        }
        if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
}

// ── Build and evaluate ─────────────────────────────────────────────────────
const model = train(TRAINING_DATA);

// Quick self-test
const tests = [
    { input: 'Send email to team',          expected: 'communication' },
    { input: 'Fix null pointer bug',        expected: 'development' },
    { input: 'Generate monthly report',     expected: 'reporting' },
    { input: 'Open Excel spreadsheet',      expected: 'file ops' },
    { input: 'Fill timesheet hours',        expected: 'admin' },
    { input: 'Read article',                expected: 'general' },
    { input: 'Deploy to production',        expected: 'development' },
    { input: 'Update Jira ticket',          expected: 'admin' },
    { input: 'Create presentation slides',  expected: 'reporting' },
    { input: 'Check Slack messages',        expected: 'communication' },
];

let passed = 0;
for (const { input, expected } of tests) {
    const got = predict(model, input);
    const ok  = got === expected;
    if (ok) passed++;
    console.log(`${ok ? '✓' : '✗'} "${input}" → ${got}${ok ? '' : ` (expected ${expected})`}`);
}
console.log(`\nAccuracy: ${passed}/${tests.length} (${Math.round(passed/tests.length*100)}%)`);

// ── Convert to categoryWeights format for server.js ───────────────────────
// scale log-probs so sigmoid(score) gives meaningful confidence values
const SCALE = 8; // compress log-space into a sigmoid-friendly range
const categoryWeights = {};
for (const c of model.classes) {
    const vocab = {};
    for (const [word, logProb] of Object.entries(model.logLikelihood[c])) {
        if (word !== '<UNK>') {
            // store scaled weight; baseline (UNK) is subtracted so seen words are positive
            const delta = logProb - model.logLikelihood[c]['<UNK>'];
            if (delta > 0) vocab[word] = parseFloat((delta / SCALE).toFixed(6));
        }
    }
    categoryWeights[c] = {
        prior: parseFloat((model.logPriors[c] / SCALE).toFixed(6)),
        vocab,
    };
}

const output = {
    classes: model.classes,
    categoryWeights,
    vocabSize: model.vocabSize,
    trainingExamples: model.trainingExamples,
    trainedAt: model.trainedAt,
};

const outPath = path.join(__dirname, 'model_weights.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\nModel saved -> ${outPath}`);
console.log(`  Classes: ${model.classes.join(', ')}`);
console.log(`  Vocab size: ${model.vocabSize}`);
console.log(`  Training examples: ${model.trainingExamples}`);
