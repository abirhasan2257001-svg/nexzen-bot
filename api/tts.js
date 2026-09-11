import crypto from 'crypto';
import WebSocket from 'ws';
const TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0';
const GEC_VER = '1-143.0.3650.75';
function secMsGec() {
  let t = Date.now() / 1000 + 11644473600;
  t -= t % 300;
  const ticks = t * 1e7;
  return crypto.createHash('sha256').update(ticks.toFixed(0) + TOKEN, 'ascii').digest('hex').toUpperCase();
}
function dateToStr() {
  const d = new Date();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const p = n => String(n).padStart(2, '0');
  return `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${p(d.getUTCDate())} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} GMT+0000 (Coordinated Universal Time)`;
}
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function synth(text, voice, rate, pitch) {
  return new Promise((resolve, reject) => {
    const rid = crypto.randomUUID().replace(/-/g, '');
    const muid = crypto.randomBytes(16).toString('hex').toUpperCase();
    const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TOKEN}&ConnectionId=${crypto.randomUUID().replace(/-/g,'')}&Sec-MS-GEC=${secMsGec()}&Sec-MS-GEC-Version=${GEC_VER}`;
    const ws = new WebSocket(url, { headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache', 'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold', 'Sec-WebSocket-Version': '13', 'User-Agent': UA, 'Accept-Encoding': 'gzip, deflate, br, zstd', 'Accept-Language': 'en-US,en;q=0.9', 'Cookie': `muid=${muid};` } });
    const parts = []; let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; try { ws.close(); } catch {} reject(new Error('tts timeout 50s')); } }, 50000);
    const fail = e => { if (!done) { done = true; clearTimeout(timer); try { ws.close(); } catch {} reject(e); } };
    ws.on('open', () => {
      const ds = dateToStr();
      ws.send(`X-Timestamp:${ds}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"true","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`);
      ws.send(`X-RequestId:${rid}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ds}Z\r\nPath:ssml\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='+0%'>${esc(text)}</prosody></voice></speak>`);
    });
    ws.on('message', (data, isBinary) => {
      if (!isBinary) { const s = data.toString(); if (s.includes('Path:turn.end') && !done) { done = true; clearTimeout(timer); try { ws.close(); } catch {} resolve(Buffer.concat(parts)); } return; }
      const hlen = data.readUInt16BE(0);
      const header = data.subarray(2, 2 + hlen).toString();
      if (header.startsWith('Path:audio')) { const audio = data.subarray(2 + hlen); if (audio.length) parts.push(audio); }
    });
    ws.on('error', fail);
    ws.on('close', () => fail(new Error('ws closed early')));
  });
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const { text, voice, rate = '+0%', pitch = '+0Hz' } = req.body || {};
  if (!text || !voice) return res.status(400).json({ ok: false, error: 'text+voice required' });
  try { const buf = await synth(text, voice, rate, pitch); res.status(200).json({ ok: true, base64: buf.toString('base64') }); }
  catch (e) { res.status(500).json({ ok: false, error: String(e.message || e) }); }
}
