import { useMemo } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { events } from "../data/events";
import EventDetailsComponent from "../components/EventDetails";

function EventDetailsPage({ user }) {
  const { eventId } = useParams();

  const navigate = useNavigate();

  const event = useMemo(() => {
    return events.find(
      (item) => item.id === eventId
    );
  }, [eventId]);

  if (!event) {
    return (
      <main className="event-details-page">

        <div className="event-details-card">

          <div className="event-details-content">

            <div className="event-details-subtitle">
              VEXORA EVENTS
            </div>

            <h1>
              Event not found
            </h1>

            <p className="event-details-description">
              This event doesn't exist or is no
              longer available.
            </p>

            <button
              type="button"
              className="event-join-button"
              onClick={() =>
                navigate("/events")
              }
            >
              ← BACK TO EVENTS
            </button>

          </div>

        </div>

      </main>
    );
  }

  return (
    <EventDetailsComponent
      event={event}
      user={user}
      onBack={() => navigate("/events")}
    />
  );
}

export default EventDetailsPage;