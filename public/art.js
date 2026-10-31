'use strict';

// Hand-drawn SVG art: dramatic lit portraits, team seals and chalices.
// Everything is inline so the game needs no image files or network access.
// Portraits are drawn on a 200 x 280 canvas, then shown whole (roleCard) or cropped to a medallion (roleArt).

function star(cx, cy, r, fill = '#f4d77a') {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.42 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
}

const radial = (id, stops, cx = '50%', cy = '40%', r = '70%') => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${
  stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
const linear = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${
  stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;

const FILTERS = `
  <filter id="soft2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="soft5" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>
  <filter id="soft12" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="12"/></filter>`;

const GOLD = linear('gold', [[0, '#fbe9a6'], [0.45, '#d4a544'], [1, '#7a5518']]);
const IRON = linear('iron', [[0, '#8d8f99'], [0.4, '#4a4c56'], [1, '#14151b']], 0.4, 1);

// A lit face seen head-on, centred on x = 100. Light falls from the right; the left side drops into shadow.
function face({ id, light, mid, dark, iris = '#2a2018', brow = '#2b1c12', eyes = 'open', y = 0 }) {
  const shape = 'M66 96 C64 56 136 56 134 96 C136 126 122 152 100 160 C78 152 64 126 66 96Z';
  const eye = (x) => (eyes === 'closed'
    ? `<path d="M${x - 11} 104 Q${x} 109 ${x + 11} 104" stroke="${dark}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    : `<path d="M${x - 11} 104 Q${x} 94 ${x + 11} 104 Q${x} 110 ${x - 11} 104Z" fill="#e9dfd0"/>
       <circle cx="${x}" cy="102.5" r="4.6" fill="${iris}"/><circle cx="${x}" cy="102.5" r="2" fill="#090606"/>
       <circle cx="${x + 1.6}" cy="101" r="1" fill="#fff"/>
       <path d="M${x - 12} 104 Q${x} 92 ${x + 12} 104" stroke="#120b08" stroke-width="2" fill="none"/>`);
  return `<g transform="translate(0 ${y})">
    <defs>${linear(`${id}-skin`, [[0, dark], [0.45, mid], [0.8, light], [1, mid]], 1, 0.15)}
      <clipPath id="${id}-face"><path d="${shape}"/></clipPath></defs>
    <path d="${shape}" fill="url(#${id}-skin)"/>
    <g clip-path="url(#${id}-face)">
      <path d="M58 60 H90 C80 96 84 130 96 170 H58Z" fill="#000" opacity=".42" filter="url(#soft5)"/>
      <ellipse cx="120" cy="124" rx="11" ry="8" fill="#d9643f" opacity=".2" filter="url(#soft5)"/>
      <path d="M72 106 Q84 114 94 106 L94 118 Q84 122 72 116Z" fill="#000" opacity=".18" filter="url(#soft2)"/>
      <path d="M106 106 Q116 114 128 106 L128 116 Q116 122 106 118Z" fill="#000" opacity=".12" filter="url(#soft2)"/>
    </g>
    ${eye(84)}${eye(116)}
    <path d="M71 94 Q84 85 96 93" stroke="${brow}" stroke-width="4.4" fill="none" stroke-linecap="round"/>
    <path d="M104 93 Q116 85 129 94" stroke="${brow}" stroke-width="4.4" fill="none" stroke-linecap="round"/>
    <path d="M97 96 C95 112 92 124 90 128 Q100 136 108 128 C104 120 103 108 103 96Z" fill="#000" opacity=".2" filter="url(#soft2)"/>
    <path d="M102 98 C104 112 107 122 108 127 Q104 131 100 130 C103 120 102 108 102 98Z" fill="${light}" opacity=".7" filter="url(#soft2)"/>
  </g>`;
}

const ROLE_ART = {
  // Hooded wizard raising a crystal-tipped staff beneath the stars.
  merlin: {
    crop: [38, 40, 124, 124],
    defs: radial('m-bg', [[0, '#34507f'], [0.55, '#172444'], [1, '#050813']], '72%', '26%', '85%')
      + linear('m-robe', [[0, '#3f68bb'], [0.55, '#1d3573'], [1, '#0a1230']], 0.6, 1)
      + linear('m-beard', [[0, '#fbf8ee'], [0.6, '#c9c5ba'], [1, '#6d6b68']]),
    art: `<rect width="200" height="280" fill="url(#m-bg)"/>
      ${star(30, 40, 4, '#dfe9ff')}${star(60, 18, 2.6, '#dfe9ff')}${star(18, 96, 3, '#dfe9ff')}${star(176, 120, 2.6, '#dfe9ff')}
      <path d="M163 280 L171 66" stroke="#4a2f19" stroke-width="7"/>
      <path d="M163 280 L171 66" stroke="#9b6a3c" stroke-width="2"/>
      <circle cx="172" cy="52" r="34" fill="#6fd4ff" opacity=".45" filter="url(#soft12)"/>
      <path d="M172 32 L183 52 L172 72 L161 52Z" fill="#c9f2ff"/><path d="M172 32 L183 52 L172 72Z" fill="#59b9ec"/>
      <path d="M2 280 C8 214 30 178 62 164 L138 164 C170 178 192 214 198 280Z" fill="url(#m-robe)"/>
      <path d="M100 12 C146 12 160 60 158 110 C156 148 146 170 132 186 L68 186 C54 170 44 148 42 110 C40 60 54 12 100 12Z" fill="url(#m-robe)"/>
      <path d="M66 96 C60 46 140 46 134 96 L138 150 L62 150Z" fill="#050813"/>
      ${face({ id: 'm', light: '#f2c9a0', mid: '#bb8259', dark: '#4e2c1c', brow: '#efe9db', eyes: 'closed' })}
      <path d="M70 124 C74 134 88 132 100 136 C112 132 126 134 130 124 C138 170 124 222 100 244 C76 222 62 170 70 124Z" fill="url(#m-beard)"/>
      <path d="M84 146 Q88 186 96 226 M100 146 V236 M116 146 Q112 186 104 226" stroke="#8d8a84" stroke-width="1.3" fill="none" opacity=".7"/>
      <path d="M86 132 Q100 126 114 132 Q100 140 86 132Z" fill="#fbf8ee"/>
      <path d="M100 12 C60 14 42 58 44 112 C45 146 54 170 68 186 M100 12 C140 14 158 58 156 112 C155 146 146 170 132 186" stroke="url(#gold)" stroke-width="5" fill="none"/>
      ${star(32, 226, 5)}${star(170, 214, 4)}${star(46, 262, 3.6)}`,
  },

  // A young knight in a blue-plumed helm behind a white-crossed shield.
  percival: {
    crop: [36, 18, 128, 128],
    defs: radial('pe-bg', [[0, '#c9b98c'], [0.45, '#55627c'], [1, '#0d1220']], '74%', '30%', '85%')
      + linear('pe-plume', [[0, '#7ea8f0'], [1, '#183a86']])
      + linear('pe-shield', [[0, '#3a68c4'], [1, '#13285e']], 0.6, 1),
    art: `<rect width="200" height="280" fill="url(#pe-bg)"/>
      <path d="M100 26 C134 -6 180 22 176 96 C166 58 134 42 106 46Z" fill="url(#pe-plume)"/>
      <path d="M104 30 C136 8 168 28 168 70" stroke="#b6cdf6" stroke-width="1.6" fill="none" opacity=".7"/>
      <path d="M8 280 C10 220 36 186 70 176 L130 176 C164 186 190 220 192 280Z" fill="url(#iron)"/>
      <path d="M58 176 H142 L132 152 H68Z" fill="#5d606b"/>
      <path d="M60 176 Q100 196 140 176" stroke="#a2a5b1" stroke-width="2" fill="none"/>
      ${face({ id: 'pe', light: '#f4cfa8', mid: '#c48d63', dark: '#54301e', iris: '#3f6fb0', brow: '#6b4a24', y: 4 })}
      <path d="M100 26 C146 26 156 72 152 118 C150 142 142 158 132 168 L130 104 Q100 78 70 104 L68 168 C58 158 50 142 48 118 C44 72 54 26 100 26Z" fill="url(#iron)"/>
      <path d="M96 28 H104 V100 H96Z" fill="url(#gold)"/>
      <path d="M50 96 Q100 66 150 96" stroke="url(#gold)" stroke-width="5" fill="none"/>
      <path d="M92 150 Q100 156 110 150" stroke="#4a2517" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M52 196 H148 V232 C148 256 124 272 100 280 C76 272 52 256 52 232Z" fill="url(#pe-shield)" stroke="url(#gold)" stroke-width="4"/>
      <path d="M100 198 V278 M54 228 H146" stroke="#eef0f5" stroke-width="11"/>`,
  },

  // Plain soldier in a kettle helm and mail, spear at his shoulder, firelit.
  servant: {
    crop: [36, 30, 128, 128],
    defs: radial('s-bg', [[0, '#a8682c'], [0.5, '#44301f'], [1, '#0d0a08']], '78%', '42%', '80%')
      + linear('s-tabard', [[0, '#2f5aa8'], [1, '#0f2150']], 0.5, 1),
    art: `<rect width="200" height="280" fill="url(#s-bg)"/>
      <path d="M170 280 L170 30" stroke="#3b2413" stroke-width="6"/>
      <path d="M163 40 L170 2 L177 40 L170 50Z" fill="#c4c7d0"/>
      <path d="M170 2 L177 40 L170 50Z" fill="#7f828e"/>
      <path d="M6 280 C10 216 38 182 72 172 L128 172 C162 182 190 216 194 280Z" fill="url(#iron)"/>
      <path d="M6 280 C10 216 38 182 72 172 L128 172 C162 182 190 216 194 280Z" fill="none" stroke="#000" stroke-width="1" stroke-dasharray="2 3" opacity=".5"/>
      <path d="M62 196 H138 L146 280 H54Z" fill="url(#s-tabard)"/>
      <path d="M100 196 V280 M58 236 H142" stroke="#d9dce4" stroke-width="7"/>
      <path d="M62 120 C56 150 62 176 74 192 L126 192 C138 176 144 150 138 120Z" fill="#4c4e58"/>
      <path d="M62 120 C56 150 62 176 74 192 L126 192 C138 176 144 150 138 120" fill="none" stroke="#1b1c22" stroke-width="1.2" stroke-dasharray="2 3"/>
      ${face({ id: 's', light: '#eebf90', mid: '#ad7549', dark: '#42251a', iris: '#4a3a24', brow: '#2c1c10', y: 8 })}
      <path d="M78 142 Q100 152 122 142 L120 158 Q100 174 80 158Z" fill="#3a2517" opacity=".55" filter="url(#soft2)"/>
      <path d="M92 150 Q100 154 110 150" stroke="#2c130c" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M36 92 Q100 66 164 92 L156 104 Q100 88 44 104Z" fill="url(#iron)" stroke="#a5a8b3" stroke-width="1"/>
      <path d="M58 94 C60 30 140 30 142 94Z" fill="url(#iron)"/>
      <path d="M100 37 V82" stroke="#a5a8b3" stroke-width="3"/>`,
  },

  // Eyes burning under a black hood, a bloodied dagger held low.
  assassin: {
    crop: [38, 26, 124, 124],
    defs: radial('a-bg', [[0, '#7d1c16'], [0.5, '#2a0a0c'], [1, '#050203']], '50%', '40%', '75%')
      + linear('a-hood', [[0, '#34333c'], [0.6, '#15141a'], [1, '#050507']], 0.5, 1)
      + linear('a-steel', [[0, '#e9ecf2'], [1, '#747884']], 1, 0),
    art: `<rect width="200" height="280" fill="url(#a-bg)"/>
      <path d="M0 280 C6 214 26 180 60 166 L140 166 C174 180 194 214 200 280Z" fill="url(#a-hood)"/>
      <path d="M100 6 C150 8 170 66 164 118 C160 152 146 176 128 190 L72 190 C54 176 40 152 36 118 C30 66 50 8 100 6Z" fill="url(#a-hood)"/>
      <path d="M62 112 C58 56 142 56 138 112 C136 148 120 166 100 172 C80 166 64 148 62 112Z" fill="#040304"/>
      <ellipse cx="82" cy="108" rx="20" ry="10" fill="#ff3a20" opacity=".5" filter="url(#soft5)"/>
      <ellipse cx="118" cy="108" rx="20" ry="10" fill="#ff3a20" opacity=".5" filter="url(#soft5)"/>
      <path d="M70 110 Q82 98 95 110 Q82 116 70 110Z" fill="#ffd27a"/><path d="M105 110 Q118 98 130 110 Q118 116 105 110Z" fill="#ffd27a"/>
      <circle cx="83" cy="108" r="3.4" fill="#2a0404"/><circle cx="117" cy="108" r="3.4" fill="#2a0404"/>
      <path d="M68 142 Q100 166 132 142 L126 174 L74 174Z" fill="#17161b"/>
      <path d="M78 152 L100 166 L122 152" stroke="#34333c" stroke-width="2" fill="none"/>
      <g transform="rotate(-24 100 230)">
        <path d="M93 124 L100 104 L107 124 L107 214 L93 214Z" fill="url(#a-steel)"/>
        <path d="M100 104 L107 124 L107 214 L100 214Z" fill="#6c707c"/>
        <path d="M100 108 L104 124 V170 L100 186 Z" fill="#9a0f0f" opacity=".85"/>
        <rect x="74" y="214" width="52" height="9" rx="4" fill="url(#gold)"/>
        <rect x="93" y="223" width="14" height="44" fill="#201410"/>
        <circle cx="100" cy="270" r="7" fill="url(#gold)"/>
      </g>`,
  },

  // Dark-haired sorceress crowned with a crescent, violet magic at her hand.
  morgana: {
    crop: [36, 22, 128, 128],
    defs: radial('mo-bg', [[0, '#6b2f93'], [0.5, '#25103c'], [1, '#07030d']], '26%', '60%', '85%')
      + linear('mo-hair', [[0, '#26182f'], [0.6, '#0e0814'], [1, '#040208']], 0.2, 1)
      + linear('mo-gown', [[0, '#5b1f6e'], [1, '#180722']], 0.5, 1),
    art: `<rect width="200" height="280" fill="url(#mo-bg)"/>
      <path d="M100 18 C158 18 170 72 166 132 C164 184 176 226 188 280 H12 C24 226 36 184 34 132 C30 72 42 18 100 18Z" fill="url(#mo-hair)"/>
      <path d="M72 166 L128 166 L164 222 L176 280 H24 L36 222Z" fill="url(#mo-gown)"/>
      <path d="M78 150 L122 150 L128 186 Q100 214 72 186Z" fill="#c78f79"/>
      <path d="M72 186 Q100 214 128 186" stroke="url(#gold)" stroke-width="4" fill="none"/>
      ${star(100, 208, 6, '#e14bd2')}
      ${face({ id: 'mo', light: '#f1cdbb', mid: '#b98670', dark: '#4a2a35', iris: '#b13bd0', brow: '#120a12', y: 2 })}
      <path d="M92 146 Q100 142 108 146 Q100 154 92 146Z" fill="#8e1f3f"/>
      <path d="M100 42 C60 44 58 92 62 132 C70 104 78 78 104 62 C118 76 130 100 138 132 C142 92 140 44 100 42Z" fill="url(#mo-hair)"/>
      <path d="M64 70 Q100 44 136 70" stroke="url(#gold)" stroke-width="4.5" fill="none"/>
      <path d="M116 22 A26 26 0 1 0 116 72 A21 21 0 0 1 116 22Z" transform="rotate(-90 100 44) translate(4 -6)" fill="url(#gold)"/>
      <circle cx="34" cy="226" r="28" fill="#d15cff" opacity=".55" filter="url(#soft12)"/>
      <circle cx="34" cy="226" r="7" fill="#f6d6ff"/>
      ${star(52, 186, 3.4, '#f6d6ff')}${star(16, 190, 2.6, '#f6d6ff')}`,
  },

  // The black king: a crowned, visored helm with a red glare in the slit.
  mordred: {
    crop: [34, 8, 132, 132],
    defs: radial('md-bg', [[0, '#a4371a'], [0.42, '#3c1210'], [1, '#060305']], '50%', '56%', '75%')
      + linear('md-iron', [[0, '#55565f'], [0.4, '#23232b'], [1, '#07070a']], 0.5, 1),
    art: `<rect width="200" height="280" fill="url(#md-bg)"/>
      <path d="M0 280 C2 216 22 178 62 164 L138 164 C178 178 198 216 200 280Z" fill="url(#md-iron)"/>
      <path d="M0 210 L52 170 L70 200 L8 280Z M200 210 L148 170 L130 200 L192 280Z" fill="#17171d" stroke="#6a6b75" stroke-width="1.4"/>
      <path d="M72 200 L100 262 L128 200Z" fill="#7d1616"/>
      <path d="M72 200 L100 262 L128 200" stroke="url(#gold)" stroke-width="3" fill="none"/>
      <path d="M56 80 C56 40 144 40 144 80 L142 138 C138 166 118 182 100 188 C82 182 62 166 58 138Z" fill="url(#md-iron)"/>
      <path d="M144 80 L142 138 C138 166 118 182 100 188 L100 50 C124 50 144 58 144 80Z" fill="#fff" opacity=".05"/>
      <path d="M100 52 V188" stroke="#74757f" stroke-width="2.4"/>
      <path d="M60 104 Q100 118 140 104 L136 120 Q100 130 64 120Z" fill="#050305"/>
      <ellipse cx="80" cy="113" rx="17" ry="7" fill="#ff2a12" opacity=".6" filter="url(#soft5)"/>
      <ellipse cx="120" cy="113" rx="17" ry="7" fill="#ff2a12" opacity=".6" filter="url(#soft5)"/>
      <path d="M70 112 Q80 106 90 114 Q80 117 70 112Z M110 114 Q120 106 130 112 Q120 117 110 114Z" fill="#ffb066"/>
      <g fill="#07070a"><circle cx="84" cy="146" r="2.2"/><circle cx="84" cy="156" r="2.2"/><circle cx="116" cy="146" r="2.2"/><circle cx="116" cy="156" r="2.2"/><circle cx="92" cy="166" r="2.2"/><circle cx="108" cy="166" r="2.2"/></g>
      <path d="M52 76 L46 16 L72 44 L82 6 L100 40 L118 6 L128 44 L154 16 L148 76 Q100 56 52 76Z" fill="url(#gold)" stroke="#4a3210" stroke-width="1.5"/>
      <circle cx="100" cy="60" r="6" fill="#d12a2a"/><circle cx="74" cy="62" r="4" fill="#d12a2a"/><circle cx="126" cy="62" r="4" fill="#d12a2a"/>
      <circle cx="98.5" cy="58.5" r="1.8" fill="#ffc0b0"/>`,
  },

  // Antlered and alone: a fey outsider watching from the green dark.
  oberon: {
    crop: [34, 34, 132, 132],
    defs: radial('o-bg', [[0, '#3f7040'], [0.5, '#16301f'], [1, '#040a07']], '50%', '44%', '75%')
      + linear('o-skin', [[0, '#7fa066'], [0.5, '#46653f'], [1, '#17261b']], 0.8, 0.6)
      + linear('o-cloak', [[0, '#3a4a2a'], [1, '#0a120c']], 0.5, 1),
    art: `<rect width="200" height="280" fill="url(#o-bg)"/>
      <path d="M0 280 V236 L24 200 L18 280Z M200 280 V226 L176 196 L182 280Z" fill="#050b07"/>
      <g fill="none" stroke="#5a4730" stroke-width="7" stroke-linecap="round">
        <path d="M72 70 C60 44 46 34 34 10 M56 44 L28 44 M46 28 L60 6"/>
        <path d="M128 70 C140 44 154 34 166 10 M144 44 L172 44 M154 28 L140 6"/>
      </g>
      <path d="M2 280 C8 216 30 182 66 170 L134 170 C170 182 192 216 198 280Z" fill="url(#o-cloak)"/>
      <path d="M36 166 C60 190 80 186 100 206 C120 186 140 190 164 166 L150 214 L100 236 L50 214Z" fill="#26361f"/>
      <path d="M68 92 C68 58 132 58 132 92 C134 124 118 162 100 178 C82 162 66 124 68 92Z" fill="url(#o-skin)"/>
      <path d="M68 92 C68 58 96 60 90 68 C78 110 84 146 100 178 C82 162 66 124 68 92Z" fill="#000" opacity=".42" filter="url(#soft2)"/>
      <path d="M70 100 L52 84 L68 118Z M130 100 L148 84 L132 118Z" fill="url(#o-skin)"/>
      <path d="M74 98 L96 108 L76 110Z M126 98 L104 108 L124 110Z" fill="#0a0f08"/>
      <path d="M78 102 L92 107 L79 108Z M122 102 L108 107 L121 108Z" fill="#e8d84a"/>
      <circle cx="84" cy="105.5" r="2" fill="#141407"/><circle cx="116" cy="105.5" r="2" fill="#141407"/>
      <path d="M97 112 L94 134 L100 138 L106 134 L103 112Z" fill="#000" opacity=".25"/>
      <path d="M88 150 Q100 144 112 150" stroke="#0c1409" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M66 86 Q100 62 134 86 L128 72 Q100 54 72 72Z" fill="#2b3d22"/>`,
  },

  // Faceless man-at-arms: spiked helm, two red points in the dark.
  minion: {
    crop: [38, 20, 124, 124],
    defs: radial('mi-bg', [[0, '#5a2018'], [0.5, '#1e0c0c'], [1, '#040203']], '50%', '52%', '75%')
      + linear('mi-iron', [[0, '#5a5b65'], [0.45, '#25262e'], [1, '#08080b']], 0.6, 1),
    art: `<rect width="200" height="280" fill="url(#mi-bg)"/>
      <path d="M2 280 C8 218 30 182 68 168 L132 168 C170 182 192 218 198 280Z" fill="url(#mi-iron)"/>
      <path d="M2 280 C8 218 30 182 68 168 L132 168 C170 182 192 218 198 280Z" fill="none" stroke="#000" stroke-width="1" stroke-dasharray="2 3" opacity=".6"/>
      <path d="M60 110 C54 150 62 180 76 196 L124 196 C138 180 146 150 140 110Z" fill="#0e0e12"/>
      <path d="M100 6 L112 44 C136 54 146 78 146 112 L120 110 L114 146 H86 L80 110 L54 112 C54 78 64 54 88 44Z" fill="url(#mi-iron)" stroke="#70717b" stroke-width="1"/>
      <path d="M100 6 L112 44 L100 148 Z" fill="#fff" opacity=".07"/>
      <path d="M54 112 Q100 92 146 112" stroke="#7d3a2a" stroke-width="3" fill="none"/>
      <ellipse cx="70" cy="122" rx="12" ry="7" fill="#ff2c18" opacity=".55" filter="url(#soft5)"/>
      <ellipse cx="130" cy="122" rx="12" ry="7" fill="#ff2c18" opacity=".55" filter="url(#soft5)"/>
      <ellipse cx="70" cy="122" rx="4" ry="2.4" fill="#ff8a60"/><ellipse cx="130" cy="122" rx="4" ry="2.4" fill="#ff8a60"/>
      <path d="M86 150 H114 L108 196 H92Z" fill="#050507"/>
      <g fill="#6a6b75"><circle cx="66" cy="214" r="3"/><circle cx="134" cy="214" r="3"/><circle cx="50" cy="240" r="3"/><circle cx="150" cy="240" r="3"/></g>`,
  },

  // Card back: a castle of spires at dusk above the mist.
  hidden: {
    crop: [24, 74, 152, 152],
    defs: linear('h-sky', [[0, '#3c3a60'], [0.42, '#a4694f'], [0.68, '#f2b860'], [1, '#f8dd9a']])
      + linear('h-hill', [[0, '#5a6d2c'], [0.55, '#2f4120'], [1, '#121b10']])
      + linear('h-wall', [[0, '#3a2a2a'], [1, '#17111a']], 1, 0.3),
    art: `<rect width="200" height="280" fill="url(#h-sky)"/>
      <circle cx="146" cy="162" r="44" fill="#fff0bd" opacity=".65" filter="url(#soft12)"/>
      <ellipse cx="50" cy="66" rx="60" ry="10" fill="#6a4a58" opacity=".55" filter="url(#soft5)"/>
      <ellipse cx="150" cy="104" rx="66" ry="8" fill="#7c4f49" opacity=".5" filter="url(#soft5)"/>
      <g fill="url(#h-wall)">
        <path d="M44 196 V140 L51 110 L58 140 V196Z"/><path d="M74 196 V116 L82 76 L90 116 V196Z"/>
        <path d="M104 196 V98 L113 48 L122 98 V196Z"/><path d="M136 196 V128 L144 96 L152 128 V196Z"/>
        <path d="M34 200 V162 H42 V154 H50 V162 H60 V148 H70 V158 H94 V136 H102 V146 H124 V136 H132 V158 H154 V150 H164 V200Z"/>
      </g>
      <path d="M113 48 V30 M82 76 V62" stroke="#17111a" stroke-width="1.6"/>
      <path d="M113 30 L128 34 L113 38Z" fill="#a8241e"/>
      <g fill="#ffd27a"><rect x="111" y="108" width="4" height="9" rx="2"/><rect x="80" y="126" width="4" height="9" rx="2"/><rect x="142" y="136" width="4" height="8" rx="2"/><rect x="50" y="148" width="3" height="7" rx="1.5"/><rect x="96" y="170" width="5" height="9" rx="2"/><rect x="124" y="170" width="5" height="9" rx="2"/></g>
      <path d="M0 280 V216 C36 190 70 196 104 192 C144 188 170 196 200 214 V280Z" fill="url(#h-hill)"/>
      <ellipse cx="46" cy="238" rx="60" ry="9" fill="#f6ead0" opacity=".32" filter="url(#soft5)"/>
      <ellipse cx="160" cy="224" rx="52" ry="7" fill="#f6ead0" opacity=".3" filter="url(#soft5)"/>`,
  },
};

const RING = {
  good: ['#fbe9a6', '#8a6424'],
  evil: ['#e6e8ee', '#5d5f6a'],
  neutral: ['#d9c58a', '#6a5a34'],
};

// A portrait cropped to a round medallion: the small form used in lists and at the table.
function roleArt(role, team, size = 120) {
  const { crop: [x, y, w], defs, art } = ROLE_ART[role] || ROLE_ART.hidden;
  const [hi, lo] = RING[team] || RING.neutral;
  const k = 90 / w;
  return `<svg class="emblem" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
    <defs>${FILTERS}${GOLD}${IRON}${defs}${linear(`ring-${team}`, [[0, hi], [1, lo]], 0.6, 1)}
      <clipPath id="medallion"><circle cx="50" cy="50" r="45"/></clipPath></defs>
    <circle cx="50" cy="50" r="46" fill="#08080b"/>
    <g clip-path="url(#medallion)"><g transform="translate(5 5) scale(${k.toFixed(4)}) translate(${-x} ${-y})">${art}</g></g>
    <circle cx="50" cy="50" r="46" fill="none" stroke="url(#ring-${team})" stroke-width="4"/>
  </svg>`;
}

// The full painted role card, with its name engraved along the bottom.
function roleCard(role, team, title, subtitle) {
  const { defs, art } = ROLE_ART[role] || ROLE_ART.hidden;
  return `<div class="role-card ${team}">
    <svg viewBox="0 0 200 280" aria-hidden="true"><defs>${FILTERS}${GOLD}${IRON}${defs}</defs>${art}</svg>
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
