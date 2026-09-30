import { drawFullBody } from "./avatarRender";
import { parseDicebear } from "../data/avatarParts";
import { fitText, roundedRect } from "./momentImage";

// "Level 6 on Suffrova" story image (1080x1920) with the player's invite link.
const W = 1080;
const H = 1920;
const DISPLAY = '"Bricolage Grotesque", "Geist", system-ui, sans-serif';
const BODY = '"Geist", system-ui, sans-serif';
const MONO = '"Geist Mono", ui-monospace, monospace';

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

const accent = (ctx, x0, x1) => {
  const gradient = ctx.createLinearGradient(x0, 0, x1, 0);
  gradient.addColorStop(0, "#ff4d8d");
  gradient.addColorStop(0.55, "#ff7a5c");
  gradient.addColorStop(1, "#ff9f3d");
  return gradient;
};

export async function renderLevelImage({ username, body, level, tierName, link }) {
  try {
    await Promise.all([
      document.fonts.load(`800 100px ${DISPLAY}`),
      document.fonts.load(`600 40px ${BODY}`),
      document.fonts.load(`500 40px ${MONO}`),
    ]);
  } catch {
    // System fonts are fine.
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const cx = W / 2;

  ctx.fillStyle = "#140d16";
  ctx.fillRect(0, 0, W, H);
  [[160, 360, "rgba(255, 77, 141, 0.45)"], [W - 120, H - 420, "rgba(255, 159, 61, 0.32)"], [cx, 980, "rgba(155, 92, 255, 0.14)"]].forEach(
    ([x, y, color]) => {
      const glow = ctx.createRadialGradient(x, y, 30, x, y, 900);
      glow.addColorStop(0, color);
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
    }
  );

  // Confetti
  const colors = ["#ff4d8d", "#ffd166", "#7cc4ff", "#5fe3a8", "#c7a6ff", "#ff9f3d"];
  // Scattered with a fixed pseudo-random pattern (same image every time).
  const rand = (n) => {
    const v = Math.sin(n * 12.9898) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let i = 0; i < 70; i += 1) {
    const x = rand(i + 1) * W;
    const y = 230 + rand(i + 101) * 980;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((i * 37 * Math.PI) / 180);
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.55;
    ctx.fillRect(-9, -4, 18, 8);
    ctx.restore();
  }

  // Brand
  roundedRect(ctx, 90, 110, 76, 76, 20);
  ctx.fillStyle = accent(ctx, 90, 166);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `800 50px ${DISPLAY}`;
  ctx.textAlign = "center";
  ctx.fillText("S", 128, 166);
  ctx.textAlign = "left";
  ctx.font = `800 52px ${DISPLAY}`;
  ctx.fillText("Suffrova", 188, 166);

  // Avatar celebrating
  const options = parseDicebear(body)?.s === "fb" ? parseDicebear(body).o : null;
  const figure = options ? await loadImage(drawFullBody({ ...options, pose: "flex", eyes: "star", mouth: "grin" }, "full")) : null;
  if (figure) {
    const height = 560;
    const width = height * (200 / 342);
    ctx.drawImage(figure, cx - width / 2, 230, width, height);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd166";
  ctx.font = `700 46px ${MONO}`;
  ctx.fillText("LEVEL UP", cx, figure ? 880 : 420);

  ctx.font = `800 300px ${DISPLAY}`;
  ctx.fillStyle = accent(ctx, cx - 300, cx + 300);
  ctx.fillText(`Lv ${level}`, cx, figure ? 1160 : 720);

  ctx.fillStyle = "#fff1f5";
  const nameSize = fitText(ctx, username, W - 200, 72, 40, 800, DISPLAY);
  ctx.font = `800 ${nameSize}px ${DISPLAY}`;
  ctx.fillText(username, cx, figure ? 1270 : 830);

  ctx.fillStyle = "#d3bcc9";
  ctx.font = `600 44px ${BODY}`;
  ctx.fillText(`${tierName} rank on Suffrova`, cx, figure ? 1340 : 900);

  // Call to action + link (added as a Link sticker on Instagram).
  ctx.fillStyle = "#fff1f5";
  ctx.font = `800 66px ${DISPLAY}`;
  ctx.fillText("Come hang out with me 👇", cx, 1540);

  const shortLink = link.replace(/^https?:\/\/(www\.)?/, "");
  ctx.font = `500 40px ${MONO}`;
  const linkWidth = Math.min(ctx.measureText(shortLink).width + 90, W - 120);
  roundedRect(ctx, cx - linkWidth / 2, 1600, linkWidth, 100, 50);
  ctx.fillStyle = accent(ctx, cx - linkWidth / 2, cx + linkWidth / 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  const linkSize = fitText(ctx, shortLink, linkWidth - 70, 40, 24, 500, MONO);
  ctx.font = `500 ${linkSize}px ${MONO}`;
  ctx.fillText(shortLink, cx, 1664);

  ctx.fillStyle = "rgba(255, 241, 245, 0.55)";
  ctx.font = `500 30px ${BODY}`;
  ctx.fillText("Chat · calls · 3D avatars · real prizes", cx, 1800);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  return new File([blob], `suffrova-level-${level}.jpg`, { type: "image/jpeg" });
}
