import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../../lib/supabaseClient";
import Icon from "../Icon";
import SkeletonRows from "../SkeletonRows";
import { EVENT_COLUMNS, loadEvents, toEvent } from "../../data/events";
import { getEventStatus } from "../../hooks/useCountdown";
import { adminCall, formatDateTime } from "./adminApi";

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,39}$/;
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const STATUS_LABEL = { live: "Live", upcoming: "Upcoming", ended: "Ended" };
const STATUS_CHIP = { live: "chip-live", upcoming: "chip-gold", ended: "chip-ended" };

const pad = (value) => String(value).padStart(2, "0");

// <input type="datetime-local"> works in the browser's own timezone.
function toLocalInput(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

function blankEvent() {
  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 15);

  return {
    isNew: true,
    id: "",
    title: "",
    subtitle: "",
    description: "",
    prize: "$35 Total",
    starts: toLocalInput(start),
    ends: toLocalInput(end),
    image: "/events/summer.png",
    type: "referral",
    active: true,
    winners: [
      { position: 1, reward: "$20" },
      { position: 2, reward: "$10" },
      { position: 3, reward: "$5" },
    ],
  };
}

function formFromEvent(event) {
  return {
    isNew: false,
    id: event.id,
    title: event.title,
    subtitle: event.subtitle,
    description: event.description,
    prize: event.prize,
    starts: toLocalInput(event.startDate),
    ends: toLocalInput(event.endDate),
    image: event.image,
    type: event.type,
    active: event.active,
    winners: event.rules.winners.map((winner) => ({ ...winner })),
  };
}

function validate(form) {
  if (!ID_PATTERN.test(form.id)) {
    return "The link name needs 3–40 lowercase letters, numbers or dashes.";
  }
  if (form.title.trim().length < 3) return "Give it a title (at least 3 characters).";
  if (form.description.trim().length < 10) return "The description needs at least 10 characters.";
  if (!form.prize.trim()) return "Add the prize, e.g. “$35 Total”.";
  if (!form.starts || !form.ends) return "Pick a start and an end time.";
  if (new Date(form.ends) <= new Date(form.starts)) return "The end has to be after the start.";
  if (form.winners.some((winner) => !winner.reward.trim())) {
    return "Each prize place needs a reward, or remove the place.";
  }

  return "";
}

