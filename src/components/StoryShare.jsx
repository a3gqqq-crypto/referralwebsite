import { useEffect, useRef, useState } from "react";

import Icon from "./Icon";
import { shareOrSaveFile } from "../lib/momentImage";
import { useCopy } from "../hooks/useCopy";

import "../styles/social.css";

const copyNow = (text) =>
  navigator.clipboard?.writeText(text).then(() => true, () => false) ?? Promise.resolve(false);

// Links drawn on a story image can't be tapped on Instagram; only a Link
// sticker can. So the link is copied on the first tap (it has to happen while
// the tap still counts), then this sheet explains the sticker while the image renders.
function StoryShareSheet({ job, onClose }) {
  const [file, setFile] = useState(null);
  const [failed, setFailed] = useState(false);
  const [autoCopied, setAutoCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, copy] = useCopy();

  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    let cancelled = false;

    job.file.then(
      (made) => !cancelled && setFile(made),
      (error) => {
        console.error("Could not make the story image:", error);
        if (!cancelled) setFailed(true);
      }
    );
    job.copied.then((ok) => !cancelled && setAutoCopied(ok));

    return () => {
      cancelled = true;
    };
  }, [job]);

  const share = async () => {
    setSharing(true);
    const result = await shareOrSaveFile(file, job.text);
    setSharing(false);
    if (result !== "cancelled") onClose();
  };

  const isCopied = autoCopied || copied;

  return (
    <dialog
      ref={dialogRef}
      className="report-modal story-share"
      // A stale close event (e.g. from a re-run effect) can arrive after the
      // dialog has reopened; only react when it's really closed.
      onClose={(event) => !event.currentTarget.open && onClose()}
    >
      <div className="report-modal-body">
        <h2>Share to your story</h2>

        <ol className="story-share-steps">
          <li>
            <span className="story-share-num">1</span>
            <div>
              <strong>{isCopied ? "Your link is copied ✓" : "Copy your link"}</strong>
              <div className="story-share-link">
                <code className="mono">{job.link.replace(/^https?:\/\//, "")}</code>
                <button
                  type="button"
                  className={`btn btn-sm ${isCopied ? "btn-success" : "btn-primary"}`}
                  onClick={() => copy(job.link)}
                >
                  <Icon name={isCopied ? "check" : "copy"} size={14} />
                  {isCopied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </li>

          <li>
            <span className="story-share-num">2</span>
            <div>
              <strong>Post the image to your story</strong>
            </div>
          </li>

          <li>
            <span className="story-share-num">3</span>
            <div>
              <strong>Add a Link sticker 🔗 and paste</strong>
              <span>Tap the sticker icon at the top, pick “Link”, and paste. Links in the picture itself can’t be tapped.</span>
            </div>
          </li>
        </ol>

        {failed && <div className="notice notice-error">Couldn’t make the image. Try again.</div>}

        <div className="report-modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-primary" onClick={share} disabled={!file || sharing}>
            <Icon name="share" size={16} />
            {!file && !failed ? "Making image…" : sharing ? "Opening…" : "Share image"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

// start({ link, text, render }) must be called straight from a tap handler.
export function useStoryShare() {
  const [job, setJob] = useState(null);

  const start = ({ link, text, render }) => {
    setJob({ link, text, copied: copyNow(link), file: render() });
  };

  const sheet = job ? <StoryShareSheet job={job} onClose={() => setJob(null)} /> : null;

  return [start, sheet];
}
