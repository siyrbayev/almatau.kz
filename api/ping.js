// api/ping.js
export function handler(_req, res) {
  res.status(200).json({ ok: true, ping: 'pong' });
}