function EventForm({ initial, existingIds, onSaved, onCancel }) {
  const [form, setForm] = useState(initial);
  const [idTouched, setIdTouched] = useState(!initial.isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const setTitle = (title) =>
    setForm((current) => ({
      ...current,
      title,
      id: idTouched ? current.id : slugify(title),
    }));

  const setWinner = (index, reward) =>
    setForm((current) => ({
      ...current,
      winners: current.winners.map((winner, i) => (i === index ? { ...winner, reward } : winner)),
    }));

  const addWinner = () =>
    setForm((current) => ({
      ...current,
      winners: [...current.winners, { position: current.winners.length + 1, reward: "" }],
    }));

  const removeWinner = (index) =>
    setForm((current) => ({
      ...current,
      winners: current.winners
        .filter((_, i) => i !== index)
        .map((winner, i) => ({ ...winner, position: i + 1 })),
    }));

  const liveNow =
    !initial.isNew &&
    getEventStatus({ startDate: initial.starts, endDate: initial.ends }) === "live";

  const submit = async (event) => {
    event.preventDefault();

    const problem =
      validate(form) ||
      (form.isNew && existingIds.includes(form.id) ? "An event with that link name already exists." : "");

    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    setError("");

    const result = await adminCall("admin_save_event", {
      p_event: {
        id: form.id,
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        prize: form.prize.trim(),
        starts_at: new Date(form.starts).toISOString(),
        ends_at: new Date(form.ends).toISOString(),
        image: form.image.trim(),
        type: form.type,
        active: form.active,
        winners: form.winners.map((winner) => ({
          position: winner.position,
          reward: winner.reward.trim(),
        })),
      },
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onSaved(form.id);
  };

  return (
    <form className="admin-event-form card" onSubmit={submit}>
      <h3>{form.isNew ? "New event" : `Edit “${initial.title}”`}</h3>

      {liveNow && (
        <div className="notice notice-gold">
          This event is live. Changing the start or end changes which invites count
          toward the leaderboard.
        </div>
      )}

      <div className="admin-form-grid">
        <div className="field admin-span-2">
          <label htmlFor="event-title">Title</label>
          <input
            id="event-title"
            value={form.title}
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Vexora Top Inviter · Round 3"
          />
        </div>

        <div className="field">
          <label htmlFor="event-id">Link name</label>
          <input
            id="event-id"
            value={form.id}
            maxLength={40}
            disabled={!form.isNew}
            onChange={(event) => {
              setIdTouched(true);
              set("id", event.target.value.toLowerCase());
            }}
            placeholder="top-inviter-3"
          />
          <small className="admin-hint">
            {form.isNew ? `joinvexora.com/events/${form.id || "…"}` : "Can't change after creating."}
          </small>
        </div>

        <div className="field">
          <label htmlFor="event-subtitle">Tagline</label>
          <input
            id="event-subtitle"
            value={form.subtitle}
            maxLength={80}
            onChange={(event) => set("subtitle", event.target.value)}
            placeholder="EVERYONE STARTS AT ZERO."
          />
        </div>

        <div className="field admin-span-2">
          <label htmlFor="event-description">Description</label>
          <textarea
            id="event-description"
            rows={3}
            maxLength={400}
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="event-starts">Starts</label>
          <input
            id="event-starts"
            type="datetime-local"
            value={form.starts}
            onChange={(event) => set("starts", event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="event-ends">Ends</label>
          <input
            id="event-ends"
            type="datetime-local"
            value={form.ends}
            onChange={(event) => set("ends", event.target.value)}
          />
        </div>

        <p className="admin-hint admin-span-2">Times are in your timezone ({TIME_ZONE}).</p>

        <div className="field">
          <label htmlFor="event-prize">Prize pool</label>
          <input
            id="event-prize"
            value={form.prize}
            maxLength={40}
            onChange={(event) => set("prize", event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="event-type">Ranking</label>
          <select id="event-type" value={form.type} onChange={(event) => set("type", event.target.value)}>
            <option value="referral">Invites made during the event</option>
            <option value="custom">Custom (no invite leaderboard)</option>
          </select>
        </div>

        <div className="field admin-span-2">
          <label htmlFor="event-image">Image path</label>
          <input
            id="event-image"
            value={form.image}
            onChange={(event) => set("image", event.target.value)}
            placeholder="/events/summer.png"
          />
        </div>

        <fieldset className="admin-winners admin-span-2">
          <legend>Prizes by place</legend>

          {form.winners.map((winner, index) => (
            <div key={winner.position} className="admin-winner-row">
              <span className="mono">#{winner.position}</span>
              <input
                value={winner.reward}
                maxLength={20}
                onChange={(event) => setWinner(index, event.target.value)}
                placeholder="$20"
                aria-label={`Prize for place ${winner.position}`}
              />
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => removeWinner(index)}
                aria-label={`Remove place ${winner.position}`}
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          ))}

          {form.winners.length < 10 && (
            <button type="button" className="btn btn-sm" onClick={addWinner}>
              Add a place
            </button>
          )}
        </fieldset>

        <label className="admin-check admin-span-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => set("active", event.target.checked)}
          />
          Visible on the site
        </label>
      </div>

      {error && <div className="notice notice-error">{error}</div>}

      <div className="admin-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : form.isNew ? "Create event" : "Save changes"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function AdminEvents() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [saved, setSaved] = useState("");

  // Admins can read hidden events too (RLS), so this list includes them.
  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .order("starts_at", { ascending: false });

    if (loadError) {
      console.error(loadError);
      setError("Could not load events.");
      return;
    }

    setError("");
    setEvents((data || []).map(toEvent));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSaved = async (id) => {
    setEditing(null);
    setSaved(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    await Promise.all([load(), loadEvents({ force: true })]);
  };

  if (editing) {
    return (
      <EventForm
        key={editing.isNew ? "new" : editing.id}
        initial={editing}
        existingIds={(events || []).map((event) => event.id)}
        onSaved={onSaved}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            setSaved("");
            setEditing(blankEvent());
          }}
        >
          <Icon name="sparkles" size={15} />
          New event
        </button>
      </div>

      {saved && <div className="notice notice-success">Saved. It's live on the site now.</div>}
      {error && <div className="notice notice-error">{error}</div>}

      {!events ? (
        <SkeletonRows count={3} />
      ) : events.length === 0 ? (
        <p className="admin-empty">No events yet.</p>
      ) : (
        <ul className="admin-list">
          {events.map((event) => {
            const status = getEventStatus(event);

            return (
              <li key={event.id} className="admin-event card">
                <div className="admin-event-main">
                  <div className="admin-report-head">
                    <span className={`chip ${STATUS_CHIP[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                    {!event.active && <span className="chip admin-banned">Hidden</span>}
                    <span className="admin-meta mono">{event.id}</span>
                  </div>

                  <h3>{event.title}</h3>

                  <p className="admin-meta">
                    {formatDateTime(event.startDate)} → {formatDateTime(event.endDate)} · {event.prize}
                    {event.rules.winners.length > 0 &&
                      ` (${event.rules.winners.map((winner) => winner.reward).join(" / ")})`}
                  </p>
                </div>

                <div className="admin-actions">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      setSaved("");
                      setEditing(formFromEvent(event));
                    }}
                  >
                    <Icon name="edit" size={15} />
                    Edit
                  </button>

                  {event.active && (
                    <Link to={`/events/${event.id}`} className="btn btn-sm btn-ghost">
                      View
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default AdminEvents;
