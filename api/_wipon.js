// api/_wipon.js
export default async function handler(req, res) {
  const response = await fetch('https://wipon.kz/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: process.env.WIPON_USER,
      password: process.env.WIPON_PASS,
    }),
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
