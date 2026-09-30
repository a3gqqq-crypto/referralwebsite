import { useEffect, useState } from "react";

// "Install the app" support. Chrome/Edge/Android fire beforeinstallprompt once,
// early, so it's caught here at load and kept until the person taps Install.
// iPhones have no prompt: people add it from Safari's Share menu instead.

let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export const isInstalled = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

export const isIos = () =>
  typeof navigator !== "undefined" &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

// "prompt" (one-tap install), "ios" (show Share → Add to Home Screen steps),
// or null (already installed / not possible here).
export function useInstall() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((tick) => tick + 1);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  const mode = isInstalled() ? null : deferred ? "prompt" : isIos() ? "ios" : null;

  const install = async () => {
    if (!deferred) return false;
    const event = deferred;
    deferred = null;
    notify();
    await event.prompt();
    const choice = await event.userChoice.catch(() => null);
    return choice?.outcome === "accepted";
  };

  return { mode, install };
}
