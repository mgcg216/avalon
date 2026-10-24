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
      : q.failsNeeded > 1 ? '2 fails' : `Quest ${i + 1}`;
    return `<div class="quest ${cls}" title="Quest ${i + 1}: ${q.size} knights">
      <div class="token">${label}</div><small>${sub}</small></div>`;
  }).join('')}</div>`;
}

function rejectTrack(s) {
  const dots = [1, 2, 3, 4, 5].map((n) => `<span class="rej ${n <= s.rejects ? 'on' : ''}">${n}</span>`).join('');
  return `<div class="rejects"><span>Rejected</span>${dots}</div>`;
}

// Players seated around the round table, with the quest track on the tabletop.
function roundTable(s, meId) {
  const n = s.players.length;
  const seats = s.players.map((p, i) => {
    const a = (2 * Math.PI * i) / n;
    const x = 50 + 40 * Math.sin(a);
    const y = 50 - 40 * Math.cos(a);
    const r = s.reveal && s.reveal.find((v) => v.id === p.id);
    const cls = [p.leader && 'leader', p.onTeam && 'team', (p.voted || p.played) && 'done',
      !p.connected && 'offline', p.id === meId && 'me', r && r.team].filter(Boolean).join(' ');
    const avatar = r ? roleArt(r.key, r.team, '100%') : `<span class="initial">${esc(p.name[0].toUpperCase())}</span>`;
    return `<div class="seat ${cls}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%">
      <div class="avatar">${avatar}
        ${p.leader ? '<span class="badge crown" title="Leader">♛</span>' : ''}
        ${p.onTeam ? '<span class="badge shield" title="On the quest">⚔</span>' : ''}
        ${p.voted || p.played ? '<span class="badge check" title="Done">✓</span>' : ''}
      </div>
      <div class="sname">${esc(p.name.replace(/ \(bot\)$/, ''))}${p.bot ? ' <small>bot</small>' : ''}</div>
      ${r ? `<div class="srole ${r.team}">${esc(r.role)}</div>` : ''}
    </div>`;
  }).join('');
  return `<div class="round-table">
    <div class="tabletop"><div class="tabletop-inner">${questTrack(s)}${rejectTrack(s)}</div></div>
    ${seats}</div>`;
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
    <ul class="votes reveal">${s.reveal.map((r) => `<li>${roleArt(r.key, r.team, 36)}
      <span class="pname">${esc(r.name)}${r.id === s.assassinTarget ? ' <em class="tag">assassinated</em>' : ''}</span>
      <b class="${r.team}">${esc(r.role)}</b></li>`).join('')}</ul></section>`;
}

function logHtml(s) {
  if (!s.log.length) return '';
  return `<section class="card"><h3>Game log</h3><ol class="log">${s.log.slice().reverse()
    .map((l) => `<li>${esc(l.msg)}</li>`).join('')}</ol></section>`;
}

// ---------- quest card reveal ----------

const CARD_ART = {
  success: `<svg viewBox="0 0 100 100" class="card-art" aria-hidden="true">
    <path d="M28 18 H72 C72 44 62 58 50 60 C38 58 28 44 28 18Z" fill="#f4d77a" stroke="#8a6a22" stroke-width="2"/>
    <path d="M34 24 H66 C65 40 58 50 50 52Z" fill="#fff3c4" opacity=".5"/>
    <rect x="46" y="60" width="8" height="16" fill="#d9b45a"/>
    <path d="M32 84 C32 76 68 76 68 84Z" fill="#f4d77a" stroke="#8a6a22" stroke-width="2"/></svg>`,
  fail: `<svg viewBox="0 0 100 100" class="card-art" aria-hidden="true">
    <path d="M50 14 C30 14 20 28 20 44 C20 56 28 62 32 66 V80 H68 V66 C72 62 80 56 80 44 C80 28 70 14 50 14Z" fill="#ece3d0" stroke="#5a1010" stroke-width="2"/>
    <ellipse cx="38" cy="46" rx="8" ry="9" fill="#2a0808"/><ellipse cx="62" cy="46" rx="8" ry="9" fill="#2a0808"/>
    <path d="M50 54 L45 64 H55Z" fill="#2a0808"/>
    <path d="M40 72 V80 M47 72 V80 M53 72 V80 M60 72 V80" stroke="#2a0808" stroke-width="2"/>
    <path d="M58 16 L52 32 L58 38" stroke="#5a1010" stroke-width="2" fill="none"/></svg>`,
};

