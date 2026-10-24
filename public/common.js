'use strict';

// Shared helpers for the player and game master pages.

const $ = (sel) => document.querySelector(sel);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function api(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

let toastTimer;
function toast(msg) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

// Runs an API call and shows any error as a toast.
async function act(path, body) {
  try {
    return await api(path, body);
  } catch (e) {
    toast(e.message);
    return null;
  }
}

// Opens a server-sent event stream; EventSource reconnects on its own.
function subscribe(url, { onState, onGone }) {
  const es = new EventSource(url);
  const dot = $('#conn');
  es.addEventListener('state', (e) => onState(JSON.parse(e.data)));
  es.addEventListener('gone', () => {
    es.close();
    if (onGone) onGone();
  });
  es.onopen = () => dot && dot.classList.remove('off');
  es.onerror = () => dot && dot.classList.add('off');
  return es;
}

const PHASE_TEXT = {
  lobby: 'Waiting in the lobby',
  team: 'Leader is choosing a team',
  vote: 'Everyone votes on the team',
  quest: 'The team is on a quest',
  assassin: 'The Assassin is choosing a target',
  over: 'Game over',
};

function playerName(s, id) {
  const p = s.players.find((x) => x.id === id);
  return p ? p.name : '?';
}

function questTrack(s) {
  return `<div class="quests">${s.quests.map((q, i) => {
    const cls = q.result ? q.result : (i === s.questIdx && s.phase !== 'over' && s.phase !== 'assassin' ? 'current' : '');
    const label = q.result === 'success' ? '✓' : q.result === 'fail' ? '✗' : q.size;
    const sub = q.result === 'fail' ? `${q.fails} fail${q.fails === 1 ? '' : 's'}`
      : q.failsNeeded > 1 ? '2 fails needed' : `Quest ${i + 1}`;
    return `<div class="quest ${cls}"><div class="token">${label}</div><small>${sub}</small></div>`;
  }).join('')}</div>`;
}

function rejectTrack(s) {
  const dots = [1, 2, 3, 4, 5].map((n) => `<span class="rej ${n <= s.rejects ? 'on' : ''}">${n}</span>`).join('');
  return `<div class="rejects"><span>Rejected teams</span>${dots}</div>`;
}

function lastVoteHtml(s) {
  const v = s.lastVote;
  if (!v) return '';
  const rows = s.players.map((p) => {
    const yes = v.votes[p.id];
    return `<li><span>${esc(p.name)}${v.team.includes(p.id) ? ' <em class="tag">team</em>' : ''}</span>
      <b class="${yes ? 'good' : 'evil'}">${yes ? 'Approve' : 'Reject'}</b></li>`;
  }).join('');
  return `<section class="card">
    <h3>Last vote: quest ${v.quest}, led by ${esc(playerName(s, v.leader))},
      <span class="${v.approved ? 'good' : 'evil'}">${v.approved ? 'approved' : 'rejected'} ${v.approvals}-${v.rejections}</span></h3>
    <ul class="votes">${rows}</ul></section>`;
}

function lastQuestHtml(s) {
  const q = s.lastQuest;
  if (!q) return '';
  return `<section class="card">
    <h3>Quest ${q.quest} <span class="${q.result === 'success' ? 'good' : 'evil'}">${q.result === 'success' ? 'succeeded' : 'failed'}</span></h3>
    <p>Team: ${q.team.map((id) => esc(playerName(s, id))).join(', ')}<br>
    Fail cards played: <b>${q.fails}</b></p></section>`;
}

function revealHtml(s) {
  if (!s.reveal) return '';
  return `<section class="card">
    <h2 class="banner ${s.winner}">${s.winner === 'good' ? 'Good wins!' : 'Evil wins!'}</h2>
    <p class="center">${esc(s.reason)}</p>
    <ul class="votes">${s.reveal.map((r) => `<li><span>${esc(r.name)}${r.id === s.assassinTarget ? ' <em class="tag">assassinated</em>' : ''}</span>
      <b class="${r.team}">${esc(r.role)}</b></li>`).join('')}</ul></section>`;
}

function logHtml(s) {
  if (!s.log.length) return '';
  return `<section class="card"><h3>Game log</h3><ol class="log">${s.log.slice().reverse()
    .map((l) => `<li>${esc(l.msg)}</li>`).join('')}</ol></section>`;
}
