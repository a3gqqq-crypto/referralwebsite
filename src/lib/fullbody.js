// Full-body avatar (Bitmoji-style), drawn as SVG from a small options object.
// Stage is 200 x 360. "head" view crops to the face for small avatars.

const OUTLINE = "rgba(40, 20, 20, 0.22)";

function shade(hex, amount) {
  const n = parseInt(hex.replace("#", ""), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) - amount);
  const g = clamp(((n >> 8) & 255) - amount);
  const b = clamp((n & 255) - amount);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const pt = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

/* ---------- Body geometry ---------- */

function geometry(o) {
  const girl = o.body === "girl";
  return {
    girl,
    sw: girl ? 30 : 37, // shoulder half-width
    wa: girl ? 23 : 33, // waist half-width (y 205)
    hp: girl ? 30 : 32, // hip half-width (y 240)
    arm: girl ? 13 : 15,
    legs: girl ? [85, 115] : [84, 116],
    legW: girl ? 19 : 21,
  };
}

function torsoPath(g, bottom = 240) {
  const { sw, wa, hp } = g;
  const hipY = Math.min(bottom, 240);
  const hipW = bottom < 240 ? wa + (hp - wa) * ((bottom - 205) / 35) : hp;
  return `M ${100 - sw} 165 Q ${100 - sw} 154 ${100 - sw + 12} 153 L ${100 + sw - 12} 153 Q ${100 + sw} 154 ${100 + sw} 165 Q ${100 + wa} 205 ${100 + hipW} ${hipY} L ${100 - hipW} ${hipY} Q ${100 - wa} 205 ${100 - sw} 165 Z`;
}

function arms(o, g) {
  const { sw, wa } = g;
  const side = (s, kind) => {
    const S = [100 + s * (sw - 6), 165];
    if (kind === "up") return { S, E: [100 + s * (sw + 24), 148], H: [100 + s * (sw + 30), 106] };
    if (kind === "hip") return { S, E: [100 + s * (sw + 20), 192], H: [100 + s * (wa + 3), 214] };
    if (kind === "flex") return { S, E: [100 + s * (sw + 26), 166], H: [100 + s * (sw + 18), 128] };
    return { S, E: [100 + s * (sw + 6), 204], H: [100 + s * (sw + 8), 242] };
  };

  const pose = o.pose || "stand";
  const right = { stand: "down", wave: "up", peace: "up", hips: "hip", flex: "flex" }[pose] || "down";
  const left = { hips: "hip", flex: "flex" }[pose] || "down";

  return [
    { s: -1, ...side(-1, left), hand: pose === "flex" ? "fist" : "plain" },
    { s: 1, ...side(1, right), hand: pose === "wave" ? "open" : pose === "peace" ? "peace" : pose === "flex" ? "fist" : "plain" },
  ];
}

/* ---------- Clothing ---------- */

const SLEEVES = {
  tee: "short", crop: "short", jersey: "none", dress: "none",
  hoodie: "long", sweater: "long", shirt: "long", bomber: "long",
  leather: "long", puffer: "long", suit: "long",
};

function drawArm(a, o, g, skin) {
  const sleeve = SLEEVES[o.top] || "long";
  const top = sleeveColor(o);
  const w = g.arm + (o.top === "puffer" ? 3 : 0);
  let out = `<path d="M ${pt(a.S)} L ${pt(a.E)} L ${pt(a.H)}" stroke="${OUTLINE}" stroke-width="${g.arm + 2.4}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  out += `<path d="M ${pt(a.S)} L ${pt(a.E)} L ${pt(a.H)}" stroke="${skin}" stroke-width="${g.arm}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

  if (sleeve === "long") {
    const cuff = lerp(a.H, a.E, 0.22);
    out += `<path d="M ${pt(a.S)} L ${pt(a.E)} L ${pt(cuff)}" stroke="${top}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    if (o.top === "bomber" || o.top === "hoodie" || o.top === "sweater") {
      const band = lerp(a.H, a.E, 0.3);
      out += `<path d="M ${pt(band)} L ${pt(cuff)}" stroke="${o.top === "bomber" ? "#1d1d22" : shade(top, 22)}" stroke-width="${w}" stroke-linecap="butt" fill="none"/>`;
    }
  } else if (sleeve === "short") {
    const end = lerp(a.S, a.E, 0.7);
    out += `<path d="M ${pt(a.S)} L ${pt(end)}" stroke="${top}" stroke-width="${w + 3}" stroke-linecap="round" fill="none"/>`;
  }

  out += drawHand(a, skin);
  return out;
}

function drawHand(a, skin) {
  const [x, y] = a.H;
  const edge = shade(skin, 40);
  let out = `<circle cx="${x}" cy="${y}" r="8.5" fill="${skin}" stroke="${OUTLINE}" stroke-width="1.2"/>`;

  if (a.hand === "open") {
    out += [-6, -2, 2, 6]
      .map((dx, i) => `<path d="M ${x + dx * 0.8} ${y - 4} L ${x + dx * 1.3} ${y - 13 + (i === 0 || i === 3 ? 3 : 0)}" stroke="${skin}" stroke-width="4.2" stroke-linecap="round"/>`)
      .join("");
    out += `<path d="M ${x - a.s * 7} ${y + 1} L ${x - a.s * 12} ${y - 4}" stroke="${skin}" stroke-width="4.2" stroke-linecap="round"/>`;
  } else if (a.hand === "peace") {
    out += `<path d="M ${x - 2} ${y - 4} L ${x - 6} ${y - 17} M ${x + 3} ${y - 4} L ${x + 6} ${y - 17}" stroke="${skin}" stroke-width="4.4" stroke-linecap="round"/>`;
    out += `<path d="M ${x - 5} ${y - 1} Q ${x} ${y + 3} ${x + 5} ${y - 1}" stroke="${edge}" stroke-width="1.2" fill="none"/>`;
  } else if (a.hand === "fist") {
    out += `<path d="M ${x - 5} ${y - 3} L ${x + 5} ${y - 3} M ${x - 5} ${y + 1} L ${x + 5} ${y + 1}" stroke="${edge}" stroke-width="1.1"/>`;
  }
  return out;
}

