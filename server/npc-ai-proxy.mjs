import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Minimal .env reader so this helper works on Node 18+ without dotenv.
try {
  const envText = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^([\"'])(.*)\1$/, '$2');
  }
} catch { /* .env is optional; use the process environment instead. */ }

const PORT = Math.max(1, Number(process.env.AI_PROXY_PORT || 8787));
const API_URL = String(process.env.LLM_API_URL || '').trim();
const API_KEY = String(process.env.LLM_API_KEY || '').trim();
const MODEL = String(process.env.LLM_MODEL || '').trim();
const allowedOrigins = new Set(
  String(process.env.ALLOWED_ORIGINS || 'http://localhost:8000,http://127.0.0.1:8000')
    .split(',').map(value => value.trim()).filter(Boolean)
);
const MAX_BODY_BYTES = 48 * 1024;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const requestWindows = new Map();

function send(res, status, payload, origin) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(origin ? {
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    } : {})
  });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.setEncoding('utf8');
    req.on('data', chunk => {
      bytes += Buffer.byteLength(chunk, 'utf8');
      if (bytes > MAX_BODY_BYTES) {
        reject(new Error('payload-too-large'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(new Error('invalid-json')); }
    });
    req.on('error', reject);
  });
}

function allowRate(ip) {
  const now = Date.now();
  const recent = (requestWindows.get(ip) || []).filter(time => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestWindows.set(ip, recent);
    return false;
  }
  recent.push(now);
  requestWindows.set(ip, recent);
  return true;
}

function extractContent(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(part => part?.text || '').join('\n');
  if (typeof data?.output_text === 'string') return data.output_text;
  if (typeof data?.reply === 'string') return data.reply;
  return '';
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (req.method === 'OPTIONS') {
    if (!allowedOrigins.has(origin)) return send(res, 403, { error: 'origin-not-allowed' });
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600'
    });
    return res.end();
  }
  if (req.method !== 'POST' || req.url !== '/npc-chat') return send(res, 404, { error: 'not-found' });
  if (!allowedOrigins.has(origin)) return send(res, 403, { error: 'origin-not-allowed' });
  if (!allowRate(req.socket.remoteAddress || 'unknown')) return send(res, 429, { error: 'rate-limit' }, origin);
  if (!API_URL || !API_KEY || !MODEL) return send(res, 503, { error: 'proxy-not-configured' }, origin);

  let input;
  try { input = await readJson(req); }
  catch (error) { return send(res, error.message === 'payload-too-large' ? 413 : 400, { error: error.message }, origin); }
  if (!Array.isArray(input.messages) || input.messages.length < 2 || input.messages.length > 14) {
    return send(res, 400, { error: 'invalid-messages' }, origin);
  }

  try {
    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ model: MODEL, messages: input.messages, temperature: 0.82, max_tokens: 220 }),
      signal: AbortSignal.timeout(20_000)
    });
    if (!upstream.ok) return send(res, 502, { error: 'upstream-error', status: upstream.status }, origin);
    const data = await upstream.json();
    const reply = String(extractContent(data) || '').replace(/<[^>]+>/g, '').trim().slice(0, 900);
    if (!reply) return send(res, 502, { error: 'empty-upstream-reply' }, origin);
    return send(res, 200, { reply }, origin);
  } catch {
    return send(res, 502, { error: 'upstream-unavailable' }, origin);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`NPC AI proxy listening at http://127.0.0.1:${PORT}/npc-chat`);
  if (!API_URL || !API_KEY || !MODEL) console.log('Set LLM_API_URL, LLM_API_KEY and LLM_MODEL in the server environment.');
});
