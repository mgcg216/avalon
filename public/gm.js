'use strict';

const ROLE_OPTIONS = [
  { key: 'percival', name: 'Percival', team: 'good', desc: 'Sees Merlin and Morgana, but not which is which.' },
  { key: 'morgana', name: 'Morgana', team: 'evil', desc: 'Appears as Merlin to Percival.' },
  { key: 'mordred', name: 'Mordred', team: 'evil', desc: 'Hidden from Merlin.' },
  { key: 'oberon', name: 'Oberon', team: 'evil', desc: 'Unknown to the other evil players, and does not know them.' },
];

let state = null;
let joinUrls = [];

fetch('/api/info').then((r) => r.json()).then((info) => {
  joinUrls = info.joinUrls;
  if (state) render();
});

subscribe('/api/events', { onState: (s) => { state = s; render(); maybeReveal(s); } });

function render() {
  const s = state;
  $('#phase').textContent = PHASE_TEXT[s.phase];
  $('#app').innerHTML = s.phase === 'lobby' ? lobbyHtml(s) : boardHtml(s);
  bind();
}

function lobbyHtml(s) {
  const n = s.players.length;
  const canStart = n >= s.minPlayers && n <= s.maxPlayers && s.preview && !s.preview.error;
  let status;
  if (n < s.minPlayers) status = `<p class="muted">Need at least ${s.minPlayers} players (${s.minPlayers - n} more).</p>`;
  else if (s.preview && s.preview.error) status = `<p class="evil">${esc(s.preview.error)}</p>`;
  else status = `<p>Roles in play: ${s.preview.roles.map((r) => esc(r)).join(', ')}</p>`;

  return `<div class="grid">
    <div>
      <section class="card center">
        <h3>Scan to join</h3>
        ${joinUrls.length ? qrSvg(joinUrls[0]) : ''}
        ${joinUrls.map((u) => `<div class="join-url">${esc(u)}</div>`).join('')}
      </section>
      <section class="card">
        <h3>Players (${n}/${s.maxPlayers})</h3>
        ${n ? `<ul class="players">${s.players.map((p) => `<li class="${p.connected ? '' : 'offline'}">
          <span class="pname">${esc(p.name)}</span>
          ${p.bot ? '<em class="tag">bot</em>' : ''}
          <button class="secondary small" data-kick="${p.id}">Remove</button></li>`).join('')}</ul>`
          : '<p class="muted">No one has joined yet.</p>'}
        <button class="secondary small" data-act="add-bot" style="margin-top:10px" ${n >= s.maxPlayers ? 'disabled' : ''}>+ Add bot</button>
      </section>
    </div>
    <div>
      <section class="card">
        <h3>Optional roles</h3>
        <p class="muted">Merlin and the Assassin are always in play. Remaining seats are Loyal Servants and Minions.</p>
        ${ROLE_OPTIONS.map((r) => `<label class="opt">
          <input type="checkbox" data-opt="${r.key}" ${s.options[r.key] ? 'checked' : ''}>
          ${roleArt(r.key, r.team, 44)}
          <span><b class="${r.team}">${r.name}</b><br><span class="muted">${r.desc}</span></span></label>`).join('')}
      </section>
      <section class="card">
        ${status}
        <button data-act="start" style="width:100%" ${canStart ? '' : 'disabled'}>Start game</button>
      </section>
    </div>
  </div>`;
}

function boardHtml(s) {
  const leader = esc(playerName(s, s.leaderId));
  let status = '';
  if (s.phase === 'team') status = `${leader} is choosing ${s.teamSize} players for quest ${s.questIdx + 1}.`;
  if (s.phase === 'vote') status = `${leader} proposes: <b>${s.team.map((id) => esc(playerName(s, id))).join(', ')}</b>. Everyone vote!`;
  if (s.phase === 'quest') status = `Quest ${s.questIdx + 1} is underway: ${s.team.map((id) => esc(playerName(s, id))).join(', ')}`;
  if (s.phase === 'assassin') status = 'Good completed three quests. The Assassin is choosing a target...';

  return `<div class="grid">
    <div>
      ${s.phase === 'over' ? revealHtml(s) : ''}
      <section class="card">
        <div class="phase">${PHASE_TEXT[s.phase]}</div>
        ${status ? `<h2>${status}</h2>` : ''}
        ${roundTable(s)}
      </section>
      <section class="card">
        <button class="${s.phase === 'over' ? '' : 'secondary'}" data-act="end" style="width:100%">
          ${s.phase === 'over' ? 'Back to lobby (same players)' : 'Abort game'}</button>
      </section>
    </div>
    <div>
      ${lastVoteHtml(s)}
      ${lastQuestHtml(s)}
      ${logHtml(s)}
    </div>
  </div>`;
}

// Black-on-white QR code as inline SVG (phones scan dark-on-light most reliably).
function qrSvg(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 4;
  let path = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c + quiet} ${r + quiet}h1v1h-1z`;
  }
  const size = n + quiet * 2;
  return `<svg class="qr" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR code for ${esc(text)}">
    <rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}

function bind() {
  document.querySelectorAll('[data-opt]').forEach((el) => {
    el.onchange = () => act('/api/options', { [el.dataset.opt]: el.checked });
  });
  document.querySelectorAll('[data-kick]').forEach((el) => {
    el.onclick = () => act('/api/kick', { id: el.dataset.kick });
  });
  document.querySelectorAll('[data-act]').forEach((el) => {
    el.onclick = () => {
      if (el.dataset.act === 'start') act('/api/start');
      if (el.dataset.act === 'add-bot') act('/api/add-bot');
      if (el.dataset.act === 'end') {
        if (state.phase === 'over' || confirm('Abort the current game? Everyone returns to the lobby.')) act('/api/end');
      }
    };
  });
}
