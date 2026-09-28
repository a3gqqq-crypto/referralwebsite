// Real-time 3D avatar (prototype). Built from simple 3D shapes with the 2D
// face painted onto the head. Loaded lazily; see components/Avatar3D.jsx.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { faceDecalSvg, svgToUri } from "./fullbody";

const SLEEVES = {
  tee: "short", crop: "short", jersey: "none", dress: "none", tank: "none",
  hoodie: "long", sweater: "long", shirt: "long", bomber: "long", leather: "long",
  puffer: "long", suit: "long", varsity: "long", tracksuit: "long",
};

// Arm angles (radians, right arm; left mirrors): [shoulder, elbow].
const POSES = {
  stand: { right: [0.12, 0], left: [0.12, 0] },
  wave: { right: [2.45, 0.35], left: [0.12, 0], wave: true },
  peace: { right: [2.2, 0.8], left: [0.12, 0], peace: true },
  hips: { right: [0.55, -2.05], left: [0.55, -2.05] },
  flex: { right: [1.55, 1.55], left: [1.55, 1.55] },
};

const HEAD_Y = 3.45;

function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.02, ...extra });
}

function mesh(geometry, mat, [x = 0, y = 0, z = 0] = [], scale = null) {
  const m = new THREE.Mesh(geometry, mat);
  m.position.set(x, y, z);
  if (scale) m.scale.set(...scale);
  m.castShadow = true;
  return m;
}

const sphere = (r, seg = 32) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75));
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 8, 20);

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

// Paints the face features onto an equirectangular texture for the head sphere.
async function faceTexture(o) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const image = await loadImage(svgToUri(faceDecalSvg(o)));

  // Face centre (100, 90) lands on the front of the sphere (u = 0.25, v = 0.5).
  const scale = 3.55;
  ctx.drawImage(image, 256 - 50 * scale, 256 - 30 * scale, 100 * scale, 90 * scale);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/* ---------- Hair ---------- */

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// A sphere with the face cut out along a smooth hairline. hairline(angle)
// gives how far down (polar angle) the hair reaches at each angle around the
// head (0 = front, ±π = back).
function hairShell(radius, hairline) {
  // Instead of cutting triangles (jagged), pull every vertex below the
  // hairline up onto it, so the edge follows the curve smoothly.
  const geometry = new THREE.SphereGeometry(radius, 96, 64);
  const position = geometry.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    const theta = Math.acos(Math.max(-1, Math.min(1, v.y / radius)));
    const angle = Math.atan2(v.x, v.z);
    const limit = hairline(angle);
    if (theta <= limit) continue;

    const ring = Math.sqrt(v.x * v.x + v.z * v.z) || 1;
    const r = radius * Math.sin(limit);
    position.setXYZ(i, (v.x / ring) * r, radius * Math.cos(limit), (v.z / ring) * r);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function hairCap(mat, { thetaFront = 0.34, thetaSide = 0.5, thetaBack = 0.64, radius = 1.07, lift = 0, bangs = false } = {}) {
  const hairline = (angle) => {
    const a = Math.abs(angle);
    let theta =
      thetaFront +
      (thetaSide - thetaFront) * smoothstep(0.25, Math.PI / 2, a) +
      (thetaBack - thetaSide) * smoothstep(Math.PI / 2, Math.PI * 0.85, a);
    // Wispy bangs across the forehead.
    if (bangs && a < 0.9) theta += 0.03 * Math.sin(a * 16) * (1 - a / 0.9);
    return theta * Math.PI;
  };

  const shell = mesh(hairShell(radius, hairline), mat, [0, lift, 0], [1.02, 1.04, 1.03]);
  return shell;
}

function backCurtain(mat, height, radius = 1.06, flare = 0.12) {
  const geo = new THREE.CylinderGeometry(radius, radius + flare, height, 32, 1, true, Math.PI / 2, Math.PI);
  const m = mesh(geo, mat, [0, -height / 2 + 0.1, -0.05]);
  m.material.side = THREE.DoubleSide;
  return m;
}

function sideStrands(mat, length) {
  const group = new THREE.Group();
  for (const s of [-1, 1]) {
    group.add(mesh(capsule(0.2, length), mat, [s * 0.92, -length / 2 + 0.05, 0.25], [1, 1, 0.6]));
  }
  return group;
}

function bumps(mat, count, radius, thetaMax, size) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i += 1) {
    const phi = (i / count) * Math.PI * 2 * 3.3;
    const theta = Math.acos(1 - ((i + 0.5) / count) * (1 - Math.cos(thetaMax)));
    const x = -radius * Math.cos(phi) * Math.sin(theta);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(theta);
    // Keep the face clear.
    if (z > 0.55 && y < 0.5) continue;
    group.add(mesh(sphere(size, 16), mat, [x, y, z]));
  }
  return group;
}

