import { supabase } from "../lib/supabaseClient";

// Must match the list allowed by set_avatar() in the database.
export const BUILTIN_AVATARS = [
  { id: "fox", name: "Fox" },
  { id: "cat", name: "Cat" },
  { id: "panda", name: "Panda" },
  { id: "owl", name: "Owl" },
  { id: "frog", name: "Frog" },
  { id: "bear", name: "Bear" },
  { id: "bunny", name: "Bunny" },
  { id: "penguin", name: "Penguin" },
];

const BUILTIN_IDS = new Set(BUILTIN_AVATARS.map((avatar) => avatar.id));

// profiles.avatar is "builtin:<id>", "upload:<user id>/<file>", or null (initial letter).
export function avatarSrc(avatar) {
  if (!avatar) return null;

  if (avatar.startsWith("builtin:")) {
    const id = avatar.slice(8);
    return BUILTIN_IDS.has(id) ? `/avatars/${id}.svg` : null;
  }

  if (avatar.startsWith("upload:")) {
    return supabase.storage.from("avatars").getPublicUrl(avatar.slice(7)).data.publicUrl;
  }

  return null;
}

const SIZE = 320;
const MAX_INPUT_BYTES = 10 * 1024 * 1024;

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Crops the middle square, scales to 320px and re-encodes, which also strips
// photo metadata like location. Returns { blob, ext }.
export async function prepareAvatarImage(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("That isn't an image.");
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("That image is over 10 MB. Try a smaller one.");
  }

  let bitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Couldn't read that image. Try a JPG or PNG.");
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;

  const context = canvas.getContext("2d");
  context.imageSmoothingQuality = "high";
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE
  );
  bitmap.close?.();

  // Some browsers can't encode WebP and quietly hand back PNG; fall back to JPEG.
  const webp = await canvasToBlob(canvas, "image/webp", 0.86);
  if (webp?.type === "image/webp") return { blob: webp, ext: "webp" };

  const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.88);
  if (jpeg) return { blob: jpeg, ext: "jpg" };

  throw new Error("Couldn't process that image.");
}
