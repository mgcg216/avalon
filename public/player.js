'use strict';

// "?seat=2" lets you open several players in one browser for testing.
const SEAT = new URLSearchParams(location.search).get('seat') || '';
const TOKEN_KEY = `avalon.token${SEAT ? '.' + SEAT : ''}`;

let token = localStorage.getItem(TOKEN_KEY);
let state = null;
let es = null;
let roleShown = false;
let selected = new Set();
let selectionKey = '';

function forget(msg) {
  if (es) es.close();
  es = null;
  token = null;
  state = null;
  localStorage.removeItem(TOKEN_KEY);
  showJoin(msg);
}

function showJoin(msg) {
  $('#who').textContent = '';
  $('#app').innerHTML = `
    <section class="card">
      <h2>Join the game</h2>
      ${msg ? `<p class="evil">${esc(msg)}</p>` : ''}
      <form id="join">
        <input type="text" id="name" placeholder="Your name" maxlength="20" autocomplete="off" autofocus>
        <button type="submit" style="width:100%">Join</button>
      </form>
    </section>`;
  $('#join').onsubmit = async (e) => {
    e.preventDefault();
    const res = await act('/api/join', { name: $('#name').value });
    if (!res) return;
    token = res.token;
    localStorage.setItem(TOKEN_KEY, token);
    connect();
  };
}

function connect() {
  es = subscribe(`/api/events?token=${encodeURIComponent(token)}`, {
    onState: (s) => { state = s; render(); maybeReveal(s); },
    onGone: () => forget('You are no longer in the game. Join again.'),
  });
}

// ---------- rendering ----------

function render() {
  const s = state;
  const me = s.me;
  $('#who').textContent = me.name;

  // Clear the leader's team selection whenever a new proposal round starts.
  const key = `${s.phase}-${s.questIdx}-${s.leaderId}`;
  if (key !== selectionKey) {
    selectionKey = key;
    selected = new Set();
  }

  let html = '';
  if (s.phase === 'lobby') {
    roleShown = false; // start each new game with the role hidden
    html = lobbyHtml(s);
  } else if (!me.inGame) {
    html = `<section class="card center"><h3>A game is in progress</h3>
      <p class="muted">You will be able to play when the game master starts the next game.</p></section>`
      + `<section class="card">${roundTable(s)}</section>`;
  } else {
    if (s.phase === 'over') html += revealHtml(s);
    html += roleHtml(me);
    if (s.phase !== 'over') html += actionHtml(s, me);
    html += `<section class="card">${roundTable(s, me.id)}</section>`;
    html += lastVoteHtml(s) + lastQuestHtml(s);
  }
  $('#app').innerHTML = html;
  bind();
}

function lobbyHtml(s) {
  return `<section class="card center">
      <h2>Welcome, ${esc(s.me.name)}</h2>
      <p class="muted">Waiting for the game master to start the game.</p>
      <button class="secondary small" data-act="leave">Leave</button>
    </section>
    <section class="card"><h3>Players (${s.players.length})</h3>
      <ul class="players">${s.players.map((p) => `<li class="${p.connected ? '' : 'offline'}">
        <span class="pname">${esc(p.name)}</span>${p.id === s.me.id ? '<em class="tag">you</em>' : ''}</li>`).join('')}</ul>
    </section>`;
}

function roleHtml(me) {
  if (!roleShown) {
    return `<section class="card role" data-act="toggle-role">
      ${roleArt('hidden', 'neutral', 140)}
      <div class="name">Your role is hidden</div>
      <div class="hint">Tap to reveal. Keep your screen private!</div></section>`;
  }
  const knows = me.knows.length
    ? `<ul>${me.knows.map((k) => `<li><b>${esc(k.name)}</b>: <span class="${k.label === 'Merlin or Morgana' ? 'gold' : 'evil'}">${esc(k.label)}</span></li>`).join('')}</ul>`
    : (me.role === 'merlin' || me.role === 'percival' || me.team === 'evil') && me.role !== 'oberon'
      ? '<p class="muted">You see no one.</p>' : '';
  return `<section class="card role ${me.team}" data-act="toggle-role">
    <div class="team ${me.team}">${me.team === 'good' ? 'Loyal to Arthur' : 'Minion of Mordred'}</div>
    ${roleArt(me.role, me.team, 140)}
    <div class="name">${esc(me.roleName)}</div>
    <p>${esc(me.desc)}</p>
    ${knows}
    <div class="hint">Tap to hide</div></section>`;
}

