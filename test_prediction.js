/**
 * Test script for POST /predict/category
 * Run: node test_prediction.js
 */

const https = require('https');

const BASE_URL = 'https://flowoptix.onrender.com/predict/category';

const TESTS = [
    { task_name: 'Send email to client',   expected: 'communication' },
    { task_name: 'Fix null pointer bug',   expected: 'development'   },
    { task_name: 'Generate monthly report',expected: 'reporting'     },
    { task_name: 'Open Excel spreadsheet', expected: 'file ops'      },
    { task_name: 'Fill timesheet',         expected: 'admin'         },
];

function post(url, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
        };
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function run() {
    console.log(`Testing ${BASE_URL}\n${'─'.repeat(55)}`);
    let passed = 0;
    let failed = 0;

    for (const { task_name, expected } of TESTS) {
        try {
            const { status, body } = await post(BASE_URL, { task_name });

            if (status !== 200) {
                console.log(`FAIL  "${task_name}"`);
                console.log(`      HTTP ${status}: ${JSON.stringify(body)}`);
                failed++;
                continue;
            }

            const { category, confidence } = body;
            const ok = category === expected;
            ok ? passed++ : failed++;

            const mark   = ok ? 'PASS' : 'FAIL';
            const note   = ok ? '' : `  (expected: ${expected})`;
            console.log(`${mark}  "${task_name}"`);
            console.log(`      category: ${category}  confidence: ${confidence}${note}`);
        } catch (err) {
            console.log(`ERROR "${task_name}"`);
            console.log(`      ${err.message}`);
            failed++;
        }
    }

    console.log(`${'─'.repeat(55)}`);
    if (failed === 0) {
        console.log(`All ${passed} tests passed`);
    } else {
        console.log(`${passed} passed, ${failed} failed`);
        process.exit(1);
    }
}

run();
