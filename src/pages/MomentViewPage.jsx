import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import Icon from "../components/Icon";
import MomentCard from "../components/MomentCard";
import { templateById } from "../data/momentTemplates";
import { useCopy, canNativeShare, nativeShare } from "../hooks/useCopy";
import { renderMomentImage } from "../lib/momentImage";
import { useStoryShare } from "../components/StoryShare";

import "../styles/moments.css";

// Stable pseudo-random in [0, 1) so the burst looks scattered without Math.random in render.
const jitter = (n) => (((Math.sin(n * 12.9898) * 43758.5453) % 1) + 1) % 1;

// Emoji that fly out when the envelope opens.
function Burst({ emojis }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => {
        const angle = (index / 28) * Math.PI * 2 + jitter(index) * 0.4;
        const distance = 160 + jitter(index + 50) * 220;

        return {
          emoji: emojis[index % emojis.length],
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 80,
          rotate: Math.round(jitter(index + 100) * 540 - 270),
          delay: jitter(index + 150) * 0.15,
          size: 18 + jitter(index + 200) * 22,
        };
      }),
    [emojis]
  );

  return (
    <div className="moment-burst" aria-hidden="true">
      {pieces.map((piece, index) => (
        <span
          key={index}
          style={{
            "--x": `${piece.x}px`,
            "--y": `${piece.y}px`,
            "--r": `${piece.rotate}deg`,
            "--d": `${piece.delay}s`,
            fontSize: `${piece.size}px`,
          }}
        >
          {piece.emoji}
        </span>
      ))}
    </div>
  );
}

function MomentViewPage() {
  const { momentId } = useParams();

  const [moment, setMoment] = useState(null);
  const [state, setState] = useState("loading");
  const [opened, setOpened] = useState(false);
  const [startStoryShare, storySheet] = useStoryShare();
  const [copied, copy] = useCopy();

  useEffect(() => {
    let cancelled = false;

    supabase.rpc("get_moment", { p_id: momentId }).then(({ data, error }) => {
      if (cancelled) return;

      const row = data?.[0];

      if (error || !row) {
        setState("missing");
        return;
      }

      if (row.expired) {
        setState("expired");
        return;
      }

      setMoment(row);
      setState("ready");
    });

    return () => {
      cancelled = true;
    };
  }, [momentId]);

  const template = templateById(moment?.template);

  const ref = moment?.creator_username ? `?ref=${encodeURIComponent(moment.creator_username)}` : "";
  const publicLink = moment ? `${window.location.origin}/m/${moment.id}${ref}` : "";
  const replyLink = moment
    ? `/moments?to=${encodeURIComponent(moment.from_name || "")}${ref ? `&${ref.slice(1)}` : ""}`
    : "/moments";

  const open = () => {
    setOpened(true);
    // Supabase queries only send once awaited/then'd.
    supabase.rpc("open_moment", { p_id: moment.id }).then(({ error }) => {
      if (error) console.error("Could not count the open:", error);
    });
  };

  const saveImage = () =>
    startStoryShare({
      link: publicLink,
      text: `${moment.from_name} made you something ✦`,
      render: () => renderMomentImage(moment),
    });

  return (
    <div className="moment-view" style={{ "--m-glow": template.bg[1] }}>
      {storySheet}

      <header className="moment-view-bar">
        <Link to={`/${ref}`} className="navbar-brand">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span className="brand-word">Suffrova</span>
        </Link>

        <Link to={`/moments${ref}`} className="btn btn-sm">
          Make your own
        </Link>
      </header>

      <main className="moment-view-main">
        {state === "loading" && (
          <div className="moment-view-loading">
            <span className="brand-mark" aria-hidden="true">S</span>
            <p>Opening your Moment…</p>
          </div>
        )}

        {(state === "expired" || state === "missing") && (
          <div className="moment-view-gone card">
            <span className="moment-view-gone-icon" aria-hidden="true">⌛</span>

            <h1>{state === "expired" ? "This Moment has expired." : "This Moment doesn't exist."}</h1>

            <p>Moments only last 5 days. Make a new one and give someone else a reason to smile.</p>

            <Link to="/moments" className="btn btn-primary">
              Make a Moment
              <Icon name="arrowRight" />
            </Link>
          </div>
        )}

        {state === "ready" && moment && !opened && (
          <div className="moment-sealed">
            <p className="moment-view-intro">
              <strong>{moment.from_name}</strong> made you something.
            </p>

            <button
              type="button"
              className="moment-envelope"
              onClick={open}
              style={{ "--env-a": template.bg[0], "--env-b": template.bg[1], "--env-ink": template.ink }}
              aria-label="Open your Moment"
            >
              <span className="moment-envelope-flap" aria-hidden="true" />
              <span className="moment-envelope-seal" aria-hidden="true">{template.icon}</span>
              <span className="moment-envelope-to">For {moment.to_name}</span>
            </button>

            <p className="moment-tap">Tap to open</p>
          </div>
        )}

        {state === "ready" && moment && opened && (
          <>
            <p className="moment-view-intro">
              <strong>{moment.from_name}</strong> made you something.
            </p>

            <div className="moment-view-card">
              <Burst emojis={template.burst} />
              <MomentCard
                templateId={moment.template}
                to={moment.to_name}
                message={moment.message}
                from={moment.from_name}
                large
              />
            </div>

            <div className="moment-view-actions">
              <button type="button" className="btn btn-primary" onClick={saveImage}>
                <Icon name="download" />
                Save or share image
              </button>

              <button
                type="button"
                className={`btn ${copied ? "btn-success" : ""}`}
                onClick={() => copy(publicLink)}
              >
                <Icon name={copied ? "check" : "copy"} />
                {copied ? "Copied" : "Copy link"}
              </button>

              {canNativeShare && (
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    nativeShare({ title: "A Suffrova Moment", text: `${moment.from_name} made you something ✦`, url: publicLink })
                  }
                >
                  <Icon name="share" />
                  Share link
                </button>
              )}
            </div>

            <section className="moment-view-cta card">
              <div>
                <h2>Send one back to {moment.from_name}.</h2>
                <p>Free, takes a minute, and Suffrova runs competitions with real prizes for inviting friends.</p>
              </div>

              <Link to={replyLink} className="btn btn-primary">
                Reply with a Moment
                <Icon name="arrowRight" />
              </Link>
            </section>
          </>
        )}
      </main>

    </div>
  );
}

export default MomentViewPage;