function buildHair(o, mat) {
  const group = new THREE.Group();
  const add = (...items) => items.forEach((item) => group.add(item));
  mat.side = THREE.DoubleSide;

  // Under a cap, beanie or bucket hat only the hair that hangs down shows.
  if (["cap", "beanie", "bucket"].includes(o.hat) && o.hair && o.hair !== "bald") {
    add(mesh(new THREE.SphereGeometry(1.05, 40, 24, Math.PI, Math.PI, 0, Math.PI * 0.6), mat));
    if (["long", "sidebangs", "curlylong", "wolfcut"].includes(o.hair)) add(backCurtain(mat, 2.1), sideStrands(mat, 1.3));
    if (o.hair === "bob") add(backCurtain(mat, 1.35, 1.1, 0.08), sideStrands(mat, 0.95));
    if (o.hair === "pigtails") add(mesh(capsule(0.24, 0.9), mat, [-1.1, -0.35, -0.1]), mesh(capsule(0.24, 0.9), mat, [1.1, -0.35, -0.1]));
    if (o.hair === "ponytail") add(mesh(capsule(0.22, 1.1), mat, [0, -0.45, -1.12]));
    if (o.hair === "braids") for (const s of [-1, 1]) for (let i = 0; i < 8; i += 1) add(mesh(sphere(0.17, 16), mat, [s * 0.88, -0.2 - i * 0.26, 0.28]));
    return group;
  }

  switch (o.hair) {
    case "":
    case "bald":
      break;
    case "buzz": {
      const thin = mat.clone();
      thin.transparent = true;
      thin.opacity = 0.6;
      add(hairCap(thin, { radius: 1.02 }));
      break;
    }
    case "fade":
      add(hairCap(mat, { radius: 1.04, thetaBack: 0.5 }));
      break;
    case "spiky": {
      add(hairCap(mat));
      for (let i = 0; i < 9; i += 1) {
        const a = (i / 9) * Math.PI * 2;
        const cone = mesh(new THREE.ConeGeometry(0.2, 0.55, 12), mat, [Math.sin(a) * 0.55, 1.0, Math.cos(a) * 0.55 - 0.05]);
        cone.rotation.x = Math.cos(a) * 0.6;
        cone.rotation.z = -Math.sin(a) * 0.6;
        add(cone);
      }
      break;
    }
    case "mohawk": {
      const thin = mat.clone();
      thin.transparent = true;
      thin.opacity = 0.35;
      add(hairCap(thin, { radius: 1.02 }), mesh(sphere(0.5), mat, [0, 0.95, -0.05], [0.4, 0.9, 1.9]));
      break;
    }
    case "curly":
    case "twists":
      add(hairCap(mat, { radius: 1.03 }), bumps(mat, 46, 1.08, Math.PI * 0.42, o.hair === "twists" ? 0.17 : 0.24));
      break;
    case "afro":
      add(mesh(new THREE.SphereGeometry(1.45, 48, 32, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0, Math.PI * 0.78), mat, [0, 0.32, -0.15]));
      add(bumps(mat, 22, 1.32, Math.PI * 0.72, 0.5));
      add(hairCap(mat, { radius: 1.05, thetaFront: 0.33 }));
      break;
    case "manbun":
      add(hairCap(mat), mesh(sphere(0.32), mat, [0, 0.85, -0.75]));
      break;
    case "undercut":
      add(hairCap(mat, { lift: 0.08, thetaBack: 0.45, radius: 1.08 }));
      break;
    case "locs": {
      add(hairCap(mat));
      for (let i = 0; i < 11; i += 1) {
        const a = Math.PI * 0.62 + (i / 10) * Math.PI * 1.76;
        add(mesh(capsule(0.1, 1.1), mat, [-Math.cos(a) * 1.02, -0.55, Math.sin(a) * 1.02]));
      }
      break;
    }
    case "long":
    case "sidebangs":
      add(hairCap(mat, { thetaFront: 0.37, thetaSide: 0.58, thetaBack: 0.66, bangs: true }), backCurtain(mat, 2.3), sideStrands(mat, 1.5));
      if (o.hair === "sidebangs") add(mesh(sphere(0.5), mat, [-0.42, 0.55, 0.8], [1.3, 0.45, 0.4]));
      break;
    case "curlylong":
      add(hairCap(mat), bumps(mat, 36, 1.1, Math.PI * 0.45, 0.24), backCurtain(mat, 2.1, 1.12, 0.3), sideStrands(mat, 1.3));
      break;
    case "bob":
      add(hairCap(mat, { thetaFront: 0.38, thetaSide: 0.6, bangs: true }), backCurtain(mat, 1.35, 1.1, 0.08), sideStrands(mat, 0.95));
      break;
    case "wolfcut":
      add(hairCap(mat, { radius: 1.09, thetaFront: 0.38, thetaSide: 0.58, bangs: true }), backCurtain(mat, 1.6, 1.1, 0.2), sideStrands(mat, 0.9));
      break;
    case "bun":
      add(hairCap(mat, { bangs: true, thetaFront: 0.36 }), mesh(sphere(0.42), mat, [0, 1.05, -0.35]));
      break;
    case "spacebuns":
      add(hairCap(mat, { bangs: true, thetaFront: 0.36 }), mesh(sphere(0.38), mat, [-0.62, 0.85, -0.1]), mesh(sphere(0.38), mat, [0.62, 0.85, -0.1]));
      break;
    case "ponytail":
      add(hairCap(mat, { bangs: true, thetaFront: 0.36 }), mesh(sphere(0.2), mat, [0, 0.35, -1.02]), mesh(capsule(0.22, 1.1), mat, [0, -0.45, -1.12]));
      break;
    case "pigtails":
      add(hairCap(mat, { bangs: true, thetaFront: 0.36 }), mesh(capsule(0.24, 0.9), mat, [-1.1, -0.35, -0.1]), mesh(capsule(0.24, 0.9), mat, [1.1, -0.35, -0.1]));
      break;
    case "braids": {
      add(hairCap(mat));
      for (const s of [-1, 1]) {
        for (let i = 0; i < 8; i += 1) add(mesh(sphere(0.17, 16), mat, [s * 0.88, -0.2 - i * 0.26, 0.28]));
      }
      break;
    }
    default: // short, sidepart, slickback
      add(hairCap(mat, { radius: o.hair === "slickback" ? 1.05 : 1.07 }));
      break;
  }
  return group;
}

/* ---------- Hats, glasses, jewelry ---------- */

