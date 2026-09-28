import { useEffect, useState } from "react";

import { parseDicebear } from "../data/avatarParts";

// Avatar-maker pictures are drawn in the browser. The drawing code loads on
// first use; results are cached so lists of avatars stay fast.
const cache = new Map();
let loader = null;

const load = () => (loader ??= import("./dicebear.js"));

export function dicebearKey(style, options) {
  return JSON.stringify([style, options]);
}

export function cachedDicebear(style, options) {
  return cache.get(dicebearKey(style, options)) || null;
}

export async function drawDicebear(style, options) {
  const key = dicebearKey(style, options);
  if (cache.has(key)) return cache.get(key);

  const { renderDicebear } = await load();
  const uri = await renderDicebear(style, options);

  if (cache.size > 400) cache.clear();
  cache.set(key, uri);
  return uri;
}

export async function dicebearSrc(avatar) {
  const parsed = parseDicebear(avatar);
  return parsed ? drawDicebear(parsed.s, parsed.o) : null;
}

// Hook: data URI for a style + options (null while drawing).
export function useDicebear(style, options) {
  const key = style ? dicebearKey(style, options) : null;
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

  if (!key) return null;
  return drawn.key === key ? drawn.uri : cache.get(key) || null;
}

export function useAvatarDicebear(avatar) {
  const parsed = parseDicebear(avatar);
  return useDicebear(parsed?.s || null, parsed?.o || null);
}
