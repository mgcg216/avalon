'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Game, GameError } = require('./game');
const { addBot, runBots } = require('./bots');

const PLAYER_PORT = Number(process.env.PLAYER_PORT) || 3000;
const GM_PORT = Number(process.env.GM_PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const GM_HOST = process.env.GM_HOST || HOST; // set to 127.0.0.1 to keep the GM page local-only
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const game = new Game();
runBots(game);
for (let i = 0; i < (Number(process.env.BOTS) || 0); i++) addBot(game);

// ---------- helpers ----------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function serveFile(res, file) {
  const full = path.join(PUBLIC_DIR, file);
  if (!full.startsWith(PUBLIC_DIR + path.sep)) return sendJson(res, 404, { error: 'Not found' });
  fs.readFile(full, (err, data) => {
    if (err) return sendJson(res, 404, { error: 'Not found' });
    // no-cache: browsers revalidate every load, so updated pages show up without a hard refresh.
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(full)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 10_000) {
        reject(new GameError('Request too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new GameError('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Virtual interfaces (Docker, VMs) aren't reachable from phones on the Wi-Fi.
const VIRTUAL_IFACE = /^(docker|br-|veth|virbr|vmnet|vboxnet|tun|tap|zt|tailscale)/;

function lanUrls(port) {
  const urls = [];
  for (const [name, ifaces] of Object.entries(os.networkInterfaces())) {
    if (VIRTUAL_IFACE.test(name)) continue;
    for (const i of ifaces || []) {
      if (i.family === 'IPv4' && !i.internal) urls.push(`http://${i.address}:${port}`);
    }
  }
  return urls.length ? urls : [`http://localhost:${port}`];
}

// ---------- server-sent events ----------

// Each stream gets its own view: player streams only ever see that player's secrets.
const streams = new Set(); // { res, view: () => object|null, onClose }

function openStream(req, res, view, onClose) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
  });
  res.write('retry: 2000\n\n');
  const stream = { res, view };
  streams.add(stream);
  push(stream);
  req.on('close', () => {
    streams.delete(stream);
    if (onClose) onClose();
  });
}

function push(stream) {
  const data = stream.view();
  if (data === null) {
    // Player no longer exists (kicked or server restarted).
    stream.res.write('event: gone\ndata: {}\n\n');
    return;
  }
  stream.res.write(`event: state\ndata: ${JSON.stringify(data)}\n\n`);
}

let pending = false;
game.onChange(() => {
  // Coalesce bursts of changes into a single broadcast.
  if (pending) return;
  pending = true;
  setImmediate(() => {
    pending = false;
    for (const s of streams) push(s);
  });
});

// Keep proxies and phones from dropping idle connections.
setInterval(() => {
  for (const s of streams) s.res.write(': ping\n\n');
}, 25_000).unref();

// ---------- routing ----------

function makeHandler(name, routes, pages) {
  return async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const key = `${req.method} ${url.pathname}`;
    try {
      if (routes[key]) {
        const body = req.method === 'POST' ? await readBody(req) : null;
        const result = await routes[key]({ req, res, url, body });
        if (result !== undefined) sendJson(res, 200, result);
        return;
      }
      if (req.method === 'GET') {
        const file = pages[url.pathname] || url.pathname.slice(1);
        if (file && !file.includes('..')) return serveFile(res, file);
      }
      sendJson(res, 404, { error: 'Not found' });
    } catch (err) {
      if (err instanceof GameError) return sendJson(res, 400, { error: err.message });
      console.error(`[${name}]`, err);
      sendJson(res, 500, { error: 'Server error' });
    }
  };
}

const playerRoutes = {
  'POST /api/join': ({ body }) => {
    const p = game.join(body.name);
    console.log(`+ ${p.name} joined`);
    return { token: p.token, id: p.id };
  },
  'POST /api/leave': ({ body }) => {
    game.leave(body.token);
    return { ok: true };
  },
  'POST /api/skip': ({ body }) => {
    game.requestSkip(body.token);
    return { ok: true };
  },
  'POST /api/propose': ({ body }) => {
    game.propose(body.token, body.team);
    return { ok: true };
  },
  'POST /api/vote': ({ body }) => {
    game.vote(body.token, body.approve);
    return { ok: true };
  },
  'POST /api/quest': ({ body }) => {
    game.playCard(body.token, body.success);
    return { ok: true };
  },
  'POST /api/assassinate': ({ body }) => {
    game.assassinate(body.token, body.target);
    return { ok: true };
  },
  'GET /api/events': ({ req, res, url }) => {
    const token = url.searchParams.get('token') || '';
    const player = game.byToken(token);
    if (player) {
      player.connections++;
      game.changed();
    }
    openStream(req, res, () => game.playerView(token), () => {
      if (player) {
        player.connections--;
        game.maybeSkip();
        game.changed();
      }
    });
  },
};

const gmRoutes = {
  'GET /api/info': () => ({ joinUrls: lanUrls(PLAYER_PORT) }),
  'POST /api/options': ({ body }) => {
    game.setOptions(body);
    return { ok: true };
  },
  'POST /api/start': () => {
    game.start();
    console.log(`Game started with ${game.order.length} players`);
    return { ok: true };
  },
  'POST /api/begin': () => {
    game.begin();
    return { ok: true };
  },
  'POST /api/end': () => {
    game.endGame();
    return { ok: true };
  },
  'POST /api/add-bot': () => {
    addBot(game);
    return { ok: true };
  },
  'POST /api/kick': ({ body }) => {
    game.kick(body.id);
    return { ok: true };
  },
  'GET /api/events': ({ req, res }) => {
    openStream(req, res, () => game.publicState());
  },
};

const playerServer = http.createServer(makeHandler('player', playerRoutes, { '/': 'player.html' }));
const gmServer = http.createServer(makeHandler('gm', gmRoutes, { '/': 'gm.html' }));

playerServer.listen(PLAYER_PORT, HOST, () => {
  console.log(`Players join at:   ${lanUrls(PLAYER_PORT).join('  ')}`);
});
gmServer.listen(GM_PORT, GM_HOST, () => {
  console.log(`Game master board: http://localhost:${GM_PORT}`);
});
