function DonationCard() {
  const donors = [
    { name: "pokipine", amount: 50 },
    { name: "Alex", amount: 40 },
    { name: "George", amount: 38 },
    { name: "Kokomelon", amount: 32 },
    { name: "Snake", amount: 21 },
    { name: "PlayerOne", amount: 17 },
    { name: "Shadow", amount: 14 },
    { name: "Nova", amount: 10 },
    { name: "Pixel", amount: 5 },
    { name: "Dragon", amount: 5 },
  ];

  return (
    <section className="donation-section">

      <div className="donation-card">

        <div className="donation-card-glow donation-glow-one"></div>
        <div className="donation-card-glow donation-glow-two"></div>

        <div className="donation-top">

          <div className="donation-copy">

            <div className="donation-label">
              KEEP VEXORA MOVING
            </div>

            <h2>
              Every bit of support
              <span> makes a difference.</span>
            </h2>

            <p>
              Your support helps us keep competitions,
              rewards, and community events running.
            </p>

            <div className="donation-pill-row">

              <span className="donation-pill">
                ✦ COMMUNITY POWERED
              </span>

              <span className="donation-pill">
                🏆 MORE EVENTS
              </span>

              <span className="donation-pill">
                💜 MORE REWARDS
              </span>

            </div>

          </div>

          <div className="donation-hero-icon">

            <div className="donation-icon-ring">
              <div className="donation-icon">
                💜
              </div>
            </div>

            <span>
              SUPPORTER
            </span>

          </div>

        </div>


        <div className="donation-action-panel">

          <div className="donation-action-copy">

            <span>
              READY TO SUPPORT?
            </span>

            <strong>
              Back the next competition.
            </strong>

            <small>
              Donations are coming soon.
            </small>

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
            <b>→</b>
          </button>

        </div>


        <div className="donation-leaderboard">

          <div className="donation-leaderboard-header">

            <div>

              <span className="donation-small-label">
                COMMUNITY SUPPORT
              </span>

              <h3>
                Top Donators
              </h3>

              <p>
                Our community supporters
              </p>

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


        <div className="donation-footer-note">
          <span>✦</span>
          Every supporter helps keep Vexora moving forward.
          <span>✦</span>
        </div>

      </div>

    </section>
  );
}

export default DonationCard;
