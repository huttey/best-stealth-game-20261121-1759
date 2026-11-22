// A tiny static server for playing Lantern Thief locally (Node 22, standard library
// only). Serves game/ at http://localhost:8080 — open it in desktop Chrome and play
// with WASD or arrow keys, Shift to sneak, R to restart.

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, 'game');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

createServer((req, res) => {
  const raw = (req.url ?? '/').split('?')[0];
  const path = raw === '/' ? '/index.html' : raw;
  const file = join(root, path);
  if (!existsSync(file) || !file.startsWith(root)) { res.writeHead(404); res.end('not found'); return; }
  let stat;
  try { stat = statSync(file); } catch { res.writeHead(404); res.end('not found'); return; }
  if (!stat.isFile()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(8080, () => console.log('Lantern Thief at http://localhost:8080'));
