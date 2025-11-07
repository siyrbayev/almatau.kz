// api/proxy/[...proxy].js — robust Vercel proxy for Wipon
let cached = null; // { access_token, refresh_token, expires_at }

const log = (...a) => console.log("[proxy]", ...a);

async function safeRead(r) {
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try { return await r.json(); } catch {}
  }
  const t = await r.text();
  try { return JSON.parse(t); } catch { return t; }
}

export default async function handler(req, res) {
  try {
    const API_BASE    = process.env.API_BASE || "https://api.wipon.kz";
    const AUTH_PATH   = process.env.WIPON_AUTH_PATH || "/v1/oauth/token";
    const USERNAME    = process.env.WIPON_USER;
    const PASSWORD    = process.env.WIPON_PASS;
    const EMPLOYEE_ID = process.env.EMPLOYEE_ID;

    // Health
    if (req.url.startsWith("/api/proxy/ping")) {
      return res.status(200).json({ ok: true, ping: "pong" });
    }

    if (!USERNAME || !PASSWORD) {
      return res.status(500).json({ ok:false, message:"Missing WIPON_USER / WIPON_PASS in Vercel env."});
    }
    if (!EMPLOYEE_ID) {
      return res.status(500).json({ ok:false, message:"Missing EMPLOYEE_ID in Vercel env. Add it in Project → Settings → Environment Variables."});
    }

    async function getToken() {
      if (cached?.expires_at && cached.expires_at > Date.now() + 15000)
        return cached.access_token;

      if (cached?.refresh_token) {
        try {
          const body = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: cached.refresh_token,
          });
          const r = await fetch(API_BASE + AUTH_PATH, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
          });
          const t = await safeRead(r);
          if (!r.ok) throw new Error("refresh_failed_" + r.status);
          const ttl = (t.expires_in || 3600) * 1000;
          cached = {
            access_token: t.access_token,
            refresh_token: t.refresh_token || cached.refresh_token,
            expires_at: Date.now() + ttl,
          };
          return cached.access_token;
        } catch (e) {
          log("refresh error → fallback", e.message);
        }
      }

      const body = new URLSearchParams({
        grant_type: "password",
        username: USERNAME,
        password: PASSWORD,
      });
      const r = await fetch(API_BASE + AUTH_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const data = await safeRead(r);
      if (!r.ok) {
        return res.status(401).json({ ok:false, message:"Auth failed to Wipon ("+r.status+")", details:data });
      }
      const ttl = (data.expires_in || 3600) * 1000;
      cached = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + ttl,
      };
      log("auth ok");
      return cached.access_token;
    }

    const token = await getToken();

    // Build upstream URL
    const segs   = Array.isArray(req.query.proxy) ? req.query.proxy : [];
    const suffix = "/" + segs.join("/");
    const query  = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";

    // Replace either /vX/employee/auto/.. OR /vX/employee/<id>/.. with the concrete EMPLOYEE_ID
    const rewrittenPath = suffix.replace(
      /\/v(\d+)\/employee\/(?:auto|\d+)\/(.*)$/,
      (_m, v, rest) => `/v${v}/employee/${EMPLOYEE_ID}/${rest}`
    );

    const upstream = API_BASE + rewrittenPath + query;
    log("→", req.method, upstream);

    // Forward request
    const headers = {
      Authorization: "Bearer " + token,
      Accept: "application/json, text/plain, */*",
    };
    if (req.headers["content-type"])
      headers["Content-Type"] = req.headers["content-type"];

    const r = await fetch(upstream, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const body = await safeRead(r);
    res.status(r.status);
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/json; charset=utf-8");
    if (typeof body === "string") return res.send(body);
    return res.json(body);
  } catch (e) {
    log("error", e.message);
    res.status(500).json({ ok:false, message:"Proxy error: "+ e.message });
  }
}