function buildHat(o) {
  const group = new THREE.Group();
  const c = material(o.hatColor || "#e24b4a");
  const gold = material("#ffc933", { metalness: 0.6, roughness: 0.3 });

  switch (o.hat) {
    case "cap": {
      group.add(mesh(new THREE.SphereGeometry(1.12, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.46), c));
      const brim = mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.06, 32), c, [0, 0.2, 1.05], [1, 1, 0.8]);
      brim.rotation.x = 0.18;
      group.add(brim);
      break;
    }
    case "beanie":
      group.add(mesh(new THREE.SphereGeometry(1.14, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), c));
      group.add(mesh(new THREE.TorusGeometry(1.1, 0.13, 12, 40), c, [0, 0.12, 0]).rotateX(Math.PI / 2));
      group.add(mesh(sphere(0.25), material("#f5f5f5"), [0, 1.2, 0]));
      break;
    case "bucket":
      group.add(mesh(new THREE.CylinderGeometry(0.8, 1.02, 0.6, 32), c, [0, 0.82, 0]));
      group.add(mesh(new THREE.CylinderGeometry(1.4, 1.45, 0.05, 40), c, [0, 0.52, 0]));
      break;
    case "headband":
    case "bandana":
      group.add(mesh(new THREE.TorusGeometry(1.04, 0.1, 12, 40), c, [0, 0.45, 0]).rotateX(Math.PI / 2 - 0.12));
      break;
    case "crown":
      group.add(mesh(new THREE.CylinderGeometry(0.62, 0.55, 0.42, 24, 1, true), gold, [0, 1.05, 0]));
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        group.add(mesh(new THREE.ConeGeometry(0.12, 0.3, 8), gold, [Math.sin(a) * 0.6, 1.4, Math.cos(a) * 0.6]));
      }
      group.add(mesh(sphere(0.08, 12), material("#e0344e", { roughness: 0.2 }), [0, 1.08, 0.6]));
      break;
    case "halo":
      group.add(mesh(new THREE.TorusGeometry(0.55, 0.06, 12, 40), material("#ffd65a", { emissive: "#ffb300", emissiveIntensity: 0.8 }), [0, 1.45, 0]).rotateX(Math.PI / 2));
      break;
    case "headphones": {
      const dark = material("#26262b");
      const band = mesh(new THREE.TorusGeometry(1.12, 0.07, 12, 40, Math.PI), dark, [0, 0.05, 0]);
      group.add(band);
      for (const s of [-1, 1]) {
        const cup = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 24), dark, [s * 1.1, 0, 0]);
        cup.rotation.z = Math.PI / 2;
        group.add(cup);
        const glow = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24), material("#7cf0ff", { emissive: "#35e0ff", emissiveIntensity: 1 }), [s * 1.21, 0, 0]);
        glow.rotation.z = Math.PI / 2;
        group.add(glow);
      }
      break;
    }
    case "catears":
      for (const s of [-1, 1]) {
        const ear = mesh(new THREE.ConeGeometry(0.28, 0.5, 4), c, [s * 0.55, 1.0, 0]);
        ear.rotation.z = -s * 0.35;
        group.add(ear);
      }
      break;
    case "horns":
      for (const s of [-1, 1]) {
        const horn = mesh(new THREE.ConeGeometry(0.14, 0.55, 12), material("#c62828"), [s * 0.5, 1.05, 0.1]);
        horn.rotation.z = -s * 0.5;
        group.add(horn);
      }
      break;
    default:
      break;
  }
  return group;
}

function buildGlasses(o) {
  const group = new THREE.Group();
  if (!o.glasses) return group;

  const frame = material(o.glasses === "aviators" ? "#c9a14a" : o.glasses === "heart" ? "#e23d78" : "#262224", { metalness: 0.3 });
  const y = -0.12;
  const z = 0.95;

  if (o.glasses === "eyepatch") {
    group.add(mesh(new THREE.CircleGeometry(0.22, 24), material("#141414"), [0.33, y, z + 0.02]));
    group.add(mesh(new THREE.TorusGeometry(1.01, 0.02, 8, 48), material("#141414"), [0, 0.05, 0]).rotateZ(-0.3).rotateX(Math.PI / 2 - 0.1));
    return group;
  }

  const tinted = ["sunglasses", "aviators", "heart"].includes(o.glasses);
  for (const s of [-1, 1]) {
    const ring = mesh(new THREE.TorusGeometry(0.2, 0.035, 10, o.glasses === "square" ? 4 : 32), frame, [s * 0.33, y, z]);
    if (o.glasses === "square") ring.rotation.z = Math.PI / 4;
    group.add(ring);
    if (tinted) {
      group.add(
        mesh(
          new THREE.CircleGeometry(0.2, 32),
          material(o.glasses === "heart" ? "#ff5a8c" : "#141416", { transparent: true, opacity: o.glasses === "heart" ? 0.6 : 0.9, roughness: 0.15 }),
          [s * 0.33, y, z + 0.01]
        )
      );
    }
  }
  group.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 8), frame, [0, y + 0.02, z + 0.02]).rotateZ(Math.PI / 2));
  return group;
}

function buildEarrings(o) {
  const group = new THREE.Group();
  const gold = material("#ffd65a", { metalness: 0.7, roughness: 0.25 });
  for (const s of [-1, 1]) {
    if (o.earrings === "studs") group.add(mesh(sphere(0.06, 12), gold, [s * 1.0, -0.3, 0.1]));
    if (o.earrings === "hoops") group.add(mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 24), gold, [s * 1.0, -0.4, 0.1]).rotateY(Math.PI / 2));
  }
  return group;
}

/* ---------- Body ---------- */

const TORSO_BOTTOM = 1.2;
const TORSO_HEIGHT = 1.35;