function actionHtml(s, me) {
  const leader = esc(playerName(s, s.leaderId));
  const questNo = s.questIdx + 1;
  const teamNames = s.team.map((id) => esc(playerName(s, id))).join(', ');
  const waitingOn = (ids) => ids.map((id) => esc(playerName(s, id))).join(', ');
  let body = '';

  if (s.phase === 'team') {
    if (me.isLeader) {
      body = `<h3>You are the leader. Choose ${s.teamSize} players for quest ${questNo}.</h3>
        <div class="pick">${s.players.map((p) => `<button data-pick="${p.id}" class="${selected.has(p.id) ? 'on' : ''}">
          ${esc(p.name)}${p.id === me.id ? ' (you)' : ''}</button>`).join('')}</div>
        <button data-act="propose" style="width:100%" ${selected.size === s.teamSize ? '' : 'disabled'}>
          Propose team (${selected.size}/${s.teamSize})</button>`;
    } else {
      body = `<h3>Waiting for ${leader} to choose ${s.teamSize} players for quest ${questNo}.</h3>
        <p class="muted">Discuss who should go!</p>`;
    }
  } else if (s.phase === 'vote') {
    const pending = s.players.filter((p) => !p.voted).map((p) => p.id);
    body = `<h3>${leader} proposes: ${teamNames}</h3>`;
    if (me.myVote === null) {
      body += `<p>Do you approve this team for quest ${questNo}?</p>
        <div class="row"><button class="approve" data-act="vote" data-v="1">Approve</button>
        <button class="reject" data-act="vote" data-v="0">Reject</button></div>`;
    } else {
      body += `<p>You voted <b class="${me.myVote ? 'good' : 'evil'}">${me.myVote ? 'Approve' : 'Reject'}</b>.
        Waiting on: ${waitingOn(pending)}</p>`;
    }
    if (s.rejects === 4) body += '<p class="evil"><b>Warning:</b> if this team is rejected, evil wins.</p>';
  } else if (s.phase === 'quest') {
    const pending = s.team.filter((id) => !s.players.find((p) => p.id === id).played);
    if (s.team.includes(me.id) && !me.playedCard) {
      body = `<h3>You are on quest ${questNo}. Play your card secretly.</h3>
        <div class="row"><button class="success" data-act="quest" data-v="1">Success</button>
        <button class="fail" data-act="quest" data-v="0" ${me.team === 'good' ? 'disabled' : ''}>Fail</button></div>
        ${me.team === 'good' ? '<p class="muted">Loyal servants of Arthur must play Success.</p>' : ''}`;
    } else {
      body = `<h3>Quest ${questNo} in progress: ${teamNames}</h3>
        ${me.playedCard ? `<p>You played <b class="${me.myCard ? 'good' : 'evil'}">${me.myCard ? 'Success' : 'Fail'}</b>.</p>` : ''}
        <p class="muted">Waiting on: ${waitingOn(pending)}</p>`;
    }
  } else if (s.phase === 'assassin') {
    if (me.role === 'assassin') {
      body = `<h3>Good completed three quests. Who is Merlin?</h3>
        <p class="muted">Talk it over with your fellow minions, then choose. This cannot be undone.</p>
        <div class="pick">${s.players.filter((p) => p.id !== me.id).map((p) =>
          `<button data-assassinate="${p.id}">${esc(p.name)}</button>`).join('')}</div>`;
    } else {
      body = `<h3>Good completed three quests!</h3>
        <p class="muted">The Assassin now gets one chance to name Merlin. Evil players may discuss openly.</p>`;
    }
  }
  return `<section class="card"><div class="phase">${PHASE_TEXT[s.phase]}</div>${body}</section>`;
}

// ---------- events ----------

function bind() {
  document.querySelectorAll('[data-act]').forEach((el) => {
    el.onclick = () => handle(el.dataset.act, el);
  });
  document.querySelectorAll('[data-pick]').forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.pick;
      if (selected.has(id)) selected.delete(id);
      else if (selected.size < state.teamSize) selected.add(id);
      render();
    };
  });
  document.querySelectorAll('[data-assassinate]').forEach((el) => {
    el.onclick = () => {
      const name = playerName(state, el.dataset.assassinate);
      if (confirm(`Assassinate ${name}? This is final.`)) act('/api/assassinate', { token, target: el.dataset.assassinate });
    };
  });
}

function handle(action, el) {
  switch (action) {
    case 'toggle-role':
      roleShown = !roleShown;
      render();
      break;
    case 'leave':
      act('/api/leave', { token }).then((r) => r && forget());
      break;
    case 'propose':
      act('/api/propose', { token, team: [...selected] });
      break;
    case 'vote':
      act('/api/vote', { token, approve: el.dataset.v === '1' });
      break;
    case 'quest':
      act('/api/quest', { token, success: el.dataset.v === '1' });
      break;
  }
}

if (token) connect();
else showJoin();
