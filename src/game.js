'use strict';

const crypto = require('crypto');

const MIN_PLAYERS = 5;
const MAX_PLAYERS = 10;

// Official board setups: number of evil players and team size for each quest.
// With 7+ players, the 4th quest needs two Fail cards to fail.
const SETUPS = {
  5: { evil: 2, quests: [2, 3, 2, 3, 3] },
  6: { evil: 2, quests: [2, 3, 4, 3, 4] },
  7: { evil: 3, quests: [2, 3, 3, 4, 4] },
  8: { evil: 3, quests: [3, 4, 4, 5, 5] },
  9: { evil: 3, quests: [3, 4, 4, 5, 5] },
  10: { evil: 4, quests: [3, 4, 4, 5, 5] },
};

const ROLES = {
  merlin: {
    name: 'Merlin', team: 'good',
    desc: 'You know who the agents of evil are (except Mordred). Guide good subtly. If the Assassin identifies you at the end, evil wins.',
  },
  percival: {
    name: 'Percival', team: 'good',
    desc: 'You see Merlin and Morgana, but not which is which. Protect Merlin.',
  },
  servant: {
    name: 'Loyal Servant of Arthur', team: 'good',
    desc: 'You know only your own loyalty. Find the evil players and keep them off quests.',
  },
  assassin: {
    name: 'Assassin', team: 'evil',
    desc: 'You know your fellow minions. If good completes three quests, you get one chance to name Merlin and steal the win.',
  },
  morgana: {
    name: 'Morgana', team: 'evil',
    desc: 'You appear as Merlin to Percival. Sow confusion.',
  },
  mordred: {
    name: 'Mordred', team: 'evil',
    desc: 'Merlin does not know you are evil.',
  },
  oberon: {
    name: 'Oberon', team: 'evil',
    desc: 'You do not know the other minions and they do not know you, but Merlin sees you.',
  },
  minion: {
    name: 'Minion of Mordred', team: 'evil',
    desc: 'You know your fellow minions (except Oberon). Sabotage quests without getting caught.',
  },
};

const OPTIONAL_ROLES = ['percival', 'morgana', 'mordred', 'oberon'];

class GameError extends Error {}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newId() {
  return crypto.randomBytes(4).toString('hex');
}

// Builds the role list for a player count, or throws if the options don't fit.
function buildRoles(count, options) {
  const setup = SETUPS[count];
  if (!setup) throw new GameError(`Need ${MIN_PLAYERS}-${MAX_PLAYERS} players (have ${count})`);
  const good = ['merlin'];
  const evil = ['assassin'];
  if (options.percival) good.push('percival');
  for (const r of ['morgana', 'mordred', 'oberon']) if (options[r]) evil.push(r);
  const goodCount = count - setup.evil;
  if (evil.length > setup.evil) {
    throw new GameError(`Too many evil roles selected: ${count} players only have ${setup.evil} evil`);
  }
  while (good.length < goodCount) good.push('servant');
  while (evil.length < setup.evil) evil.push('minion');
  return good.concat(evil);
}

class Game {
  constructor() {
    this.players = []; // { id, token, name, connections }
    this.options = { percival: true, morgana: true, mordred: false, oberon: false };
    this.listeners = new Set();
    this.resetToLobby();
  }

  // ---- change notification ----

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  changed() {
    for (const fn of this.listeners) fn();
  }

  // ---- lookups ----

  byToken(token) {
    return this.players.find((p) => p.token === token) || null;
  }

  byId(id) {
    return this.players.find((p) => p.id === id) || null;
  }

  name(id) {
    const p = this.byId(id);
    return p ? p.name : '?';
  }

  get leaderId() {
    return this.order[this.leaderIdx];
  }

  get quest() {
    return this.quests[this.questIdx];
  }

  inGame() {
    return this.phase !== 'lobby';
  }

  addLog(msg) {
    this.log.push({ t: Date.now(), msg });
    if (this.log.length > 200) this.log.shift();
  }

  // ---- lobby ----

  resetToLobby() {
    this.phase = 'lobby'; // lobby | team | vote | quest | assassin | over
    this.order = [];
    this.roles = {};
    this.quests = [];
    this.questIdx = 0;
    this.leaderIdx = 0;
    this.rejects = 0;
    this.team = [];
    this.votes = {};
    this.cards = {};
    this.lastVote = null;
    this.lastQuest = null;
    this.log = [];
    this.winner = null;
    this.reason = '';
    this.assassinTarget = null;
  }

  join(rawName, bot = false) {
    const name = String(rawName || '').trim().replace(/\s+/g, ' ');
    if (!name) throw new GameError('Please enter a name');
    if (name.length > 20) throw new GameError('Name must be 20 characters or fewer');
    if (this.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      throw new GameError('That name is already taken');
    }
    if (this.inGame()) throw new GameError('A game is in progress. Wait for the next one');
    if (this.players.length >= MAX_PLAYERS) throw new GameError(`The game is full (${MAX_PLAYERS} players)`);
    const player = { id: newId(), token: crypto.randomBytes(16).toString('hex'), name, connections: 0, bot };
    this.players.push(player);
    this.changed();
    return player;
  }

