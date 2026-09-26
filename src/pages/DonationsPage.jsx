import DonationCard from "../components/DonationCard";

function DonationsPage() {
  return (
    <main className="page donation-page">
      <header className="page-header">
        <span className="eyebrow">Support Suffrova</span>

        <h1>
          Help keep the <span className="mark">prizes coming.</span>
        </h1>

        <p>
          Suffrova is a small, independent project. Support
          goes toward prize pools and running more events.
        </p>
      </header>

      <DonationCard />
    </main>
  );
}

export default DonationsPage;
