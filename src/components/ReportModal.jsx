import { useEffect, useRef, useState } from "react";

import { useSocial } from "../context/SocialContext";
import { displayNameOf } from "../data/cosmetics";

import "../styles/social.css";

const REASONS = [
  "Harassment or bullying",
  "Inappropriate or sexual content",
  "Spam or scams",
  "Hate speech",
  "Something else",
];

function ReportModal({ target, kind = "profile", messageId = null, onClose }) {
  const { report } = useSocial();

  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    dialog?.showModal();

    return () => dialog?.close();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setState("sending");
    setError("");

    const result = await report(
      target.id,
      kind,
      messageId,
      details.trim() ? `${reason}: ${details.trim()}` : reason
    );

    if (result.ok) {
      setState("sent");
    } else {
      setState("idle");
      setError(result.error);
    }
  };

  return (
    <dialog ref={dialogRef} className="report-modal" onClose={onClose} onCancel={onClose}>
      {state === "sent" ? (
        <div className="report-modal-body">
          <h2>Thanks for telling us.</h2>
          <p>
            The Suffrova team will look at it. If you don't want to hear
            from {displayNameOf(target)} again, you can also block them.
          </p>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form className="report-modal-body" onSubmit={submit}>
          <h2>Report {displayNameOf(target)}</h2>

          <fieldset className="report-reasons">
            {REASONS.map((item) => (
              <label key={item}>
                <input
                  type="radio"
                  name="reason"
                  value={item}
                  checked={reason === item}
                  onChange={() => setReason(item)}
                />
                {item}
              </label>
            ))}
          </fieldset>

          <div className="field">
            <label htmlFor="report-details">Anything else? (optional)</label>
            <textarea
              id="report-details"
              rows={3}
              maxLength={200}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
            />
          </div>

          {error && <div className="notice notice-error">{error}</div>}

          <div className="report-modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Send report"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}

export default ReportModal;
