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

subscribe('/api/events', { onState: (s) => { state = s; render(); maybeReveal(s); syncIntro(s); } });

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
  else status = `<p>Roles in play: ${s.preview.roles.map((r) => esc(r.name)).join(', ')}</p>`;

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

// ---------- game start intro ----------

// One line per role, safe to show the whole table.
const ROLE_SUMMARY = {
  merlin: 'Knows who is evil, but must stay hidden.',
  servant: 'Knows only their own loyalty.',
  assassin: 'Gets one chance to name Merlin if good wins three quests.',
  minion: 'Knows the other evil players.',
  ...Object.fromEntries(ROLE_OPTIONS.map((r) => [r.key, r.desc])),
};

// How long each slide stays up. The game starts when the last one runs out.
const INTRO_SLIDE_MS = [25000, 30000];

let intro = null; // { gameId, el, slides, index, timer }

function introRoles(s, team) {
  const counts = new Map();
  for (const r of s.preview.roles) {
    if (r.team !== team) continue;
    const seen = counts.get(r.key);
    counts.set(r.key, { ...r, n: seen ? seen.n + 1 : 1 });
  }
  return [...counts.values()].map((r) => `<li>${roleArt(r.key, r.team, 44)}
    <span><b>${esc(r.name)}</b>${r.n > 1 ? ` <span class="muted">× ${r.n}</span>` : ''}<br>
    <span class="muted">${ROLE_SUMMARY[r.key]}</span></span></li>`).join('');
}

function introSlides(s) {
  const count = (team) => s.preview.roles.filter((r) => r.team === team).length;
  const twoFails = s.quests.some((q) => q.failsNeeded > 1);
  return [
    `<div class="reveal-title">The Roles</div>
      <div class="intro-sides">
        <div><h2 class="good">Good (${count('good')})</h2><ul class="intro-roles">${introRoles(s, 'good')}</ul></div>
        <div><h2 class="evil">Evil (${count('evil')})</h2><ul class="intro-roles">${introRoles(s, 'evil')}</ul></div>
      </div>
      <p class="intro-text">Check your phone for your secret role, and keep it to yourself.</p>`,

    `<div class="reveal-title">How to Play</div>
      <ol class="intro-steps">
        <li><b>The leader</b> picks a team for the quest.</li>
        <li><b>Everyone votes</b> on that team, in the open. Five rejected teams in a row and evil wins.</li>
        <li><b>The team</b> secretly plays Success or Fail. Only evil can play Fail, and one Fail sinks the quest${twoFails ? ' (quest 4 takes two)' : ''}.</li>
      </ol>
      <p class="intro-text">First side to three quests wins. But if good gets there, the Assassin has one chance to name Merlin and steal the victory.</p>`,
  ];
}

// Slides live in their own overlay because render() rebuilds #app on every state update.
function syncIntro(s) {
  if (s.phase !== 'intro') return closeIntro();
  if (intro && intro.gameId === s.gameId) return showSkipRequests(s);
  closeIntro();

  const el = document.createElement('div');
  el.className = 'reveal-overlay intro';
  el.innerHTML = `<div class="reveal-box"><div class="intro-stage"></div>
    <div class="intro-actions">
      <button class="intro-next"></button>
      <button class="secondary intro-skip">Skip intro</button>
    </div>
    <p class="intro-skips muted"></p></div>`;
  document.body.appendChild(el);
  intro = { gameId: s.gameId, el, slides: introSlides(s), index: 0, timer: null };

  const buttons = el.querySelectorAll('button');
  const begin = async () => {
    buttons.forEach((b) => { b.disabled = true; });
    await act('/api/begin');
    buttons.forEach((b) => { b.disabled = false; });
  };
  el.querySelector('.intro-next').onclick = () => {
    if (intro.index < intro.slides.length - 1) showIntroSlide(intro.index + 1);
    else begin();
  };
  el.querySelector('.intro-skip').onclick = begin;
  showIntroSlide(0);
  showSkipRequests(s);
}

function showSkipRequests(s) {
  const { asked, needed } = s.skip;
  intro.el.querySelector('.intro-skips').textContent = asked ? `${asked} of ${needed} players asked to skip` : '';
}

function showIntroSlide(index) {
  clearTimeout(intro.timer);
  intro.index = index;
  const last = index === intro.slides.length - 1;
  const ms = INTRO_SLIDE_MS[index];
  intro.el.querySelector('.intro-stage').innerHTML = `<div class="intro-slide">${intro.slides[index]}</div>
    <div class="intro-timer" style="--ms:${ms}ms"></div>`;
  // Quiet on purpose: a second GM window may have started the game first.
  intro.timer = setTimeout(() => (last ? api('/api/begin').catch(() => {}) : showIntroSlide(index + 1)), ms);
  intro.el.querySelector('.intro-next').textContent = last ? 'Start the game' : 'Next';
  intro.el.querySelector('.intro-skip').hidden = last;
}

function closeIntro() {
  if (!intro) return;
  const { el, timer } = intro;
  intro = null;
  clearTimeout(timer);
  el.classList.add('closing');
  setTimeout(() => el.remove(), 400);
}
