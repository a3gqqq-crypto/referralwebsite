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

export function referralLinkFor(username) {
  if (!username) return "";

  return `${window.location.origin}/?ref=${encodeURIComponent(username)}`;
}
