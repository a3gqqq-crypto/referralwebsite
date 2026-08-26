function DonationCard() {
  const donors = [
    { name: "DreamCM", amount: 250 },
    { name: "Alex", amount: 150 },
    { name: "George", amount: 100 },
    { name: "Kokomelon", amount: 75 },
    { name: "Snake", amount: 50 },
    { name: "PlayerOne", amount: 40 },
    { name: "Shadow", amount: 35 },
    { name: "Nova", amount: 25 },
    { name: "Pixel", amount: 20 },
    { name: "Dragon", amount: 15 },
  ];

  return (
    <section className="donation-section">

      <div className="donation-card">

        <div className="donation-header">

          <div>
            <div className="donation-label">
              SUPPORT THE COMPETITION
            </div>

            <h2>
              Help us keep it <span>going.</span>
            </h2>

            <p>
              Your support helps keep the competition
              running and growing.
            </p>
          </div>

          <div className="donation-icon">
            💜
          </div>

        </div>

        <button
          type="button"
          className="donation-button"
          onClick={() =>
            alert("Donations are coming soon! 💜")
          }
        >
          <span>💰</span>
          Donate
        </button>


        <div className="donation-leaderboard">

          <div className="donation-leaderboard-header">

            <div>
              <span className="donation-small-label">
                LEADERBOARD
              </span>

              <h3>
                Top Donators
              </h3>
            </div>

            <div className="donation-trophy">
              🏆
            </div>

          </div>


          <div className="donor-list">

            {donors.map((donor, index) => {

              const rank = index + 1;

              return (
                <div
                  className={`donor-row ${
                    rank <= 3
                      ? `donor-top donor-top-${rank}`
                      : ""
                  }`}
                  key={`${donor.name}-${rank}`}
                >

                  <div className="donor-rank">

                    {rank === 1
                      ? "🥇"
                      : rank === 2
                        ? "🥈"
                        : rank === 3
                          ? "🥉"
                          : `#${rank}`}

                  </div>


                  <div className="donor-avatar">
                    {donor.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>


                  <div className="donor-info">

                    <strong>
                      {donor.name}
                    </strong>

                    <span>
                      Supporter
                    </span>

                  </div>


                  <div className="donor-amount">

                    <strong>
                      ${donor.amount}
                    </strong>

                  </div>

                </div>
              );

            })}

          </div>

        </div>

      </div>

    </section>
  );
}

export default DonationCard;