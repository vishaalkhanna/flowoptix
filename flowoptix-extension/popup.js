const CAT_COLORS = {
  communication: { bg: '#2D1B00', text: '#F59E0B' },
  development:   { bg: '#1A0F4D', text: '#7C5CFF' },
  reporting:     { bg: '#0F2D3A', text: '#60A5FA' },
  'file ops':    { bg: '#0F3A2A', text: '#14B8A6' },
  admin:         { bg: '#3A0F2A', text: '#EC4899' },
  general:       { bg: '#1E1E2E', text: '#6A6A7A' },
};

function fmtTime(secs) {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.round(secs / 60)}m`;
  return `${(secs / 3600).toFixed(1)}h`;
}

async function loadUid() {
  const { userId } = await chrome.storage.sync.get('userId');
  if (userId) {
    document.getElementById('uid-input').value = userId;
    document.getElementById('uid-saved').style.display = 'block';
    document.getElementById('uid-hint').style.display = 'none';
  }
}

async function loadSession() {
  chrome.runtime.sendMessage({ type: 'GET_SESSION' }, ({ sessionData, activeTabUrl }) => {
    const list = document.getElementById('domain-list');
    const entries = Object.entries(sessionData || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);

    if (entries.length === 0) {
      list.innerHTML = '<div class="empty">No browsing data yet this session</div>';
    } else {
      list.innerHTML = entries.map(([domain, secs]) => {
        const cat = getCategory(domain);
        const c = CAT_COLORS[cat] || CAT_COLORS.general;
        return `
          <div class="domain-row">
            <span class="domain-name">${domain}</span>
            <span class="cat-badge" style="background:${c.bg};color:${c.text}">${cat}</span>
            <span class="domain-time">${fmtTime(secs)}</span>
          </div>`;
      }).join('');
    }

    const statusEl = document.getElementById('status-text');
    if (activeTabUrl) {
      try {
        const domain = new URL(activeTabUrl).hostname.replace(/^www\./, '');
        statusEl.textContent = `Tracking: ${domain}`;
      } catch { statusEl.textContent = 'Tracking your workflow'; }
    }
  });

  const { lastSync, lastTaskCount } = await chrome.storage.local.get(['lastSync', 'lastTaskCount']);
  if (lastSync) {
    const d = new Date(lastSync);
    document.getElementById('last-sync').textContent =
      `Last sync: ${d.toLocaleDateString()} ${d.toLocaleTimeString()} · ${lastTaskCount || 0} tasks sent`;
  }
}

function getCategory(domain) {
  const DOMAIN_CATEGORIES = {
    'gmail.com': 'communication', 'mail.google.com': 'communication',
    'outlook.com': 'communication', 'slack.com': 'communication',
    'discord.com': 'communication', 'teams.microsoft.com': 'communication',
    'zoom.us': 'communication', 'meet.google.com': 'communication',
    'github.com': 'development', 'gitlab.com': 'development',
    'stackoverflow.com': 'development', 'vscode.dev': 'development',
    'vercel.com': 'development', 'replit.com': 'development',
    'docs.google.com': 'reporting', 'notion.so': 'reporting',
    'office.com': 'file ops', 'drive.google.com': 'file ops',
    'dropbox.com': 'file ops', 'onedrive.live.com': 'file ops',
    'atlassian.com': 'admin', 'jira.com': 'admin', 'trello.com': 'admin',
    'asana.com': 'admin', 'linear.app': 'admin',
    'calendar.google.com': 'admin',
  };
  for (const [key, cat] of Object.entries(DOMAIN_CATEGORIES)) {
    if (domain.includes(key)) return cat;
  }
  return 'general';
}

document.getElementById('uid-save').addEventListener('click', async () => {
  const uid = document.getElementById('uid-input').value.trim();
  if (!uid) return;
  await chrome.storage.sync.set({ userId: uid });
  document.getElementById('uid-saved').style.display = 'block';
  document.getElementById('uid-hint').style.display = 'none';
});

document.getElementById('sync-btn').addEventListener('click', () => {
  const btn = document.getElementById('sync-btn');
  btn.disabled = true;
  btn.textContent = 'Syncing…';
  chrome.runtime.sendMessage({ type: 'SYNC_NOW' }, (res) => {
    btn.disabled = false;
    if (res?.ok) {
      btn.textContent = '✓ Synced!';
      setTimeout(() => { btn.textContent = '⬆ Sync Now'; loadSession(); }, 1500);
    } else {
      btn.textContent = 'Failed — check User ID';
      setTimeout(() => { btn.textContent = '⬆ Sync Now'; }, 2000);
    }
  });
});

document.getElementById('clear-btn').addEventListener('click', async () => {
  await chrome.storage.local.set({ sessionData: {} });
  loadSession();
});

loadUid();
loadSession();
