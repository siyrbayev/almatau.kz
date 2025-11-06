import 'dotenv/config';           // <— грузим .env
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';


const app = express();
app.use(express.json());

// Разрешите фронту
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-domain.tld'],
  credentials: false,
}));

const API_BASE  = import.meta.env.API_BASE  || 'https://api.wipon.kz';
const AUTH_PATH = import.meta.env.WIPON_AUTH_PATH || '/v1/oauth/token';
const USERNAME  = import.meta.env.WIPON_USER;
const PASSWORD  = import.meta.env.WIPON_PASS;
const EMPLOYEE_ID = import.meta.env.EMPLOYEE_ID;


let cached = null; // { access_token, refresh_token, expires_at }

// ——— лог-хелпер
function log(...args){ console.log('[proxy]', ...args); }

async function getToken() {
  // валиден?
  if (cached?.expires_at && cached.expires_at > Date.now() + 15000) return cached.access_token;

  // пробуем refresh
  if (cached?.refresh_token) {
    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: cached.refresh_token,
      });
      const r = await fetch(API_BASE + AUTH_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      const t = await safeRead(r);
      if (!r.ok) {
        log('refresh failed', r.status, t);
        throw new Error('refresh_failed');
      }
      const ttl = (t.expires_in || 3600) * 1000;
      cached = {
        access_token: t.access_token,
        refresh_token: t.refresh_token || cached.refresh_token,
        expires_at: Date.now() + ttl
      };
      return cached.access_token;
    } catch (e) {
      log('refresh error -> fallback to password', e.message);
    }
  }

  // логин паролем
  if (!USERNAME || !PASSWORD) {
    throw new Error('Missing WIPON_USER or WIPON_PASS in .env');
  }
  const body = new URLSearchParams({
    grant_type: 'password',
    username: USERNAME,
    password: PASSWORD
  });
  const res = await fetch(API_BASE + AUTH_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await safeRead(res);
  if (!res.ok) {
    log('password auth failed', res.status, data);
    throw new Error('auth_failed_' + res.status);
  }
  const ttl = (data.expires_in || 3600) * 1000;
  cached = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + ttl
  };
  log('auth ok; expires_in=', data.expires_in);
  return cached.access_token;
}

// безопасно читаем JSON/текст
async function safeRead(r) {
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { return await r.json(); } catch { /* fallthrough */ }
  }
  const text = await r.text();
  try { return JSON.parse(text); } catch { return text; }
}

// основной прокси
app.use('/proxy', async (req, res) => {
  try {
    const token = await getToken();

    // исходный путь от фронта
    const inPath = req.url.replace('/proxy', '');

    // подмена .../v1/employee/auto/... или .../v2/employee/auto/... на твой ID
    const rewrittenPath = inPath.replace(/\/v(\d+)\/employee\/auto\//, (_m, v) => {
      return `/v${v}/employee/${EMPLOYEE_ID}/`;
    });

    const upstream = API_BASE + rewrittenPath;

    const headers = {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/json, text/plain, */*'
    };
    const ct = req.get('content-type');
    if (ct) headers['Content-Type'] = ct;

    const r = await fetch(upstream, {
      method: req.method,
      headers,
      body: ['GET','HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
    });

    const body = await safeRead(r);
    res.status(r.status);
    res.set('Content-Type', r.headers.get('content-type') || 'application/json; charset=utf-8');
    if (typeof body === 'string') return res.send(body);
    return res.json(body);

  } catch (e) {
    return res.status(500).json({ ok:false, message: 'Proxy error: ' + e.message });
  }
});


const port = process.env.PORT || 8787;
app.listen(port, () => log('listening on http://localhost:' + port));
