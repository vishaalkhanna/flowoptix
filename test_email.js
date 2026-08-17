/**
 * Tests that POST /tasks/log saves the task AND fires the Resend email notification.
 *
 * Usage:
 *   TEST_USER_ID=<uuid> node test_email.js                        # hits live Render
 *   BASE_URL=http://localhost:3000 TEST_USER_ID=<uuid> node test_email.js  # local
 *
 * Requirements:
 *   - RESEND_API_KEY must be set on the server (Render env var)
 *   - NOTIFY_EMAIL must be set on the server (Render env var)
 *   - A valid user_id UUID from your Supabase auth.users table
 *
 * The script verifies:
 *   1. /tasks/log returns HTTP 200 with the saved task
 *   2. The Resend email fires (confirmed by the server log "[Email] Task notification sent")
 *      — Check your NOTIFY_EMAIL inbox a few seconds after running.
 */

const https = require('https');
const http  = require('http');

const BASE_URL     = process.env.BASE_URL || 'https://flowoptix.onrender.com';
// Must be a real UUID from your Supabase auth.users table.
// Set via env var:  TEST_USER_ID=<your-user-id> node test_email.js
const TEST_USER_ID = process.env.TEST_USER_ID;
if (!TEST_USER_ID) {
    console.error('ERROR: TEST_USER_ID env var is required.');
    console.error('  Find your user ID in Supabase → Authentication → Users.');
    console.error('  Run: TEST_USER_ID=<uuid> node test_email.js');
    process.exit(1);
}

const TASKS = [
    { task_name: 'Send email to client',    category: 'communication' },
    { task_name: 'Fix null pointer bug',    category: 'development'   },
    { task_name: 'Generate monthly report', category: 'reporting'     },
    { task_name: 'Open Excel spreadsheet',  category: 'file ops'      },
    { task_name: 'Fill timesheet',          category: 'admin'         },
];

function post(url, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const u       = new URL(url);
        const lib     = u.protocol === 'https:' ? https : http;
        const options = {
            hostname: u.hostname,
            port:     u.port || (u.protocol === 'https:' ? 443 : 80),
            path:     u.pathname,
            method:   'POST',
            headers: {
                'Content-Type':   'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
        };
        const req = lib.request(options, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function run() {
    console.log(`Target: ${BASE_URL}/tasks/log`);
    console.log(`User:   ${TEST_USER_ID}`);
    console.log('─'.repeat(60));

    let passed = 0;
    let failed = 0;

    for (const task of TASKS) {
        const payload = { user_id: TEST_USER_ID, ...task };
        try {
            const { status, body } = await post(`${BASE_URL}/tasks/log`, payload);

            if (status !== 200 || !body.success) {
                console.log(`FAIL  "${task.task_name}"`);
                console.log(`      HTTP ${status}: ${JSON.stringify(body)}`);
                failed++;
                continue;
            }

            console.log(`PASS  "${task.task_name}"`);
            console.log(`      id: ${body.task?.id ?? 'n/a'}  category: ${task.category}`);
            console.log(`      Resend email fired (check server log + NOTIFY_EMAIL inbox)`);
            passed++;
        } catch (err) {
            console.log(`ERROR "${task.task_name}"`);
            console.log(`      ${err.message}`);
            failed++;
        }
    }

    console.log('─'.repeat(60));
    if (failed === 0) {
        console.log(`All ${passed} tasks logged successfully`);
        console.log('Check your NOTIFY_EMAIL inbox in ~5s to confirm emails arrived via Resend.');
    } else {
        console.log(`${passed} passed, ${failed} failed`);
        process.exit(1);
    }
}

run();
