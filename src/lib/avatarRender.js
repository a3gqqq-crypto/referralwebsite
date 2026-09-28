import { useEffect, useState } from "react";

import { fullBodyOptions, parseDicebear } from "../data/avatarParts";
import { fullBodySvg, svgToUri } from "./fullbody";

// Avatar-maker pictures are drawn in the browser. Full-body ("fb") avatars are
// drawn by our own code (instant); older DiceBear styles load on first use.
// Results are cached so lists of avatars stay fast.
const cache = new Map();
let loader = null;

const load = () => (loader ??= import("./dicebear.js"));

export function dicebearKey(style, options, view = "head") {
  return JSON.stringify([style, options, view]);
}

function remember(key, uri) {
  if (cache.size > 600) cache.clear();
  cache.set(key, uri);
  return uri;
}

// Synchronous for full-body avatars.
export function drawFullBody(options, view = "head") {
  const key = dicebearKey("fb", options, view);
  if (cache.has(key)) return cache.get(key);

  const { options: drawn, bg } = fullBodyOptions(options);
  return remember(key, svgToUri(fullBodySvg(drawn, view, bg)));
}

export async function drawDicebear(style, options) {
  if (style === "fb") return drawFullBody(options, "head");

  const key = dicebearKey(style, options);
  if (cache.has(key)) return cache.get(key);

  const { renderDicebear } = await load();
  return remember(key, await renderDicebear(style, options));
}

export async function dicebearSrc(avatar) {
  const parsed = parseDicebear(avatar);
  return parsed ? drawDicebear(parsed.s, parsed.o) : null;
}

// Hook: data URI for a style + options (null while drawing).
export function useDicebear(style, options) {
  const key = style && style !== "fb" ? dicebearKey(style, options) : null;
  const [drawn, setDrawn] = useState(() => ({ key, uri: key ? cache.get(key) || null : null }));

  useEffect(() => {
    if (!key) return;
    let alive = true;

    drawDicebear(style, options).then(
      (uri) => alive && setDrawn({ key, uri }),
      () => {}
    );

    return () => {
      alive = false;
    };
    // `key` covers style and options.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (style === "fb") return drawFullBody(options, "head");
  if (!key) return null;
  return drawn.key === key ? drawn.uri : cache.get(key) || null;
}

export function useAvatarDicebear(avatar) {
  const parsed = parseDicebear(avatar);
  return useDicebear(parsed?.s || null, parsed?.o || null);
}

// Full-body picture for a stored avatar, or null if it isn't a full-body one.
export function fullBodySrc(avatar) {
  const parsed = parseDicebear(avatar);
  return parsed?.s === "fb" ? drawFullBody(parsed.o, "full") : null;
}