// Torso radius from hips (t = 0) to neck (t = 1).
const TORSO_PROFILE = {
  guy: [[0, 0.44], [0.15, 0.47], [0.4, 0.46], [0.62, 0.53], [0.8, 0.6], [0.88, 0.58], [0.94, 0.46], [0.98, 0.3], [1, 0.2]],
  girl: [[0, 0.46], [0.15, 0.48], [0.38, 0.38], [0.62, 0.46], [0.8, 0.5], [0.88, 0.48], [0.94, 0.38], [0.98, 0.26], [1, 0.18]],
};

function profileAt(profile, t) {
  for (let i = 1; i < profile.length; i += 1) {
    const [t1, r1] = profile[i];
    const [t0, r0] = profile[i - 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      const smooth = k * k * (3 - 2 * k);
      return r0 + (r1 - r0) * smooth;
    }
  }
  return profile[profile.length - 1][1];
}

// Evenly spaced rings so the clothing texture isn't stretched.
function latheFromProfile(profile, height, rings = 28) {
  const points = [];
  for (let i = 0; i <= rings; i += 1) {
    const t = i / rings;
    points.push(new THREE.Vector2(Math.max(0.001, profileAt(profile, t)), t * height));
  }
  // Front of the body (+z) sits in the middle of the texture (u = 0.5).
  return new THREE.LatheGeometry(points, 48, -Math.PI, Math.PI * 2);
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function shadeHex(hex, amount) {
  const n = parseInt(hex.replace("#", ""), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) - amount);
  const g = clamp(((n >> 8) & 255) - amount);
  const b = clamp((n & 255) - amount);
  return `rgb(${r}, ${g}, ${b})`;
}