  leave(token) {
    const p = this.byToken(token);
    if (!p) return;
    if (this.inGame()) throw new GameError('You cannot leave during a game');
    this.players = this.players.filter((x) => x !== p);
    this.changed();
  }

  kick(id) {
    if (this.inGame()) throw new GameError('Cannot remove players during a game. End the game first');
    this.players = this.players.filter((p) => p.id !== id);
    this.changed();
  }

  setOptions(opts) {
    if (this.inGame()) throw new GameError('Cannot change roles during a game');
    for (const r of OPTIONAL_ROLES) if (r in opts) this.options[r] = !!opts[r];
    this.changed();
  }

  start() {
    if (this.inGame()) throw new GameError('Game already started');
    const roles = shuffle(buildRoles(this.players.length, this.options));
    this.resetToLobby();
    this.order = shuffle(this.players.map((p) => p.id));
    this.order.forEach((id, i) => { this.roles[id] = roles[i]; });
    const setup = SETUPS[this.order.length];
    this.quests = setup.quests.map((size, i) => ({
      size,
      failsNeeded: i === 3 && this.order.length >= 7 ? 2 : 1,
      result: null,
      fails: null,
      team: null,
    }));
    this.leaderIdx = crypto.randomInt(this.order.length);
    this.phase = 'team';
    this.addLog(`Game started with ${this.order.length} players. ${this.name(this.leaderId)} leads first.`);
    this.changed();
  }

  endGame() {
    this.resetToLobby();
    this.changed();
  }

  // ---- gameplay ----

  requirePlayer(token) {
    const p = this.byToken(token);
    if (!p) throw new GameError('Unknown player. Please rejoin');
    if (!this.order.includes(p.id)) throw new GameError('You are not in this game');
    return p;
  }

  propose(token, team) {
    const p = this.requirePlayer(token);
    if (this.phase !== 'team') throw new GameError('Not time to propose a team');
    if (p.id !== this.leaderId) throw new GameError('Only the leader can propose a team');
    if (!Array.isArray(team)) throw new GameError('Invalid team');
    const unique = [...new Set(team)];
    if (unique.length !== this.quest.size) throw new GameError(`Pick exactly ${this.quest.size} players`);
    if (!unique.every((id) => this.order.includes(id))) throw new GameError('Invalid player in team');
    this.team = this.order.filter((id) => unique.includes(id)); // keep seating order
    this.votes = {};
    this.phase = 'vote';
    this.addLog(`${p.name} proposed: ${this.team.map((id) => this.name(id)).join(', ')}`);
    this.changed();
  }

  vote(token, approve) {
    const p = this.requirePlayer(token);
    if (this.phase !== 'vote') throw new GameError('Not time to vote');
    if (p.id in this.votes) throw new GameError('You already voted');
    this.votes[p.id] = !!approve;
    if (Object.keys(this.votes).length === this.order.length) this.resolveVote();
    this.changed();
  }

  resolveVote() {
    const approvals = Object.values(this.votes).filter(Boolean).length;
    const approved = approvals > this.order.length / 2;
    this.lastVote = {
      quest: this.questIdx + 1,
      leader: this.leaderId,
      team: this.team.slice(),
      votes: { ...this.votes },
      approvals,
      rejections: this.order.length - approvals,
      approved,
    };
    this.addLog(`Team ${approved ? 'APPROVED' : 'REJECTED'} (${approvals}-${this.order.length - approvals})`);
    if (approved) {
      this.rejects = 0;
      this.cards = {};
      this.phase = 'quest';
      return;
    }
    this.rejects++;
    if (this.rejects >= 5) {
      this.finish('evil', 'Five team proposals in a row were rejected');
      return;
    }
    this.nextLeader();
  }

  playCard(token, success) {
    const p = this.requirePlayer(token);
    if (this.phase !== 'quest') throw new GameError('Not time for a quest');
    if (!this.team.includes(p.id)) throw new GameError('You are not on this quest');
    if (p.id in this.cards) throw new GameError('You already played a card');
    if (!success && ROLES[this.roles[p.id]].team === 'good') {
      throw new GameError('Loyal servants of Arthur must play Success');
    }
    this.cards[p.id] = !!success;
    if (Object.keys(this.cards).length === this.team.length) this.resolveQuest();
    this.changed();
  }

  resolveQuest() {
    const q = this.quest;
    q.fails = Object.values(this.cards).filter((c) => !c).length;
    q.result = q.fails >= q.failsNeeded ? 'fail' : 'success';
    q.team = this.team.slice();
    this.lastQuest = { quest: this.questIdx + 1, team: q.team, fails: q.fails, result: q.result };
    this.addLog(`Quest ${this.questIdx + 1} ${q.result === 'success' ? 'SUCCEEDED' : 'FAILED'} (${q.fails} fail card${q.fails === 1 ? '' : 's'})`);

    const successes = this.quests.filter((x) => x.result === 'success').length;
    const failures = this.quests.filter((x) => x.result === 'fail').length;
    if (failures >= 3) {
      this.finish('evil', 'Three quests failed');
    } else if (successes >= 3) {
      this.phase = 'assassin';
      this.team = [];
      this.addLog('Good completed three quests. The Assassin must now name Merlin.');
    } else {
      this.questIdx++;
      this.nextLeader();
    }
  }

