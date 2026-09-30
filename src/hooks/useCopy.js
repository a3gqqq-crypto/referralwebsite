import { useEffect, useRef, useState } from "react";

export function useCopy(resetMs = 1800) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async (text) => {
    if (!text) return false;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return false;
    }

    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), resetMs);

    return true;
  };

  return [copied, copy];
}

export const canNativeShare =
  typeof navigator !== "undefined" && typeof navigator.share === "function";

export async function nativeShare({ title, text, url }) {
  if (!canNativeShare) return false;

  try {
    await navigator.share({ title, text, url });
    return true;
  } catch {
    return false;
  }
}

// suffrova.com/join/NAME: a real page path, so the server can give the link
// its own preview ("NAME invited you to Suffrova"). It forwards to /?ref=NAME.
// squadTag adds ?squad=TAG (a squad invite).
export function referralLinkFor(username, squadTag = null) {
  if (!username) return "";

  const base = `${window.location.origin}/join/${encodeURIComponent(username)}`;
  return squadTag ? `${base}?squad=${encodeURIComponent(squadTag)}` : base;
}
