'use strict';

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const excelDir = path.join(__dirname, '..', 'excel');
fs.mkdirSync(excelDir, { recursive: true });

class ExcelReporter {
  constructor() {
    this.results = [];
    this.logs = [];
    this.startTime = new Date();
  }

  record(suiteName, testTitle, status, duration, error = null) {
    this.results.push({
      suite: suiteName,
      title: testTitle,
      status,
      duration,
      error: error ? error.message : '',
      timestamp: new Date().toISOString(),
    });
    this.logs.push(`[${new Date().toISOString()}] [${status}] ${suiteName} > ${testTitle}${error ? ' — ' + error.message : ''}`);
  }

  async write() {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'FlowOptix E2E';
    wb.created = new Date();

    const passed = this.results.filter((r) => r.status === 'PASS');
    const failed = this.results.filter((r) => r.status === 'FAIL');
    const skipped = this.results.filter((r) => r.status === 'SKIP');
    const totalDuration = this.results.reduce((s, r) => s + (r.duration || 0), 0);

    // ── Sheet 1: Summary ────────────────────────────────────────────────
    const summary = wb.addWorksheet('Summary');
    summary.columns = [{ width: 30 }, { width: 20 }];
    const addSummaryRow = (label, value, bold = false) => {
      const row = summary.addRow([label, value]);
      if (bold) row.font = { bold: true };
    };
    addSummaryRow('FlowOptix E2E Summary', '', true);
    addSummaryRow('');
    addSummaryRow('Run Date', new Date().toISOString().slice(0, 19).replace('T', ' '));
    addSummaryRow('Total Tests', this.results.length);
    addSummaryRow('Passed', passed.length);
    addSummaryRow('Failed', failed.length);
    addSummaryRow('Skipped', skipped.length);
    addSummaryRow('Pass Rate', `${this.results.length ? Math.round((passed.length / this.results.length) * 100) : 0}%`);
    addSummaryRow('Total Duration (s)', (totalDuration / 1000).toFixed(1));
    addSummaryRow('Browser', process.env.BROWSER || 'chrome');

    // ── Sheet 2: TestCases ───────────────────────────────────────────────
    const tc = wb.addWorksheet('TestCases');
    tc.columns = [
      { header: 'Suite', key: 'suite', width: 20 },
      { header: 'Test Title', key: 'title', width: 50 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Duration (ms)', key: 'duration', width: 16 },
      { header: 'Timestamp', key: 'timestamp', width: 22 },
    ];
    tc.getRow(1).font = { bold: true };
    this.results.forEach((r) => {
      const row = tc.addRow(r);
      if (r.status === 'PASS') row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
      if (r.status === 'FAIL') row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
    });

    // ── Sheet 3: Failed ──────────────────────────────────────────────────
    const fl = wb.addWorksheet('Failed');
    fl.columns = [
      { header: 'Suite', key: 'suite', width: 20 },
      { header: 'Test Title', key: 'title', width: 50 },
      { header: 'Error', key: 'error', width: 80 },
      { header: 'Timestamp', key: 'timestamp', width: 22 },
    ];
    fl.getRow(1).font = { bold: true };
    failed.forEach((r) => fl.addRow(r));

    // ── Sheet 4: Logs ────────────────────────────────────────────────────
    const lg = wb.addWorksheet('Logs');
    lg.columns = [{ header: 'Log Entry', key: 'log', width: 120 }];
    lg.getRow(1).font = { bold: true };
    this.logs.forEach((line) => lg.addRow({ log: line }));

    const filename = `E2E_Report_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.xlsx`;
    const filepath = path.join(excelDir, filename);
    await wb.xlsx.writeFile(filepath);
    logger.info(`Excel report written: ${filepath}`);
    return filepath;
  }
}

// Singleton shared across the whole run
const reporter = new ExcelReporter();
module.exports = reporter;
