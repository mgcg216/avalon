'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { Game, GameError, ROLES, buildRoles } = require('../src/game');

function setup(n, options) {
  const g = new Game();
  if (options) g.setOptions(options);
  const players = [];
  for (let i = 0; i < n; i++) players.push(g.join(`P${i}`));
  g.start();
  const tok = (id) => players.find((p) => p.id === id).token;
  const teamOf = (team) => g.order.filter((id) => ROLES[g.roles[id]].team === team);
  return { g, players, tok, teamOf };
}

// Leader proposes the given team (or the first N seats) and everyone approves.
function approveTeam(ctx, team) {
  const { g, tok } = ctx;
  team = team || g.order.slice(0, g.quest.size);
  g.propose(tok(g.leaderId), team);
  for (const id of g.order) g.vote(tok(id), true);
  return team;
}

function runQuest(ctx, succeed) {
  const { g, tok } = ctx;
  const good = ctx.teamOf('good');
  const evil = ctx.teamOf('evil');
  // Pick a team that can definitely succeed (all good) or fail (includes evil).
  const size = g.quest.size;
  const team = succeed ? good.slice(0, size) : [...evil.slice(0, 2), ...good].slice(0, size);
  approveTeam(ctx, team);
  for (const id of team) g.playCard(tok(id), succeed || ROLES[g.roles[id]].team === 'good');
}

test('role counts match the official setups', () => {
  const expectedEvil = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 };
  for (let n = 5; n <= 10; n++) {
    const roles = buildRoles(n, { percival: true, morgana: true });
    assert.strictEqual(roles.length, n);
    assert.strictEqual(roles.filter((r) => ROLES[r].team === 'evil').length, expectedEvil[n]);
    assert.ok(roles.includes('merlin') && roles.includes('assassin'));
  }
  assert.throws(() => buildRoles(5, { morgana: true, mordred: true }), GameError);
  assert.throws(() => buildRoles(4, {}), GameError);
});

test('joining validates names and locks during a game', () => {
  const g = new Game();
  assert.throws(() => g.join('  '), GameError);
  g.join('Alice');
  assert.throws(() => g.join('alice'), GameError);
  for (const n of ['B', 'C', 'D', 'E']) g.join(n);
  g.start();
  assert.throws(() => g.join('Late'), GameError);
});

test('knowledge: Merlin, Percival, evil, Mordred, Oberon', () => {
  const { g } = setup(10, { percival: true, morgana: true, mordred: true, oberon: true });
  const who = (role) => g.order.find((id) => g.roles[id] === role);
  const seen = (role) => g.knowledgeFor(who(role)).map((k) => g.roles[k.id]).sort();

  assert.deepStrictEqual(seen('merlin'), ['assassin', 'morgana', 'oberon']); // not Mordred
  assert.deepStrictEqual(seen('percival'), ['merlin', 'morgana']);
  assert.deepStrictEqual(seen('assassin'), ['mordred', 'morgana']); // not Oberon
  assert.deepStrictEqual(seen('mordred'), ['assassin', 'morgana']);
  assert.deepStrictEqual(seen('oberon'), []);
  assert.deepStrictEqual(seen('servant'), []);
});

test('player views never leak other roles before game over', () => {
  const ctx = setup(7);
  for (const p of ctx.players) {
    const v = ctx.g.playerView(p.token);
    assert.strictEqual(v.reveal, null);
    assert.strictEqual(v.me.role, ctx.g.roles[p.id]);
    assert.ok(!JSON.stringify(v).includes('token'));
  }
  assert.ok(!JSON.stringify(ctx.g.publicState()).includes(ctx.players[0].token));
});

test('only the leader proposes, with the right team size', () => {
  const ctx = setup(5);
  const { g, tok } = ctx;
  const notLeader = g.order.find((id) => id !== g.leaderId);
  assert.throws(() => g.propose(tok(notLeader), g.order.slice(0, 2)), /leader/);
  assert.throws(() => g.propose(tok(g.leaderId), g.order.slice(0, 3)), /exactly 2/);
  g.propose(tok(g.leaderId), g.order.slice(0, 2));
  assert.strictEqual(g.phase, 'vote');
});

test('rejected vote passes leadership; 5 rejections means evil wins', () => {
  const ctx = setup(5);
  const { g, tok } = ctx;
  for (let i = 0; i < 5; i++) {
    const leader = g.leaderId;
    g.propose(tok(leader), g.order.slice(0, 2));
    for (const id of g.order) g.vote(tok(id), false);
    if (i < 4) {
      assert.strictEqual(g.phase, 'team');
      assert.notStrictEqual(g.leaderId, leader);
      assert.strictEqual(g.rejects, i + 1);
    }
  }
  assert.strictEqual(g.phase, 'over');
  assert.strictEqual(g.winner, 'evil');
});

test('tied vote is a rejection', () => {
  const ctx = setup(6);
  const { g, tok } = ctx;
  g.propose(tok(g.leaderId), g.order.slice(0, 2));
  g.order.forEach((id, i) => g.vote(tok(id), i < 3));
  assert.strictEqual(g.lastVote.approved, false);
  assert.strictEqual(g.rejects, 1);
});

test('good players cannot play Fail', () => {
  const ctx = setup(5);
  const good = ctx.teamOf('good').slice(0, 2);
  approveTeam(ctx, good);
  assert.throws(() => ctx.g.playCard(ctx.tok(good[0]), false), /must play Success/);
});

test('three failed quests: evil wins', () => {
  const ctx = setup(5);
  for (let i = 0; i < 3; i++) runQuest(ctx, false);
  assert.strictEqual(ctx.g.winner, 'evil');
  assert.ok(ctx.g.publicState().reveal);
});

test('quest 4 with 7+ players needs two fails', () => {
  const ctx = setup(7);
  const { g, tok } = ctx;
  runQuest(ctx, true);
  runQuest(ctx, false);
  runQuest(ctx, false);
  assert.strictEqual(g.questIdx, 3);
  assert.strictEqual(g.quest.failsNeeded, 2);
  // One evil player on the team plays Fail: still a success.
  const team = [ctx.teamOf('evil')[0], ...ctx.teamOf('good')].slice(0, g.quest.size);
  approveTeam(ctx, team);
  for (const id of team) g.playCard(tok(id), ROLES[g.roles[id]].team === 'good');
  assert.strictEqual(g.quests[3].result, 'success');
});

test('three successes go to assassination; picking Merlin wins for evil', () => {
  for (const hitMerlin of [true, false]) {
    const ctx = setup(5);
    const { g, tok } = ctx;
    for (let i = 0; i < 3; i++) runQuest(ctx, true);
    assert.strictEqual(g.phase, 'assassin');
    const assassin = g.order.find((id) => g.roles[id] === 'assassin');
    const merlin = g.order.find((id) => g.roles[id] === 'merlin');
    const servant = g.order.find((id) => g.roles[id] === 'servant');
    const notAssassin = g.order.find((id) => id !== assassin);
    assert.throws(() => g.assassinate(tok(notAssassin), merlin), /Only the Assassin/);
    g.assassinate(tok(assassin), hitMerlin ? merlin : servant);
    assert.strictEqual(g.winner, hitMerlin ? 'evil' : 'good');
  }
});

test('ending a game returns everyone to the lobby', () => {
  const ctx = setup(5);
  ctx.g.endGame();
  assert.strictEqual(ctx.g.phase, 'lobby');
  assert.strictEqual(ctx.g.players.length, 5);
  ctx.g.start();
  assert.strictEqual(ctx.g.phase, 'team');
});
