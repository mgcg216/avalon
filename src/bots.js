'use strict';

const crypto = require('crypto');
const { ROLES, SETUPS, GameError } = require('./game');

const BOT_NAMES = ['Lancelot', 'Gawain', 'Galahad', 'Tristan', 'Bedivere', 'Kay', 'Gareth', 'Bors', 'Lamorak', 'Percy'];
const DELAY_MS = Number(process.env.BOT_DELAY_MS) || 1500;

const chance = (p) => Math.random() < p;
const pick = (arr) => arr[crypto.randomInt(arr.length)];

function addBot(game) {
  const taken = new Set(game.players.map((p) => p.name.toLowerCase()));
  const name = BOT_NAMES.map((n) => `${n} (bot)`).find((n) => !taken.has(n.toLowerCase()));
  if (!name) throw new GameError('No bot names left');
  return game.join(name, true);
}

// ---------- strategy ----------

const isEvil = (game, id) => ROLES[game.roles[id]].team === 'evil';

// Players this bot knows to be evil (including itself if evil).
function knownEvil(game, id) {
  const known = new Set();
  const role = game.roles[id];
  if (isEvil(game, id)) known.add(id);
  if (role !== 'percival') for (const k of game.knowledgeFor(id)) known.add(k.id);
  return known;
}

// Higher = more suspicious, based on failed quests a player went on.
function suspicion(game, id) {
  const known = knownEvil(game, id);
  const score = {};
  for (const other of game.order) {
    score[other] = Math.random() * 0.1; // tie-breaker
    if (known.has(other) && !isEvil(game, id)) score[other] += 100;
  }
  for (const q of game.quests) {
    if (q.result !== 'fail') continue;
    for (const m of q.team) score[m] += q.fails / q.team.length;
  }
  score[id] = -100; // always trusts itself
  return score;
}

function proposeTeam(game, id) {
  const size = game.quest.size;
  const others = game.order.filter((x) => x !== id);
  if (isEvil(game, id)) {
    // Bring itself along, fill with players it doesn't know to be evil so only one Fail shows up.
    const known = knownEvil(game, id);
    const clean = others.filter((x) => !known.has(x)).sort(() => Math.random() - 0.5);
    return [id, ...clean, ...others].filter((x, i, a) => a.indexOf(x) === i).slice(0, size);
  }
  const score = suspicion(game, id);
  return [id, ...others.sort((a, b) => score[a] - score[b])].slice(0, size);
}

function decideVote(game, id) {
  const team = game.team;
  if (isEvil(game, id)) {
    const known = knownEvil(game, id);
    if (game.rejects === 4) return false; // a fifth rejection wins it for evil
    return team.some((x) => known.has(x)) || chance(0.15);
  }
  if (game.rejects === 4) return true;
  // Reject if the team contains any of the most suspicious players.
  const score = suspicion(game, id);
  const evilCount = SETUPS[game.order.length].evil;
  const suspects = game.order
    .filter((x) => score[x] >= 0.3)
    .sort((a, b) => score[b] - score[a])
    .slice(0, evilCount);
  if (team.some((x) => suspects.includes(x))) return false;
  return team.includes(id) || game.leaderId === id || chance(0.75);
}

function decideCard(game, id) {
  if (!isEvil(game, id)) return true;
  // If several known evil players are on the team, only one of them fails.
  const known = knownEvil(game, id);
  const evilOnTeam = game.team.filter((x) => known.has(x)).sort();
  if (evilOnTeam.length > 1 && evilOnTeam[0] !== id) return true;
  // Occasionally lie low on the first quest.
  return game.questIdx === 0 ? !chance(0.3) : true;
}

function chooseTarget(game, id) {
  const known = knownEvil(game, id);
  return pick(game.order.filter((x) => !known.has(x)));
}

// ---------- driver ----------

function needsToAct(game, p) {
  if (!game.order.includes(p.id)) return null;
  switch (game.phase) {
    case 'team': return game.leaderId === p.id ? 'propose' : null;
    case 'vote': return p.id in game.votes ? null : 'vote';
    case 'quest': return game.team.includes(p.id) && !(p.id in game.cards) ? 'quest' : null;
    case 'assassin': return game.roles[p.id] === 'assassin' ? 'assassinate' : null;
    default: return null;
  }
}

function act(game, p, action) {
  switch (action) {
    case 'propose': return game.propose(p.token, proposeTeam(game, p.id));
    case 'vote': return game.vote(p.token, decideVote(game, p.id));
    case 'quest': return game.playCard(p.token, decideCard(game, p.id));
    case 'assassinate': return game.assassinate(p.token, chooseTarget(game, p.id));
  }
}

// Watches the game and makes every bot act after a short, human-ish delay.
function runBots(game) {
  const scheduled = new Set();
  game.onChange(() => {
    for (const p of game.players) {
      if (!p.bot) continue;
      const action = needsToAct(game, p);
      const key = `${p.id}:${action}`;
      if (!action || scheduled.has(key)) continue;
      scheduled.add(key);
      setTimeout(() => {
        scheduled.delete(key);
        // Re-check: the game may have moved on (aborted, already acted).
        if (!game.players.includes(p) || needsToAct(game, p) !== action) return;
        try {
          act(game, p, action);
        } catch (e) {
          console.error(`bot ${p.name} failed to ${action}:`, e.message);
        }
      }, DELAY_MS * (0.6 + Math.random()));
    }
  });
}

module.exports = { addBot, runBots };
