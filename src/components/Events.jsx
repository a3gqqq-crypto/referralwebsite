import { Link } from "react-router-dom";

import Icon from "./Icon";
import SkeletonRows from "./SkeletonRows";
import { eventKind, useEventList } from "../data/events";
import { useEvents } from "../context/EventContext";
import {
  useNow,
  getEventStatus,
  formatCountdown,
} from "../hooks/useCountdown";
import { useReveal } from "../hooks/useReveal";

import "../styles/events.css";

const STATUS_LABEL = {
  live: "Live now",
  upcoming: "Upcoming",
  ended: "Ended",
};

const STATUS_ORDER = {
  live: 0,
  upcoming: 1,
  ended: 2,
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

function Events() {
  const now = useNow();

  const { isJoined, loadingEvents } = useEvents();

  const [momentsRef, momentsVisible] = useReveal();

  const { events, loading } = useEventList();

  const activeEvents = events
    .filter((event) => event.active)
    .map((event) => ({
      ...event,
      status: getEventStatus(event, now),
    }))
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        new Date(b.startDate) - new Date(a.startDate)
    );

  const hasOpenEvent = activeEvents.some(
    (event) => event.status !== "ended"
  );

  return (
    <>
      <header className="page-header">
        <span className="eyebrow">Events</span>

        <h1>
          Compete for <span className="mark">real prizes.</span>
        </h1>

        <p>
          Each event has a prize pool and a clock. Join,
          share your link, and finish top three.
        </p>
      </header>


      {!hasOpenEvent && !loading && (
        <div className="events-idle">
          <span className="chip chip-ended">Between events</span>

          <p>
            Nothing's running right now. The next event gets
            announced in the Discord first.
          </p>

          <Link to="/discord" className="btn btn-sm btn-dark">
            Get notified
          </Link>
        </div>
      )}


      {loading ? (
        <div className="card" aria-busy="true">
          <SkeletonRows count={3} />
        </div>
      ) : activeEvents.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon" aria-hidden="true">✨</div>

          <h3>No events yet</h3>

          <p>
            The first competition is on its way. Hang out in
            the Discord or send someone a Moment meanwhile.
          </p>

          <div className="empty-state-actions">
            <Link to="/discord" className="btn btn-primary">
              Join Discord
            </Link>

            <Link to="/moments" className="btn">
              Send a Moment
            </Link>
          </div>
        </div>
      ) : (
        <div className="events-list">
          {activeEvents.map((event) => {
            const { status } = event;
            const joined = isJoined(event.id);

            return (
              <article
                key={event.id}
                className={`event-card card is-${status}`}
              >
                <Link
                  to={`/events/${event.id}`}
                  className="event-card-art"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <img src={event.image} alt="" />
                </Link>

                <div className="event-card-body">
                  <div className="event-card-chips">
                    <span className={`chip chip-${status}`}>
                      {status === "live" && <span className="live-dot" />}
                      {STATUS_LABEL[status]}
                    </span>

                    {event.type !== "custom" && (
                      <span className="chip">{eventKind(event).chip}</span>
                    )}

                    {joined && !loadingEvents && (
                      <span className="chip event-card-joined">
                        <Icon name="check" size={14} />
                        Joined
                      </span>
                    )}
                  </div>

                  <h2>
                    <Link to={`/events/${event.id}`}>
                      {event.title}
                    </Link>
                  </h2>

                  <p>{event.description}</p>

                  <dl className="event-card-meta">
                    <div>
                      <dt>Prize pool</dt>
                      <dd className="event-card-prize">
                        {event.prize}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        {status === "upcoming"
                          ? "Starts in"
                          : status === "live"
                            ? "Ends in"
                            : "Ran"}
                      </dt>
                      <dd className="mono">
                        {status === "upcoming"
                          ? formatCountdown(event.startDate, now)
                          : status === "live"
                            ? formatCountdown(event.endDate, now)
                            : `${formatDate(event.startDate)} – ${formatDate(event.endDate)}`}
                      </dd>
                    </div>
                  </dl>

                  <div className="event-card-actions">
                    <Link
                      to={`/events/${event.id}`}
                      className={`btn btn-sm ${status === "ended" ? "" : "btn-primary"}`}
                    >
                      {status === "ended" ? "Event details" : "View event"}
                      <Icon name="arrowRight" size={16} />
                    </Link>

                    <Link
                      to={`/events/${event.id}/leaderboard`}
                      className="btn btn-sm"
                    >
                      <Icon name="trophy" size={16} />
                      {status === "ended" ? "Final results" : "Leaderboard"}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}


      {/* =========================================
          MOMENTS PROMO
      ========================================= */}

      <section
        ref={momentsRef}
        className={`events-moments reveal-section ${
          momentsVisible ? "reveal-visible" : ""
        }`}
      >
        <div className="events-moments-copy">
          <span className="eyebrow">Always on</span>

          <h2>Vexora Moments</h2>

          <p>
            Make a little card for someone — a birthday, a
            thank-you, a “proud of you.” Send the link. If
            they sign up after opening it, you get the
            referral.
          </p>

          <ul className="events-moments-facts">
            <li>6 styles</li>
            <li>Free</li>
            <li>Lives 5 days</li>
          </ul>

          <Link to="/moments" className="btn btn-primary">
            Make a Moment
            <Icon name="arrowRight" />
          </Link>
        </div>

        <div className="events-moments-demo" aria-hidden="true">
          <div className="demo-moment demo-moment-back">
            <span>💙</span>
            <strong>For Leo</strong>
          </div>

          <div className="demo-moment demo-moment-front">
            <span className="demo-moment-emoji">🎂</span>
            <span className="demo-moment-label">Birthday</span>
            <strong>For Maya</strong>
            <p>happy birthday to the only person who laughs at my jokes</p>
            <em>— sam</em>
          </div>
        </div>
      </section>
    </>
  );
}

export default Events;
