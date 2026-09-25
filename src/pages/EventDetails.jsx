import { useParams } from "react-router-dom";

import { useEventList } from "../data/events";
import EventDetailsComponent from "../components/EventDetails";
import NotFound from "./NotFound";
import PageLoading from "../components/PageLoading";

function EventDetailsPage({ user }) {
  const { eventId } = useParams();
  const { events, loading } = useEventList();

  const event = events.find((item) => item.id === eventId);

  if (!event && loading) return <PageLoading />;

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