const sleeveColor = (o) => (o.top === "leather" ? "#232326" : o.topColor);

function drawTop(o, g, skin) {
  const c = o.topColor;
  const d = shade(c, 30);
  const ol = `stroke="${OUTLINE}" stroke-width="1.2"`;
  let out = "";

  if (o.top === "crop") {
    out += `<path d="${torsoPath(g)}" fill="${skin}" ${ol}/>`;
    out += `<ellipse cx="100" cy="230" rx="2" ry="2.6" fill="${shade(skin, 45)}"/>`;
    out += `<path d="${torsoPath(g, 220)}" fill="${c}" ${ol}/>`;
    out += `<path d="M 90 153 Q 100 163 110 153" fill="${skin}"/>`;
    return out;
  }

  if (o.top === "dress") {
    out += `<path d="${torsoPath(g, 212)}" fill="${c}" ${ol}/>`;
    out += `<path d="M ${100 - g.wa - 1} 208 L ${100 + g.wa + 1} 208 L ${100 + g.hp + 20} 292 Q 100 302 ${100 - g.hp - 20} 292 Z" fill="${c}" ${ol}/>`;
    out += `<path d="M ${100 - g.wa} 208 L ${100 + g.wa} 208" stroke="${d}" stroke-width="4"/>`;
    out += `<path d="M 88 153 Q 100 168 112 153" fill="${skin}"/>`;
    out += [-22, -8, 8, 22].map((x) => `<path d="M ${100 + x * 0.5} 214 L ${100 + x} 292" stroke="${d}" stroke-width="1.2" opacity="0.5"/>`).join("");
    return out;
  }

  const base = o.top === "leather" ? "#232326" : c;
  out += `<path d="${torsoPath(g)}" fill="${base}" ${ol}/>`;

  switch (o.top) {
    case "tee":
      out += `<path d="M 89 153 Q 100 164 111 153" fill="${skin}" stroke="${d}" stroke-width="2"/>`;
      break;
    case "hoodie":
      out += `<path d="M 80 153 Q 100 176 120 153" fill="none" stroke="${d}" stroke-width="5"/>`;
      out += `<path d="M 94 162 L 93 186 M 106 162 L 107 186" stroke="#f5f5f5" stroke-width="2" stroke-linecap="round"/>`;
      out += `<path d="M 80 208 L 120 208 L 124 230 L 76 230 Z" fill="${shade(c, 16)}"/>`;
      out += `<path d="M ${100 - g.hp + 1} 234 L ${100 + g.hp - 1} 234" stroke="${d}" stroke-width="7"/>`;
      break;
    case "sweater":
      out += `<path d="M 88 153 Q 100 166 112 153" fill="${skin}" stroke="${d}" stroke-width="4"/>`;
      out += `<path d="M ${100 - g.sw + 4} 186 L ${100 + g.sw - 4} 186" stroke="${shade(c, -40)}" stroke-width="6" opacity="0.7"/>`;
      out += `<path d="M ${100 - g.hp + 1} 234 L ${100 + g.hp - 1} 234" stroke="${d}" stroke-width="7"/>`;
      break;
    case "shirt":
      out += `<path d="M 90 153 L 100 168 L 110 153 Z" fill="${skin}"/>`;
      out += `<path d="M 88 152 L 99 170 L 92 172 L 84 156 Z M 112 152 L 101 170 L 108 172 L 116 156 Z" fill="${shade(c, -25)}" stroke="${d}" stroke-width="1"/>`;
      out += [180, 196, 212, 228].map((y) => `<circle cx="100" cy="${y}" r="1.8" fill="${d}"/>`).join("");
      out += `<path d="M 100 170 L 100 240" stroke="${d}" stroke-width="1.2"/>`;
      break;
    case "jersey":
      out += `<path d="M 86 153 Q 100 176 114 153" fill="${skin}" stroke="#fff" stroke-width="3"/>`;
      out += `<text x="100" y="214" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="26" fill="#fff" stroke="${d}" stroke-width="1">23</text>`;
      out += `<path d="M ${100 - g.wa - 3} 190 L ${100 - g.hp + 2} 238 M ${100 + g.wa + 3} 190 L ${100 + g.hp - 2} 238" stroke="#fff" stroke-width="4"/>`;
      break;
    case "bomber":
      out += `<path d="M 84 152 Q 100 166 116 152" fill="none" stroke="#1d1d22" stroke-width="7"/>`;
      out += `<path d="M 100 160 L 100 234" stroke="#c9c9c9" stroke-width="2.4" stroke-dasharray="2 2"/>`;
      out += `<circle cx="${100 + g.sw - 16}" cy="182" r="6" fill="#ffd166" stroke="#1d1d22" stroke-width="1.5"/>`;
      out += `<path d="M ${100 - g.hp + 1} 234 L ${100 + g.hp - 1} 234" stroke="#1d1d22" stroke-width="8"/>`;
      break;
    case "leather":
      out += `<path d="M 90 153 L 110 153 L 108 240 L 92 240 Z" fill="${c}"/>`;
      out += `<path d="M 86 152 L 96 190 L 92 240 L 82 240 L 88 196 L 78 160 Z M 114 152 L 104 190 L 108 240 L 118 240 L 112 196 L 122 160 Z" fill="#2e2e33" stroke="#111" stroke-width="1"/>`;
      out += `<circle cx="84" cy="214" r="1.6" fill="#bbb"/><circle cx="116" cy="214" r="1.6" fill="#bbb"/>`;
      break;
    case "puffer":
      out += `<path d="${torsoPath({ ...g, sw: g.sw + 3, wa: g.wa + 4, hp: g.hp + 3 })}" fill="${c}" ${ol}/>`;
      out += [176, 196, 216].map((y) => `<path d="M ${100 - g.sw - 2} ${y} Q 100 ${y + 5} ${100 + g.sw + 2} ${y}" stroke="${d}" stroke-width="1.8" fill="none"/>`).join("");
      out += `<path d="M 84 150 Q 100 162 116 150 L 116 158 Q 100 170 84 158 Z" fill="${d}"/>`;
      out += `<path d="M 100 162 L 100 240" stroke="${d}" stroke-width="2"/>`;
      break;
    case "suit":
      out += `<path d="M 90 153 L 100 190 L 110 153 Z" fill="#f7f7f7"/>`;
      out += `<path d="M 97 158 L 103 158 L 104 184 L 100 190 L 96 184 Z" fill="#c8323c"/>`;
      out += `<path d="M 86 152 L 100 196 L 94 240 L 88 240 L 92 198 L 80 158 Z M 114 152 L 100 196 L 106 240 L 112 240 L 108 198 L 120 158 Z" fill="${shade(c, 12)}" stroke="${d}" stroke-width="1"/>`;
      out += `<circle cx="100" cy="212" r="2" fill="${d}"/><circle cx="100" cy="226" r="2" fill="${d}"/>`;
      break;
    default:
      break;
  }
  return out;
}

