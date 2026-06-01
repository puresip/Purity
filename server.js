const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4500;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'puresip2024';

const DATA_FILE = path.join(__dirname, 'data', 'banners.json');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return { settings: {}, banners: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Public: get banners + settings
app.get('/api/banners', (req, res) => {
  res.json(readData());
});

// Admin login check
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ ok: false, error: 'Invalid password' });
});

// Admin: save banners + settings (password in body)
app.post('/api/admin/banners', (req, res) => {
  const { password, settings, banners } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Invalid password' });
  }
  if (!Array.isArray(banners)) {
    return res.status(400).json({ ok: false, error: 'banners must be an array' });
  }
  const clean = {
    settings: {
      rotateSeconds: Number(settings?.rotateSeconds) || 5,
      topBarEnabled: !!settings?.topBarEnabled,
      topBarText: String(settings?.topBarText || '').slice(0, 300)
    },
    banners: banners.slice(0, 20).map((b, i) => ({
      id: String(b.id || 'b' + (i + 1)),
      enabled: !!b.enabled,
      icon: String(b.icon || '💧').slice(0, 8),
      title: String(b.title || '').slice(0, 120),
      subtitle: String(b.subtitle || '').slice(0, 300),
      cta: String(b.cta || '').slice(0, 60),
      link: String(b.link || '#').slice(0, 500),
      color1: String(b.color1 || '#0a6fd1').slice(0, 32),
      color2: String(b.color2 || '#22a7f0').slice(0, 32)
    }))
  };
  writeData(clean);
  res.json({ ok: true, data: clean });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Pure Sip running at http://localhost:${PORT}  (admin: /admin)`);
});
