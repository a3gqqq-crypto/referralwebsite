import { useState } from "react";

import Icon from "../Icon";
import { useInstall } from "../../lib/install";

const DISMISS_KEY = "suffrova_install_card_hidden";

const hiddenBefore = () => {
  try {
    return Boolean(localStorage.getItem(DISMISS_KEY));
  } catch {
    return false;
  }
};

// "Install the app": one tap on Android/Chrome, Share → Add to Home Screen
// steps on iPhone. Hidden once installed, when opened as the app, or dismissed.
function InstallCard() {
  const { mode, install } = useInstall();
  const [hidden, setHidden] = useState(hiddenBefore);
  const [done, setDone] = useState(false);

  if (hidden || (!mode && !done)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // It just comes back next visit.
    }
    setHidden(true);
  };

  return (
    <section className="insta-card card install-card">
      <span className="insta-card-logo install-card-logo" aria-hidden="true">
        S
      </span>

      <div className="insta-card-text">
        {done ? (
          <>
            <strong>Suffrova is installed 🎉</strong>
            <span>Open it from your home screen for the full-screen app.</span>
          </>
        ) : mode === "ios" ? (
          <>
            <strong>Get the Suffrova app 📲</strong>
            <span className="install-steps">
              In Safari, tap <b>Share</b>{" "}
              <span className="install-share" aria-label="the Share button">
                <Icon name="share" size={13} />
              </span>{" "}
              → <b>Add to Home Screen</b> → <b>Add</b>. Then open Suffrova from your home screen to get calls and
              messages.
            </span>
          </>
        ) : (
          <>
            <strong>Get the Suffrova app 📲</strong>
            <span>Full screen, quicker to open, and calls and messages reach you like a real app.</span>
          </>
        )}
      </div>

      <div className="insta-card-actions">
        {mode === "prompt" && !done && (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={async () => {
              if (await install()) setDone(true);
            }}
          >
            <Icon name="download" size={15} />
            Install
          </button>
        )}
        <button type="button" className="btn btn-sm" onClick={dismiss}>
          {done ? "OK" : "Not now"}
        </button>
      </div>
    </section>
  );
}

export default InstallCard;
