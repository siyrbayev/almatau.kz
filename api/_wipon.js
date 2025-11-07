// api/_wipon.js
let cachedToken = null
let tokenExpires = 0

// ✅ Получаем токен автоматически при первом запросе
async function getWiponToken() {
  const now = Date.now()
  if (cachedToken && now < tokenExpires) {
    return cachedToken
  }

  console.log('⏳ Получаю новый токен от Wipon...')

  const res = await fetch('https://wipon.api.kz/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: process.env.WIPON_USER,
      password: process.env.WIPON_PASS
    })
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('Ошибка авторизации Wipon:', res.status, text)
    throw new Error('Wipon auth failed')
  }

  const data = await res.json()
  cachedToken = data.token
  tokenExpires = now + 60 * 60 * 1000 // живёт 1 час
  console.log('✅ Новый токен получен')
  return cachedToken
}

// 🌐 Универсальный fetch для всех запросов к Wipon
export async function wiponFetch(path, params = {}) {
  const token = await getWiponToken()
  const base = 'https://wipon.api.kz'
  const url = `${base}${path}`

  const res = await fetch(url, {
    ...params,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(params.headers || {})
    }
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('Wipon API error:', res.status, text)
    throw new Error(`Wipon API ${res.status}`)
  }

  return res.json()
}
