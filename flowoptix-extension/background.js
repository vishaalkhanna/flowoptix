const BACKEND_URL = 'https://flowoptix.onrender.com';

const DOMAIN_CATEGORIES = {
  'gmail.com': 'communication',
  'mail.google.com': 'communication',
  'outlook.com': 'communication',
  'outlook.live.com': 'communication',
  'slack.com': 'communication',
  'discord.com': 'communication',
  'teams.microsoft.com': 'communication',
  'github.com': 'development',
  'gitlab.com': 'development',
  'stackoverflow.com': 'development',
  'vscode.dev': 'development',
  'codepen.io': 'development',
  'replit.com': 'development',
  'docs.google.com': 'reporting',
  'sheets.google.com': 'reporting',
  'slides.google.com': 'reporting',
  'office.com': 'file ops',
  'onedrive.live.com': 'file ops',
  'drive.google.com': 'file ops',
  'dropbox.com': 'file ops',
  'notion.so': 'reporting',
  'atlassian.com': 'admin',
  'jira.com': 'admin',
  'trello.com': 'admin',
  'asana.com': 'admin',
  'linear.app': 'admin',
  'figma.com': 'development',
  'vercel.com': 'development',
  'render.com': 'development',
  'supabase.com': 'development',
  'calendar.google.com': 'admin',
  'zoom.us': 'communication',
  'meet.google.com': 'communication',
  'youtube.com': 'general',
  'twitter.com': 'general',
  'x.com': 'general',
  'linkedin.com': 'general',
};

function getDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function getCategory(domain) {
  if (!domain) return 'general';
  for (const [key, cat] of Object.entries(DOMAIN_CATEGORIES)) {
    if (domain.includes(key)) return cat;
  }
  return 'general';
}

// Track active tab start time
let activeTabStart = null;
let activeTabUrl = null;

// Accumulated time per domain (in seconds) since last sync
let sessionData = {};

async function loadSessionData() {
  const stored = await chrome.storage.local.get('sessionData');
  sessionData = stored.sessionData || {};
}

async function saveSessionData() {
  await chrome.storage.local.set({ sessionData });
}

function recordActiveTime() {
  if (!activeTabUrl || !activeTabStart) return;
  const domain = getDomain(activeTabUrl);
  if (!domain) return;
  const elapsed = Math.floor((Date.now() - activeTabStart) / 1000);
  if (elapsed < 5) return; // ignore very short visits
  sessionData[domain] = (sessionData[domain] || 0) + elapsed;
}

chrome.tabs.onActivated.addListener(async (info) => {
  recordActiveTime();
  const tab = await chrome.tabs.get(info.tabId);
  activeTabUrl = tab.url;
  activeTabStart = Date.now();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id === tabId) {
        recordActiveTime();
        activeTabUrl = tab.url;
        activeTabStart = Date.now();
      }
    });
  }
});

// Sync accumulated data to backend every hour
chrome.alarms.create('syncFlowOptix', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'syncFlowOptix') await syncToBackend();
});

async function syncToBackend() {
  const { userId } = await chrome.storage.sync.get('userId');
  if (!userId) return;

  recordActiveTime();
  await loadSessionData();

  const significantDomains = Object.entries(sessionData)
    .filter(([, secs]) => secs >= 60); // only domains with 1+ min

  if (significantDomains.length === 0) return;

  const now = new Date();
  const tasks = significantDomains.map(([domain, secs]) => ({
    task_name: `Browsed ${domain}`,
    category: getCategory(domain),
    duration_seconds: secs,
    source: 'browser',
    started_at: new Date(now.getTime() - secs * 1000).toISOString(),
    ended_at: now.toISOString(),
  }));

  try {
    const res = await fetch(`${BACKEND_URL}/tasks/auto-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, tasks }),
    });
    if (res.ok) {
      // Reset session data after successful sync
      sessionData = {};
      await saveSessionData();
      await chrome.storage.local.set({ lastSync: now.toISOString(), lastTaskCount: tasks.length });
    }
  } catch (err) {
    console.error('FlowOptix sync failed:', err);
  }
}

// Expose sync for popup manual trigger
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SYNC_NOW') {
    syncToBackend().then(() => sendResponse({ ok: true })).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === 'GET_SESSION') {
    recordActiveTime();
    sendResponse({ sessionData, activeTabUrl });
    return true;
  }
});

// Initialize
loadSessionData();
