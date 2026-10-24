'use strict';

process.env.BOT_DELAY_MS = '1';
process.env.BOT_WAIT_REVEAL = '0';

const test = require('node:test');
const assert = require('node:assert');
const { Game } = require('../src/game');
const { addBot, runBots } = require('../src/bots');

function playBotGame(n, options) {
  const g = new Game();
  if (options) g.setOptions(options);
  runBots(g);
  for (let i = 0; i < n; i++) addBot(g);
  g.start();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`stuck in phase ${g.phase}`)), 5000);
    g.onChange(() => {
      if (g.phase === 'over') {
        clearTimeout(timer);
        resolve(g);
      }
    });
  });
}

test('bots finish games at every player count', async () => {
  const wins = { good: 0, evil: 0 };
  for (let n = 5; n <= 10; n++) {
    for (let i = 0; i < 5; i++) {
      const g = await playBotGame(n, { percival: true, morgana: true, mordred: n >= 7, oberon: n >= 10 });
      wins[g.winner]++;
    }
  }
  console.log('bot results', wins);
  assert.strictEqual(wins.good + wins.evil, 30);
});

test('bots are flagged and shown as connected', () => {
  const g = new Game();
  addBot(g);
  const [p] = g.publicState().players;
  assert.ok(p.bot && p.connected);
});
