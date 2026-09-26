import { avatarSrc } from "../data/avatars";
import { fitText, roundedRect } from "./momentImage";

// "I'm #2 in Round 2 — beat me" story image (1080x1920) with the player's invite link.
const W = 1080;
const H = 1920;
const DISPLAY = '"Bricolage Grotesque", "Geist", system-ui, sans-serif';
const BODY = '"Geist", system-ui, sans-serif';
const MONO = '"Geist Mono", ui-monospace, monospace';

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function accentGradient(ctx, x0, x1) {
  const gradient = ctx.createLinearGradient(x0, 0, x1, 0);
  gradient.addColorStop(0, "#ff4d8d");
  gradient.addColorStop(0.55, "#ff7a5c");
  gradient.addColorStop(1, "#ff9f3d");
  return gradient;
}

export async function renderBragImage({ username, avatar, rank, count, countLabel, eventTitle, daysLeft, prize, link }) {
  try {
    await Promise.all([
      document.fonts.load(`800 100px ${DISPLAY}`),
      document.fonts.load(`500 40px ${BODY}`),
      document.fonts.load(`500 40px ${MONO}`),
    ]);
  } catch {
    // System fonts are fine.
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#140d16";
  ctx.fillRect(0, 0, W, H);

  const glowA = ctx.createRadialGradient(200, 300, 40, 200, 300, 900);
  glowA.addColorStop(0, "rgba(255, 77, 141, 0.45)");
  glowA.addColorStop(1, "rgba(255, 77, 141, 0)");
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, W, H);

  const glowB = ctx.createRadialGradient(W - 100, H - 300, 40, W - 100, H - 300, 900);
  glowB.addColorStop(0, "rgba(255, 159, 61, 0.3)");
  glowB.addColorStop(1, "rgba(255, 159, 61, 0)");
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, W, H);

  // Brand
  roundedRect(ctx, 90, 110, 76, 76, 20);
  ctx.fillStyle = accentGradient(ctx, 90, 166);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `800 50px ${DISPLAY}`;
  ctx.textAlign = "center";
  ctx.fillText("S", 128, 166);
  ctx.textAlign = "left";
  ctx.font = `800 52px ${DISPLAY}`;
  ctx.fillText("Suffrova", 188, 166);

  // Avatar
  const cx = W / 2;
  const cy = 480;
  const radius = 150;

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 14, 0, Math.PI * 2);
  ctx.fillStyle = accentGradient(ctx, cx - radius, cx + radius);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#35263a";
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  const image = await loadImage(avatarSrc(avatar));

  if (image) {
    ctx.drawImage(image, cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = "#ff9dbc";
    ctx.font = `800 150px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.fillText((username || "?").charAt(0).toUpperCase(), cx, cy + 52);
  }

  ctx.restore();

  // Name + rank
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff1f5";
  const nameSize = fitText(ctx, username, W - 200, 76, 40, 800, DISPLAY);
  ctx.font = `800 ${nameSize}px ${DISPLAY}`;
  ctx.fillText(username, cx, 740);

  ctx.font = `800 330px ${DISPLAY}`;
  ctx.fillStyle = accentGradient(ctx, cx - 260, cx + 260);
  ctx.fillText(`#${rank}`, cx, 1080);

  ctx.fillStyle = "#d3bcc9";
  const titleSize = fitText(ctx, `in ${eventTitle}`, W - 180, 50, 30, 700, BODY);
  ctx.font = `700 ${titleSize}px ${BODY}`;
  ctx.fillText(`in ${eventTitle}`, cx, 1160);

  // Stats
  const stats = [
    [`${count}`, countLabel || (count === 1 ? "invite" : "invites")],
    [daysLeft != null ? `${daysLeft}d` : "—", "left"],
    [prize || "—", "for #1"],
  ];

  stats.forEach(([value, label], index) => {
    const x = 90 + index * 300 + 150;

    roundedRect(ctx, x - 135, 1230, 270, 170, 30);
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 200, 225, 0.16)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#fff1f5";
    const size = fitText(ctx, value, 240, 72, 36, 800, DISPLAY);
    ctx.font = `800 ${size}px ${DISPLAY}`;
    ctx.fillText(value, x, 1325);

    ctx.fillStyle = "#9c8494";
    ctx.font = `600 30px ${BODY}`;
    ctx.fillText(label, x, 1372);
  });

  // Call to action
  ctx.fillStyle = "#fff1f5";
  ctx.font = `800 70px ${DISPLAY}`;
  ctx.fillText("Think you can beat me? 👇", cx, 1540);

  const shortLink = link.replace(/^https?:\/\/(www\.)?/, "");
  ctx.font = `500 40px ${MONO}`;
  const linkWidth = Math.min(ctx.measureText(shortLink).width + 90, W - 120);
  roundedRect(ctx, cx - linkWidth / 2, 1600, linkWidth, 100, 50);
  ctx.fillStyle = accentGradient(ctx, cx - linkWidth / 2, cx + linkWidth / 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  const linkSize = fitText(ctx, shortLink, linkWidth - 70, 40, 24, 500, MONO);
  ctx.font = `500 ${linkSize}px ${MONO}`;
  ctx.fillText(shortLink, cx, 1664);

  ctx.fillStyle = "rgba(255, 241, 245, 0.55)";
  ctx.font = `500 30px ${BODY}`;
  ctx.fillText("Invite friends. Climb the board. Win real prizes.", cx, 1800);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  return new File([blob], `suffrova-rank-${rank}.jpg`, { type: "image/jpeg" });
}

export const bragShareText = (details) =>
  `I'm #${details.rank} in ${details.eventTitle} on Suffrova. Beat me: ${details.link}`;
