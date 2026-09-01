'use strict';

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const excelDir = path.join(__dirname, '..', 'excel');
fs.mkdirSync(excelDir, { recursive: true });

// Static data-coverage manifest — maps each data file to the suite that consumes it.
const DATA_COVERAGE = [
  { file: 'emails.json',      cases: 45, suite: 'Email Validation' },
  { file: 'passwords.json',   cases: 30, suite: 'Password Validation' },
  { file: 'taskNames.json',   cases: 50, suite: 'Task Data' },
  { file: 'categories.json',  cases: 20, suite: 'Category Filter' },
  { file: 'searchTerms.json', cases: 35, suite: 'Search Data' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function headerRow(sheet, headers) {
  const row = sheet.addRow(headers);
  row.font = { bold: true };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  return row;
}

function statusFill(status) {
  if (status === 'PASS') return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
  if (status === 'FAIL') return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF4444' } };
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE599' } };
}

// ── Reporter class ─────────────────────────────────────────────────────────────

class ExcelReporter {
  constructor() {
    this.results = [];
    this.logs = [];
    this.startTime = new Date();
    this._counter = 0;
  }

  record(suite, title, status, duration, error = null, meta = {}) {
    this._counter++;
    const now = new Date();
    const startTime = meta.startTime || new Date(now - (duration || 0));
    this.results.push({
      testId:         `TC-${String(this._counter).padStart(4, '0')}`,
      module:         suite,
      scenario:       title,
      browser:        meta.browser || process.env.BROWSER || 'chrome',
      status,
      startTime:      startTime.toISOString(),
      endTime:        now.toISOString(),
      duration:       duration || 0,
      error:          error ? (error.message || String(error)) : '',
      screenshotPath: meta.screenshotPath || '',
      url:            meta.url || '',
    });

    const logLine = `[${now.toISOString()}] [${status}] [${meta.browser || process.env.BROWSER || 'chrome'}] ${suite} > ${title}`;
    this.logs.push({ timestamp: now.toISOString(), name: title, step: 'RESULT', result: status, remarks: error ? error.message : '' });
    logger.info(logLine);
  }

  logStep(testName, step, result, remarks = '') {
    this.logs.push({ timestamp: new Date().toISOString(), name: testName, step, result, remarks });
  }

  async write() {
    const browser = process.env.BROWSER || 'chrome';
    const wb = new ExcelJS.Workbook();
    wb.creator = 'FlowOptix E2E Suite';
    wb.created = new Date();

    const passed  = this.results.filter((r) => r.status === 'PASS');
    const failed  = this.results.filter((r) => r.status === 'FAIL');
    const skipped = this.results.filter((r) => r.status === 'SKIP');
    const totalMs = this.results.reduce((s, r) => s + (r.duration || 0), 0);
    const pct     = this.results.length ? Math.round((passed.length / this.results.length) * 100) : 0;

    // Unique scenarios = distinct test titles (deduplicated across browsers if merged)
    const uniqueScenarios = new Set(this.results.map((r) => r.module + '::' + r.scenario)).size;

    // Per-browser breakdown
    const byBrowser = {};
    this.results.forEach((r) => {
      if (!byBrowser[r.browser]) byBrowser[r.browser] = { pass: 0, fail: 0, skip: 0, total: 0 };
      byBrowser[r.browser].total++;
      if (r.status === 'PASS') byBrowser[r.browser].pass++;
      else if (r.status === 'FAIL') byBrowser[r.browser].fail++;
      else byBrowser[r.browser].skip++;
    });

    // ── Sheet 1: Summary ──────────────────────────────────────────────────────
    const summary = wb.addWorksheet('Summary');
    summary.columns = [{ width: 32 }, { width: 28 }];

    const addRow = (label, value, bold = false) => {
      const r = summary.addRow([label, value]);
      if (bold) { r.font = { bold: true }; r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } }; }
    };

    addRow('FlowOptix E2E Report', '', true);
    addRow('');
    addRow('Run Date',           new Date().toISOString().slice(0, 19).replace('T', ' '));
    addRow('Environment',        process.env.BASE_URL || 'https://flowoptix-ten.vercel.app');
    addRow('Browser',            browser);
    addRow('');
    addRow('Unique Scenarios',   uniqueScenarios);
    addRow('Total Executions',   this.results.length);
    addRow('Passed',             passed.length);
    addRow('Failed',             failed.length);
    addRow('Skipped',            skipped.length);
    addRow('Pass Rate',          `${pct}%`);
    addRow('Total Duration (s)', (totalMs / 1000).toFixed(1));
    addRow('');
    addRow('Per-Browser Breakdown', '', true);
    summary.addRow(['Browser', 'Total', 'Pass', 'Fail', 'Skip', 'Pass %']).font = { bold: true };
    Object.entries(byBrowser).forEach(([br, s]) => {
      const brPct = s.total ? Math.round((s.pass / s.total) * 100) : 0;
      summary.addRow([br, s.total, s.pass, s.fail, s.skip, `${brPct}%`]);
    });

    // ── Sheet 2: TestCases ─────────────────────────────────────────────────────
    const tc = wb.addWorksheet('TestCases');
    tc.columns = [
      { key: 'testId',    width: 10 },
      { key: 'module',    width: 22 },
      { key: 'scenario',  width: 60 },
      { key: 'browser',   width: 10 },
      { key: 'status',    width: 8  },
      { key: 'startTime', width: 24 },
      { key: 'endTime',   width: 24 },
      { key: 'duration',  width: 14 },
    ];
    headerRow(tc, ['Test ID', 'Module', 'Scenario', 'Browser', 'Status', 'Start', 'End', 'Duration (ms)']);
    this.results.forEach((r) => {
      const row = tc.addRow([r.testId, r.module, r.scenario, r.browser, r.status, r.startTime, r.endTime, r.duration]);
      row.getCell('status').fill = statusFill(r.status);
    });

    // ── Sheet 3: Failed ────────────────────────────────────────────────────────
    const fl = wb.addWorksheet('Failed');
    fl.columns = [
      { key: 'scenario',       width: 60 },
      { key: 'error',          width: 80 },
      { key: 'screenshotPath', width: 40 },
      { key: 'browser',        width: 10 },
      { key: 'url',            width: 60 },
    ];
    headerRow(fl, ['Test Name', 'Failure Reason', 'Screenshot Path', 'Browser', 'URL at Failure']);
    failed.forEach((r) => fl.addRow([r.scenario, r.error, r.screenshotPath, r.browser, r.url]));
    if (!failed.length) fl.addRow(['(no failures)']);

    // ── Sheet 4: DataCoverage ──────────────────────────────────────────────────
    const dc = wb.addWorksheet('DataCoverage');
    dc.columns = [
      { key: 'file',  width: 22 },
      { key: 'cases', width: 12 },
      { key: 'suite', width: 30 },
    ];
    headerRow(dc, ['Data File', 'Case Count', 'Consuming Suite']);
    DATA_COVERAGE.forEach((d) => dc.addRow([d.file, d.cases, d.suite]));
    dc.addRow([]);
    dc.addRow(['Total parameterized scenarios', DATA_COVERAGE.reduce((s, d) => s + d.cases, 0), '(data-driven only)']);

    // ── Sheet 5: ExecutionLogs ────────────────────────────────────────────────
    const lg = wb.addWorksheet('ExecutionLogs');
    lg.columns = [
      { key: 'timestamp', width: 26 },
      { key: 'name',      width: 60 },
      { key: 'step',      width: 12 },
      { key: 'result',    width: 8  },
      { key: 'remarks',   width: 60 },
    ];
    headerRow(lg, ['Timestamp', 'Test Name', 'Step', 'Result', 'Remarks']);
    this.logs.forEach((l) => lg.addRow([l.timestamp, l.name, l.step, l.result, l.remarks]));

    const filename = 'Selenium_E2E_Report.xlsx';
    const filepath = path.join(excelDir, filename);
    await wb.xlsx.writeFile(filepath);
    logger.info(`Excel report written: ${filepath}`);
    return filepath;
  }
}

// Singleton shared across the whole run
const reporter = new ExcelReporter();
module.exports = reporter;
