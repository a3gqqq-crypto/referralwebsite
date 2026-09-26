import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import Icon from "./Icon";
import { useEvents } from "../context/EventContext";
import { localResetTime } from "../lib/streakDay";
import {
  useNow,
  getEventStatus,
  formatCountdown,
} from "../hooks/useCountdown";
import {
  useCopy,
  canNativeShare,
  nativeShare,
  referralLinkFor,
} from "../hooks/useCopy";

import "../styles/eventDetails.css";

const STATUS_LABEL = {
  live: "Live now",
  upcoming: "Upcoming",
  ended: "Ended",
};

const PLACE_LABEL = {
  1: "1st",
  2: "2nd",
  3: "3rd",
};

const MEDAL = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

const STEPS = {
  referral: {
    title: "Four steps. No tricks.",
    items: [
      ["Join", "Hit “Join event” so you show up on this event's board."],
      ["Share", "Send your invite link anywhere people will see it."],
      ["Climb", "Each signup through your link adds to your count."],
      ["Win", "Top three when the clock hits zero take the prizes."],
    ],
  },
  streak: {
    title: "Show up. Every day.",
    items: [
      ["You're in", "Everyone who opens Suffrova this month is entered automatically."],
      ["Check in", `Open the site once a day to add to your chain. Days reset at ${localResetTime()} your time (00:00 UTC).`],
      ["Don't break it", "Miss a day and your chain starts again from one."],
      ["Win", "The three longest chains when the month ends win secret prizes."],
    ],
  },
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

function EventDetails({ event, user }) {
  const now = useNow();

  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [copied, copy] = useCopy();

  const { isJoined, joinEvent, loadingEvents } = useEvents();

  const joined = isJoined(event.id);
  const status = getEventStatus(event, now);
  const isReferralEvent = event.type === "referral";
  const isStreakEvent = event.type === "streak";
  const steps = isStreakEvent ? STEPS.streak : STEPS.referral;

  const [myStanding, setMyStanding] = useState(null);

  useEffect(() => {
    if (!isStreakEvent || !user?.id) return;

    let cancelled = false;

    supabase
      .rpc("streak_standings", {
        p_event_id: event.id,
        p_starts: new Date(event.startDate).toISOString(),
        p_ends: new Date(event.endDate).toISOString(),
      })
      .then(({ data }) => {
        if (cancelled || !data) return;

        const index = data.findIndex((player) => player.id === user.id);
        setMyStanding(index === -1 ? null : { ...data[index], rank: index + 1 });
      });

    return () => {
      cancelled = true;
    };
  }, [isStreakEvent, event.id, event.startDate, event.endDate, user?.id]);

  const referralLink = referralLinkFor(
    user?.user_metadata?.username
  );

  const winners = [...(event.rules?.winners || [])].sort(
    (a, b) => a.position - b.position
  );

  const podiumOrder = [2, 1, 3]
    .map((position) =>
      winners.find((winner) => winner.position === position)
    )
    .filter(Boolean);

  const handleJoin = async () => {
    setMessage("");
    setError("");

    if (status === "ended" || joined) return;

    setJoining(true);

    try {
      const result = await joinEvent(event.id);

      if (!result?.success) {
        setError(result?.error || "Could not join the event.");
        return;
      }

      setMessage(
        result.alreadyJoined
          ? "You're already in this one."
          : isStreakEvent
            ? "You're in. See you tomorrow. 🔥"
            : "You're in. Now go share your link. 🏆"
      );
    } catch (joinError) {
      console.error("Join event error:", joinError);
      setError("Could not join the event. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const joinLabel = loadingEvents
    ? "Checking…"
    : joining
      ? "Joining…"
      : joined
        ? "You're in"
        : "Join event";

  return (
    <main className="page event-page">

      <Link to="/events" className="event-back">
        <Icon name="arrowLeft" size={16} />
        All events
      </Link>


      {/* =========================================
          HERO
      ========================================= */}

      <section className="event-hero">
        <div className="event-hero-art">
          <img src={event.image} alt="" />

          <span className={`chip chip-${status}`}>
            {status === "live" && <span className="live-dot" />}
            {STATUS_LABEL[status]}
          </span>
        </div>

        <div className="event-hero-copy">
          {event.subtitle && (
            <span className="eyebrow">{event.subtitle}</span>
          )}

          <h1>{event.title}</h1>

          <p>{event.description}</p>

          <div className="event-hero-actions">
            {status === "ended" ? (
              <Link
                to={`/events/${event.id}/leaderboard`}
                className="btn btn-primary"
              >
                <Icon name="trophy" />
                See final results
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  className={`btn ${joined ? "btn-success" : "btn-primary"}`}
                  onClick={handleJoin}
                  disabled={loadingEvents || joining || joined}
                >
                  {joined && <Icon name="check" />}
                  {joinLabel}
                </button>

                <Link
                  to={`/events/${event.id}/leaderboard`}
                  className="btn"
                >
                  <Icon name="trophy" />
                  Leaderboard
                </Link>
              </>
            )}
          </div>

          {error && (
            <div className="notice notice-error" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div className="notice notice-success" role="status">
              {message}
            </div>
          )}
        </div>
      </section>


      {/* =========================================
          FACTS
      ========================================= */}

      <section className="event-facts">
        <div className="event-fact event-fact-prize">
          <span className="eyebrow">Prize pool</span>
          <strong>{event.prize}</strong>
        </div>

        <div className="event-fact">
          <span className="eyebrow">
            {status === "upcoming"
              ? "Starts in"
              : status === "live"
                ? "Ends in"
                : "Ran"}
          </span>

          <strong className="mono">
            {status === "upcoming"
              ? formatCountdown(event.startDate, now)
              : status === "live"
                ? formatCountdown(event.endDate, now)
                : `${formatDate(event.startDate)} – ${formatDate(event.endDate)}`}
          </strong>
        </div>

        <div className="event-fact">
          <span className="eyebrow">{isStreakEvent ? "Your streak" : "You"}</span>
          <strong>
            {isStreakEvent && status === "upcoming"
              ? "Starts at 0"
              : isStreakEvent && myStanding
                ? `🔥 ${myStanding.best_streak} ${myStanding.best_streak === 1 ? "day" : "days"} · #${myStanding.rank}`
                : joined
                ? "Competing"
                : status === "ended"
                  ? "Didn't join"
                  : "Not joined yet"}
          </strong>
        </div>
      </section>


      {/* =========================================
          REWARDS
      ========================================= */}

      {podiumOrder.length > 0 && (
        <section className="event-section">
          <div className="event-section-head">
            <span className="eyebrow">Rewards</span>
            <h2>Finish top three.</h2>
          </div>

          <div className="event-podium">
            {podiumOrder.map((winner) => (
              <div
                key={winner.position}
                className={`event-podium-step place-${winner.position}`}
              >
                <span className="event-podium-medal" aria-hidden="true">
                  {MEDAL[winner.position]}
                </span>

                <strong>{winner.reward}</strong>

                <span className="event-podium-place">
                  {PLACE_LABEL[winner.position]} place
                </span>
              </div>
            ))}
          </div>
        </section>
      )}


      {/* =========================================
          REFERRAL LINK
      ========================================= */}

      {isReferralEvent && status !== "ended" && (
        <section className="event-section">
          <div className="event-link card card-gold">
            <div>
              <span className="eyebrow">Your invite link</span>
              <h2>This is how you climb.</h2>
              <p>
                Every new account made through this link
                adds one to your count on the leaderboard.
              </p>
            </div>

            <div className="event-link-box">
              <code className="mono">
                {referralLink || "Set a username to get your link"}
              </code>

              <div className="event-link-buttons">
                <button
                  type="button"
                  className={`btn ${copied ? "btn-success" : "btn-sun"}`}
                  onClick={() => copy(referralLink)}
                  disabled={!referralLink}
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
                        title: "Suffrova",
                        text: `Join ${event.title} on Suffrova 🏆`,
                        url: referralLink,
                      })
                    }
                    disabled={!referralLink}
                  >
                    <Icon name="share" />
                    Share
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}


      {/* =========================================
          HOW IT WORKS
      ========================================= */}

      <section className="event-section">
        <div className="event-section-head">
          <span className="eyebrow">How it works</span>
          <h2>{steps.title}</h2>
        </div>

        <ol className="event-steps">
          {steps.items.map(([title, text], index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{title}</strong>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

    </main>
  );
}

export default EventDetails;
