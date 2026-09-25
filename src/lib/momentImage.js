import { SHAPE_PATHS, decorationsFor, templateById } from "../data/momentTemplates";

// Renders a Moment as a 1080x1920 story image (JPEG), matching the on-screen card.
const W = 1080;
const H = 1920;
const CARD = { x: 90, y: 360, w: 900, h: 1125 };

const DISPLAY = '"Bricolage Grotesque", "Geist", system-ui, sans-serif';
const BODY = '"Geist", system-ui, sans-serif';

export function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx, text, maxWidth) {
  const lines = [];

  for (const paragraph of String(text).split("\n")) {
    let line = "";

    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;

      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }

    lines.push(line);
  }

  return lines;
}

export function fitText(ctx, text, maxWidth, startSize, minSize, weight, family) {
  let size = startSize;

  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  } while (size > minSize);

  return size;
}

function drawCard(ctx, moment, template) {
  const { x, y, w, h } = CARD;
  const scale = w / 100;

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((-1.6 * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);

  // Shadow + clip
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 80;
  ctx.shadowOffsetY = 40;
  roundedRect(ctx, 0, 0, w, h, 56);
  ctx.fillStyle = template.bg[0];
  ctx.fill();
  ctx.restore();

  roundedRect(ctx, 0, 0, w, h, 56);
  ctx.clip();

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, template.bg[0]);
  gradient.addColorStop(1, template.bg[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  for (const shape of decorationsFor(template)) {
    ctx.save();
    ctx.translate(shape.x * scale, shape.y * scale);
    ctx.rotate((shape.rotate * Math.PI) / 180);
    ctx.scale(shape.size * scale, shape.size * scale);
    ctx.globalAlpha = shape.opacity;

    const path = new Path2D(SHAPE_PATHS[shape.kind]);

    if (shape.kind === "bubble") {
      ctx.lineWidth = 0.09;
      ctx.strokeStyle = shape.color;
      ctx.stroke(path);
    } else {
      ctx.fillStyle = shape.color;
      ctx.fill(path);
    }

    ctx.restore();
  }

  // Text
  const pad = 80;
  const ink = template.ink;
  ctx.textBaseline = "alphabetic";

  ctx.font = `110px ${BODY}`;
  ctx.fillText(template.icon, pad, 190);

  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.75;
  ctx.font = `600 26px ${BODY}`;
  ctx.fillText(template.label.toUpperCase().split("").join(" "), pad, 250);
  ctx.globalAlpha = 1;

  const toText = `For ${moment.to_name || "you"}`;
  const toSize = fitText(ctx, toText, w - pad * 2, 104, 56, 800, DISPLAY);
  ctx.font = `800 ${toSize}px ${DISPLAY}`;
  ctx.fillText(toText, pad, 250 + toSize + 40);

  const message = moment.message || "";
  const messageSize = message.length > 320 ? 32 : message.length > 160 ? 38 : 46;
  ctx.font = `500 ${messageSize}px ${BODY}`;

  const lines = wrap(ctx, message, w - pad * 2).slice(0, 16);
  let lineY = 250 + toSize + 120;

  for (const line of lines) {
    ctx.fillText(line, pad, lineY);
    lineY += messageSize * 1.45;
  }

  ctx.font = `800 52px ${DISPLAY}`;
  ctx.fillText(`— ${moment.from_name || "someone"}`, pad, Math.min(lineY + 60, h - 90));

  ctx.restore();
}

export async function renderMomentImage(moment) {
  const template = templateById(moment.template);

  try {
    await Promise.all([
      document.fonts.load(`800 100px ${DISPLAY}`),
      document.fonts.load(`500 40px ${BODY}`),
    ]);
  } catch {
    // Fall back to system fonts.
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background: dark with the card's colours glowing behind it.
  ctx.fillStyle = "#140d16";
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, H * 0.45, 60, W / 2, H * 0.45, W);
  glow.addColorStop(0, `${template.bg[1]}88`);
  glow.addColorStop(1, "#140d1600");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = "#fff1f5";
  ctx.textAlign = "center";
  const header = `${moment.from_name || "Someone"} made ${moment.to_name || "you"} something ✦`;
  const headerSize = fitText(ctx, header, W - 160, 52, 30, 800, DISPLAY);
  ctx.font = `800 ${headerSize}px ${DISPLAY}`;
  ctx.fillText(header, W / 2, 230);
  ctx.textAlign = "left";

  drawCard(ctx, moment, template);

  // Footer
  ctx.textAlign = "center";
  ctx.fillStyle = "#ff9dbc";
  ctx.font = `600 34px ${BODY}`;
  ctx.fillText(`Open it: joinvexora.com/m/${moment.id}`, W / 2, 1650);

  ctx.fillStyle = "rgba(255, 241, 245, 0.6)";
  ctx.font = `500 28px ${BODY}`;
  ctx.fillText("made on Vexora · invite friends, win real prizes", W / 2, 1712);

  // JPEG keeps it small enough to send quickly (the gradients make PNGs ~1.5 MB).
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  return new File([blob], `vexora-moment-${moment.id}.jpg`, { type: "image/jpeg" });
}

// Share the image where the phone allows it (WhatsApp, Instagram…), otherwise download it.
export async function shareOrSaveFile(file, text) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
    }
  }

  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  return "saved";
}

export async function shareOrSaveMomentImage(moment) {
  const file = await renderMomentImage(moment);
  return shareOrSaveFile(file, `${moment.from_name} made you something ✦`);
}
