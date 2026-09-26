import Icon from "../components/Icon";
import { useReveal } from "../hooks/useReveal";

const DISCORD_INVITE = "https://discord.gg/GNC4xd87FP";

const FEATURES = [
  {
    icon: "📣",
    title: "Announcements",
    text: "New events drop here first — prize, dates, rules.",
    tint: "tint-accent",
  },
  {
    icon: "🏆",
    title: "Winners",
    text: "Final standings and winners, announced when events end.",
    tint: "tint-sun",
  },
  {
    icon: "👋",
    title: "The people",
    text: "Meet who you're competing with (and against).",
    tint: "tint-mint",
  },
  {
    icon: "🛟",
    title: "Help",
    text: "Account, referral, or event question? Ask here.",
    tint: "tint-sky",
  },
];

function DiscordPage() {
  const [featuresRef, featuresVisible] = useReveal();
  const [ctaRef, ctaVisible] = useReveal();

  return (
    <main className="page discord-page">

      <section className="discord-hero">
        <div className="discord-hero-copy">
          <span className="eyebrow">Community</span>

          <h1>
            Where Suffrova <span className="mark">actually lives.</span>
          </h1>

          <p>
            Event drops, winner announcements, and the people
            you're racing — all in one server.
          </p>

          <a href={DISCORD_INVITE} className="btn btn-primary discord-join">
            Join the Discord
            <Icon name="external" />
          </a>
        </div>

        <div className="discord-mock card" aria-hidden="true">
          <div className="discord-mock-side">
            <span className="brand-mark">S</span>

            <span className="discord-mock-label">Channels</span>
            <span className="discord-mock-channel active"># announcements</span>
            <span className="discord-mock-channel"># general</span>
            <span className="discord-mock-channel"># leaderboard</span>
            <span className="discord-mock-channel"># winners</span>
            <span className="discord-mock-channel"># help</span>
          </div>

          <div className="discord-mock-chat">
            <div className="discord-mock-head"># announcements</div>

            <div className="discord-mock-msg">
              <span className="discord-mock-avatar" style={{ background: "var(--gold)" }}>S</span>
              <div>
                <strong>Suffrova <em>BOT</em></strong>
                <p>🚀 New event is live. Go grab your invite link.</p>
              </div>
            </div>

            <div className="discord-mock-msg">
              <span className="discord-mock-avatar" style={{ background: "var(--violet)" }}>P</span>
              <div>
                <strong>pokipine</strong>
                <p>already at 12 lol catch me</p>
              </div>
            </div>

            <div className="discord-mock-msg">
              <span className="discord-mock-avatar" style={{ background: "var(--mint)" }}>A</span>
              <div>
                <strong>alexr</strong>
                <p>not for long 👀</p>
              </div>
            </div>

            <div className="discord-mock-typing">
              <span /><span /><span />
              someone is typing…
            </div>
          </div>
        </div>
      </section>


      <section
        ref={featuresRef}
        className={`discord-features reveal-section ${featuresVisible ? "reveal-visible" : ""}`}
      >
        {FEATURES.map((feature) => (
          <div key={feature.title} className={`discord-feature ${feature.tint}`}>
            <span className="discord-feature-icon" aria-hidden="true">
              {feature.icon}
            </span>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </div>
        ))}
      </section>


      <section
        ref={ctaRef}
        className={`discord-cta reveal-section ${ctaVisible ? "reveal-visible" : ""}`}
      >
        <h2>Compete here. Hang out there.</h2>

        <a href={DISCORD_INVITE} className="btn btn-sun">
          Join the Discord
          <Icon name="external" />
        </a>
      </section>

    </main>
  );
}

export default DiscordPage;
