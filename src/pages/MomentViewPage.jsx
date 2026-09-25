import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import Icon from "../components/Icon";
import MomentCard from "../components/MomentCard";
import { templateById } from "../data/momentTemplates";
import { useCopy, canNativeShare, nativeShare } from "../hooks/useCopy";

import "../styles/moments.css";

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function wrapLines(text, maxChars) {
  const lines = [];
  let remaining = text;

  while (remaining.length > maxChars) {
    let cut = remaining.lastIndexOf(" ", maxChars);
    if (cut < maxChars / 2) cut = maxChars;
    lines.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }

  if (remaining) lines.push(remaining);

  return lines;
}

function buildCardSvg(moment) {
  const template = templateById(moment.template);
  const lines = wrapLines(moment.message, 34).slice(0, 9);

  const messageSvg = lines
    .map(
      (line, index) =>
        `<text x="170" y="${760 + index * 52}" fill="#1a1612" font-size="38" font-family="Arial, sans-serif">${escapeXml(line)}</text>`
    )
    .join("");

  const fromY = 760 + lines.length * 52 + 50;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
  <defs>
    <radialGradient id="glow" cx="0.1" cy="0" r="0.9">
      <stop offset="0" stop-color="#f2b544" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#f2b544" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="1500" fill="#0f0e11"/>
  <rect width="1200" height="1500" fill="url(#glow)"/>
  <rect x="120" y="220" width="960" height="1100" rx="56" fill="#000000" fill-opacity="0.45"/>
  <rect x="110" y="190" width="960" height="1100" rx="56" fill="${template.color}"/>
  <text x="170" y="360" font-size="110">${escapeXml(template.icon)}</text>
  <text x="170" y="440" fill="#1a1612" fill-opacity="0.75" font-size="26" letter-spacing="5" font-family="Courier New, monospace">${escapeXml(template.label.toUpperCase())}</text>
  <text x="170" y="590" fill="#1a1612" font-size="100" font-family="Georgia, serif">For ${escapeXml(moment.to_name)}</text>
  ${messageSvg}
  <text x="170" y="${fromY}" fill="#1a1612" font-size="40" font-style="italic" font-family="Georgia, serif">— ${escapeXml(moment.from_name)}</text>
  <text x="600" y="1410" text-anchor="middle" fill="#f8d58a" font-size="26" font-family="Arial, sans-serif">made on Vexora · joinvexora.com</text>
</svg>`;
}

function MomentViewPage() {
  const { momentId } = useParams();

  const [moment, setMoment] = useState(null);
  const [state, setState] = useState("loading");
  const [copied, copy] = useCopy();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("moments")
        .select(
          "id, creator_username, from_name, to_name, message, template, created_at, expires_at"
        )
        .eq("id", momentId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setState("missing");
        return;
      }

      if (new Date(data.expires_at).getTime() <= Date.now()) {
        setState("expired");
        return;
      }

      setMoment(data);
      setState("ready");
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [momentId]);

  const ref = moment?.creator_username
    ? `?ref=${encodeURIComponent(moment.creator_username)}`
    : "";

  const publicLink = moment
    ? `${window.location.origin}/m/${moment.id}${ref}`
    : "";

  const downloadCard = () => {
    const blob = new Blob([buildCardSvg(moment)], {
      type: "image/svg+xml;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `vexora-moment-${moment.id}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="moment-view">

      <header className="moment-view-bar">
        <Link to={`/${ref}`} className="navbar-brand">
          <span className="brand-mark" aria-hidden="true">V</span>
          <span className="brand-word">Vexora</span>
        </Link>

        <Link to={`/moments${ref}`} className="btn btn-sm">
          Make your own
        </Link>
      </header>


      <main className="moment-view-main">
        {state === "loading" && (
          <div className="moment-view-loading">
            <span className="brand-mark" aria-hidden="true">V</span>
            <p>Opening your Moment…</p>
          </div>
        )}

        {(state === "expired" || state === "missing") && (
          <div className="moment-view-gone card">
            <span className="moment-view-gone-icon" aria-hidden="true">⌛</span>

            <h1>
              {state === "expired"
                ? "This Moment has expired."
                : "This Moment doesn't exist."}
            </h1>

            <p>
              Moments only last 5 days. Make a new one and
              give someone else a reason to smile.
            </p>

            <Link to="/moments" className="btn btn-primary">
              Make a Moment
              <Icon name="arrowRight" />
            </Link>
          </div>
        )}

        {state === "ready" && moment && (
          <>
            <p className="moment-view-intro">
              <strong>{moment.from_name}</strong> made you something.
            </p>

            <div className="moment-view-card">
              <MomentCard
                templateId={moment.template}
                to={moment.to_name}
                message={moment.message}
                from={moment.from_name}
                large
              />
            </div>

            <div className="moment-view-actions">
              {canNativeShare && (
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    nativeShare({
                      title: "A Vexora Moment",
                      text: `${moment.from_name} made you something ✦`,
                      url: publicLink,
                    })
                  }
                >
                  <Icon name="share" />
                  Share
                </button>
              )}

              <button
                type="button"
                className={`btn ${copied ? "btn-success" : ""}`}
                onClick={() => copy(publicLink)}
              >
                <Icon name={copied ? "check" : "copy"} />
                {copied ? "Copied" : "Copy link"}
              </button>

              <button type="button" className="btn" onClick={downloadCard}>
                <Icon name="download" />
                Save image
              </button>
            </div>

            <section className="moment-view-cta card">
              <div>
                <h2>Make one back.</h2>
                <p>
                  Free, takes a minute, and Vexora runs
                  competitions with real prizes for inviting friends.
                </p>
              </div>

              <Link to={`/moments${ref}`} className="btn btn-primary">
                Create your Moment
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
