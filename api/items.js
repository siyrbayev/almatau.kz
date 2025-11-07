// api/items.js
import { wiponGet } from "./_wipon.js";

export default async function handler(req, res) {
  try {
    const EMPLOYEE_ID = process.env.EMPLOYEE_ID;
    if (!EMPLOYEE_ID) throw new Error("Missing EMPLOYEE_ID");

    // Разрешённые параметры по спецификации v2 item:
    const ALLOWED = [
      "title",
      "vendor_code",
      "barcode",
      "type",
      "stock_id",
      "item_category_id",
      "vendor_id",
      "page",
      "per_page",
      "positive_balance",
      "created_at_from",
      "created_at_to",
      "trashed",
      "only_parents",
      "all",
      "is_weighted",
      "selling_price",
      "order_direction"
    ];

    const qs = new URLSearchParams();
    for (const k of ALLOWED) {
      const v = req.query[k];
      if (v != null && v !== "") qs.set(k, String(v));
    }

    const path = `/v2/employee/${EMPLOYEE_ID}/item` + (qs.toString() ? `?${qs}` : "");
    const { status, body } = await wiponGet(path);
    res.status(status).json(body);
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e?.message || e) });
  }
}
