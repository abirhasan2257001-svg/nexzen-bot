import crypto from 'crypto';
import WebSocket from 'ws';
const TOKEN = '6A5AA1D4EAOF4FC9A493FF4E37A3949B';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';
function secMsGec() {
  let ticks = Math.floor((Date.now() / 1000 + 11644473600) * 1e7);
  ticks -= ticks % 3000000000;
  return crypto.createHash('sha256').update(ticks + TOKEN).digest('base64');
}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function synth(text, voice, rate, pitch) {
  return new Promise((resolve, reject) => {
    const rid = crypto.randomUUID().replace(/-/g, '').toUpperCase();
    const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TOKEN}&ConnectionId=${crypto.randomUUID()}&Sec-MS-GEC=${encodeURIComponent(secMsGec())}`;
    const ws = new WebSocket(url, { headers: { 'User-Agent': UA, Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold', 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' } });
    const parts = []; let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; try { ws.close(); } catch {} reject(new Error('tts timeout 50s')); } }, 50000);
    const fail = (e) => { if (!done) { done = true; clearTimeout(timer); try { ws.close(); } catch {} reject(e); } };
    ws.on('open', () => {
      ws.send(`Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`);
      ws.send(`X-RequestId:${rid}\r\nContent-Type:application/ssml+xml\r\nX-TimeStamp:${new Date().toISOString()}\r\nPath:ssml\r\n\r\n<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${voice}"><prosody rate="${rate}" pitch="${pitch}">${esc(text)}</prosody></voice></speak>`);
    });
    ws.on('message', (data, isBinary) => {
      if (!isBinary) { const s = data.toString(); if (s.includes('Path:turn.end') && !done) { done = true; clearTimeout(timer); try { ws.close(); } catch {} resolve(Buffer.concat(parts)); } return; }
      const hlen = data.readUInt16BE(0);
      const header = data.subarray(2, 2 + hlen).toString();
      if (header.startsWith('Path:audio')) parts.push(data.subarray(2 + hlen));
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