  assassinate(token, targetId) {
    const p = this.requirePlayer(token);
    if (this.phase !== 'assassin') throw new GameError('Not time for the assassination');
    if (this.roles[p.id] !== 'assassin') throw new GameError('Only the Assassin can do this');
    if (!this.order.includes(targetId) || targetId === p.id) throw new GameError('Invalid target');
    this.assassinTarget = targetId;
    this.addLog(`The Assassin targeted ${this.name(targetId)}.`);
    if (this.roles[targetId] === 'merlin') {
      this.finish('evil', `The Assassin found Merlin (${this.name(targetId)})`);
    } else {
      this.finish('good', `The Assassin picked ${this.name(targetId)}, who was not Merlin`);
    }
    this.changed();
  }

  nextLeader() {
    this.leaderIdx = (this.leaderIdx + 1) % this.order.length;
    this.team = [];
    this.votes = {};
    this.phase = 'team';
  }

  finish(winner, reason) {
    this.phase = 'over';
    this.winner = winner;
    this.reason = reason;
    this.team = [];
    this.addLog(`${winner === 'good' ? 'GOOD' : 'EVIL'} WINS: ${reason}`);
  }

  // ---- views ----

  // What a given player secretly knows about others.
  knowledgeFor(id) {
    const role = this.roles[id];
    const others = this.order.filter((x) => x !== id);
    const evil = (x) => ROLES[this.roles[x]].team === 'evil';
    let seen = [];
    let label = '';
    if (role === 'merlin') {
      seen = others.filter((x) => evil(x) && this.roles[x] !== 'mordred');
      label = 'Evil';
    } else if (role === 'percival') {
      seen = others.filter((x) => ['merlin', 'morgana'].includes(this.roles[x]));
      label = 'Merlin or Morgana';
    } else if (ROLES[role].team === 'evil' && role !== 'oberon') {
      seen = others.filter((x) => evil(x) && this.roles[x] !== 'oberon');
      label = 'Fellow evil';
    }
    return seen.map((x) => ({ id: x, name: this.name(x), label }));
  }

  publicState() {
    const lobby = this.phase === 'lobby';
    const ids = lobby ? this.players.map((p) => p.id) : this.order;
    const players = ids.map((id) => {
      const p = this.byId(id);
      return {
        id,
        name: p ? p.name : '?',
        connected: !!(p && (p.bot || p.connections > 0)),
        bot: !!(p && p.bot),
        leader: !lobby && id === this.leaderId,
        onTeam: this.team.includes(id),
        voted: this.phase === 'vote' && id in this.votes,
        played: this.phase === 'quest' && id in this.cards,
      };
    });
    const count = lobby ? this.players.length : this.order.length;
    let preview = null;
    if (SETUPS[count]) {
      try {
        preview = { roles: buildRoles(count, this.options).map((r) => ROLES[r].name), error: null };
      } catch (e) {
        preview = { roles: [], error: e.message };
      }
    }
    return {
      phase: this.phase,
      options: { ...this.options },
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      preview,
      players,
      leaderId: lobby ? null : this.leaderId,
      quests: this.quests.map(({ size, failsNeeded, result, fails }) => ({ size, failsNeeded, result, fails })),
      questIdx: this.questIdx,
      teamSize: this.quest ? this.quest.size : null,
      rejects: this.rejects,
      team: this.team.slice(),
      lastVote: this.lastVote,
      lastQuest: this.lastQuest,
      log: this.log.slice(-30),
      winner: this.winner,
      reason: this.reason,
      assassinTarget: this.assassinTarget,
      // Roles are only revealed once the game is over.
      reveal: this.phase === 'over'
        ? this.order.map((id) => ({ id, name: this.name(id), role: ROLES[this.roles[id]].name, team: ROLES[this.roles[id]].team }))
        : null,
    };
  }

  playerView(token) {
    const p = this.byToken(token);
    if (!p) return null;
    const state = this.publicState();
    const inThisGame = this.order.includes(p.id);
    const me = { id: p.id, name: p.name, inGame: inThisGame };
    if (inThisGame && this.phase !== 'lobby') {
      const role = this.roles[p.id];
      Object.assign(me, {
        role,
        roleName: ROLES[role].name,
        team: ROLES[role].team,
        desc: ROLES[role].desc,
        knows: this.knowledgeFor(p.id),
        isLeader: p.id === this.leaderId,
        myVote: p.id in this.votes ? this.votes[p.id] : null,
        playedCard: p.id in this.cards,
        // Evil players see their own card choice, nobody else does.
        myCard: p.id in this.cards ? this.cards[p.id] : null,
      });
    }
    return { ...state, me };
  }
}

module.exports = { Game, GameError, ROLES, SETUPS, buildRoles, MIN_PLAYERS, MAX_PLAYERS };
