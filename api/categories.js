// api/categories.js
import { wiponFetch } from './_wipon.js'

export default async function handler(req, res) {
  try {
    const query = req.url.split('?')[1] || ''
    const data = await wiponFetch(`/v1/employee/auto/item-category?${query}`)
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}
