import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { events } from "../data/events";
import { useEvents } from "../context/EventContext";

import "../styles/events.css";

function Events({ user }) {
  const [now, setNow] = useState(new Date());

  const {
    isJoined,
    loadingEvents,
  } = useEvents();

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getEventStatus = (event) => {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);

    if (now < start) return "upcoming";
    if (now > end) return "ended";

    return "live";
  };

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

  const activeEvents = events.filter(
    (event) => event.active
  );

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
          Live competitions, special events,
          and experiences built to keep Vexora moving.
        </p>
      </div>


      {/* =========================================
          EVENT LIST
      ========================================= */}

      <div className="events-list">

        {activeEvents.map((event) => {
          const status =
            getEventStatus(event);

          const joined =
            isJoined(event.id);

          const isReferralEvent =
            event.type === "referral";

          return (
            <article
              className={`event-list-card ${status}`}
              key={event.id}
            >

              {/* =====================================
                  EVENT VISUAL
              ===================================== */}

              <div className="event-list-visual">

                <img
                  src={event.image}
                  alt=""
                />

                <div className="event-list-visual-overlay"></div>

                <div
                  className={`event-list-status ${status}`}
                >
                  <span></span>

                  {status === "live"
                    ? "LIVE NOW"
                    : status === "upcoming"
                      ? "UPCOMING"
                      : "ENDED"}
                </div>

                <div className="event-list-visual-mark">
                  {isReferralEvent
                    ? "↗"
                    : "✦"}
                </div>

              </div>


              {/* =====================================
                  EVENT INFO
              ===================================== */}

              <div className="event-list-main">

                <div className="event-list-copy">

                  <div className="event-list-kicker">
                    {isReferralEvent
                      ? "REFERRAL COMPETITION"
                      : "VEXORA EVENT"}
                  </div>

                  <h3>
                    {event.title}
                  </h3>

                  <p>
                    {event.description}
                  </p>

                </div>


                {/* =================================
                    EVENT META
                ================================= */}

                <div className="event-list-meta">

                  <div className="event-list-meta-item">
                    <span>
                      PRIZE
                    </span>

                    <strong>
                      {event.prize}
                    </strong>
                  </div>

                  <div className="event-list-meta-item">
                    <span>
                      {status === "upcoming"
                        ? "STARTS"
                        : status === "ended"
                          ? "STATUS"
                          : "ENDS IN"}
                    </span>

                    <strong>
                      {status === "ended"
                        ? "COMPLETED"
                        : formatTimeLeft(
                            event.endDate
                          )}
                    </strong>
                  </div>

                  <div className="event-list-meta-item">
                    <span>
                      YOUR STATUS
                    </span>

                    <strong
                      className={
                        joined
                          ? "joined"
                          : ""
                      }
                    >
                      {loadingEvents
                        ? "CHECKING"
                        : joined
                          ? "JOINED"
                          : status === "ended"
                            ? "CLOSED"
                            : "READY"}
                    </strong>
                  </div>

                </div>


                {/* =================================
                    ACTIONS
                ================================= */}

                <div className="event-list-actions">

                  <Link
                    to={
                      event.id === "top-inviter"
                        ? "/events/top-inviter"
                        : `/events/${event.id}`
                    }
                    className="event-list-view"
                  >
                    VIEW EVENT
                    <span>→</span>
                  </Link>

                  <Link
                    to={`/events/${event.id}/leaderboard`}
                    className="event-list-board"
                  >
                    🏆 LEADERBOARD
                  </Link>

                </div>

              </div>

            </article>
          );
        })}

      </div>


      {/* =========================================
          VEXORA MOMENTS
      ========================================= */}

      <section className="events-moments-section">

        <div className="events-moments-card">

          <div className="events-moments-art">

  <img
    src="/events/moments-event.png"
    alt="Vexora Moments"
    style={{
      width: "100%",
      height: "100%",
      display: "block",
      objectFit: "cover",
      objectPosition: "center",
      borderRadius: "inherit",
    }}
  />

  <div className="moments-image-status">
    <span></span>
    LIVE NOW
  </div>

  <div className="moments-image-arrow">
    ↗
  </div>

</div>


          <div className="events-moments-main">

            <div className="events-moments-header">

              <div className="events-moments-badge">
                ✦ SPECIAL EVENT
              </div>

              <div className="events-moments-live">
                <span></span>
                VEXORA MOMENTS
              </div>

            </div>


            <div className="events-moments-copy">

              <h2>
                Vexora Moments
                <span> worth sharing.</span>
              </h2>

              <p>
                Create a beautiful personalized Moment,
                share it with someone, and bring new
                people into Vexora.
              </p>

            </div>


            <div className="events-moments-meta">

              <div>
                <span>CREATE</span>
                <strong>6 unique vibes</strong>
              </div>

              <div>
                <span>SHARE</span>
                <strong>Instant link</strong>
              </div>

              <div>
                <span>LIFETIME</span>
                <strong>5 days</strong>
              </div>

            </div>


            <div className="events-moments-bottom">

              <div className="events-moments-tags">
                <span>💜 Someone Special</span>
                <span>🎂 Birthday</span>
                <span>💙 Best Friend</span>
                <span>✨ Festival</span>
              </div>

              <Link
                to="/moments"
                className="events-moments-button"
              >
                VIEW EVENT
                <span>→</span>
              </Link>

            </div>

          </div>

        </div>

      </section>

    </section>
  );
}

export default Events;
