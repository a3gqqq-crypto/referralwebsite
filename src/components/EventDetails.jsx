import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useEvents } from "../context/EventContext";

import "../styles/eventDetails.css";

function EventDetails({
  event,
  user,
  onBack,
}) {
  const [now, setNow] = useState(
    new Date()
  );

  const [joining, setJoining] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  const {
    isJoined,
    joinEvent,
    loadingEvents,
  } = useEvents();


  const joined = isJoined(
    event?.id
  );


  /* =========================================
     COUNTDOWN
  ========================================= */

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);


  /* =========================================
     STATUS
  ========================================= */

  const getStatus = () => {
    const start =
      new Date(
        event.startDate
      );

    const end =
      new Date(
        event.endDate
      );

    if (now < start) {
      return "upcoming";
    }

    if (now > end) {
      return "ended";
    }

    return "live";
  };

  const status = getStatus();


  /* =========================================
     COUNTDOWN
  ========================================= */

  const formatTimeLeft = () => {
    const difference =
      new Date(
        event.endDate
      ).getTime() -
      now.getTime();

    if (difference <= 0) {
      return "00d 00h 00m 00s";
    }

    const totalSeconds =
      Math.floor(
        difference / 1000
      );

    const days =
      Math.floor(
        totalSeconds / 86400
      );

    const hours =
      Math.floor(
        (totalSeconds % 86400) /
          3600
      );

    const minutes =
      Math.floor(
        (totalSeconds % 3600) /
          60
      );

    const seconds =
      totalSeconds % 60;

    return `${String(days).padStart(
      2,
      "0"
    )}d ${String(hours).padStart(
      2,
      "0"
    )}h ${String(minutes).padStart(
      2,
      "0"
    )}m ${String(seconds).padStart(
      2,
      "0"
    )}s`;
  };


  /* =========================================
     JOIN
  ========================================= */

  const handleJoin = async () => {
    setMessage("");
    setError("");

    if (!user?.id) {
      setError(
        "You need to be logged in to join this event."
      );

      return;
    }

    if (status === "ended") {
      setError(
        "This event has already ended."
      );

      return;
    }

    if (joined) {
      return;
    }

    setJoining(true);

    const result =
      await joinEvent(event.id);

    if (!result.success) {
      setError(
        result.error ||
          "Could not join the event."
      );

      setJoining(false);

      return;
    }

    setMessage(
      result.alreadyJoined
        ? "You're already participating in this event."
        : "You're officially in! Good luck 🏆"
    );

    setJoining(false);
  };


  return (
    <section className="event-details-page">

      {/* BACK */}

      <button
        type="button"
        className="event-back-button"
        onClick={onBack}
      >
        ← Back to Events
      </button>


      <div className="event-details-card">

        {/* IMAGE */}

        <div className="event-details-image">

          <img
            src={event.image}
            alt={event.title}
          />

          <div
            className={`event-details-status ${status}`}
          >
            <span></span>

            {status === "live" &&
              "LIVE NOW"}

            {status === "upcoming" &&
              "UPCOMING"}

            {status === "ended" &&
              "EVENT ENDED"}
          </div>

        </div>


        {/* CONTENT */}

        <div className="event-details-content">

          <div className="event-details-subtitle">
            {event.subtitle}
          </div>

          <h1>
            {event.title}
          </h1>

          <p className="event-details-description">
            {event.description}
          </p>


          {/* COUNTDOWN */}

          {status === "live" && (
            <div className="event-countdown">

              <span>
                EVENT ENDS IN
              </span>

              <strong>
                {formatTimeLeft()}
              </strong>

            </div>
          )}


          {/* INFO */}

          <div className="event-info-grid">

            <div className="event-info-box">

              <span>
                🏆 PRIZE POOL
              </span>

              <strong>
                {event.prize}
              </strong>

            </div>


            <div className="event-info-box">

              <span>
                📅 START
              </span>

              <strong>
                {new Date(
                  event.startDate
                ).toLocaleDateString()}
              </strong>

            </div>


            <div className="event-info-box">

              <span>
                🏁 END
              </span>

              <strong>
                {new Date(
                  event.endDate
                ).toLocaleDateString()}
              </strong>

            </div>

          </div>


          {/* TOP 3 */}

          {event.rules?.winners && (
            <div className="event-details-rewards">

              <div className="event-details-rewards-heading">

                <div>

                  <span>
                    TOP 3 REWARDS
                  </span>

                  <h2>
                    Finish on top.
                  </h2>

                </div>

                <strong>
                  {event.prize}
                </strong>

              </div>


              <div className="event-details-reward-grid">

                {event.rules.winners.map(
                  (winner) => (

                    <div
                      className={`event-details-reward reward-${winner.position}`}
                      key={
                        winner.position
                      }
                    >

                      <div className="event-details-reward-position">

                        {winner.position ===
                          1 && "🥇"}

                        {winner.position ===
                          2 && "🥈"}

                        {winner.position ===
                          3 && "🥉"}

                        <span>

                          {winner.position ===
                            1 && "1ST"}

                          {winner.position ===
                            2 && "2ND"}

                          {winner.position ===
                            3 && "3RD"}

                        </span>

                      </div>

                      <strong>
                        {winner.reward}
                      </strong>

                    </div>

                  )
                )}

              </div>

            </div>
          )}


          {/* HOW TO PARTICIPATE */}

          <div className="event-participation">

            <div className="event-participation-icon">
              ⚡
            </div>

            <div>

              <h3>
                How to participate
              </h3>

              <p>
                Join the event and invite as
                many people as possible. Your
                referral count determines your
                position on the leaderboard.
              </p>

            </div>

          </div>


          {/* MESSAGES */}

          {error && (
            <div className="event-message error">
              {error}
            </div>
          )}

          {message && (
            <div className="event-message success">
              {message}
            </div>
          )}


          {/* ACTIONS */}

          <div className="event-details-actions">

            <button
              type="button"
              className={`event-join-button ${
                joined
                  ? "joined"
                  : ""
              }`}
              onClick={handleJoin}
              disabled={
                loadingEvents ||
                joining ||
                joined ||
                status === "ended"
              }
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