// Front details of each top, painted onto the torso (front centre is x = 256,
// the front half spans x 128-384; y 0 is the neck, y 256 the hips).
function torsoTexture(o) {
  const c = o.top === "leather" ? "#232326" : o.topColor;
  const d = shadeHex(c, 38);
  const light = shadeHex(c, -30);

  return canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 512, 256);
    const round = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    };
    const line = (x0, y0, x1, y1, color, width) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    };
    const neckline = (depth, color = o.skin) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(256, 0, 34, depth, 0, 0, Math.PI);
      ctx.fill();
    };
    const hem = (color) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 238, 512, 18);
    };

    switch (o.top) {
      case "hoodie":
        ctx.fillStyle = d;
        ctx.beginPath();
        ctx.ellipse(256, 6, 70, 26, 0, 0, Math.PI);
        ctx.fill();
        line(244, 20, 242, 92, "#f5f5f5", 5);
        line(268, 20, 270, 92, "#f5f5f5", 5);
        round(196, 150, 120, 62, 18);
        ctx.fillStyle = shadeHex(c, 16);
        ctx.fill();
        line(196, 150, 316, 150, d, 3);
        hem(d);
        break;
      case "tee":
      case "crop":
        neckline(22);
        line(222, 0, 290, 0, d, 6);
        if (o.top === "crop") {
          ctx.fillStyle = o.skin;
          ctx.fillRect(0, 196, 512, 60);
          line(0, 196, 512, 196, d, 4);
        }
        break;
      case "tank":
        neckline(44);
        break;
      case "sweater":
        neckline(18);
        ctx.strokeStyle = d;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.ellipse(256, 0, 38, 22, 0, 0, Math.PI);
        ctx.stroke();
        ctx.fillStyle = light;
        ctx.fillRect(0, 96, 512, 18);
        hem(d);
        for (let x = 0; x < 512; x += 8) line(x, 238, x, 256, shadeHex(c, 50), 2);
        break;
      case "shirt":
        ctx.fillStyle = o.skin;
        ctx.beginPath();
        ctx.moveTo(236, 0);
        ctx.lineTo(256, 38);
        ctx.lineTo(276, 0);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.moveTo(222, 0);
        ctx.lineTo(254, 42);
        ctx.lineTo(236, 48);
        ctx.lineTo(210, 8);
        ctx.moveTo(290, 0);
        ctx.lineTo(258, 42);
        ctx.lineTo(276, 48);
        ctx.lineTo(302, 8);
        ctx.fill();
        line(256, 40, 256, 256, d, 2);
        for (const y of [80, 125, 170, 215]) {
          ctx.fillStyle = d;
          ctx.beginPath();
          ctx.arc(262, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case "jersey":
        neckline(40);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(256, 0, 36, 42, 0, 0, Math.PI);
        ctx.stroke();
        ctx.font = "900 78px Arial Black, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = d;
        ctx.lineWidth = 3;
        ctx.fillText("23", 256, 170);
        ctx.strokeText("23", 256, 170);
        line(128, 60, 128, 256, "#fff", 10);
        line(384, 60, 384, 256, "#fff", 10);
        break;
      case "bomber":
        ctx.fillStyle = "#1d1d22";
        ctx.beginPath();
        ctx.ellipse(256, 0, 44, 20, 0, 0, Math.PI);
        ctx.fill();
        hem("#1d1d22");
        ctx.setLineDash([6, 5]);
        line(256, 18, 256, 240, "#c9c9c9", 5);
        ctx.setLineDash([]);
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        ctx.arc(300, 70, 16, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "leather":
        ctx.fillStyle = o.topColor;
        ctx.fillRect(232, 0, 48, 256);
        ctx.fillStyle = "#34343a";
        ctx.beginPath();
        ctx.moveTo(212, 0);
        ctx.lineTo(240, 110);
        ctx.lineTo(226, 256);
        ctx.lineTo(196, 256);
        ctx.lineTo(212, 120);
        ctx.lineTo(186, 20);
        ctx.moveTo(300, 0);
        ctx.lineTo(272, 110);
        ctx.lineTo(286, 256);
        ctx.lineTo(316, 256);
        ctx.lineTo(300, 120);
        ctx.lineTo(326, 20);
        ctx.fill();
        break;
      case "puffer":
        for (const y of [60, 118, 176, 234]) line(0, y, 512, y, d, 5);
        line(256, 0, 256, 256, d, 4);
        ctx.fillStyle = d;
        ctx.fillRect(210, 0, 92, 16);
        break;
      case "suit":
        ctx.fillStyle = "#f7f7f7";
        ctx.beginPath();
        ctx.moveTo(226, 0);
        ctx.lineTo(256, 120);
        ctx.lineTo(286, 0);
        ctx.fill();
        ctx.fillStyle = "#c8323c";
        ctx.beginPath();
        ctx.moveTo(250, 12);
        ctx.lineTo(262, 12);
        ctx.lineTo(266, 96);
        ctx.lineTo(256, 112);
        ctx.lineTo(246, 96);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.moveTo(214, 0);
        ctx.lineTo(256, 132);
        ctx.lineTo(236, 136);
        ctx.lineTo(200, 16);
        ctx.moveTo(298, 0);
        ctx.lineTo(256, 132);
        ctx.lineTo(276, 136);
        ctx.lineTo(312, 16);
        ctx.fill();
        for (const y of [168, 208]) {
          ctx.fillStyle = d;
          ctx.beginPath();
          ctx.arc(256, y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case "varsity":
        ctx.fillStyle = "#f4f1ea";
        ctx.beginPath();
        ctx.ellipse(256, 0, 44, 20, 0, 0, Math.PI);
        ctx.fill();
        hem("#f4f1ea");
        line(0, 247, 512, 247, d, 5);
        line(256, 18, 256, 238, d, 3);
        for (const y of [60, 110, 160, 210]) {
          ctx.fillStyle = "#f4f1ea";
          ctx.beginPath();
          ctx.arc(248, y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.font = "700 64px Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#f4f1ea";
        ctx.fillText("S", 206, 118);
        break;
      case "tracksuit":
        ctx.fillStyle = d;
        ctx.fillRect(214, 0, 84, 18);
        line(256, 14, 256, 256, "#e8e8e8", 4);
        line(150, 0, 150, 256, "#fff", 8);
        line(362, 0, 362, 256, "#fff", 8);
        break;
      case "dress":
        neckline(30);
        break;
      default:
        neckline(20);
        break;
    }
  });
}

// Pants: seams and pockets, or stripes for track pants.
function legTexture(o) {
  const c = o.bottomColor;
  const d = shadeHex(c, 34);
  return canvasTexture(128, 256, (ctx) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 128, 256);
    if (o.bottom === "trackpants" || o.bottom === "joggers") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 8, 256);
      ctx.fillRect(120, 0, 8, 256);
    }
    if (o.bottom === "jeans" || o.bottom === "ripped") {
      ctx.strokeStyle = d;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(4, 256);
      ctx.moveTo(124, 0);
      ctx.lineTo(124, 256);
      ctx.stroke();
    }
    if (o.bottom === "ripped") {
      ctx.fillStyle = o.skin;
      ctx.beginPath();
      ctx.ellipse(64, 110, 20, 7, 0, 0, Math.PI * 2);
      ctx.ellipse(56, 170, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (o.bottom === "cargo") {
      ctx.fillStyle = d;
      ctx.fillRect(0, 90, 26, 48);
      ctx.fillRect(102, 90, 26, 48);
    }
    if (o.bottom === "joggers") {
      ctx.fillStyle = d;
      ctx.fillRect(0, 230, 128, 26);
    }
  });
}

function buildArm(o, side, pose, skinMat, sleeveMat) {
  const girl = o.body === "girl";
  const shoulder = new THREE.Group();
  shoulder.position.set(side * (girl ? 0.5 : 0.6), TORSO_BOTTOM + TORSO_HEIGHT * 0.82, 0);

  const sleeve = SLEEVES[o.top] || "long";
  const [shoulderAngle, elbowAngle] = side > 0 ? pose.right : pose.left;
  shoulder.rotation.z = side * shoulderAngle;

  const r = girl ? 0.125 : 0.145;
  const thick = sleeve === "none" ? 0 : o.top === "puffer" ? 0.05 : 0.02;
  const upperMat = sleeve === "none" ? skinMat : sleeveMat;
  const foreMat = sleeve === "long" ? sleeveMat : skinMat;

  shoulder.add(mesh(sphere(r + thick + 0.01), upperMat));
  shoulder.add(mesh(new THREE.CylinderGeometry(r + thick, r * 0.92 + thick, 0.62, 20), upperMat, [0, -0.31, 0]));

  const elbow = new THREE.Group();
  elbow.position.set(0, -0.62, 0);
  elbow.rotation.z = side * elbowAngle;
  shoulder.add(elbow);

  elbow.add(mesh(sphere(r * 0.92 + (sleeve === "long" ? thick : 0)), sleeve === "long" ? sleeveMat : upperMat === skinMat ? skinMat : sleeveMat));
  elbow.add(mesh(new THREE.CylinderGeometry(r * 0.9 + (sleeve === "long" ? thick : 0), r * 0.78, 0.5, 20), foreMat, [0, -0.25, 0]));
  if (sleeve === "long") {
    elbow.add(mesh(new THREE.TorusGeometry(r * 0.82, 0.03, 8, 20), material(shadeHex(o.top === "varsity" ? "#f4f1ea" : o.topColor, 30)), [0, -0.44, 0]).rotateX(Math.PI / 2));
  }

  // Mitten hand with a thumb.
  const hand = new THREE.Group();
  hand.position.set(0, -0.62, 0);
  hand.add(mesh(sphere(0.15), skinMat, [0, 0, 0], [1, 1.2, 0.72]));
  hand.add(mesh(sphere(0.06), skinMat, [side * -0.1, 0.05, 0.06]));
  elbow.add(hand);

  if (side > 0 && pose.peace) {
    for (const dx of [-0.05, 0.06]) {
      const finger = mesh(capsule(0.042, 0.18), skinMat, [dx, -0.84, 0]);
      finger.rotation.z = dx * 3;
      elbow.add(finger);
    }
  }

  return { shoulder, elbow, baseElbow: elbow.rotation.z };
}

function buildShoe(o, x) {
  const group = new THREE.Group();
  group.position.set(x, 0, 0.08);
  const upper = material(o.shoeColor, { roughness: 0.45 });
  const sole = material("#f7f7f7", { roughness: 0.5 });

  if (o.shoes === "boots") {
    group.add(mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.42, 20), upper, [0, 0.3, -0.05]));
    group.add(mesh(sphere(0.25), upper, [0, 0.14, 0.02], [0.95, 0.6, 1.3]));
    group.add(mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.07, 24), material(shadeHex(o.shoeColor, 40)), [0, 0.035, 0.02], [1, 1, 1.35]));
    return group;
  }

  if (o.shoes === "slides") {
    group.add(mesh(sphere(0.2), material(o.skin), [0, 0.12, 0], [0.9, 0.5, 1.3]));
    group.add(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 24), sole, [0, 0.03, 0], [1, 1, 1.4]));
    group.add(mesh(new THREE.TorusGeometry(0.18, 0.06, 10, 24, Math.PI), upper, [0, 0.1, 0.05]).rotateY(Math.PI / 2).rotateZ(Math.PI / 2));
    return group;
  }

  // Sneakers (and high-tops).
  group.add(mesh(sphere(0.25), upper, [0, 0.15, 0.02], [0.92, 0.62, 1.38]));
  if (o.shoes === "hightops") group.add(mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.3, 20), upper, [0, 0.3, -0.06]));
  group.add(mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.08, 28), sole, [0, 0.04, 0.03], [1, 1, 1.45]));
  group.add(mesh(sphere(0.12), sole, [0, 0.12, 0.3], [1.4, 0.7, 0.8]));
  for (const dz of [0.05, 0.13]) {
    group.add(mesh(new THREE.BoxGeometry(0.16, 0.02, 0.025), material("#ffffff"), [0, 0.3 - dz * 0.4, dz]));
  }
  return group;
}

