// api/_wipon.js
let cached = null;

async function safeRead(r) {
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/json")) { try { return await r.json(); } catch {} }
  const t = await r.text(); try { return JSON.parse(t); } catch { return t; }
}

export async function getToken() {
  const API_BASE  = process.env.API_BASE || "https://api.wipon.kz";
  const AUTH_PATH = process.env.WIPON_AUTH_PATH || "/v1/oauth/token";
  const USERNAME  = process.env.WIPON_USER;
  const PASSWORD  = process.env.WIPON_PASS;
  if (!USERNAME || !PASSWORD) throw new Error("Missing WIPON_USER / WIPON_PASS");

  if (cached?.expires_at && cached.expires_at > Date.now() + 15000) return cached.access_token;

  if (cached?.refresh_token) {
    try {
      const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: cached.refresh_token });
      const r = await fetch(API_BASE + AUTH_PATH, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      const t = await safeRead(r);
      if (!r.ok) throw new Error("refresh_failed");
      const ttl = (t.expires_in || 3600) * 1000;
      cached = { access_token: t.access_token, refresh_token: t.refresh_token || cached.refresh_token, expires_at: Date.now() + ttl };
      return cached.access_token;
    } catch {}
  }

  const body = new URLSearchParams({ grant_type: "password", username: USERNAME, password: PASSWORD });
  const r = await fetch(API_BASE + AUTH_PATH, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const data = await safeRead(r);
  if (!r.ok) throw new Error("auth_failed_" + r.status);

  const ttl = (data.expires_in || 3600) * 1000;
  cached = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + ttl };
  return cached.access_token;
}

export async function wiponGet(url) {
  const API_BASE = process.env.API_BASE || "https://api.wipon.kz";
  const token = await getToken();
  const r = await fetch(API_BASE + url, { headers: { Authorization: "Bearer " + token, Accept: "application/json" } });
  const body = await safeRead(r);
  return { status: r.status, body };
}
