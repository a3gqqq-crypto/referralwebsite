import { Link } from "react-router-dom";

import "../styles/rules.css";
import "../styles/legal.css";

const FACTS = [
  { value: "Free", label: "to join and use" },
  { value: "$35", label: "paid to Round 1's top 3" },
  { value: "13+", label: "with kid-safe chat" },
];

// Who runs Suffrova, what it is and how prizes work. Public, so people from
// ads (and anyone checking us out) can read it without an account.
function AboutPage({ standalone = false }) {
  return (
    <main className={`page rules-page legal-page about-page ${standalone ? "rules-standalone" : ""}`}>
      {standalone && (
        <div className="rules-bar">
          <Link to="/" className="navbar-brand">
            <span className="brand-mark" aria-hidden="true">S</span>
            <span className="brand-word">Suffrova</span>
          </Link>
          <Link to="/" className="btn btn-sm btn-primary">Join Suffrova</Link>
        </div>
      )}

      <header className="page-header">
        <span className="eyebrow">About</span>
        <h1>
          A place to hang out <span className="mark">with your friends.</span>
        </h1>
        <p>
          Suffrova is a free community site: chat and voice calls with friends, your own 3D avatar, and friendly
          invite events with real prizes. It's built and run by three friends in India.
        </p>
      </header>

      <div className="about-facts">
        {FACTS.map((fact) => (
          <div key={fact.label} className="about-fact card">
            <strong>{fact.value}</strong>
            <span>{fact.label}</span>
          </div>
        ))}
      </div>

      <article className="legal-doc card">
        <section>
          <h2>What you can do here</h2>
          <ul>
            <li>Chat in the Lounge, message friends, and make group chats.</li>
            <li>Jump into voice calls where your avatar talks with you.</li>
            <li>Build a 3D avatar and collect badges, frames and emotes.</li>
            <li>Join invite events: bring friends, climb the board, and the top 3 win prizes.</li>
          </ul>
        </section>

        <section>
          <h2>How prizes work</h2>
          <ul>
            <li>Each event shows its dates and prize pool up front. Joining costs nothing.</li>
            <li>Only real sign-ups count. An invite counts once the new person confirms their email, and fake or throwaway accounts are removed.</li>
            <li>When an event ends we check the top spots for cheating, then contact the winners to pay them.</li>
            <li>Round 1 (September 2026) paid $20, $10 and $5 to its top 3.</li>
          </ul>
        </section>

        <section>
          <h2>What costs money (and what doesn't)</h2>
          <p>
            Everything important is free. Shop items and the Verified badge are optional extras that only change how
            you look. They never affect rankings or who wins. We will never ask for your password, bank details or
            any payment to take part in an event.
          </p>
        </section>

        <section>
          <h2>Keeping it safe</h2>
          <ul>
            <li>Chat has a strict filter for swearing, bullying and adult content.</li>
            <li>The public Lounge needs Level 3, and phone numbers or emails can't be posted there.</li>
            <li>Only friends can message you, call you or add you to groups.</li>
            <li>Anyone can be reported or blocked, and we act on reports.</li>
          </ul>
        </section>

        <section>
          <h2>Talk to us</h2>
          <p>
            Email <a href="mailto:support@suffrova.com">support@suffrova.com</a> or DM{" "}
            <a href="https://www.instagram.com/suffrova" target="_blank" rel="noreferrer">@suffrova</a> on Instagram.
            Read our <Link to="/terms">Terms</Link>, <Link to="/privacy">Privacy Policy</Link> and{" "}
            <Link to="/rules">Rules & FAQ</Link>.
          </p>
        </section>
      </article>
    </main>
  );
}

export default AboutPage;
