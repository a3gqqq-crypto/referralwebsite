import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../styles/moments.css";

const TEMPLATES = [
  { id: "teacher", icon: "🌸", label: "Teacher's Day", title: "Thank Your Teacher", accent: "pink" },
  { id: "special", icon: "💜", label: "Someone Special", title: "Say What You Feel", accent: "purple" },
  { id: "friend", icon: "💙", label: "Best Friend", title: "Celebrate Your Person", accent: "blue" },
  { id: "birthday", icon: "🎂", label: "Birthday", title: "Make Their Day", accent: "gold" },
  { id: "congrats", icon: "🏆", label: "Congratulations", title: "Celebrate A Win", accent: "green" },
  { id: "festival", icon: "✨", label: "Festival", title: "Send Some Magic", accent: "cyan" },
];

function MomentsPage({ user }) {
  const username = user?.user_metadata?.username || "Member";
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [from, setFrom] = useState(username);
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdMoment, setCreatedMoment] = useState(null);

  useEffect(() => {
    setFrom(username);
  }, [username]);

  const createMoment = async () => {
    setError("");
    setCreatedMoment(null);

    if (!to.trim()) {
      setError("Please enter who this Moment is for.");
      return;
    }

    if (!message.trim()) {
      setError("Write a message before creating your Moment.");
      return;
    }

    setCreating(true);

    const momentId = crypto.randomUUID()
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
        message: message.trim().slice(0, 500),
        template: template.id,
      })
      .select(
        "id, creator_username, from_name, to_name, message, template, created_at, expires_at"
      )
      .single();

    if (insertError) {
      console.error(insertError);
      setError("Could not create your Moment. Please try again.");
      setCreating(false);
      return;
    }

    const link =
      `${window.location.origin}/m/${data.id}?ref=${encodeURIComponent(
        username
      )}`;

    setCreatedMoment({ ...data, link });
    setCreating(false);
  };

  const copyCreatedLink = async () => {
    if (!createdMoment?.link) return;

    try {
      await navigator.clipboard.writeText(createdMoment.link);
    } catch (copyError) {
      console.error(copyError);
    }
  };

  const shareCreatedLink = async () => {
    if (!createdMoment?.link) return;

    const shareData = {
      title: "A Vexora Moment",
      text: `${createdMoment.from_name} made you a Vexora Moment ✦`,
      url: createdMoment.link,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled native share; keep them on the page.
      }
    }

    await copyCreatedLink();
  };

  return (
    <main className="moments-page">

      <Link
        to="/events"
        className="moments-back-to-events"
      >
        ← BACK TO EVENTS
      </Link>

      {/* =========================================
          PREMIUM MOMENTS EVENT HERO
      ========================================= */}

      <section className="moments-event-hero">

        <div className="moments-event-hero-image">
          <img
            src="/events/moments-event.png"
            alt="Vexora Moments"
          />

          <div className="moments-event-hero-overlay"></div>
          <div className="moments-event-hero-glow"></div>
        </div>

        <div className="moments-event-hero-content">

          <div className="moments-event-status">
            <span></span>
            SPECIAL EVENT
          </div>

          <div className="moments-event-kicker">
            VEXORA MOMENTS
          </div>

          <h1>
            Make something
            <span> worth sharing.</span>
          </h1>

          <p>
            Create a beautiful message, give it a little Vexora magic,
            and send someone a link they will actually want to open.
          </p>

          <div className="moments-event-meta">
            <span>✦ FREE TO CREATE</span>
            <span>🔗 SHAREABLE LINK</span>
            <span>⏳ 5 DAY LIFE</span>
          </div>

        </div>

      </section>

      {/* =========================================
          EXISTING MOMENTS BUILDER
      ========================================= */}

      <section className="moments-builder-shell">
        <div className="moments-section-head">
          <div>
            <div className="moments-section-label">
              CREATE YOUR MOMENT
            </div>

            <h2>
              Pick a vibe. Write something real.
            </h2>

            <p>
              Your Moment becomes a private share link designed
              for stories, chats and DMs.
            </p>
          </div>
        </div>

        <div className="moments-template-grid">
          {TEMPLATES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`moment-template-card ${item.accent} ${
                template.id === item.id ? "selected" : ""
              }`}
              onClick={() => setTemplate(item)}
            >
              <span className="moment-template-icon">
                {item.icon}
              </span>

              <span className="moment-template-label">
                {item.label}
              </span>

              <strong>
                {item.title}
              </strong>
            </button>
          ))}
        </div>

        <div className="moments-builder-grid">

          <div className="moments-form-card">

            <div className="moments-form-label">
              WRITE YOUR MOMENT
            </div>

            <label>
              From

              <input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                maxLength={60}
              />
            </label>

            <label>
              To

              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Who is this for?"
                maxLength={60}
              />
            </label>

            <label>
              Message

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write something they will remember..."
                maxLength={500}
                rows={7}
              />
            </label>

            {error && (
              <div className="moments-error">
                {error}
              </div>
            )}

            <button
              type="button"
              className="moments-create-button"
              onClick={createMoment}
              disabled={creating}
            >
              {creating
                ? "CREATING..."
                : "CREATE MY MOMENT →"}
            </button>

            <div className="moments-form-note">
              Normal Moments stay live for 5 days.
              VIP support for longer lifetimes can be added later.
            </div>

          </div>


          <div
            className={`moment-live-preview ${template.accent}`}
          >
            <div className="moment-preview-noise"></div>

            <div className="moment-preview-top">
              <span>VEXORA MOMENTS</span>
              <span>LIVE PREVIEW</span>
            </div>

            <div className="moment-preview-center">

              <div className="moment-preview-icon">
                {template.icon}
              </div>

              <div className="moment-preview-label">
                {template.label.toUpperCase()}
              </div>

              <h3>
                {to.trim() || "Someone special"}
              </h3>

              <p>
                {message.trim() ||
                  "Your message appears here with the Vexora reveal effect."}
              </p>

              <div className="moment-preview-from">
                — {from.trim() || username}
              </div>

            </div>

            <div className="moment-preview-footer">
              SHARE · OPEN · REMEMBER
            </div>

          </div>

        </div>

        {createdMoment && (
          <div className="moment-success-card">

            <div>
              <div className="moments-section-label">
                MOMENT CREATED
              </div>

              <h3>
                Your link is ready.
              </h3>

              <p>
                This Moment will expire automatically in 5 days.
              </p>
            </div>

            <div className="moment-success-actions">

              <input
                value={createdMoment.link}
                readOnly
                aria-label="Created Moment link"
              />

              <button
                type="button"
                onClick={copyCreatedLink}
              >
                COPY LINK
              </button>

              <button
                type="button"
                onClick={shareCreatedLink}
              >
                SHARE
              </button>

              <Link
                to={`/m/${createdMoment.id}?ref=${encodeURIComponent(
                  username
                )}`}
              >
                OPEN
              </Link>

            </div>

          </div>
        )}

      </section>
    </main>
  );
}

export default MomentsPage;
