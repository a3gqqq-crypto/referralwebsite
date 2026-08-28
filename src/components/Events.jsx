import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { events } from "../data/events";
import EventDetails from "./EventDetails";

import { useEvents } from "../context/EventContext";

import "../styles/events.css";

function Events({ user }) {
  const [now, setNow] = useState(new Date());

  const [selectedEvent, setSelectedEvent] =
    useState(null);

  const [joiningEventId, setJoiningEventId] =
    useState(null);

  const [joinError, setJoinError] =
    useState("");

  const {
    isJoined,
    joinEvent,
    loadingEvents,
  } = useEvents();


  /* =========================================
     CLOCK
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
     EVENT STATUS
  ========================================= */

  const getEventStatus = (event) => {
    const start =
      new Date(event.startDate);

    const end =
      new Date(event.endDate);

    if (now < start) {
      return "upcoming";
    }

    if (now > end) {
      return "ended";
    }

    return "live";
  };


  /* =========================================
     TIME LEFT
  ========================================= */

  const formatTimeLeft = (endDate) => {
    const difference =
      new Date(endDate).getTime() -
      now.getTime();

    if (difference <= 0) {
      return "Event ended";
    }

    const totalSeconds =
      Math.floor(difference / 1000);

    const days =
      Math.floor(totalSeconds / 86400);

    const hours =
      Math.floor(
        (totalSeconds % 86400) / 3600
      );

    const minutes =
      Math.floor(
        (totalSeconds % 3600) / 60
      );

    const seconds =
      totalSeconds % 60;

    return `${days}d ${String(hours).padStart(
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
     WINNER REWARD
  ========================================= */

  const getWinnerReward = (
    event,
    position
  ) => {
    const winners =
      event?.rules?.winners || [];

    const winner = winners.find(
      (item) =>
        item.position === position
    );

    return winner?.reward || "—";
  };


  /* =========================================
     EVENT ACTION
     LIVE EVENT -> join immediately.
     UPCOMING/ENDED -> open details.
  ========================================= */

  const handleEventAction = async (event) => {
    const status = getEventStatus(event);

    setJoinError("");

    /*
     * Already joined:
     * stay on this page. Do not open another
     * screen containing a second Join button.
     */
    if (isJoined(event.id)) {
      return;
    }

    /*
     * LIVE EVENT:
     * join directly from this card.
     * Never open EventDetails from this action.
     */
    if (status === "live" && user?.id) {
      setJoiningEventId(event.id);

      try {
        const result = await joinEvent(event.id);

        if (!result?.success) {
          setJoinError(
            result?.error ||
              "Could not join the event. Please try again."
          );
        }
      } catch (error) {
        console.error("Join event error:", error);

        setJoinError(
          "Could not join the event. Please try again."
        );
      } finally {
        setJoiningEventId(null);
      }

      return;
    }

    /*
     * Upcoming / ended:
     * opening details is still useful.
     */
    setSelectedEvent(event);
  };


  /* =========================================
     EVENT DETAILS
  ========================================= */

  if (selectedEvent) {
    return (
      <EventDetails
        event={selectedEvent}
        user={user}
        onBack={() =>
          setSelectedEvent(null)
        }
      />
    );
  }


  /* =========================================
     ACTIVE EVENTS
  ========================================= */

  const activeEvents =
    events.filter(
      (event) => event.active
    );


  /* =========================================
     EMPTY
  ========================================= */

  if (activeEvents.length === 0) {
    return (
      <section className="events-section">

        <div className="events-heading">

          <div className="events-label">
            VEXORA EVENTS
          </div>

          <h2>
            No active competitions.
          </h2>

          <p>
            New events and rewards will appear
            here when they go live.
          </p>

        </div>


        <div className="events-empty">

          <div className="events-empty-icon">
            ✨
          </div>

          <h3>
            Nothing is live right now
          </h3>

          <p>
            Check back soon for the next Vexora
            competition.
          </p>

        </div>

      </section>
    );
  }


  return (
    <section className="events-section">

      {/* =========================================
          HEADER
      ========================================= */}

      <div className="events-heading">

        <div className="events-label">
          VEXORA EVENTS
        </div>

        <h2>
          Compete for the top.
        </h2>

        <p>
          Join live competitions, invite people,
          and compete for exclusive rewards.
        </p>

      </div>


      {/* =========================================
          EVENT GRID
      ========================================= */}

      {joinError && (
        <div
          className="auth-message error"
          role="alert"
          style={{
            maxWidth: "720px",
            margin: "0 auto 18px",
          }}
        >
          {joinError}
        </div>
      )}

      <div className="events-grid">

        {activeEvents.map((event) => {

          const status =
            getEventStatus(event);

          const isReferralEvent =
            event.type === "referral";

          /*
           * IMPORTANT:
           * Joined state now comes from the
           * shared EventContext.
           *
           * That means Supabase is the source
           * of truth across devices.
           */
          const joined =
            isJoined(event.id);


          return (
            <article
              className={`event-card ${status}`}
              key={event.id}
            >

              {/* =================================
                  IMAGE
              ================================= */}

              <div className="event-image">

                <img
                  src={event.image}
                  alt={event.title}
                />

                <div
                  className={`event-status ${status}`}
                >

                  <span></span>

                  {status === "live" &&
                    "LIVE NOW"}

                  {status === "upcoming" &&
                    "UPCOMING"}

                  {status === "ended" &&
                    "ENDED"}

                </div>

              </div>


              {/* =================================
                  CONTENT
              ================================= */}

              <div className="event-content">

                <div className="event-subtitle">
                  {event.subtitle}
                </div>

                <h3>
                  {event.title}
                </h3>

                <p className="event-description">
                  {event.description}
                </p>


                {/* =================================
                    TOP 3 REWARDS
                ================================= */}

                {isReferralEvent &&
                  event.rules?.winners && (

                    <div className="event-rewards">

                      <div className="event-rewards-heading">

                        <span>
                          TOP 3 REWARDS
                        </span>

                        <strong>
                          {event.prize}
                        </strong>

                      </div>


                      <div className="event-rewards-grid">

                        <div className="event-reward second">

                          <span>
                            🥈 2ND
                          </span>

                          <strong>
                            {getWinnerReward(
                              event,
                              2
                            )}
                          </strong>

                        </div>


                        <div className="event-reward first">

                          <span>
                            🥇 1ST
                          </span>

                          <strong>
                            {getWinnerReward(
                              event,
                              1
                            )}
                          </strong>

                        </div>


                        <div className="event-reward third">

                          <span>
                            🥉 3RD
                          </span>

                          <strong>
                            {getWinnerReward(
                              event,
                              3
                            )}
                          </strong>

                        </div>

                      </div>

                    </div>
                  )}


                {/* =================================
                    EVENT INFO
                ================================= */}

                <div className="event-details">

                  <div className="event-detail">

                    <span>
                      🏆 PRIZE POOL
                    </span>

                    <strong>
                      {event.prize}
                    </strong>

                  </div>


                  <div className="event-detail">

                    <span>
                      {status === "upcoming"
                        ? "🚀 STARTS IN"
                        : status === "ended"
                          ? "✓ STATUS"
                          : "⏱ ENDS IN"}
                    </span>

                    <strong>
                      {status === "ended"
                        ? "Completed"
                        : formatTimeLeft(
                            event.endDate
                          )}
                    </strong>

                  </div>

                </div>


                {/* =================================
                    ACTIONS
                ================================= */}

                <div className="event-actions">

                  <button
                    className={`event-button ${
                      joined
                        ? "event-button-joined"
                        : ""
                    }`}
                    type="button"
                    onClick={() =>
                      handleEventAction(event)
                    }
                    disabled={
                      loadingEvents ||
                      joiningEventId === event.id
                    }
                  >

                    {loadingEvents
                      ? "CHECKING..."
                      : joiningEventId === event.id
                        ? "JOINING..."
                        : joined
                          ? "✓ YOU'RE JOINED"
                          : status === "live"
                            ? event.buttonText
                            : "VIEW EVENT"}

                  </button>


                  <Link
                    to={`/events/${event.id}/leaderboard`}
                    className="event-leaderboard-link"
                  >
                    🏆 EVENT LEADERBOARD
                  </Link>

                </div>

              </div>

            </article>
          );
        })}

      </div>

    </section>
  );
}

export default Events;