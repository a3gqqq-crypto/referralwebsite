import { useEffect, useState } from "react";

import { supabase } from "./supabaseClient";

const BUCKET = "chat-images";
const MAX_SIDE = 1280;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Shrinks to 1280px on the long side and re-encodes, which also strips photo
// metadata such as location. Returns { blob, ext }.
export async function prepareChatImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("That isn't an image.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That image is over 15 MB.");

  let bitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Couldn't read that image. Try a JPG or PNG.");
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const webp = await canvasToBlob(canvas, "image/webp", 0.82);
  if (webp?.type === "image/webp") return { blob: webp, ext: "webp" };

  const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.85);
  if (jpeg) return { blob: jpeg, ext: "jpg" };

  throw new Error("Couldn't process that image.");
}

export async function uploadChatImage(userId, prepared) {
  const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${userId}/${id.replace(/[^A-Za-z0-9_-]/g, "")}.${prepared.ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, prepared.blob, { contentType: prepared.blob.type, cacheControl: "31536000" });

  if (error) {
    console.error(error);
    throw new Error("Photo upload failed. Try again.");
  }

  return path;
}

export const removeChatImage = (path) => supabase.storage.from(BUCKET).remove([path]);

// Photos are private, so they're shown through short-lived signed links.
// Links are cached and fetched in batches.
const LINK_SECONDS = 3600;
const cache = new Map();
const listeners = new Set();
let queue = new Set();
let timer = null;

function flush() {
  timer = null;
  const paths = [...queue];
  queue = new Set();

  if (!paths.length) return;

  supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, LINK_SECONDS)
    .then(({ data }) => {
      const expires = Date.now() + (LINK_SECONDS - 120) * 1000;

      paths.forEach((path) => {
        const signed = (data || []).find((item) => item.path === path);
        cache.set(path, { url: signed?.signedUrl || null, expires, failed: !signed?.signedUrl });
      });

      listeners.forEach((listener) => listener());
    });
}

function request(path) {
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now()) return;

  queue.add(path);
  if (!timer) timer = setTimeout(flush, 30);
}

export function useChatImage(path) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;

    const listener = () => setTick((tick) => tick + 1);
    listeners.add(listener);
    request(path);

    return () => listeners.delete(listener);
  }, [path]);

  return path ? cache.get(path) || null : null;
}