function buildBody(o, skinMat) {
  const girl = o.body === "girl";
  const group = new THREE.Group();
  const topMat = material("#ffffff", { map: torsoTexture(o), roughness: o.top === "leather" ? 0.35 : 0.7 });
  const plainTop = material(o.top === "leather" ? "#232326" : o.topColor, { roughness: o.top === "leather" ? 0.35 : 0.7 });
  const sleeveMat = o.top === "varsity" ? material("#f4f1ea", { roughness: 0.7 }) : plainTop;
  const pantsMat = material("#ffffff", { map: legTexture(o), roughness: o.bottom === "jeans" || o.bottom === "ripped" ? 0.8 : 0.7 });
  const bottomPlain = material(o.bottomColor, { roughness: 0.75 });

  const dress = o.top === "dress";
  const bareLegs = dress || o.bottom === "skirt" || o.bottom === "shorts";
  const legX = girl ? 0.21 : 0.24;

  // Legs: tapered, with knees and ankles.
  for (const s of [-1, 1]) {
    const legMat = bareLegs ? skinMat : pantsMat;
    const r = girl ? 0.17 : 0.19;
    group.add(mesh(new THREE.CylinderGeometry(r, r * 0.8, 0.95, 20), legMat, [s * legX, 0.72, 0]));
    group.add(mesh(sphere(r * 0.8), legMat, [s * legX, 0.25, 0]));
    if (o.bottom === "shorts" && !dress) {
      group.add(mesh(new THREE.CylinderGeometry(r + 0.04, r + 0.02, 0.36, 20), bottomPlain, [s * legX, 1.02, 0]));
    }
    group.add(buildShoe(o, s * legX));
  }

  // Hips / pelvis
  if (!bareLegs || o.bottom === "shorts") {
    group.add(mesh(sphere(0.5), bottomPlain, [0, 1.2, 0], [girl ? 0.92 : 0.98, 0.5, 0.68]));
  }
  if (o.bottom === "skirt" && !dress) {
    const skirtMat = bottomPlain.clone();
    skirtMat.side = THREE.DoubleSide;
    group.add(mesh(new THREE.CylinderGeometry(0.46, 0.76, 0.6, 32, 1, true), skirtMat, [0, 1.02, 0], [1, 1, 0.8]));
  }
  if (dress) {
    const skirtMat = plainTop.clone();
    skirtMat.side = THREE.DoubleSide;
    group.add(mesh(new THREE.CylinderGeometry(0.4, 0.92, 1.0, 36, 1, true), skirtMat, [0, 0.82, 0], [1, 1, 0.82]));
  }

  // Torso
  const torso = mesh(latheFromProfile(TORSO_PROFILE[girl ? "girl" : "guy"], TORSO_HEIGHT), topMat, [0, TORSO_BOTTOM, 0], [o.top === "puffer" ? 1.1 : 1, 1, o.top === "puffer" ? 0.78 : 0.7]);
  group.add(torso);

  if (o.top === "hoodie") {
    group.add(mesh(new THREE.TorusGeometry(0.28, 0.1, 12, 32), plainTop, [0, TORSO_BOTTOM + TORSO_HEIGHT - 0.04, -0.06]).rotateX(Math.PI / 2 + 0.25));
  }
  if (o.necklace) {
    const chain = mesh(
      new THREE.TorusGeometry(0.26, 0.03, 8, 32),
      material(o.necklace === "chain" ? "#ffd65a" : "#fdf7ee", { metalness: o.necklace === "chain" ? 0.8 : 0.1, roughness: 0.25 }),
      [0, TORSO_BOTTOM + TORSO_HEIGHT - 0.1, 0.1]
    );
    chain.rotation.x = Math.PI / 2 - 0.6;
    group.add(chain);
  }

  // Neck
  group.add(mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.5, 20), skinMat, [0, TORSO_BOTTOM + TORSO_HEIGHT + 0.08, 0]));

  const pose = POSES[o.pose] || POSES.stand;
  const right = buildArm(o, 1, pose, skinMat, sleeveMat);
  const left = buildArm(o, -1, pose, skinMat, sleeveMat);
  group.add(right.shoulder, left.shoulder);

  return { group, torso, right, left, pose };
}

