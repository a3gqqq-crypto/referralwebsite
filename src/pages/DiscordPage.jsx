const DISCORD_INVITE =
  "https://discord.gg/GNC4xd87FP";

function DiscordPage() {
  const handleJoin = () => {
    // Navigate directly to the working Discord invite.
    window.location.href = DISCORD_INVITE;
  };

  return (
    <main className="page discord-page-v3">

      {/* =========================================
          CINEMATIC HERO
      ========================================= */}

      <section className="discord-v3-hero">

        <div className="discord-v3-aurora aurora-cyan"></div>
        <div className="discord-v3-aurora aurora-purple"></div>
        <div className="discord-v3-aurora aurora-pink"></div>
        <div className="discord-v3-aurora aurora-green"></div>

        <div className="discord-v3-stars"></div>

        <div className="discord-v3-hero-grid">

          <div className="discord-v3-copy">

            <div className="discord-v3-kicker">
              <span></span>
              VEXORA COMMUNITY
              <b>•</b>
              DISCORD
            </div>

            <h1>
              More than a
              <span> leaderboard.</span>
              <em>It’s a community.</em>
            </h1>

            <p>
              Step into the Vexora Discord for instant event alerts,
              winner announcements, community competition, support,
              and the people behind the climb.
            </p>

            <div className="discord-v3-actions">

              <button
                type="button"
                className="discord-v3-primary"
                onClick={handleJoin}
              >
                <span className="discord-v3-button-icon">
                  D
                </span>

                JOIN THE DISCORD

                <b>↗</b>
              </button>

              <a
                href="#discord-v3-hub"
                className="discord-v3-ghost"
              >
                EXPLORE THE HUB
                <span>↓</span>
              </a>

            </div>

            <div className="discord-v3-proof">

              <div className="discord-v3-proof-item">
                <strong>LIVE</strong>
                <span>EVENT ALERTS</span>
              </div>

              <i></i>

              <div className="discord-v3-proof-item">
                <strong>FAST</strong>
                <span>COMMUNITY SUPPORT</span>
              </div>

              <i></i>

              <div className="discord-v3-proof-item">
                <strong>REAL</strong>
                <span>COMPETITORS</span>
              </div>

            </div>

          </div>


          {/* =====================================
              HERO VISUAL
          ===================================== */}

          <div className="discord-v3-stage">

            <div className="discord-v3-halo halo-one"></div>
            <div className="discord-v3-halo halo-two"></div>
            <div className="discord-v3-halo halo-three"></div>

            <div className="discord-v3-core">

              <div className="discord-v3-core-shadow"></div>

              <div className="discord-v3-discord-logo">
                <div className="discord-v3-logo-ear ear-left"></div>
                <div className="discord-v3-logo-ear ear-right"></div>

                <div className="discord-v3-logo-eye eye-left"></div>
                <div className="discord-v3-logo-eye eye-right"></div>

                <div className="discord-v3-logo-mouth"></div>
              </div>

            </div>


            <div className="discord-v3-floating floating-cyan">
              <span>01</span>
              <strong>EVENT DROPS</strong>
              <small>First to know.</small>
            </div>

            <div className="discord-v3-floating floating-purple">
              <span>02</span>
              <strong>WINNER ALERTS</strong>
              <small>See who climbed.</small>
            </div>

            <div className="discord-v3-floating floating-pink">
              <span>03</span>
              <strong>COMMUNITY</strong>
              <small>Find your crew.</small>
            </div>

            <div className="discord-v3-floating floating-green">
              <span>04</span>
              <strong>SUPPORT</strong>
              <small>Help when needed.</small>
            </div>

          </div>

        </div>


        <div className="discord-v3-marquee">

          <span>VEXORA</span>
          <i>✦</i>
          <span>LIVE EVENTS</span>
          <i>✦</i>
          <span>COMMUNITY</span>
          <i>✦</i>
          <span>WINNERS</span>
          <i>✦</i>
          <span>SUPPORT</span>
          <i>✦</i>
          <span>VEXORA</span>

        </div>

      </section>


      {/* =========================================
          DISCORD HUB
      ========================================= */}

      <section
        className="discord-v3-hub"
        id="discord-v3-hub"
      >

        <div className="discord-v3-section-heading">

          <div>

            <div className="discord-v3-section-label">
              THE VEXORA HUB
            </div>

            <h2>
              Everything happens here.
            </h2>

            <p>
              One community. Every competition.
              Built to keep you in the action.
            </p>

          </div>

          <div className="discord-v3-live-pill">
            <span></span>
            COMMUNITY ONLINE
          </div>

        </div>


        <div className="discord-v3-hub-grid">

          <article className="discord-v3-hub-card hub-cyan">

            <div className="hub-number">01</div>

            <div className="hub-icon">#</div>

            <div className="hub-content">

              <span>ANNOUNCEMENTS</span>

              <h3>
                Be first to know.
              </h3>

              <p>
                New event launches, changes, winners,
                and important Vexora announcements.
              </p>

            </div>

            <div className="hub-line"></div>

          </article>


          <article className="discord-v3-hub-card hub-purple">

            <div className="hub-number">02</div>

            <div className="hub-icon">✦</div>

            <div className="hub-content">

              <span>COMPETITION</span>

              <h3>
                Follow the climb.
              </h3>

              <p>
                Compare progress, celebrate wins,
                and stay close to the action.
              </p>

            </div>

            <div className="hub-line"></div>

          </article>


          <article className="discord-v3-hub-card hub-pink">

            <div className="hub-number">03</div>

            <div className="hub-icon">◆</div>

            <div className="hub-content">

              <span>COMMUNITY</span>

              <h3>
                Find your people.
              </h3>

              <p>
                Meet competitors, share moments,
                and build your place inside Vexora.
              </p>

            </div>

            <div className="hub-line"></div>

          </article>


          <article className="discord-v3-hub-card hub-green">

            <div className="hub-number">04</div>

            <div className="hub-icon">?</div>

            <div className="hub-content">

              <span>SUPPORT</span>

              <h3>
                Never get stuck.
              </h3>

              <p>
                Get help with accounts, referrals,
                events, and anything Vexora.
              </p>

            </div>

            <div className="hub-line"></div>

          </article>

        </div>

      </section>


      {/* =========================================
          SERVER EXPERIENCE
      ========================================= */}

      <section className="discord-v3-server">

        <div className="discord-v3-server-shell">

          <div className="server-spectrum"></div>

          <div className="discord-v3-server-top">

            <div>

              <div className="discord-v3-section-label">
                ENTER THE SERVER
              </div>

              <h2>
                This is where Vexora feels alive.
              </h2>

              <p>
                Join the conversation, catch live announcements,
                and stay connected between every event.
              </p>

            </div>

            <div className="discord-v3-server-status">
              <span></span>
              READY TO JOIN
            </div>

          </div>


          <div className="discord-v3-room-preview">

            <div className="discord-v3-room-sidebar">

              <div className="room-brand">
                <div>V</div>
                <span>VEXORA</span>
              </div>

              <div className="room-label">
                TEXT CHANNELS
              </div>

              <div className="room-channel active">
                <span>#</span>
                announcements
              </div>

              <div className="room-channel">
                <span>#</span>
                general
              </div>

              <div className="room-channel">
                <span>#</span>
                leaderboard
              </div>

              <div className="room-channel">
                <span>#</span>
                winners
              </div>

              <div className="room-label room-label-space">
                SUPPORT
              </div>

              <div className="room-channel support-channel">
                <span>?</span>
                support
              </div>

            </div>


            <div className="discord-v3-room-main">

              <div className="room-main-header">

                <div>
                  <span>#</span>
                  announcements
                </div>

                <small>
                  VEXORA COMMUNITY
                </small>

              </div>


              <div className="room-message room-message-cyan">

                <div className="room-avatar">V</div>

                <div>

                  <div className="room-message-name">
                    Vexora
                    <span>BOT</span>
                  </div>

                  <p>
                    🚀 A new competition is now live.
                    Get in, invite your people, and climb.
                  </p>

                </div>

              </div>


              <div className="room-message room-message-purple">

                <div className="room-avatar">R</div>

                <div>

                  <div className="room-message-name">
                    Results
                    <span>UPDATE</span>
                  </div>

                  <p>
                    🏆 The leaderboard has been updated.
                    Someone just took the lead.
                  </p>

                </div>

              </div>


              <div className="room-message room-message-pink">

                <div className="room-avatar">V</div>

                <div>

                  <div className="room-message-name">
                    Community
                    <span>LIVE</span>
                  </div>

                  <p>
                    ✨ Your next move starts here.
                  </p>

                </div>

              </div>


              <div className="room-typing">
                <span></span>
                The community is active...
              </div>

            </div>

          </div>


          <div className="discord-v3-server-bottom">

            <div className="server-bottom-proof">
              <span>✦</span>
              BUILT FOR COMPETITORS
              <span>✦</span>
            </div>

            <button
              type="button"
              className="discord-v3-join-button"
              onClick={handleJoin}
            >
              JOIN VEXORA
              <b>↗</b>
            </button>

          </div>

        </div>

      </section>


      {/* =========================================
          FINAL CTA
      ========================================= */}

      <section className="discord-v3-final">

        <div className="final-spectrum"></div>

        <div className="discord-v3-final-copy">

          <div className="discord-v3-section-label">
            YOUR NEXT MOVE
          </div>

          <h2>
            Compete on Vexora.
            <span> Connect on Discord.</span>
          </h2>

          <p>
            The leaderboard shows the numbers.
            The community shows the journey.
          </p>

        </div>

        <button
          type="button"
          className="discord-v3-final-button"
          onClick={handleJoin}
        >
          JOIN THE COMMUNITY
          <span>↗</span>
        </button>

      </section>

    </main>
  );
}

export default DiscordPage;
