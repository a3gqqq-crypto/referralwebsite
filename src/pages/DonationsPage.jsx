import DonationCard from "../components/DonationCard";

function DonationsPage({ user }) {
  return (
    <main className="page">

      <section className="page-header">

        <div className="page-header-label">
          SUPPORT VEXORA
        </div>

        <h1>
          Support the
          <span> competition.</span>
        </h1>

        <p>
          Help keep Vexora running and support future
          events, rewards, and community competitions.
        </p>

      </section>

      <DonationCard user={user} />

    </main>
  );
}

export default DonationsPage;