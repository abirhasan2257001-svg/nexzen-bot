export default async function handler(req, res) {
  const { prompt, provider } = req.body || {};
  const userKey = req.headers['x-user-key'];
  let text = '';
  try {
    if (provider === 'codecraft') {
      const r = await fetch(process.env.CODECRAFT_URL, { method: 'POST', headers: { Authorization: `Bearer ${process.env.CODECRAFT_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.CODECRAFT_MODEL || 'default', messages: [{ role: 'user', content: prompt }], max_tokens: 1200 }) });
      const j = await r.json(); text = j.choices?.[0]?.message?.content || j.text || '';
    } else if (provider === 'gemini' && userKey) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${userKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
      const j = await r.json(); text = j.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (provider === 'groq' && userKey) {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${userKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] }) });
      const j = await r.json(); text = j.choices?.[0]?.message?.content || '';
    } else if (provider === 'deepseek' && userKey) {
      const r = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${userKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }] }) });
      const j = await r.json(); text = j.choices?.[0]?.message?.content || '';
    } else { res.status(400).json({ error: 'No provider/key' }); return; }
    res.status(200).json({ text });
  } catch (e) { res.status(200).json({ text: '', error: e.message }); }
}
