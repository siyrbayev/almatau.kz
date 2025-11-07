// api/categories.js
const { wiponFetch, EMPLOYEE_ID } = require('./_wipon');

module.exports = async function handler(req, res) {
  try {
    const base = `http://${req.headers.host || 'x'}`;
    const q = new URL(req.url, base).searchParams;
    const query = Object.fromEntries(q.entries());

    // По умолчанию: дерево (all=1) + фильтр по складу, если передан
    const all = query.all ?? '1';
    const stock_id = query.stock_id;
    const positive_balance = query.positive_balance; // 'true'/'1' по желанию

    // путь: ИЛИ auto, ИЛИ с EMPLOYEE_ID. У вас раньше работал "auto".
    const path = EMPLOYEE_ID
      ? `/v1/employee/${EMPLOYEE_ID}/item-category`
      : `/v1/employee/auto/item-category`;

    const data = await wiponFetch(path, {
      query: {
        all,
        stock_id,
        positive_balance,
      },
    });

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ ok: true, data });
  } catch (e) {
    console.error('categories error:', e);
    res
      .status(500)
      .json({ ok: false, error: String(e?.message || e) });
  }
};
