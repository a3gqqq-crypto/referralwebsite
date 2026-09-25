import { lazy } from "react";

const RELOAD_KEY = "vx-chunk-reload";

// Lazy-load a page. If its file is gone because a deploy happened while this
// tab was open, reload once to pick up the new build instead of crashing.
export function lazyPage(load) {
  return lazy(() =>
    load().catch((error) => {
      let last = 0;

      try {
        last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      } catch {
        // Storage blocked; fall through to the error.
      }

      if (Date.now() - last > 60000) {
        try {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        } catch {
          // Ignore.
        }

        window.location.reload();
        return new Promise(() => {});
      }

      throw error;
    })
  );
}
