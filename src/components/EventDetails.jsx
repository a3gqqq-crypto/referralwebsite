import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useEvents } from "../context/EventContext";

import "../styles/eventDetails.css";

function EventDetails({ event, user, onBack }) {
  const [now, setNow] = useState(new Date());
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copiedReferral, setCopiedReferral] = useState(false);

  const { isJoined, joinEvent, loadingEvents } = useEvents();

  const joined = isJoined(event?.id);
  const isReferralEvent = event?.type === "referral";
  const username = user?.user_metadata?.username || "Member";

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatus = () => {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    if (now < start) return "upcoming";
    if (now > end) return "ended";
    return "live";
  };

  const status = getStatus();

  const formatTimeLeft = () => {
    const difference = new Date(event.endDate).getTime() - now.getTime();
    if (difference <= 0) return "00d 00h 00m 00s";

    const totalSeconds = Math.floor(difference / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(days).padStart(2, "0")}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  };

  const referralLink = `${window.location.origin}/?ref=${encodeURIComponent(username)}`;

  const handleJoin = async () => {
    setMessage("");
    setError("");

    if (!user?.id) {
      setError("You need to be logged in to join this event.");
      return;
    }

    if (status === "ended") {
      setError("This event has already ended.");
      return;
    }

    if (joined) return;

    setJoining(true);

    try {
      const result = await joinEvent(event.id);
      if (!result?.success) {
        setError(result?.error || "Could not join the event.");
        return;
      }

      setMessage(
        result.alreadyJoined
          ? "You're already participating in this event."
          : "You're officially in! Good luck 🏆"
      );
    } catch (joinError) {
      console.error("Join event error:", joinError);
      setError("Could not join the event. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedReferral(true);
      window.setTimeout(() => setCopiedReferral(false), 1800);
    } catch (copyError) {
      console.error("Could not copy referral link:", copyError);
      setError("Could not copy the referral link.");
    }
  };

  return (
    <section className={`event-details-page ${isReferralEvent ? "event-details-referral" : ""}`}>
      <button type="button" className="event-back-button" onClick={onBack}>
        ← Back to Events
      </button>

      <div className="event-details-card">
        <div className="event-details-image">
          <img src={event.image} alt={event.title} />
          <div className="event-details-image-glow"></div>

          <div className={`event-details-status ${status}`}>
            <span></span>
            {status === "live" && "LIVE NOW"}
            {status === "upcoming" && "UPCOMING"}
            {status === "ended" && "EVENT ENDED"}
          </div>

          <div className="event-details-image-copy">
            <div className="event-details-eyebrow">{event.subtitle}</div>
            <h1>{event.title}</h1>
            <p>{event.description}</p>
          </div>
        </div>

        <div className="event-details-content">
          <div className="event-details-signal-grid">
            <div className="event-info-box signal-purple">
              <span>🏆 PRIZE POOL</span>
              <strong>{event.prize}</strong>
            </div>

            <div className="event-info-box signal-blue">
              <span>📅 START</span>
              <strong>{new Date(event.startDate).toLocaleDateString()}</strong>
            </div>

            <div className="event-info-box signal-pink">
              <span>🏁 END</span>
              <strong>{new Date(event.endDate).toLocaleDateString()}</strong>
            </div>
          </div>

          {status === "live" && (
            <div className="event-countdown event-details-countdown-panel">
              <div>
                <span>EVENT ENDS IN</span>
                <strong>Keep climbing while the competition is live.</strong>
              </div>
              <b>{formatTimeLeft()}</b>
            </div>
          )}

          {isReferralEvent && (
            <>
              <section className="event-referral-hero">
                <div>
                  <div className="event-referral-eyebrow">VEXORA REFERRAL COMPETITION</div>
                  <h2>Invite. <span>Climb.</span> Win.</h2>
                  <p>Share your personal referral link, bring new members to Vexora, and push your way into the top three.</p>
                </div>

                <div className="event-referral-mark">
                  <span>🏆</span>
                  <strong>TOP 3</strong>
                  <small>CASH REWARDS</small>
                </div>
              </section>

              <section className="event-referral-link-card">
                <div className="event-referral-link-copy">
                  <span>YOUR REFERRAL LINK</span>
                  <strong>Share this link to grow your position.</strong>
                  <code>{referralLink}</code>
                </div>

                <button
                  type="button"
                  className={`event-referral-copy-button ${copiedReferral ? "copied" : ""}`}
                  onClick={copyReferralLink}
                >
                  {copiedReferral ? "✓ COPIED" : "COPY LINK"}
                </button>
              </section>
            </>
          )}

          {event.rules?.winners && (
            <section className="event-details-rewards">
              <div className="event-details-rewards-heading">
                <div>
                  <span>TOP 3 REWARDS</span>
                  <h2>Finish on top.</h2>
                </div>
                <strong>{event.prize}</strong>
              </div>

              <div className="event-details-reward-grid">
                {event.rules.winners.map((winner) => (
                  <div
                    className={`event-details-reward reward-${winner.position}`}
                    key={winner.position}
                  >
                    <div className="event-details-reward-position">
                      {winner.position === 1 && "🥇"}
                      {winner.position === 2 && "🥈"}
                      {winner.position === 3 && "🥉"}
                      <span>
                        {winner.position === 1 && "1ST"}
                        {winner.position === 2 && "2ND"}
                        {winner.position === 3 && "3RD"}
                      </span>
                    </div>
                    <strong>{winner.reward}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="event-participation">
            <div className="event-participation-icon">✦</div>
            <div>
              <h3>How to participate</h3>
              <p>
                Join the event, share your Vexora referral link, and invite as many new members as possible. Your verified referral count determines your position on the leaderboard.
              </p>
            </div>
          </section>

          {error && <div className="event-message error">{error}</div>}
          {message && <div className="event-message success">{message}</div>}

          <div className="event-details-actions">
            <button
              type="button"
              className={`event-join-button ${joined ? "joined" : ""}`}
              onClick={handleJoin}
              disabled={loadingEvents || joining || joined || status === "ended"}
            >
              {loadingEvents
                ? "CHECKING..."
                : joining
                  ? "JOINING..."
                  : joined
                    ? "✓ YOU'RE JOINED"
                    : status === "ended"
                      ? "EVENT ENDED"
                      : "JOIN EVENT"}
            </button>

            <Link
              to={`/events/${event.id}/leaderboard`}
              className="event-leaderboard-button"
            >
              🏆 VIEW EVENT LEADERBOARD
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default EventDetails;
