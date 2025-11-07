// api/categories.js
import { EMPLOYEE, callWipon } from './_wipon.js';

export default async function handler(req, res) {
  try {
    const q = new URL(req.url, 'http://x').searchParams;
    const queryObj = Object.fromEntries(q.entries());

    const path = `/v1/employee/${EMPLOYEE}/item-category`;
    const response = await callWipon(path, queryObj);

    res.status(response.status).setHeader('Content-Type','application/json');
    res.send(await response.text());
  } catch (e) {
    res.status(500).json({ ok:false, error: String(e?.message || e) });
  }
}