// Streaks that make hair read as hair instead of smooth plastic.
function hairTexture() {
  const texture = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 140; i += 1) {
      const x = Math.random() * 256;
      ctx.strokeStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 6, 80, x - 6, 170, x + 3, 256);
      ctx.stroke();
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 1);
  return texture;
}

/* ---------- Eyes ---------- */

// Real eyeballs for the normal eye style: glossy white, coloured iris, pupil,
// a highlight and an upper lash line. Returns the group (scale.y blinks).
function buildEyes(o) {
  const group = new THREE.Group();
  const shape = o.eyeShape || "round";
  const size = shape === "big" ? 1.18 : 1;
  const height = shape === "almond" ? 0.72 : shape === "big" ? 1.08 : 0.95;

  const white = new THREE.MeshPhysicalMaterial({ color: "#fbfbfb", roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 });
  const iris = new THREE.MeshPhysicalMaterial({ color: o.eyeColor, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
  const dark = new THREE.MeshStandardMaterial({ color: "#1d1412", roughness: 0.4 });
  const shine = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const lash = new THREE.MeshStandardMaterial({ color: "#231815", roughness: 0.6 });

  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.33, -0.1, 0.84);
    eye.rotation.y = side * 0.34;
    eye.scale.set(size, size * height, size);

    eye.add(mesh(sphere(0.16, 32), white, [0, 0, 0], [1, 1, 0.55]));
    eye.add(mesh(sphere(0.105, 24), iris, [0, -0.005, 0.07], [1, 1, 0.38]));
    eye.add(mesh(sphere(0.055, 16), dark, [0, -0.005, 0.105], [1, 1, 0.3]));
    eye.add(mesh(sphere(0.028, 12), shine, [0.04, 0.045, 0.12]));
    eye.add(mesh(sphere(0.014, 10), shine, [-0.035, -0.04, 0.115]));

    // Upper lid / lash line.
    const lid = mesh(new THREE.TorusGeometry(0.162, o.lashes ? 0.024 : 0.017, 8, 24, Math.PI), lash, [0, 0.005, 0.02]);
    lid.scale.set(1, 1, 0.55);
    eye.add(lid);
    if (o.lashes) {
      const count = o.lashes === "long" ? 3 : 1;
      for (let i = 0; i < count; i += 1) {
        const tip = mesh(new THREE.ConeGeometry(0.013, 0.065, 6), lash, [side * (0.155 + i * 0.008), 0.06 + i * 0.022, 0.03]);
        tip.rotation.z = -side * (0.9 + i * 0.25);
        eye.add(tip);
      }
    }

    group.add(eye);
    eyes.push(eye);
  }

  return { group, eyes, baseScale: size * height };
}

/* ---------- Viewer ---------- */

// Can this device draw 3D at all?
export function supports3d() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

