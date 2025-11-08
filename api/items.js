// api/items.js
const { wiponFetch, EMPLOYEE_ID } = require('./_wipon');

module.exports = async function handler(req, res) {
  try {
    const base = `http://${req.headers.host || 'x'}`;
    const q = new URL(req.url, base).searchParams;
    const query = Object.fromEntries(q.entries());

    if (query.positive_balance === 'true' || query.positive_balance === '1') {
      query.positive_balance = 1;
    } else if (query.positive_balance === 'false' || query.positive_balance === '0') {
      query.positive_balance = 0;
    }
    
    const {
      item_category_id,
      title,
      barcode,
      vendor_code,
      stock_id,
      positive_balance = true,
      page = '1',
      per_page = '20',
    } = query;

    const path = EMPLOYEE_ID
      ? `/v2/employee/${EMPLOYEE_ID}/item`
      : `/v2/employee/auto/item`;

    const data = await wiponFetch(path, {
      query: {
        item_category_id,
        title,
        barcode,
        vendor_code,
        stock_id,
        positive_balance,
        page,
        per_page,
      },
    });

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ ok: true, data });
  } catch (e) {
    console.error('items error:', e);
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
};
