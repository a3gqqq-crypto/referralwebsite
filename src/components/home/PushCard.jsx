import { useState } from "react";

import Icon from "../Icon";
import { enablePush, isIosBrowserTab, pushSupported } from "../../lib/push";

const DISMISS_KEY = "suffrova_push_card_hidden";

// Asks people to turn on notifications so calls and messages reach them
// even with Suffrova closed. Hidden once they're on, or if dismissed.
function PushCard() {
  const [state, setState] = useState(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return "hidden";
    } catch {
      // Private mode.
    }
    if (isIosBrowserTab()) return "ios";
    if (!pushSupported()) return "hidden";
    if (Notification.permission === "granted") return "hidden";
    if (Notification.permission === "denied") return "blocked";
    return "ask";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (state === "hidden") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Fine, it just comes back next visit.
    }
    setState("hidden");
  };

  const turnOn = async () => {
    setBusy(true);
    setError("");

    try {
      await enablePush();
      setState("done");
    } catch (pushError) {
      setError(pushError.message);
    }

    setBusy(false);
  };

  return (
    <section className="insta-card card push-card">
      <span className="insta-card-logo push-card-logo" aria-hidden="true">
        <Icon name={state === "done" ? "check" : "bell"} size={22} />
      </span>

      <div className="insta-card-text">
        {state === "done" ? (
          <>
            <strong>Notifications are on 🎉</strong>
            <span>Calls and messages will reach you even when Suffrova is closed.</span>
          </>
        ) : state === "ios" ? (
          <>
            <strong>Get calls on your iPhone</strong>
            <span>
              Tap <b>Share</b> → <b>Add to Home Screen</b>, open Suffrova from there, then turn on notifications.
            </span>
          </>
        ) : state === "blocked" ? (
          <>
            <strong>Notifications are blocked</strong>
            <span>To get calls when the site is closed, allow notifications for suffrova.com in your browser settings.</span>
          </>
        ) : (
          <>
            <strong>Don't miss calls 📞</strong>
            <span>Get calls, messages and friend requests even when Suffrova is closed.</span>
          </>
        )}
        {error && <span className="insta-card-error">{error}</span>}
      </div>

      <div className="insta-card-actions">
        {state === "ask" && (
          <button type="button" className="btn btn-sm btn-primary" onClick={turnOn} disabled={busy}>
            <Icon name="bell" size={15} />
            {busy ? "Turning on…" : "Turn on"}
          </button>
        )}
        {state !== "done" && (
          <button type="button" className="btn btn-sm" onClick={dismiss}>
            Not now
          </button>
        )}
      </div>
    </section>
  );
}

export default PushCard;
