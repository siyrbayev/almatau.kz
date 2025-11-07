// api/_wipon.js
const AUTH_URL  = process.env.WIPON_AUTH_PATH || 'https://wipon.api.kz/v1/auth';
const API_BASE  = process.env.API_BASE        || 'https://wipon.api.kz';
const EMPLOYEE  = process.env.EMPLOYEE_ID;

if (!process.env.WIPON_USER || !process.env.WIPON_PASS || !EMPLOYEE) {
  console.warn('[WIPON] Missing envs: WIPON_USER / WIPON_PASS / EMPLOYEE_ID');
}

let tokenCache = { value: null, exp: 0 };

async function fetchJSON(url, opts = {}) {
  const r = await fetch(url, opts);
  if (!r.ok) {
    const text = await r.text().catch(()=>'');
    throw new Error(`HTTP ${r.status} ${r.statusText}: ${text}`);
  }
  return r.json();
}

async function getToken(force = false) {
  const now = Date.now();
  if (!force && tokenCache.value && tokenCache.exp > now) return tokenCache.value;

  const body = JSON.stringify({
    login: process.env.WIPON_USER,
    password: process.env.WIPON_PASS,
  });

  const data = await fetchJSON(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body
  });

  const token = data?.data?.token || data?.token;
  if (!token) throw new Error('Auth failed: no token');

  tokenCache = { value: token, exp: now + 50 * 60 * 1000 }; // ~50 мин
  return token;
}

async function callWipon(path, queryObj) {
  const qs = new URLSearchParams(queryObj || {});
  const url = `${API_BASE}${path}?${qs.toString()}`;

  let token = await getToken();
  let res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  // если токен протух — обновим и повторим
  if (res.status === 401) {
    token = await getToken(true);
    res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(()=> '');
    return new Response(text || JSON.stringify({ ok:false, status:res.status }), { status: res.status });
  }
  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export { EMPLOYEE, callWipon };