function drawLegs(o, g, skin) {
  const [lx, rx] = g.legs;
  const w = g.legW;
  const leg = (cx, fill, top = 232, bottom = 326) =>
    `<path d="M ${cx - w / 2 - 1} ${top} L ${cx + w / 2 + 1} ${top} L ${cx + w / 2 - 1.5} ${bottom} Q ${cx} ${bottom + 3} ${cx - w / 2 + 1.5} ${bottom} Z" fill="${fill}" stroke="${OUTLINE}" stroke-width="1.2"/>`;
  const hips = (fill, bottom = 262) =>
    `<path d="M ${100 - g.hp} 232 L ${100 + g.hp} 232 L ${100 + g.hp - 2} ${bottom} L ${100 - g.hp + 2} ${bottom} Z" fill="${fill}"/>`;

  const bare = o.top === "dress" || o.bottom === "skirt" || o.bottom === "shorts";
  let out = "";

  if (bare) out += leg(lx, skin) + leg(rx, skin);

  if (o.top === "dress") return out;

  const c = o.bottomColor;
  const d = shade(c, 30);

  switch (o.bottom) {
    case "shorts":
      out += hips(c, 250) + leg(lx, c, 232, 276) + leg(rx, c, 232, 276);
      out += `<path d="M 100 244 L 100 262" stroke="${d}" stroke-width="1.4"/>`;
      break;
    case "skirt":
      out += `<path d="M ${100 - g.hp} 230 L ${100 + g.hp} 230 L ${100 + g.hp + 12} 286 Q 100 292 ${100 - g.hp - 12} 286 Z" fill="${c}" stroke="${OUTLINE}" stroke-width="1.2"/>`;
      out += [-20, -7, 7, 20].map((x) => `<path d="M ${100 + x * 0.7} 236 L ${100 + x} 288" stroke="${d}" stroke-width="1.3" opacity="0.6"/>`).join("");
      break;
    case "joggers":
      out += hips(c) + leg(lx, c) + leg(rx, c);
      out += `<rect x="${lx - w / 2}" y="312" width="${w}" height="8" rx="3" fill="${d}"/><rect x="${rx - w / 2}" y="312" width="${w}" height="8" rx="3" fill="${d}"/>`;
      out += `<path d="M ${lx + w / 2 - 3} 244 L ${lx + w / 2 - 3} 310 M ${rx - w / 2 + 3} 244 L ${rx - w / 2 + 3} 310" stroke="#fff" stroke-width="2" opacity="0.8"/>`;
      break;
    case "cargo":
      out += hips(c) + leg(lx, c) + leg(rx, c);
      out += `<rect x="${lx - w / 2 - 2}" y="268" width="11" height="15" rx="2" fill="${d}"/><rect x="${rx + w / 2 - 9}" y="268" width="11" height="15" rx="2" fill="${d}"/>`;
      break;
    default: // jeans
      out += hips(c) + leg(lx, c) + leg(rx, c);
      out += `<path d="M 100 240 L 100 262 M ${lx - 3} 262 L ${lx - 2} 322 M ${rx + 3} 262 L ${rx + 2} 322" stroke="${d}" stroke-width="1.3" opacity="0.8"/>`;
      out += `<path d="M ${100 - g.hp + 4} 240 Q ${100 - g.hp + 12} 246 ${100 - 10} 240 M ${100 + g.hp - 4} 240 Q ${100 + g.hp - 12} 246 ${100 + 10} 240" stroke="${d}" stroke-width="1.3" fill="none"/>`;
      break;
  }
  return out;
}

