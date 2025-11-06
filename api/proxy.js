// /api/proxy.js — адаптировано под Vercel serverless

import fetch from 'node-fetch';

let cached = null; // { access_token, refresh_token, expires_at }

function log(...args) {
  console.log('[proxy]', ...args);
}

async function safeRead(r) {
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { return await r.json(); } catch { /* fallthrough */ }
  }
  const text = await r.text();
  try { return JSON.parse(text); } catch { return text; }
}

export default async function handler(req, res) {
  try {
    const API_BASE = process.env.VITE_API_BASE || 'https://api.wipon.kz';
    const AUTH_PATH = process.env.VITE_WIPON_AUTH_PATH || '/v1/oauth/token';
    const USERNAME = process.env.VITE_WIPON_USER;
    const PASSWORD = process.env.VITE_WIPON_PASS;
    const EMPLOYEE_ID = process.env.VITE_EMPLOYEE_ID;

    if (!USERNAME || !PASSWORD) {
      throw new Error('Missing WIPON_USER or WIPON_PASS');
    }

    async function getToken() {
      // если токен ещё валиден — используем
      if (cached?.expires_at && cached.expires_at > Date.now() + 15000) {
        return cached.access_token;
      }

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
            body,
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
            expires_at: Date.now() + ttl,
          };
          return cached.access_token;
        } catch (e) {
          log('refresh error → fallback to password', e.message);
        }
      }

      // авторизация логином/паролем
      const body = new URLSearchParams({
        grant_type: 'password',
        username: USERNAME,
        password: PASSWORD,
      });
      const resAuth = await fetch(API_BASE + AUTH_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const data = await safeRead(resAuth);
      if (!resAuth.ok) {
        log('password auth failed', resAuth.status, data);
        throw new Error('auth_failed_' + resAuth.status);
      }
      const ttl = (data.expires_in || 3600) * 1000;
      cached = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + ttl,
      };
      log('auth ok; expires_in=', data.expires_in);
      return cached.access_token;
    }

    const token = await getToken();

    // исходный путь от фронта
    const inPath = req.url.replace('/api/proxy', '');
    // подмена .../v1/employee/auto/... → .../v1/employee/{EMPLOYEE_ID}/...
    const rewrittenPath = inPath.replace(
      /\/v(\d+)\/employee\/auto\//,
      (_m, v) => `/v${v}/employee/${EMPLOYEE_ID}/`
    );

    const upstream = API_BASE + rewrittenPath;

    const headers = {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json, text/plain, */*',
    };
    if (req.headers['content-type'])
      headers['Content-Type'] = req.headers['content-type'];

    const r = await fetch(upstream, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method)
        ? undefined
        : JSON.stringify(req.body),
    });

    const body = await safeRead(r);
    res.status(r.status);
    res.setHeader(
      'Content-Type',
      r.headers.get('content-type') || 'application/json; charset=utf-8'
    );
    if (typeof body === 'string') return res.send(body);
    return res.json(body);
  } catch (e) {
    log('error', e.message);
    res.status(500).json({ ok: false, message: 'Proxy error: ' + e.message });
  }
}
