export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const { key, img, name, ver, features, dl, dl2, repoUrl } = req.body || {};
  if (key !== process.env.ADMIN_KEY) return res.status(403).json({ ok: false, error: 'wrong key' });
  const GH = process.env.GH_TOKEN, TG = process.env.TG_TOKEN;
  const owner = 'abirhasan2257001-svg', repo = process.env.REPO || 'oxispeak';
  const slug = (name || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
  let photoUrl = (img || '').startsWith('http') ? img : null;
  if (!photoUrl && img) {
    const base64 = img.includes(',') ? img.split(',')[1] : img;
    const put = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/covers/${slug}.png`, {
      method: 'PUT',
      headers: { Authorization: `token ${GH}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `cover: ${slug}`, content: base64 })
    });
    if (!put.ok) return res.status(500).json({ ok: false, error: 'github upload fail', detail: await put.text() });
    photoUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/covers/${slug}.png`;
  }
  const feat = (features || []).map(f => `● ${f}`).join('\n');
  let links = `📢 <a href="https://t.me/NexzenLabs">Channel</a>`;
  if (repoUrl) links += ` · 🧬 <a href="${repoUrl}">GitHub</a>`;
  const caption = `⬛ <b>NEXZEN LABS</b> ⬜ presents\n<b>${name} ${ver || ''}</b> ✅\n\n<blockquote>📦 <b>App Info</b></blockquote>\n<blockquote>${feat}</blockquote>\n\n⬇️ <b>OFFICIAL DOWNLOAD</b> ⬇️\n${links}`;
  const kb = [[{ text: '⬇️ Direct Download', url: dl }]];
  if (dl2) kb.push([{ text: '⚡ Fast Download', url: dl2 }]);
  kb.push([{ text: '📢 Channel', url: 'https://t.me/NexzenLabs' }]);
  const form = new FormData();
  form.append('chat_id', '@NexzenLabs');
  form.append('photo', photoUrl);
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  form.append('reply_markup', JSON.stringify({ inline_keyboard: kb }));
  const tg = await fetch(`https://api.telegram.org/bot${TG}/sendPhoto`, { method: 'POST', body: form });
  const j = await tg.json();
  res.status(200).json(j);
}
