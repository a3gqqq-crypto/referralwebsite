import { useCallback, useEffect, useState } from "react";

import { supabase } from "../../lib/supabaseClient";
import PlayerChip from "../PlayerChip";
import SkeletonRows from "../SkeletonRows";
import { EVENT_COLUMNS, eventKind, toEvent } from "../../data/events";
import { getEventStatus } from "../../hooks/useCountdown";
import { adminCall, formatDateTime } from "./adminApi";

const PODIUM_ITEMS = ["badge-podium", "frame-podium"];

function WinnerRow({ event, place, player, payout, ended, onChanged }) {
  const [note, setNote] = useState(payout?.note || "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const reward = event.rules.winners.find((winner) => winner.position === place)?.reward || "";
  const paid = !!payout?.paid_at;

  const setPaid = async (value) => {
    setBusy(true);
    setNotice(null);

    const result = await adminCall("admin_set_payout", {
      p_event_id: event.id,
      p_user: player.id,
      p_place: place,
      p_reward: reward,
      p_paid: value,
      p_note: note,
    });

    setBusy(false);

    if (!result.ok) setNotice({ type: "error", text: result.error });
    else onChanged();
  };

  const givePodium = async () => {
    setBusy(true);
    setNotice(null);

    for (const item of PODIUM_ITEMS) {
      const result = await adminCall("admin_grant_cosmetic", { p_user: player.id, p_cosmetic: item });

      if (!result.ok) {
        setBusy(false);
        setNotice({ type: "error", text: result.error });
        return;
      }
    }

    setBusy(false);
    setNotice({ type: "success", text: "Gave the Podium badge and frame." });
  };

  return (
    <li className={`admin-winner card ${paid ? "is-paid" : ""}`}>
      <div className="admin-winner-main">
        <span className="admin-winner-place mono">#{place}</span>
        <PlayerChip player={player} size={40} />
        <span className="admin-meta mono">
          {eventKind(event).unit(eventKind(event).score(player))}
        </span>
        {reward && <strong className="admin-winner-reward">{reward}</strong>}
        <span className={`chip ${paid ? "chip-live" : "chip-ended"}`}>
          {paid ? `Paid ${formatDateTime(payout.paid_at)}` : "Not paid"}
        </span>
      </div>

      <div className="admin-actions">
        <div className="field admin-note">
          <input
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note, e.g. how it was paid"
            aria-label={`Payout note for ${player.username}`}
          />
        </div>

        <button
          type="button"
          className={`btn btn-sm ${paid ? "btn-ghost" : "btn-primary"}`}
          disabled={busy || !ended}
          onClick={() => setPaid(!paid)}
        >
          {paid ? "Mark unpaid" : "Mark paid"}
        </button>

        <button type="button" className="btn btn-sm" disabled={busy || !ended} onClick={givePodium}>
          Give podium items
        </button>
      </div>

      {notice && <div className={`notice notice-${notice.type} admin-row-notice`}>{notice.text}</div>}
    </li>
  );
}

function AdminWinners() {
  const [events, setEvents] = useState(null);
  const [eventId, setEventId] = useState("");
  const [standings, setStandings] = useState(null);
  const [payouts, setPayouts] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .order("ends_at", { ascending: false })
      .then(({ data, error: loadError }) => {
        if (cancelled) return;

        if (loadError) {
          console.error(loadError);
          setError("Could not load events.");
          return;
        }

        const list = (data || []).map(toEvent);
        setEvents(list);

        const firstEnded = list.find((event) => getEventStatus(event) === "ended");
        setEventId((firstEnded || list[0])?.id || "");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const event = events?.find((item) => item.id === eventId) || null;

  const load = useCallback(async () => {
    if (!event) return;

    const [standingResult, payoutResult] = await Promise.all([
      supabase.rpc(eventKind(event).rpc, {
        p_event_id: event.id,
        p_starts: new Date(event.startDate).toISOString(),
        p_ends: new Date(event.endDate).toISOString(),
      }),
      adminCall("admin_event_payouts", { p_event_id: event.id }),
    ]);

    if (standingResult.error || !payoutResult.ok) {
      console.error(standingResult.error);
      setError(payoutResult.error || "Could not load standings.");
      return;
    }

    setError("");
    setStandings(standingResult.data || []);
    setPayouts(Object.fromEntries((payoutResult.data || []).map((row) => [row.user_id, row])));
  }, [event]);

  useEffect(() => {
    setStandings(null);
    load();
  }, [load]);

  if (!events) return error ? <div className="notice notice-error">{error}</div> : <SkeletonRows count={3} />;

  if (!events.length) return <p className="admin-empty">No events yet.</p>;

  const status = event ? getEventStatus(event) : "ended";
  const ended = status === "ended";
  const places = Math.max(event?.rules.winners.length || 0, 3);

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <div className="field admin-event-picker">
          <label htmlFor="winners-event">Event</label>
          <select id="winners-event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            {events.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} · {getEventStatus(item)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!ended && (
        <div className="notice notice-gold">
          This event hasn't ended yet, so these are live standings. Paying out
          unlocks once it ends.
        </div>
      )}

      {error && <div className="notice notice-error">{error}</div>}

      {!standings ? (
        <SkeletonRows count={3} />
      ) : standings.length === 0 ? (
        <p className="admin-empty">Nobody joined this event.</p>
      ) : (
        <ul className="admin-list">
          {standings.slice(0, places).map((player, index) => (
            <WinnerRow
              key={`${event.id}-${player.id}`}
              event={event}
              place={index + 1}
              player={player}
              payout={payouts[player.id]}
              ended={ended}
              onChanged={load}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default AdminWinners;
