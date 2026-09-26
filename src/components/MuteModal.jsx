import { useEffect, useRef, useState } from "react";

import { supabase } from "../lib/supabaseClient";
import { displayNameOf } from "../data/cosmetics";

import "../styles/social.css";

const LENGTHS = [
  { label: "1 hour", minutes: 60 },
  { label: "1 day", minutes: 60 * 24 },
  { label: "1 week", minutes: 60 * 24 * 7 },
  { label: "Forever", minutes: null },
];

// Owner-only: stop someone sending chat messages (Lounge and DMs) for a while.
function MuteModal({ target, onClose }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const name = displayNameOf(target);

  const mute = async (length) => {
    setBusy(true);

    const { error } = await supabase.rpc("owner_mute_user", {
      p_user: target.id,
      p_minutes: length.minutes,
    });

    setBusy(false);
    setResult(
      error
        ? { type: "error", text: error.message || "Couldn't mute them." }
        : {
            type: "success",
            text:
              length.minutes == null
                ? `${name} can't chat anymore. Undo it from Admin → Members.`
                : `${name} is muted for ${length.label}.`,
          }
    );
  };

  return (
    <dialog
      ref={dialogRef}
      className="report-modal"
      onClose={(event) => !event.currentTarget.open && onClose()}
    >
      <div className="report-modal-body">
        <h2>Mute {name}</h2>

        {result ? (
          <>
            <div className={`notice notice-${result.type}`} role="status">
              {result.text}
            </div>
            <div className="report-modal-actions">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p>They won't be able to send messages in the Lounge or DMs until it ends.</p>

            <div className="mute-lengths">
              {LENGTHS.map((length) => (
                <button
                  key={length.label}
                  type="button"
                  className={`btn ${length.minutes == null ? "btn-danger" : ""}`}
                  onClick={() => mute(length)}
                  disabled={busy}
                >
                  {length.label}
                </button>
              ))}
            </div>

            <div className="report-modal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

export default MuteModal;