function drawShoes(o, g, skin) {
  const c = o.shoeColor;
  const d = shade(c, 35);
  return g.legs
    .map((cx, i) => {
      const s = i === 0 ? -1 : 1;
      const x = cx + s * 2;
      switch (o.shoes) {
        case "hightops":
          return `<path d="M ${x - 11} 304 L ${x + 11} 304 L ${x + 12} 330 L ${x - 12} 330 Z" fill="${c}" stroke="${OUTLINE}" stroke-width="1.2"/><rect x="${x - 15}" y="326" width="30" height="10" rx="5" fill="#f5f5f5" stroke="${OUTLINE}" stroke-width="1"/><path d="M ${x - 6} 310 L ${x + 6} 310 M ${x - 6} 316 L ${x + 6} 316" stroke="#fff" stroke-width="1.8"/><circle cx="${x + s * 8}" cy="318" r="3" fill="${d}"/>`;
        case "boots":
          return `<path d="M ${x - 11} 300 L ${x + 11} 300 L ${x + 13} 330 L ${x - 13} 330 Z" fill="${c}" stroke="${OUTLINE}" stroke-width="1.2"/><rect x="${x - 15}" y="327" width="30" height="9" rx="4" fill="${d}"/><path d="M ${x - 11} 306 L ${x + 11} 306" stroke="${d}" stroke-width="3"/>`;
        case "slides":
          return `<ellipse cx="${x}" cy="330" rx="12" ry="6" fill="${skin}" stroke="${OUTLINE}" stroke-width="1"/><rect x="${x - 15}" y="331" width="30" height="6" rx="3" fill="${d}"/><path d="M ${x - 12} 326 Q ${x} 318 ${x + 12} 326" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
        default: // sneakers
          return `<path d="M ${x - 13} 334 Q ${x - 14} 319 ${x - 3} 318 L ${x + 4} 318 Q ${x + 14} 320 ${x + 15} 334 Z" fill="${c}" stroke="${OUTLINE}" stroke-width="1.2"/><rect x="${x - 15}" y="330" width="31" height="6.5" rx="3" fill="#fafafa" stroke="${OUTLINE}" stroke-width="1"/><path d="M ${x - 5} 322 L ${x + 5} 322 M ${x - 5} 326 L ${x + 5} 326" stroke="${d}" stroke-width="1.6"/>`;
      }
    })
    .join("");
}

/* ---------- Head ---------- */

function hairBack(o) {
  const c = o.hairColor;
  switch (o.hair) {
    case "long":
      return `<path d="M 56 88 Q 48 192 64 208 L 136 208 Q 152 192 144 88 Z" fill="${c}"/>`;
    case "bob":
      return `<path d="M 54 86 Q 46 146 66 150 L 134 150 Q 154 146 146 86 Z" fill="${c}"/>`;
    case "bun":
      return `<circle cx="100" cy="34" r="18" fill="${c}"/><path d="M 88 46 L 112 46" stroke="${shade(c, 30)}" stroke-width="3"/>`;
    case "manbun":
      return `<circle cx="100" cy="38" r="13" fill="${c}"/>`;
    case "ponytail":
      return `<path d="M 126 52 Q 176 64 162 158 Q 150 128 130 86 Z" fill="${c}"/>`;
    case "pigtails":
      return `<ellipse cx="46" cy="124" rx="13" ry="30" fill="${c}"/><ellipse cx="154" cy="124" rx="13" ry="30" fill="${c}"/><circle cx="52" cy="94" r="5" fill="#ff7aa5"/><circle cx="148" cy="94" r="5" fill="#ff7aa5"/>`;
    case "curlylong":
      return [[60, 70], [140, 70], [52, 104], [148, 104], [54, 140], [146, 140], [62, 172], [138, 172], [80, 184], [120, 184], [100, 188]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="21" fill="${c}"/>`)
        .join("");
    case "afro":
      return `<circle cx="100" cy="74" r="60" fill="${c}"/>` +
        Array.from({ length: 14 }, (_, i) => {
          const a = (Math.PI * 2 * i) / 14;
          return `<circle cx="${(100 + Math.cos(a) * 56).toFixed(1)}" cy="${(74 + Math.sin(a) * 56).toFixed(1)}" r="12" fill="${c}"/>`;
        }).join("");
    default:
      return "";
  }
}

function hairFront(o) {
  const c = o.hairColor;
  const d = shade(c, 25);
  switch (o.hair) {
    case "short":
      return `<path d="M 56 92 Q 52 38 100 37 Q 148 38 144 92 Q 140 70 128 63 Q 110 72 88 63 Q 70 66 60 76 Q 57 82 56 92 Z" fill="${c}"/>`;
    case "fade":
      return `<path d="M 57 90 Q 50 72 58 86 Z" fill="${c}"/><path d="M 57 86 Q 58 41 100 40 Q 142 41 143 86 Q 136 60 100 58 Q 64 60 57 86 Z" fill="${c}"/><path d="M 56 84 L 58 104 M 144 84 L 142 104" stroke="${c}" stroke-width="5" opacity="0.4"/>`;
    case "buzz":
      return `<path d="M 56 90 Q 56 42 100 42 Q 144 42 144 90 Q 136 60 100 58 Q 64 60 56 90 Z" fill="${c}" opacity="0.6"/>`;
    case "spiky":
      return `<path d="M 56 92 Q 53 54 68 45 L 64 28 L 80 39 L 86 20 L 100 36 L 114 20 L 120 39 L 136 28 L 132 45 Q 147 54 144 92 Q 138 66 100 62 Q 62 66 56 92 Z" fill="${c}"/>`;
    case "sidepart":
      return `<path d="M 56 94 Q 50 36 104 37 Q 150 40 144 94 Q 140 66 124 60 Q 96 78 62 72 Q 57 80 56 94 Z" fill="${c}"/><path d="M 118 42 Q 110 54 96 62" stroke="${d}" stroke-width="2" fill="none"/>`;
    case "curly":
      return `<path d="M 58 88 Q 58 44 100 42 Q 142 44 142 88 Q 130 64 100 62 Q 70 64 58 88 Z" fill="${c}"/>` +
        [[60, 78], [64, 58], [78, 44], [96, 38], [114, 40], [130, 50], [140, 66], [142, 84]]
          .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12" fill="${c}"/>`)
          .join("");
    case "mohawk":
      return `<path d="M 56 90 Q 56 44 100 42 Q 144 44 144 90 Q 136 60 100 58 Q 64 60 56 90 Z" fill="${c}" opacity="0.3"/><path d="M 88 64 Q 84 22 100 12 Q 116 22 112 64 Q 100 58 88 64 Z" fill="${c}"/>`;
    case "manbun":
      return `<path d="M 56 90 Q 54 40 100 40 Q 146 40 144 90 Q 138 62 100 58 Q 62 62 56 90 Z" fill="${c}"/><path d="M 80 46 Q 100 56 120 46" stroke="${d}" stroke-width="1.6" fill="none"/>`;
    case "long":
    case "bun":
    case "ponytail":
    case "pigtails":
      return `<path d="M 55 100 Q 48 36 100 35 Q 152 36 145 100 Q 140 66 118 58 Q 100 70 78 66 Q 62 72 55 100 Z" fill="${c}"/>` +
        (o.hair === "long" ? `<path d="M 55 94 Q 51 140 60 160 L 68 158 Q 61 130 63 98 Z M 145 94 Q 149 140 140 160 L 132 158 Q 139 130 137 98 Z" fill="${c}"/>` : "");
    case "bob":
      return `<path d="M 56 96 Q 52 36 100 36 Q 148 36 144 96 L 141 76 Q 120 70 100 72 Q 80 70 59 76 Z" fill="${c}"/>`;
    case "curlylong":
      return `<path d="M 56 96 Q 52 38 100 38 Q 148 38 144 96 Q 136 64 100 62 Q 64 64 56 96 Z" fill="${c}"/>` +
        [[62, 66], [76, 48], [96, 40], [116, 42], [134, 54], [142, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="${c}"/>`).join("");
    case "afro":
      return `<path d="M 58 86 Q 60 52 100 50 Q 140 52 142 86 Q 130 66 100 64 Q 70 66 58 86 Z" fill="${c}"/>`;
    case "braids":
      return `<path d="M 55 98 Q 48 36 100 35 Q 152 36 145 98 Q 138 64 100 60 Q 62 64 55 98 Z" fill="${c}"/><path d="M 100 36 L 100 60" stroke="${d}" stroke-width="2"/>`;
    default:
      return "";
  }
}

// Braids hang in front of the shoulders, so they're drawn after the body.
function braidsFront(o) {
  if (o.hair !== "braids") return "";
  const c = o.hairColor;
  const d = shade(c, 30);
  return [60, 140]
    .map((x) => {
      let out = "";
      for (let i = 0; i < 8; i += 1) {
        out += `<ellipse cx="${x + (x < 100 ? 2 : -2) * (i / 7)}" cy="${104 + i * 13}" rx="7" ry="8" fill="${c}" stroke="${d}" stroke-width="1"/>`;
      }
      return out + `<circle cx="${x + (x < 100 ? 2 : -2)}" cy="${104 + 8 * 13 - 2}" r="4" fill="#ff7aa5"/>`;
    })
    .join("");
}

function drawEyes(o, g, skin) {
  const color = o.eyeColor;
  const dark = "#231815";
  const one = (x, kind) => {
    const y = 96;
    switch (kind) {
      case "happy":
        return `<path d="M ${x - 7} ${y + 2} Q ${x} ${y - 7} ${x + 7} ${y + 2}" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      case "sleepy":
        return `<ellipse cx="${x}" cy="${y + 1}" rx="8" ry="7" fill="#fff"/><circle cx="${x}" cy="${y + 2}" r="5" fill="${color}"/><circle cx="${x}" cy="${y + 2}" r="2.5" fill="${dark}"/><rect x="${x - 10}" y="${y - 8}" width="20" height="8.5" fill="${skin}"/><path d="M ${x - 9} ${y} L ${x + 9} ${y}" stroke="${dark}" stroke-width="2.4" stroke-linecap="round"/>`;
      case "star":
        return `<path d="M ${x} ${y - 9} L ${x + 2.8} ${y - 2.8} L ${x + 9} ${y - 2.4} L ${x + 4.2} ${y + 2} L ${x + 5.6} ${y + 8.4} L ${x} ${y + 5} L ${x - 5.6} ${y + 8.4} L ${x - 4.2} ${y + 2} L ${x - 9} ${y - 2.4} L ${x - 2.8} ${y - 2.8} Z" fill="#ffc933" stroke="#b7791f" stroke-width="1"/>`;
      case "hearts":
        return `<path d="M ${x} ${y + 7} C ${x - 12} ${y - 1} ${x - 6} ${y - 10} ${x} ${y - 3} C ${x + 6} ${y - 10} ${x + 12} ${y - 1} ${x} ${y + 7} Z" fill="#ef3b5d"/>`;
      default: {
        let out = `<ellipse cx="${x}" cy="${y}" rx="8" ry="7.5" fill="#fff" stroke="${OUTLINE}" stroke-width="1"/>`;
        out += `<circle cx="${x}" cy="${y + 0.6}" r="5.4" fill="${color}"/><circle cx="${x}" cy="${y + 0.6}" r="2.7" fill="${dark}"/><circle cx="${x + 2}" cy="${y - 1.6}" r="1.6" fill="#fff"/>`;
        out += `<path d="M ${x - 9} ${y - 2} Q ${x} ${y - 10} ${x + 9} ${y - 2}" stroke="${dark}" stroke-width="${g.girl ? 2.6 : 2}" fill="none" stroke-linecap="round"/>`;
        if (g.girl) {
          const s = x < 100 ? -1 : 1;
          out += `<path d="M ${x + s * 8} ${y - 3} L ${x + s * 12} ${y - 6}" stroke="${dark}" stroke-width="2" stroke-linecap="round"/>`;
        }
        return out;
      }
    }
  };

  if (o.eyes === "wink") return one(83, "normal") + one(117, "happy");
  return one(83, o.eyes) + one(117, o.eyes);
}

function drawBrows(o, g) {
  const c = shade(o.hairColor === "#efe3c2" ? "#b39b6b" : o.hairColor, 10);
  const w = g.girl ? 2.6 : 3.4;
  const y = 81;
  const path = {
    raised: `M 74 ${y - 2} Q 83 ${y - 9} 92 ${y - 3} M 108 ${y - 3} Q 117 ${y - 9} 126 ${y - 2}`,
    angry: `M 74 ${y - 4} L 92 ${y + 2} M 108 ${y + 2} L 126 ${y - 4}`,
    flat: `M 74 ${y} L 92 ${y} M 108 ${y} L 126 ${y}`,
    sad: `M 74 ${y + 1} L 92 ${y - 4} M 108 ${y - 4} L 126 ${y + 1}`,
  }[o.brows] || `M 74 ${y} Q 83 ${y - 5} 92 ${y} M 108 ${y} Q 117 ${y - 5} 126 ${y}`;
  return `<path d="${path}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
}

function drawMouth(o) {
  const lip = "#7a2331";
  switch (o.mouth) {
    case "grin":
      return `<path d="M 89 117 Q 100 127 111 117" stroke="${lip}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
    case "open":
      return `<ellipse cx="100" cy="121" rx="5.5" ry="6.5" fill="${lip}"/><ellipse cx="100" cy="124" rx="3.5" ry="2.5" fill="#ef7c8e"/>`;
    case "smirk":
      return `<path d="M 91 121 Q 103 125 111 115" stroke="${lip}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
    case "flat":
      return `<path d="M 93 120 L 107 120" stroke="${lip}" stroke-width="2.8" stroke-linecap="round"/>`;
    case "tongue":
      return `<path d="M 88 116 Q 100 131 112 116 Z" fill="${lip}"/><path d="M 94 123 Q 100 134 106 123 Z" fill="#ef7c8e"/>`;
    default: // smile
      return `<path d="M 88 115 Q 100 131 112 115 Z" fill="${lip}"/><path d="M 89.5 116 Q 100 120 110.5 116 L 109.6 118.4 Q 100 122.5 90.4 118.4 Z" fill="#fff"/>`;
  }
}

function drawFacialHair(o) {
  const c = o.hairColor;
  const stache = `<path d="M 87 113 Q 94 107 100 111 Q 106 107 113 113 Q 106 116 100 114 Q 94 116 87 113 Z" fill="${c}"/>`;
  switch (o.facialHair) {
    case "stubble":
      return `<path d="M 60 100 Q 64 139 100 140 Q 136 139 140 100 Q 130 128 100 130 Q 70 128 60 100 Z" fill="${c}" opacity="0.25"/>`;
    case "mustache":
      return stache;
    case "beard":
      return `<path d="M 57 90 Q 56 142 100 144 Q 144 142 143 90 L 137 96 Q 134 126 112 125 Q 100 121 88 125 Q 66 126 63 96 Z" fill="${c}"/>` + stache;
    case "goatee":
      return `<path d="M 92 125 Q 100 140 108 125 Q 100 129 92 125 Z" fill="${c}"/>` + stache;
    default:
      return "";
  }
}

function drawCheeks(o) {
  if (o.cheeks === "blush") {
    return `<ellipse cx="70" cy="111" rx="7.5" ry="4.2" fill="#ff7b93" opacity="0.42"/><ellipse cx="130" cy="111" rx="7.5" ry="4.2" fill="#ff7b93" opacity="0.42"/>`;
  }
  if (o.cheeks === "freckles") {
    return [[68, 108], [74, 111], [70, 114], [126, 108], [132, 111], [130, 114]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#a0603c" opacity="0.7"/>`)
      .join("");
  }
  return "";
}

