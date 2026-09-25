import { useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import Icon from "../components/Icon";
import MomentCard from "../components/MomentCard";
import { MOMENT_TEMPLATES } from "../data/momentTemplates";
import { useCopy, canNativeShare, nativeShare } from "../hooks/useCopy";

import "../styles/moments.css";

const MESSAGE_LIMIT = 500;

function MomentsPage({ user }) {
  const username = user?.user_metadata?.username || "Member";

  const [templateId, setTemplateId] = useState(MOMENT_TEMPLATES[0].id);
  const [from, setFrom] = useState(username);
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const [copied, copy] = useCopy();

  const createMoment = async (event) => {
    event.preventDefault();

    setError("");
    setCreated(null);

    if (!to.trim()) {
      setError("Who's this Moment for?");
      return;
    }

    if (!message.trim()) {
      setError("Write a message first.");
      return;
    }

    setCreating(true);

    const momentId = crypto
      .randomUUID()
      .replaceAll("-", "")
      .slice(0, 12)
      .toUpperCase();

    const { data, error: insertError } = await supabase
      .from("moments")
      .insert({
        id: momentId,
        creator_id: user.id,
        creator_username: username,
        from_name: from.trim().slice(0, 60),
        to_name: to.trim().slice(0, 60),
        message: message.trim().slice(0, MESSAGE_LIMIT),
        template: templateId,
      })
      .select("id, from_name")
      .single();

    setCreating(false);

    if (insertError) {
      console.error(insertError);
      setError("Could not create your Moment. Please try again.");
      return;
    }

    setCreated({
      ...data,
      link: `${window.location.origin}/m/${data.id}?ref=${encodeURIComponent(
        username
      )}`,
    });
  };

  const startOver = () => {
    setCreated(null);
    setTo("");
    setMessage("");
  };

  return (
    <main className="page moments-page">

      <header className="page-header">
        <span className="eyebrow">Moments</span>

        <h1>
          Make someone's <span className="mark">whole day.</span>
        </h1>

        <p>
          Pick a vibe, write something real, send the
          link. It stays up for 5 days — and if they
          sign up after opening it, the referral's yours.
        </p>
      </header>


      <section className="moments-step">
        <h2 className="moments-step-title">
          <span className="mono">1</span>
          Pick a vibe
        </h2>

        <div className="moments-templates" role="radiogroup" aria-label="Moment style">
          {MOMENT_TEMPLATES.map((template) => {
            const selected = template.id === templateId;

            return (
              <button
                key={template.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`moments-template ${selected ? "selected" : ""}`}
                style={{ "--moment-color": template.color }}
                onClick={() => setTemplateId(template.id)}
              >
                <span className="moments-template-icon" aria-hidden="true">
                  {template.icon}
                </span>

                <span className="moments-template-label">
                  {template.label}
                </span>

                <span className="moments-template-prompt">
                  {template.prompt}
                </span>

                {selected && (
                  <span className="moments-template-check" aria-hidden="true">
                    <Icon name="check" size={14} strokeWidth={3} />
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

            {error && (
              <div className="notice notice-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={creating}
            >
              {creating ? "Creating…" : "Create my Moment"}
              {!creating && <Icon name="arrowRight" />}
            </button>

            <p className="moments-form-note">
              Moments expire after 5 days.
            </p>
          </form>

          <div className="moments-preview">
            <span className="eyebrow">Live preview</span>

            <MomentCard
              templateId={templateId}
              to={to.trim()}
              message={message.trim()}
              from={from.trim()}
            />
          </div>
        </div>
      </section>


      {created && (
        <section className="moments-done card" aria-live="polite">
          <div>
            <span className="eyebrow">It's ready</span>
            <h2>Now send it.</h2>
            <p>Drop the link in their DMs. It works without an account.</p>
          </div>

          <div className="moments-done-link">
            <code className="mono">{created.link}</code>

            <div className="moments-done-buttons">
              <button
                type="button"
                className={`btn ${copied ? "btn-success" : "btn-sun"}`}
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
                    nativeShare({
                      title: "A Vexora Moment",
                      text: `${created.from_name} made you something ✦`,
                      url: created.link,
                    })
                  }
                >
                  <Icon name="share" />
                  Share
                </button>
              )}

              <Link
                to={`/m/${created.id}?ref=${encodeURIComponent(username)}`}
                className="btn"
              >
                Open
                <Icon name="external" size={16} />
              </Link>

              <button type="button" className="btn" onClick={startOver}>
                Make another
              </button>
            </div>
          </div>
        </section>
      )}

    </main>
  );
}

export default MomentsPage;
