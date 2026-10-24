'use strict';

// Hand-drawn SVG emblems for each role, so no image files or network access are needed.

function star(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="#f4d77a"/>`;
}

const ROLE_ART = {
  merlin: `
    <path d="M30 26 A18 18 0 1 0 30 54 A14 14 0 1 1 30 26Z" fill="#f4d77a" opacity=".85"/>
    <path d="M52 12 C58 30 64 50 72 70 L32 70 C40 50 46 30 52 12Z" fill="#3d63b8"/>
    <path d="M52 12 C58 30 64 50 72 70 L60 70 C56 50 54 30 52 12Z" fill="#2c4b91"/>
    <ellipse cx="52" cy="72" rx="30" ry="7" fill="#24407d"/>
    ${star(50, 46, 6)}${star(58, 30, 4)}${star(44, 60, 3.5)}
    <path d="M38 76 Q52 96 66 76 Z" fill="#e8e3d3"/>`,

  percival: `
    <path d="M28 20 H72 V48 C72 66 61 77 50 84 C39 77 28 66 28 48 Z" fill="#c9ccd6" stroke="#8a8fa0" stroke-width="2"/>
    <path d="M50 20 V84 M28 44 H72" stroke="#3d63b8" stroke-width="10"/>
    <path d="M28 20 H72 V48 C72 66 61 77 50 84 C39 77 28 66 28 48 Z" fill="none" stroke="#f4d77a" stroke-width="3"/>`,

  servant: `
    <rect x="46" y="14" width="8" height="52" fill="#d9dce4"/>
    <path d="M46 14 L50 6 L54 14Z" fill="#d9dce4"/>
    <rect x="49" y="16" width="2" height="48" fill="#a4a9b8"/>
    <rect x="32" y="64" width="36" height="7" rx="3" fill="#f4d77a"/>
    <rect x="46" y="71" width="8" height="14" fill="#7a4b25"/>
    <circle cx="50" cy="89" r="5" fill="#f4d77a"/>`,

  assassin: `
    <g transform="rotate(35 50 50)">
      <path d="M46 10 L50 2 L54 10 L54 58 L46 58Z" fill="#d9dce4"/>
      <rect x="49" y="8" width="2" height="48" fill="#a4a9b8"/>
      <rect x="36" y="58" width="28" height="6" rx="3" fill="#3a3a3a"/>
      <rect x="46" y="64" width="8" height="18" fill="#2a1a12"/>
      <circle cx="50" cy="86" r="4" fill="#3a3a3a"/>
    </g>
    <path d="M30 70 C30 64 34 58 34 58 C34 58 38 64 38 70 A4 4 0 0 1 30 70Z" fill="#c22"/>
    <path d="M22 84 C22 80 25 76 25 76 C25 76 28 80 28 84 A3 3 0 0 1 22 84Z" fill="#c22"/>`,

  morgana: `
    <path d="M56 21 A31.4 31.4 0 1 0 56 79 A29.6 29.6 0 0 1 56 21Z" fill="#b48ee0"/>
    <ellipse cx="58" cy="50" rx="13" ry="8" fill="#1b0f24"/>
    <circle cx="58" cy="50" r="5" fill="#e14bd2"/>
    <circle cx="58" cy="50" r="2" fill="#000"/>
    ${star(76, 30, 4)}${star(80, 68, 3)}`,

  mordred: `
    <path d="M22 70 L22 34 L36 50 L50 24 L64 50 L78 34 L78 70 Z" fill="#2e2e36" stroke="#b9962f" stroke-width="3" stroke-linejoin="round"/>
    <rect x="22" y="66" width="56" height="10" fill="#b9962f"/>
    <circle cx="50" cy="56" r="5" fill="#d12a2a"/>
    <circle cx="34" cy="60" r="3" fill="#d12a2a"/>
    <circle cx="66" cy="60" r="3" fill="#d12a2a"/>`,

  oberon: `
    <path d="M30 34 C22 22 20 12 24 6 C30 16 36 24 40 30Z" fill="#6b5a3a"/>
    <path d="M70 34 C78 22 80 12 76 6 C70 16 64 24 60 30Z" fill="#6b5a3a"/>
    <path d="M28 34 C28 28 72 28 72 34 C72 60 62 80 50 84 C38 80 28 60 28 34Z" fill="#3c6b3a"/>
    <path d="M34 46 L46 50 L34 54Z M66 46 L54 50 L66 54Z" fill="#f4d77a"/>
    <path d="M42 68 Q50 62 58 68" stroke="#1b2a1a" stroke-width="3" fill="none"/>`,

  minion: `
    <path d="M50 12 C28 12 20 34 20 56 L20 88 L80 88 L80 56 C80 34 72 12 50 12Z" fill="#2b2b33"/>
    <path d="M50 26 C36 26 32 42 32 56 C32 70 40 78 50 78 C60 78 68 70 68 56 C68 42 64 26 50 26Z" fill="#0b0b0f"/>
    <ellipse cx="42" cy="52" rx="4" ry="2.5" fill="#ff3b3b"/>
    <ellipse cx="58" cy="52" rx="4" ry="2.5" fill="#ff3b3b"/>`,

  // Card back: the tower of Avalon.
  hidden: `
    <path d="M50 10 L50 22" stroke="#f4d77a" stroke-width="2"/>
    <path d="M50 10 L62 14 L50 18Z" fill="#c33"/>
    <path d="M40 30 L50 20 L60 30Z" fill="#7a5530"/>
    <rect x="40" y="30" width="20" height="54" fill="#a9a08c"/>
    <path d="M28 52 H72 V84 H28Z" fill="#8e8572"/>
    <path d="M28 52 V46 H34 V52 H40 V46 H46 V52 M54 52 V46 H60 V52 H66 V46 H72 V52" fill="#8e8572" stroke="#8e8572"/>
    <path d="M45 84 V70 A5 5 0 0 1 55 70 V84Z" fill="#3a2a1a"/>
    <rect x="47" y="38" width="6" height="8" rx="3" fill="#f4d77a"/>`,
};

const FRAME = {
  good: ['#2c4377', '#121a30', '#f4d77a'],
  evil: ['#6e2525', '#220c0c', '#c9a14a'],
  neutral: ['#3a3f4c', '#16181e', '#c9a14a'],
};

// Returns an <svg> emblem for a role key, framed in its team colour.
function roleArt(role, team, size = 120) {
  const [inner, outer, ring] = FRAME[team] || FRAME.neutral;
  const gid = `g-${team || 'neutral'}`;
  return `<svg class="emblem" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
    <defs><radialGradient id="${gid}" cx="50%" cy="40%" r="60%">
      <stop offset="0" stop-color="${inner}"/><stop offset="1" stop-color="${outer}"/></radialGradient></defs>
    <circle cx="50" cy="50" r="47" fill="url(#${gid})" stroke="${ring}" stroke-width="3"/>
    <circle cx="50" cy="50" r="42" fill="none" stroke="${ring}" stroke-width=".8" opacity=".6"/>
    <g transform="translate(10 10) scale(.8)">${ROLE_ART[role] || ROLE_ART.hidden}</g>
  </svg>`;
}