function drawGlasses(o) {
  const frame = "#262224";
  switch (o.glasses) {
    case "round":
      return `<circle cx="83" cy="96" r="11.5" fill="rgba(255,255,255,0.12)" stroke="${frame}" stroke-width="2.4"/><circle cx="117" cy="96" r="11.5" fill="rgba(255,255,255,0.12)" stroke="${frame}" stroke-width="2.4"/><path d="M 94.5 95 Q 100 91 105.5 95 M 71.5 94 L 58 91 M 128.5 94 L 142 91" stroke="${frame}" stroke-width="2.2" fill="none"/>`;
    case "square":
      return `<rect x="70" y="87" width="26" height="19" rx="4" fill="rgba(255,255,255,0.12)" stroke="${frame}" stroke-width="2.6"/><rect x="104" y="87" width="26" height="19" rx="4" fill="rgba(255,255,255,0.12)" stroke="${frame}" stroke-width="2.6"/><path d="M 96 94 L 104 94 M 70 92 L 58 90 M 130 92 L 142 90" stroke="${frame}" stroke-width="2.4"/>`;
    case "sunglasses":
      return `<path d="M 68 88 L 97 88 L 95 103 Q 83 108 70 102 Z M 103 88 L 132 88 L 130 102 Q 117 108 105 103 Z" fill="#141416" stroke="#000" stroke-width="1.5"/><path d="M 97 91 L 103 91 M 68 90 L 58 88 M 132 90 L 142 88" stroke="#000" stroke-width="2.4"/><path d="M 73 92 L 80 92" stroke="#fff" stroke-width="2" opacity="0.5"/>`;
    case "aviators":
      return `<path d="M 70 89 L 96 89 Q 97 106 84 107 Q 70 106 70 89 Z M 104 89 L 130 89 Q 130 106 116 107 Q 103 106 104 89 Z" fill="rgba(60,40,20,0.75)" stroke="#c9a14a" stroke-width="1.8"/><path d="M 96 91 Q 100 88 104 91 M 70 90 L 58 88 M 130 90 L 142 88" stroke="#c9a14a" stroke-width="1.8" fill="none"/>`;
    case "heart":
      return [83, 117]
        .map((x) => `<path d="M ${x} 107 C ${x - 18} 96 ${x - 10} 82 ${x} 91 C ${x + 10} 82 ${x + 18} 96 ${x} 107 Z" fill="rgba(255,90,140,0.6)" stroke="#e23d78" stroke-width="2"/>`)
        .join("") + `<path d="M 93 93 L 107 93" stroke="#e23d78" stroke-width="2"/>`;
    case "eyepatch":
      return `<path d="M 56 76 L 144 104" stroke="#141414" stroke-width="2.4"/><ellipse cx="117" cy="97" rx="11" ry="10" fill="#141414"/>`;
    default:
      return "";
  }
}

