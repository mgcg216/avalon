'use strict';

// Role portraits, plus hand-drawn SVG team seals and chalices. Nothing here needs network access.

const radial = (id, stops, cx = '50%', cy = '40%', r = '70%') => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${
  stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
const linear = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${
  stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;

// Each portrait is a 5:7 crop of a public-domain painting (see art/CREDITS.md).
// `face` is the [x, y, width] of the medallion crop, in a 200 x 280 frame.
const PORTRAITS = {
  merlin: [45, 10, 110],
  percival: [45, 22, 110],
  servant: [20, 10, 120],
  assassin: [38, 160, 120],
  morgana: [80, 40, 110],
  mordred: [30, 30, 140],
  oberon: [38, 38, 104],
  minion: [25, 25, 110],
  hidden: [10, 100, 180],
};

const RING = {
  good: ['#fbe9a6', '#8a6424'],
  evil: ['#e6e8ee', '#5d5f6a'],
  neutral: ['#d9c58a', '#6a5a34'],
};

// A portrait cropped to a round medallion: the small form used in lists and at the table.
function roleArt(role, team, size = 120) {
  const key = PORTRAITS[role] ? role : 'hidden';
  const [x, y, w] = PORTRAITS[key];
  const [hi, lo] = RING[team] || RING.neutral;
  const k = 90 / w;
  return `<svg class="emblem" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
    <defs>${linear(`ring-${team}`, [[0, hi], [1, lo]], 0.6, 1)}
      <clipPath id="medallion"><circle cx="50" cy="50" r="45"/></clipPath></defs>
    <circle cx="50" cy="50" r="46" fill="#08080b"/>
    <g clip-path="url(#medallion)"><image href="art/${key}.webp" width="200" height="280"
      transform="translate(5 5) scale(${k.toFixed(4)}) translate(${-x} ${-y})"/></g>
    <circle cx="50" cy="50" r="46" fill="none" stroke="url(#ring-${team})" stroke-width="4"/>
  </svg>`;
}

// The full portrait card, with its name engraved along the bottom.
function roleCard(role, team, title, subtitle) {
  const key = PORTRAITS[role] ? role : 'hidden';
  return `<div class="role-card ${team}">
    <img src="art/${key}.webp" alt="" width="600" height="840">
    ${team === 'neutral' ? '' : `<div class="role-seal">${teamSeal(team, '100%')}</div>`}
    <div class="role-plate"><div class="role-title">${title}</div><div class="role-sub">${subtitle}</div></div>
  </div>`;
}

// Eight-pointed star medallion: gold and blue for good, silver and red for evil.
function teamSeal(team, size = 40) {
  const good = team === 'good';
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const r = i % 4 === 0 ? 49 : i % 2 === 0 ? 37 : 25;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`);
  }
  const crest = good
    ? '<path d="M47 28 L50 22 L53 28 V58 H47Z M38 58 H62 V63 H53 V74 H47 V63 H38Z" fill="#f6efd8"/>'
    : `<path d="M50 28 C37 28 32 37 32 46 C32 54 38 57 41 60 V68 H59 V60 C62 57 68 54 68 46 C68 37 63 28 50 28Z" fill="#f4e9e4"/>
       <ellipse cx="42" cy="46" rx="5" ry="6" fill="#57080f"/><ellipse cx="58" cy="46" rx="5" ry="6" fill="#57080f"/>
       <path d="M50 52 L46 59 H54Z" fill="#57080f"/>`;
  return `<svg class="seal" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
    <defs>${linear(`seal-star-${team}`, good ? [[0, '#fdeeb0'], [1, '#a4741f']] : [[0, '#f4f5f9'], [1, '#7c7e8b']], 0.7, 1)}
      ${radial(`seal-disc-${team}`, good ? [[0, '#5c9df0'], [1, '#123079']] : [[0, '#e0465c'], [1, '#62081a']], '38%', '32%', '80%')}</defs>
    <polygon points="${pts.join(' ')}" fill="url(#seal-star-${team})" stroke="#2a1f0c" stroke-width="1"/>
    <circle cx="50" cy="50" r="28" fill="url(#seal-disc-${team})" stroke="url(#seal-star-${team})" stroke-width="3"/>
    ${crest}
  </svg>`;
}

// Success: a jewelled gold chalice. Fail: the same chalice, tarnished and overflowing with black.
function chaliceArt(success) {
  const id = success ? 'chalice-ok' : 'chalice-bad';
  const metal = success
    ? [[0, '#a8761f'], [0.3, '#ffe9a0'], [0.55, '#d9a73c'], [1, '#6a4610']]
    : [[0, '#3c3a3e'], [0.3, '#a7a5a2'], [0.55, '#615f61'], [1, '#222124']];
  const gem = success ? '#d3182f' : '#2c2a2e';
  const stain = success ? '' : `
    <path d="M26 22 H74 L72 34 C68 30 66 46 62 34 C60 40 58 62 54 38 C50 44 48 56 44 36 C40 42 38 50 34 34 C30 38 28 32 26 22Z" fill="#0a090b"/>
    <ellipse cx="50" cy="20" rx="24" ry="4" fill="#050506"/>`;
  return `<svg viewBox="0 0 100 100" class="card-art" aria-hidden="true">
    <defs>${linear(id, metal, 1, 0)}</defs>
    <path d="M24 18 H76 C76 44 66 60 54 62 V74 C54 80 66 82 68 90 H32 C34 82 46 80 46 74 V62 C34 60 24 44 24 18Z" fill="url(#${id})" stroke="#2a1c08" stroke-width="1.4"/>
    <ellipse cx="50" cy="18" rx="26" ry="5" fill="${success ? '#7a4a12' : '#141316'}" stroke="#2a1c08" stroke-width="1.2"/>
    <path d="M27 32 Q50 40 73 32" stroke="#2a1c08" stroke-width="1" fill="none" opacity=".55"/>
    <path d="M30 44 Q50 52 70 44" stroke="#2a1c08" stroke-width="1" fill="none" opacity=".55"/>
    <rect x="44" y="66" width="12" height="4" rx="2" fill="#2a1c08" opacity=".35"/>
    <g fill="${gem}" stroke="#fff3c4" stroke-opacity=".5" stroke-width=".6">
      <circle cx="38" cy="38" r="3"/><circle cx="50" cy="41" r="3.8"/><circle cx="62" cy="38" r="3"/></g>
    ${stain}
  </svg>`;
}
