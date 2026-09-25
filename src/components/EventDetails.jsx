import { useState } from "react";
import { Link } from "react-router-dom";

import Icon from "./Icon";
import { useEvents } from "../context/EventContext";
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
          <span className="eyebrow">You</span>
          <strong>
            {joined
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
                        title: "Vexora",
                        text: `Join ${event.title} on Vexora 🏆`,
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
          <h2>Four steps. No tricks.</h2>
        </div>

        <ol className="event-steps">
          <li>
            <span>01</span>
            <strong>Join</strong>
            <p>Hit “Join event” so you show up on this event's board.</p>
          </li>

          <li>
            <span>02</span>
            <strong>Share</strong>
            <p>Send your invite link anywhere people will see it.</p>
          </li>

          <li>
            <span>03</span>
            <strong>Climb</strong>
            <p>Each signup through your link adds to your count.</p>
          </li>

          <li>
            <span>04</span>
            <strong>Win</strong>
            <p>Top three when the clock hits zero take the prizes.</p>
          </li>
        </ol>
      </section>

    </main>
  );
}

export default EventDetails;