function drawHat(o) {
  const c = o.hatColor || "#e24b4a";
  const d = shade(c, 35);
  switch (o.hat) {
    case "cap":
      return `<path d="M 54 80 Q 54 28 100 28 Q 146 28 146 80 Z" fill="${c}" stroke="${OUTLINE}" stroke-width="1.2"/><path d="M 54 76 Q 100 64 150 74 Q 166 80 152 88 Q 100 76 54 86 Z" fill="${d}"/><circle cx="100" cy="30" r="3" fill="${d}"/><path d="M 100 30 L 100 76" stroke="${d}" stroke-width="1.2" opacity="0.6"/>`;
    case "beanie":
      return `<path d="M 53 84 Q 52 24 100 24 Q 148 24 147 84 Z" fill="${c}"/><rect x="51" y="70" width="98" height="17" rx="7" fill="${d}"/>` +
        [60, 70, 80, 90, 100, 110, 120, 130, 140].map((x) => `<path d="M ${x} 72 L ${x} 85" stroke="${shade(c, 55)}" stroke-width="1.4"/>`).join("") +
        `<circle cx="100" cy="22" r="10" fill="#f5f5f5"/>`;
    case "crown":
      return `<path d="M 66 58 L 64 26 L 80 42 L 100 18 L 120 42 L 136 26 L 134 58 Z" fill="#ffc933" stroke="#b7791f" stroke-width="2"/><circle cx="100" cy="44" r="4.5" fill="#e0344e"/><circle cx="80" cy="49" r="3.2" fill="#3a7bf0"/><circle cx="120" cy="49" r="3.2" fill="#3a7bf0"/>`;
    case "headphones":
      return `<path d="M 52 98 Q 50 26 100 26 Q 150 26 148 98" stroke="#26262b" stroke-width="8" fill="none"/><rect x="42" y="84" width="16" height="30" rx="7" fill="#26262b"/><rect x="142" y="84" width="16" height="30" rx="7" fill="#26262b"/><rect x="45" y="89" width="4" height="20" rx="2" fill="#7cf0ff"/><rect x="151" y="89" width="4" height="20" rx="2" fill="#7cf0ff"/>`;
    case "catears":
      return `<path d="M 60 62 L 62 22 L 90 44 Z M 140 62 L 138 22 L 110 44 Z" fill="${c}" stroke="${d}" stroke-width="2"/><path d="M 66 52 L 67 32 L 82 44 Z M 134 52 L 133 32 L 118 44 Z" fill="#ffb3c8"/>`;
    case "bandana":
      return `<path d="M 55 70 Q 100 52 145 70 L 145 82 Q 100 64 55 82 Z" fill="${c}"/><path d="M 145 72 L 160 66 L 156 80 Z M 145 76 L 158 88 L 148 88 Z" fill="${d}"/>` +
        [74, 92, 110, 128].map((x) => `<circle cx="${x}" cy="${70 - (x > 100 ? (128 - x) / 6 : (x - 74) / 6)}" r="1.6" fill="#fff"/>`).join("");
    case "horns":
      return `<path d="M 68 52 Q 50 40 56 16 Q 66 36 80 44 Z M 132 52 Q 150 40 144 16 Q 134 36 120 44 Z" fill="#c62828" stroke="#7f1414" stroke-width="1.5"/>`;
    case "halo":
      return `<ellipse cx="100" cy="20" rx="30" ry="7" fill="none" stroke="#ffd65a" stroke-width="5"/>`;
    default:
      return "";
  }
}