const playedReveals = new Set();

// Plays the card reveal once per quest, only when the result just happened (not on page reload).
function maybeReveal(s) {
  const q = s.lastQuest;
  if (!q || !q.cards) return;
  const key = `${s.gameId}:${q.quest}`;
  if (playedReveals.has(key)) return;
  playedReveals.add(key);
  if (q.ageMs < 3000) playReveal(q);
}

function playReveal(q) {
  const t = q.timing;
  const old = $('.reveal-overlay');
  if (old) old.remove();

  const el = document.createElement('div');
  el.className = 'reveal-overlay';
  el.style.setProperty('--flip', `${t.flip}ms`);
  el.style.setProperty('--lift', `${t.lift}ms`);
  el.innerHTML = `<div class="flash"></div>
    <div class="reveal-box">
      <div class="reveal-title">Quest ${q.quest}</div>
      <div class="reveal-sub">The cards are revealed…${q.failsNeeded > 1 ? ' (two Fails needed)' : ''}</div>
      <div class="qcards">${q.cards.map((ok) => `
        <div class="qcard ${ok ? 'is-success' : 'is-fail'}"><div class="qinner">
          <div class="qface qback">${roleArt('hidden', 'neutral', '70%')}</div>
          <div class="qface qfront">${ok ? CARD_ART.success : CARD_ART.fail}<span>${ok ? 'Success' : 'Fail'}</span></div>
        </div></div>`).join('')}</div>
      <div class="tally">Success <b class="t-ok">0</b> · Fail <b class="t-fail">0</b></div>
      <div class="reveal-result"></div>
      <button class="secondary small reveal-skip">Skip</button>
    </div>`;
  document.body.appendChild(el);

  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const close = () => {
    timers.forEach(clearTimeout);
    el.classList.add('closing');
    setTimeout(() => el.remove(), 400);
  };
  el.querySelector('.reveal-skip').onclick = close;

  const flash = (kind) => {
    const f = el.querySelector('.flash');
    f.className = 'flash';
    void f.offsetWidth; // restart the animation
    f.classList.add(kind);
  };

  const cards = [...el.querySelectorAll('.qcard')];
  let time = t.intro;
  let oks = 0;
  let fails = 0;
  cards.forEach((card, i) => {
    const last = i === cards.length - 1;
    if (last && cards.length > 1) time += t.lastHold; // longer hold before the final card
    at(time - t.lift, () => card.classList.add('lift', ...(last ? ['last'] : [])));
    at(time, () => {
      card.classList.remove('lift', 'last');
      card.classList.add('flipped');
    });
    // React when the card face becomes visible (halfway through the flip).
    at(time + t.flip / 2, () => {
      const ok = q.cards[i];
      if (ok) oks++; else fails++;
      el.querySelector('.t-ok').textContent = oks;
      el.querySelector('.t-fail').textContent = fails;
      if (ok) flash('gold');
      else {
        flash('red');
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
      }
    });
    if (!last) time += t.step;
  });

  const verdictAt = time + t.flip + 300;
  at(verdictAt, () => {
    const res = el.querySelector('.reveal-result');
    const won = q.result === 'success';
    const note = won && q.fails > 0 ? `<small>${q.fails} Fail played, but ${q.failsNeeded} were needed</small>` : '';
    res.className = `reveal-result show ${won ? 'good' : 'evil'}`;
    res.innerHTML = `Quest ${won ? 'succeeds!' : 'fails!'}${note}`;
    el.querySelector('.reveal-skip').textContent = 'Continue';
    if (!won) flash('red');
  });
  at(verdictAt + t.result, close);
}
