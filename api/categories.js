// api/categories.js
import { wiponGet } from "./_wipon.js";

export default async function handler(req, res) {
  try {
    const EMPLOYEE_ID = process.env.EMPLOYEE_ID;
    if (!EMPLOYEE_ID) throw new Error("Missing EMPLOYEE_ID");

    // Разрешённые параметры по спецификации v1 item-category:
    const ALLOWED = [
      "all",                // bool: 1/0
      "parent_id",          // int
      "stock_id",           // int
      "positive_balance",   // bool: true/false
      "search",             // string
      "is_empty",           // bool: true/false
      // types[] — массив int
      "per_page"            // есть в описании, хотя «не используется»
    ];

    const qs = new URLSearchParams();

    // обычные скалярные
    for (const k of ALLOWED) {
      const v = req.query[k];
      if (v != null && v !== "") qs.set(k, String(v));
    }

    // массив types[]
    // поддерживаем и types, и types[] — на всякий случай
    const typesArr = []
      .concat(req.query["types[]"] ?? [])
      .concat(req.query["types"] ?? []);
    for (const t of Array.isArray(typesArr) ? typesArr : [typesArr]) {
      if (t != null && t !== "") qs.append("types[]", String(t));
    }

    const path = `/v1/employee/${EMPLOYEE_ID}/item-category` + (qs.toString() ? `?${qs}` : "");
    const { status, body } = await wiponGet(path);
    res.status(status).json(body);
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e?.message || e) });
  }
}
