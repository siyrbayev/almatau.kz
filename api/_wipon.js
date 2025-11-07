// api/_wipon.js
const API_BASE = process.env.API_BASE || 'https://wipon.api.kz';
const AUTH_PATH = process.env.WIPON_AUTH_PATH || '/v1/oauth/token';
const EMPLOYEE_ID = process.env.EMPLOYEE_ID; // можно не использовать, если "auto"

const WIPON_USER = process.env.WIPON_USER;
const WIPON_PASS = process.env.WIPON_PASS;

// Глобальный кэш токена между инвокациями (пока контейнер «тёплый»)
let cachedToken = null;
let tokenExpAt = 0;

function withTimeout(ms, p) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  return fetch(p.url, { ...p, signal: ac.signal }).finally(() => clearTimeout(t));
}

async function login() {
  if (!WIPON_USER || !WIPON_PASS) {
    throw new Error('Missing env WIPON_USER or WIPON_PASS');
  }

  const url = API_BASE + AUTH_PATH;
  const r = await withTimeout(8000, {
    url,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ login: WIPON_USER, password: WIPON_PASS }),
  });

  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Auth failed ${r.status}. ${text?.slice(0, 200)}`);
  }
  const data = await r.json();

  // Подстраиваемся под формат (часто token лежит в data.token / token / access_token)
  const token = data?.data?.token || data?.token || data?.access_token;
  if (!token) throw new Error('Auth response has no token');

  // TTL: если пришёл expires_in — используем; иначе на 50 минут
  const ttl = Number(data?.expires_in || 3000); // секунд
  tokenExpAt = Date.now() + Math.max(30_000, ttl * 1000 - 60_000);
  cachedToken = token;
  return token;
}

async function getToken() {
  if (cachedToken && Date.now() < tokenExpAt) return cachedToken;
  return login();
}

// Универсальный ход в Wipon с автологином
async function wiponFetch(path, { query = {}, method = 'GET', body } = {}) {
  const u = new URL(API_BASE + path);
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  });

  const token = await getToken();

  const r = await withTimeout(10_000, {
    url: u.toString(),
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': body ? 'application/json' : undefined,
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (r.status === 401 || r.status === 403) {
    // пробуем разлогиниться и логин заново (токен протух)
    cachedToken = null;
    await getToken();
    throw new Error(`Wipon responded ${r.status} (auth). Try again.`);
  }

  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Wipon error ${r.status}: ${text?.slice(0, 300)}`);
  }

  return r.json();
}

module.exports = { wiponFetch, EMPLOYEE_ID };
