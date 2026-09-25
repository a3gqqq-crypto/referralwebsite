import { useParams } from "react-router-dom";

import { events } from "../data/events";
import EventDetailsComponent from "../components/EventDetails";
import NotFound from "./NotFound";

function EventDetailsPage({ user }) {
  const { eventId } = useParams();

  const event = events.find((item) => item.id === eventId);

  if (!event) {
    return (
      <NotFound
        title="Event not found."
        message="This event doesn't exist or isn't available anymore."
      />
    );
  }

  return <EventDetailsComponent event={event} user={user} />;
}

export default EventDetailsPage;
