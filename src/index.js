import express from 'express';
import session from 'express-session';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Minimal .env loader
const __dir = dirname(fileURLToPath(import.meta.url));
try {
  const envText = readFileSync(join(__dir, '..', '.env'), 'utf8');
  for (const line of envText.split(/\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
} catch {}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3002;

app.use(express.urlencoded({ extended: false }));
app.use(session({
  name: 'meturr_sid',
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    domain: '.meturr.online',
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 1000 * 60 * 60 * 8,
  },
}));

const USERS = { admin: 'meturr#5535' };

function isAuthed(req) { return req.session && req.session.user; }

app.get('/login', (req, res) => {
  if (isAuthed(req)) return res.redirect('https://meturr.online');
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>Login</title>
  <style>
  *{box-sizing:border-box}
  body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;min-height:100dvh;background:#0f172a;color:#fff;margin:0;padding:16px}
  .c{background:#fff;color:#0f172a;padding:28px 24px;border-radius:16px;width:100%;max-width:360px;box-shadow:0 20px 50px rgba(0,0,0,.35)}
  h2{margin:0 0 16px;font-size:22px;text-align:center}
  label{display:block;font-size:13px;color:#475569;margin-bottom:4px;font-weight:600}
  input{width:100%;padding:12px 14px;margin:0 0 14px;border:1px solid #cbd5e1;border-radius:10px;font-size:16px;-webkit-appearance:none;appearance:none}
  input:focus{outline:none;border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.15)}
  button{width:100%;padding:13px;border:none;border-radius:10px;background:#6366f1;color:#fff;font-size:16px;font-weight:600;cursor:pointer;touch-action:manipulation}
  button:active{transform:scale(.98)}
  .err{color:#ef4444;font-size:13px;margin-bottom:10px;text-align:center}
  @media (max-width:400px){.c{padding:24px 18px}h2{font-size:20px}}
  </style></head><body>
  <div class="c"><h2>Meturr Login</h2>
  ${req.query.err ? '<div class="err">ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง</div>' : ''}
  <form method="post" action="/login">
    <label>Username</label><input name="username" autofocus />
    <label>Password</label><input type="password" name="password" />
    <button type="submit">เข้าสู่ระบบ</button>
  </form></div></body></html>`);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (USERS[username] && USERS[username] === password) {
    req.session.user = username;
    return res.redirect('https://meturr.online');
  }
  res.redirect('/login?err=1');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('https://meturr.online'));
});

// forward_auth verification endpoint
app.get('/verify', (req, res) => {
  if (isAuthed(req)) return res.status(200).send('OK');
  // not authenticated -> redirect to login, preserving original URL
  const back = encodeURIComponent(req.headers['x-forwarded-uri'] || req.query.rd || '/');
  res.redirect(`https://meturr.online/login?rd=${back}`);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// OpenRouter credits proxy (admin only)
let creditsCache = { data: null, ts: 0 };
app.get('/api/openrouter/credits', async (req, res) => {
  if (!isAuthed(req)) return res.status(401).json({ error: 'unauthorized' });
  const now = Date.now();
  if (creditsCache.data && now - creditsCache.ts < 60000) {
    return res.json(creditsCache.data);
  }
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });
  try {
    const r = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: { Authorization: `Bearer ${key}` },
    });
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!r.ok) return res.status(r.status).json({ error: data?.error || data });
    const payload = {
      total_credits: data?.data?.total_credits ?? null,
      total_usage: data?.data?.total_usage ?? null,
      remaining: (data?.data?.total_credits ?? 0) - (data?.data?.total_usage ?? 0),
      raw: data,
    };
    creditsCache = { data: payload, ts: now };
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`auth listening on ${PORT}`));