// framing: "full" (whole body) or "bust" (head and shoulders).
// lite: cheaper rendering (no real shadows, lower resolution) for calls.
// interactive: drag to spin.
export function createViewer(container, { framing = "full", lite = false, interactive = true, onLost = null } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: !lite, alpha: true, powerPreference: lite ? "low-power" : "default" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral keeps skin and clothes the same colours as the 2D avatar.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = "pan-y";
  renderer.domElement.style.cursor = interactive ? "grab" : "default";
  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    onLost?.();
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const setFraming = (mode) => {
    if (mode === "bust") {
      camera.position.set(0, 3.25, 7.2);
      camera.lookAt(0, 3.05, 0);
    } else {
      camera.position.set(0, 2.55, 11.5);
      camera.lookAt(0, 2.3, 0);
    }
  };
  setFraming(framing);

  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Soft studio reflections.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight("#fff4f8", "#5a3a66", 0.75));
  const key = new THREE.DirectionalLight("#ffffff", 2.4);
  key.position.set(-1.6, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -1;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  scene.add(key);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const rim = new THREE.DirectionalLight("#ffc4d8", 0.8);
  rim.position.set(4, 3, -5);
  scene.add(rim);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 40),
    new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.28 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  scene.add(shadow);

  const root = new THREE.Group();
  scene.add(root);

  let parts = null;
  let faces = null; // { normal, blink, talk: [..] }
  let talking = false;
  let disposed = false;
  let build = 0;

  const dispose = (object) => {
    object.traverse((child) => {
      child.geometry?.dispose();
      if (child.material) [].concat(child.material).forEach((m) => { m.map?.dispose(); m.dispose(); });
    });
  };

  async function update(o) {
    const id = (build += 1);
    // Soft skin: a faint warm sheen instead of plastic shine.
    const skinMat = new THREE.MeshPhysicalMaterial({
      color: o.skin,
      roughness: 0.68,
      sheen: 0.6,
      sheenColor: new THREE.Color("#ff9d8a"),
      sheenRoughness: 0.8,
    });

    // Normal eyes become real 3D eyeballs; other styles stay painted on.
    const realEyes = o.eyes === "normal";
    const flat = { ...o, noEyes: realEyes, noNose: true };

    const [normal, blink, open, half] = await Promise.all([
      faceTexture(flat),
      realEyes ? null : faceTexture({ ...flat, eyes: o.eyes === "wink" ? "happy" : o.eyes }),
      faceTexture({ ...flat, mouth: "open" }),
      faceTexture({ ...flat, mouth: "grin" }),
    ]);
    if (disposed || id !== build) return;

    const character = new THREE.Group();
    const body = buildBody(o, skinMat);
    character.add(body.group);

    const head = new THREE.Group();
    head.position.set(0, HEAD_Y, 0);
    head.add(mesh(sphere(1, 48), skinMat, [0, 0, 0], [0.96, 1.02, 0.96]));
    for (const s of [-1, 1]) {
      head.add(mesh(sphere(0.2), skinMat, [s * 0.94, -0.1, -0.02], [0.45, 1, 0.8]));
      head.add(mesh(sphere(0.11), material(shadeHex(o.skin, 25), { roughness: 0.7 }), [s * 0.99, -0.1, 0.02], [0.3, 0.7, 0.5]));
    }
    // 3D nose, shaped by the nose style.
    const noseScale = { round: [1.35, 1.1, 0.85], pointy: [0.8, 1.1, 1.25], wide: [1.6, 0.85, 0.75] }[o.nose] || [1, 0.85, 0.75];
    head.add(mesh(sphere(0.1), skinMat, [0, -0.22, 0.95], noseScale));

    const faceMat = new THREE.MeshStandardMaterial({ map: normal, transparent: true, roughness: 0.6, depthWrite: false });
    const face = new THREE.Mesh(sphere(1.004, 64), faceMat);
    face.scale.set(0.96, 1.02, 0.96);
    head.add(face);

    const eyes = realEyes ? buildEyes(o) : null;
    if (eyes) head.add(eyes.group);

    const hairMat = material(o.hairColor, { roughness: 0.8, map: hairTexture() });
    head.add(buildHair(o, hairMat), buildHat(o), buildGlasses(o), buildEarrings(o));
    character.add(head);

    if (parts) {
      root.remove(parts.character);
      dispose(parts.character);
      if (faces) [faces.normal, faces.blink, ...faces.talk].forEach((t) => t?.dispose());
    }

    faces = { normal, blink, talk: [open, half, normal] };
    parts = { character, head, faceMat, eyes, torso: body.torso, right: body.right, pose: body.pose };
    root.add(character);
  }

  // Drag to spin; lets go and eases back to the front.
  let spin = 0;
  let spinVelocity = 0;
  let dragging = false;
  let lastX = 0;
  const onDown = (event) => {
    dragging = true;
    lastX = event.clientX;
    renderer.domElement.style.cursor = "grabbing";
    renderer.domElement.setPointerCapture?.(event.pointerId);
  };
  const onMove = (event) => {
    if (!dragging) return;
    spinVelocity = (event.clientX - lastX) * 0.012;
    spin += spinVelocity;
    lastX = event.clientX;
  };
  const onUp = () => {
    dragging = false;
    renderer.domElement.style.cursor = "grab";
  };
  if (interactive) renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointercancel", onUp);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    // CSS sizes the canvas (it fills the container); this only sets resolution.
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const clock = new THREE.Clock();
  let nextBlink = 2;
  let frame = 0;

  // Don't draw while scrolled away or while the tab is hidden.
  let onScreen = true;
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
  });
  visibility.observe(container);

  const tick = () => {
    if (disposed) return;
    frame = requestAnimationFrame(tick);
    if (!onScreen || document.hidden) return;
    const t = clock.getElapsedTime();

    if (!dragging) {
      spinVelocity *= 0.92;
      spin += spinVelocity;
      if (Math.abs(spinVelocity) < 0.002) spin += (Math.sin(t * 0.6) * 0.18 - spin) * 0.03;
    }
    root.rotation.y = spin;

    if (parts) {
      parts.torso.scale.y = 1 + Math.sin(t * 1.7) * 0.012;
      parts.character.position.x = Math.sin(t * 0.8) * 0.03;
      parts.character.rotation.z = Math.sin(t * 0.8) * 0.012;
      parts.head.rotation.z = Math.sin(t * 1.1) * 0.03;
      parts.head.position.y = HEAD_Y + Math.sin(t * 1.7) * 0.012;

      if (parts.pose.wave) parts.right.elbow.rotation.z = parts.right.baseElbow + Math.sin(t * 7) * 0.35;

      let map = faces.normal;
      const blinking = t > nextBlink;
      if (blinking && t > nextBlink + 0.13) nextBlink = t + 2.5 + Math.random() * 2.5;

      if (talking) map = faces.talk[Math.floor(t * 9) % 3];
      else if (blinking && faces.blink) map = faces.blink;

      // 3D eyes blink by closing (squashing) the eyeballs.
      if (parts.eyes) {
        const closed = blinking ? 0.08 : 1;
        for (const eye of parts.eyes.eyes) eye.scale.y = parts.eyes.baseScale * closed;
      }
      if (parts.faceMat.map !== map) {
        parts.faceMat.map = map;
        parts.faceMat.needsUpdate = true;
      }
    }

    renderer.render(scene, camera);
  };
  tick();

  return {
    update,
    setFraming,
    setTalking: (value) => {
      talking = value;
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      if (parts) dispose(parts.character);
      if (faces) [faces.normal, faces.blink, ...faces.talk].forEach((t) => t?.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
