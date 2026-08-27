import Events from "../components/Events";

function EventsPage({ user }) {
  return (
    <main className="page">

      <Events user={user} />

    </main>
  );
}

export default EventsPage;