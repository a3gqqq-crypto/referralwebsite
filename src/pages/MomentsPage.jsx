import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import Icon from "../components/Icon";
import MomentCard, { MomentArt } from "../components/MomentCard";
import { MOMENT_TEMPLATES, templateById } from "../data/momentTemplates";
import { useCopy, canNativeShare, nativeShare } from "../hooks/useCopy";
import { renderMomentImage } from "../lib/momentImage";
import { useStoryShare } from "../components/StoryShare";

import "../styles/moments.css";

const MESSAGE_LIMIT = 500;

const linkFor = (id, username) =>
  `${window.location.origin}/m/${id}?ref=${encodeURIComponent(username)}`;

function timeLeft(date) {
  const hours = Math.max(0, (new Date(date).getTime() - Date.now()) / 3600000);
  return hours >= 24 ? `${Math.round(hours / 24)}d left` : `${Math.max(1, Math.floor(hours))}h left`;
}

function MyMoments({ userId, username, refreshKey }) {
  const [moments, setMoments] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    supabase
      .from("moments")
      .select("id, to_name, template, views, first_opened_at, created_at, expires_at")
      .eq("creator_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!cancelled) setMoments(data || []);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  if (!moments?.length) return null;

  const copyLink = async (id) => {
    try {
      await navigator.clipboard.writeText(linkFor(id, username));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // Clipboard blocked; nothing to do.
    }
  };

  return (
    <section className="moments-mine">
      <h2 className="moments-step-title">Your Moments</h2>

      <ul className="moments-mine-list">
        {moments.map((moment) => {
          const template = templateById(moment.template);

          return (
            <li key={moment.id} className="moments-mine-item card">
              <span className="moments-mine-thumb" aria-hidden="true">
                <MomentArt template={template} />
                <span>{template.icon}</span>
              </span>

              <div className="moments-mine-main">
                <strong>For {moment.to_name}</strong>
                <span className={`moments-mine-status ${moment.views ? "is-opened" : ""}`}>
                  {moment.views
                    ? `Opened ${moment.views} ${moment.views === 1 ? "time" : "times"} 💌`
                    : "Not opened yet"}
                  <span className="moments-mine-left"> · {timeLeft(moment.expires_at)}</span>
                </span>
              </div>

              <button
                type="button"
                className={`btn btn-sm ${copiedId === moment.id ? "btn-success" : ""}`}
                onClick={() => copyLink(moment.id)}
              >
                <Icon name={copiedId === moment.id ? "check" : "copy"} size={14} />
                {copiedId === moment.id ? "Copied" : "Link"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MomentsPage({ user }) {
  const username = user?.user_metadata?.username || "Member";
  const [params] = useSearchParams();

  const [templateId, setTemplateId] = useState(MOMENT_TEMPLATES[0].id);
  const [from, setFrom] = useState(username);
  const [to, setTo] = useState(() => (params.get("to") || "").slice(0, 60));
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const [startStoryShare, storySheet] = useStoryShare();
  const [refreshKey, setRefreshKey] = useState(0);

  const [copied, copy] = useCopy();

  const template = templateById(templateId);

  const createMoment = async (event) => {
    event.preventDefault();

    setError("");
    setCreated(null);

    if (!to.trim()) {
      setError("Who's this Moment for?");
      return;
    }

    if (!message.trim()) {
      setError("Write a message first, or tap a suggestion.");
      return;
    }

    setCreating(true);

    const momentId = crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();

    const row = {
      id: momentId,
      creator_id: user.id,
      creator_username: username,
      from_name: from.trim().slice(0, 60),
      to_name: to.trim().slice(0, 60),
      message: message.trim().slice(0, MESSAGE_LIMIT),
      template: templateId,
    };

    const { error: insertError } = await supabase.from("moments").insert(row);

    setCreating(false);

    if (insertError) {
      console.error(insertError);
      setError("Could not create your Moment. Please try again.");
      return;
    }

    setCreated({ ...row, link: linkFor(momentId, username) });
    setRefreshKey((key) => key + 1);
  };

  const startOver = () => {
    setCreated(null);
    setTo("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveImage = () =>
    startStoryShare({
      link: created.link,
      text: `${created.from_name} made you something ✦`,
      render: () => renderMomentImage(created),
    });

  const whatsapp = created
    ? `https://wa.me/?text=${encodeURIComponent(`${created.from_name} made you something ✦ ${created.link}`)}`
    : "";

  const pickTemplate = useCallback((id) => {
    setTemplateId(id);
    setMessage((current) => {
      // Swap in the new style's suggestion if the message is still an untouched suggestion.
      const wasSuggestion = MOMENT_TEMPLATES.some((item) => item.suggestions.includes(current));
      return wasSuggestion ? templateById(id).suggestions[0] : current;
    });
  }, []);

  return (
    <main className="page moments-page">
      {storySheet}

      <header className="page-header">
        <span className="eyebrow">Moments</span>

        <h1>
          Make someone's <span className="mark">whole day.</span>
        </h1>

        <p>
          Pick a vibe, write something real, send the link. They open it like a
          letter. It stays up for 5 days, and if they sign up after, the invite's yours.
        </p>
      </header>

      {created ? (
        <section className="moments-done" aria-live="polite">
          <div className="moments-done-card">
            <MomentCard templateId={created.template} to={created.to_name} message={created.message} from={created.from_name} />
          </div>

          <div className="moments-done-side">
            <span className="eyebrow">It's ready</span>
            <h2>Now send it to {created.to_name}.</h2>
            <p>They'll open it like a letter. It works without an account, and you'll get a 🔔 when they open it.</p>

            <code className="mono">{created.link}</code>

            <div className="moments-done-buttons">
              <a className="btn btn-primary" href={whatsapp} target="_blank" rel="noreferrer">
                Send on WhatsApp
              </a>

              <button
                type="button"
                className={`btn ${copied ? "btn-success" : ""}`}
                onClick={() => copy(created.link)}
              >
                <Icon name={copied ? "check" : "copy"} />
                {copied ? "Copied" : "Copy link"}
              </button>

              {canNativeShare && (
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    nativeShare({ title: "A Vexora Moment", text: `${created.from_name} made you something ✦`, url: created.link })
                  }
                >
                  <Icon name="share" />
                  Share
                </button>
              )}

              <button type="button" className="btn" onClick={saveImage}>
                <Icon name="download" />
                Story image
              </button>
            </div>

            <div className="moments-done-more">
              <Link to={`/m/${created.id}?ref=${encodeURIComponent(username)}`} className="btn btn-sm btn-ghost">
                Preview it
                <Icon name="external" size={14} />
              </Link>
              <button type="button" className="btn btn-sm btn-ghost" onClick={startOver}>
                Make another
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="moments-step">
            <h2 className="moments-step-title">
              <span className="mono">1</span>
              Pick a vibe
            </h2>

            <div className="moments-templates" role="radiogroup" aria-label="Moment style">
              {MOMENT_TEMPLATES.map((item) => {
                const selected = item.id === templateId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`moments-template ${selected ? "selected" : ""} ${item.dark ? "is-dark" : ""}`}
                    style={{ "--m-ink": item.ink, "--m-accent": item.accent }}
                    onClick={() => pickTemplate(item.id)}
                  >
                    <MomentArt template={item} />

                    <span className="moments-template-icon" aria-hidden="true">{item.icon}</span>
                    <span className="moments-template-label">{item.label}</span>
                    <span className="moments-template-prompt">{item.prompt}</span>

                    {selected && (
                      <span className="moments-template-check" aria-hidden="true">
                        <Icon name="check" size={13} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="moments-step">
            <h2 className="moments-step-title">
              <span className="mono">2</span>
              Write it
            </h2>

            <div className="moments-builder">
              <form className="moments-form card" onSubmit={createMoment}>
                <div className="moments-form-row">
                  <div className="field">
                    <label htmlFor="moment-to">To</label>
                    <input
                      id="moment-to"
                      value={to}
                      onChange={(event) => setTo(event.target.value)}
                      placeholder="Their name"
                      maxLength={60}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="moment-from">From</label>
                    <input
                      id="moment-from"
                      value={from}
                      onChange={(event) => setFrom(event.target.value)}
                      maxLength={60}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="moment-message">
                    Message
                    <span className="moments-counter mono">
                      {message.length}/{MESSAGE_LIMIT}
                    </span>
                  </label>

                  <textarea
                    id="moment-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Something they'll screenshot."
                    maxLength={MESSAGE_LIMIT}
                    rows={6}
                  />
                </div>

                <div className="moments-suggest">
                  <span className="moments-suggest-label">
                    <Icon name="sparkles" size={13} />
                    Need words?
                  </span>

                  {template.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className={`moments-suggest-chip ${message === suggestion ? "active" : ""}`}
                      onClick={() => setMessage(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="notice notice-error" role="alert">
                    {error}
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-block" disabled={creating}>
                  {creating ? "Creating…" : "Create my Moment"}
                  {!creating && <Icon name="arrowRight" />}
                </button>

                <p className="moments-form-note">Moments expire after 5 days.</p>
              </form>

              <div className="moments-preview">
                <span className="eyebrow">Live preview</span>

                <MomentCard templateId={templateId} to={to.trim()} message={message.trim()} from={from.trim()} />
              </div>
            </div>
          </section>
        </>
      )}

      <MyMoments userId={user?.id} username={username} refreshKey={refreshKey} />
    </main>
  );
}

export default MomentsPage;
