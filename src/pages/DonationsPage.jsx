import DonationCard from "../components/DonationCard";

function DonationsPage({ user }) {
  return (
    <main className="page donation-page">

      <section className="page-header donation-page-header">

        <div className="page-header-label">
          SUPPORT VEXORA
        </div>

        <h1>
          Power the
          <span> next event.</span>
        </h1>

        <p>
          Support the competition, help fund future events,
          and keep the Vexora community growing.
        </p>

      </section>

      <DonationCard user={user} />

    </main>
  );
}

export default DonationsPage;