function drawJewelry(o) {
  let out = "";
  if (o.earrings === "studs") out += `<circle cx="57" cy="106" r="2.6" fill="#ffd65a"/><circle cx="143" cy="106" r="2.6" fill="#ffd65a"/>`;
  if (o.earrings === "hoops") out += `<circle cx="57" cy="111" r="6" fill="none" stroke="#ffd65a" stroke-width="2.4"/><circle cx="143" cy="111" r="6" fill="none" stroke="#ffd65a" stroke-width="2.4"/>`;
  return out;
}

function drawNecklace(o) {
  if (o.necklace === "chain") {
    return `<path d="M 86 154 Q 100 178 114 154" stroke="#ffd65a" stroke-width="3" fill="none" stroke-dasharray="3 1.5"/><circle cx="100" cy="171" r="4.5" fill="#ffd65a" stroke="#b7791f" stroke-width="1"/>`;
  }
  if (o.necklace === "pearls") {
    return Array.from({ length: 9 }, (_, i) => {
      const t = i / 8;
      const x = 88 + 24 * t;
      const y = 154 + Math.sin(Math.PI * t) * 13;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.3" fill="#fdf7ee" stroke="#d9cbb3" stroke-width="0.6"/>`;
    }).join("");
  }
  return "";
}

function drawHead(o, g, skin) {
  const hides = o.hat === "beanie" || o.hat === "cap";
  let out = "";

  out += `<rect x="91" y="128" width="18" height="30" rx="7" fill="${shade(skin, 18)}"/>`;
  out += `<circle cx="57" cy="97" r="9" fill="${skin}" stroke="${OUTLINE}" stroke-width="1.2"/><circle cx="143" cy="97" r="9" fill="${skin}" stroke="${OUTLINE}" stroke-width="1.2"/>`;
  out += `<ellipse cx="100" cy="90" rx="44" ry="47" fill="${skin}" stroke="${OUTLINE}" stroke-width="1.4"/>`;
  out += drawCheeks(o);
  out += drawFacialHair(o);
  out += drawEyes(o, g, skin);
  out += drawBrows(o, g);
  out += `<path d="M 100 100 Q 104 107 98 109" stroke="${shade(skin, 45)}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  out += drawMouth(o);
  if (!(hides && ["short", "fade", "buzz", "spiky", "sidepart", "curly", "mohawk", "manbun"].includes(o.hair))) out += hairFront(o);
  else out += `<path d="M 56 94 Q 55 80 60 76 L 60 96 Z M 144 94 Q 145 80 140 76 L 140 96 Z" fill="${o.hairColor}"/>`;
  out += drawJewelry(o);
  out += drawGlasses(o);
  out += drawHat(o);
  return out;
}

/* ---------- Public ---------- */

export const FB_BACKGROUND_FALLBACK = ["b6e3f4"];

// view: "full" (whole body, transparent) or "head" (square face crop with background).
export function fullBodySvg(o, view = "full", bgColors = FB_BACKGROUND_FALLBACK) {
  const g = geometry(o);
  const skin = o.skin;
  let body = "";

  const hideBackHair = o.hat === "beanie" && ["bun", "manbun", "ponytail"].includes(o.hair);
  if (!hideBackHair) body += hairBack(o);

  if (view === "full") {
    body += `<ellipse cx="100" cy="338" rx="54" ry="7" fill="rgba(0,0,0,0.16)"/>`;
    body += drawLegs(o, g, skin);
    body += drawShoes(o, g, skin);
  }

  body += drawTop(o, g, skin);
  body += drawNecklace(o);

  body += drawHead(o, g, skin);

  // After the head so a raised hand (wave, peace) sits in front of hair.
  if (view === "full") {
    for (const arm of arms(o, g)) body += drawArm(arm, o, g, skin);
  }

  body += braidsFront(o);

  if (view === "head") {
    const [a, b] = bgColors;
    const fill = b ? "url(#fbbg)" : `#${a}`;
    const defs = b
      ? `<defs><linearGradient id="fbbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#${a}"/><stop offset="1" stop-color="#${b}"/></linearGradient></defs>`
      : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="30 22 140 140">${defs}<rect x="30" y="22" width="140" height="140" fill="${fill}"/>${body}</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 6 200 342">${body}</svg>`;
}

export const svgToUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
