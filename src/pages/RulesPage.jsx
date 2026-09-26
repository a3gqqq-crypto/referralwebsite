import { Link } from "react-router-dom";

import { XP_RULES } from "../data/levels";
import { localResetTime } from "../lib/streakDay";

import "../styles/rules.css";

const SECTIONS = [
  {
    id: "invites",
    title: "Invites & events",
    items: [
      ["How does an invite count?", "When someone makes a new Suffrova account through your link (suffrova.com/?ref=yourname), it's added to your count. Each person can only be invited once."],
      ["Do old invites count in a new event?", "No. Invite events only count invites made between the event's start and end, so everyone starts at zero."],
      ["Do I need to join the event?", "For invite races, yes: tap “Join event” to appear on its board. Login Streak events enter you automatically when you open the site."],
      ["What if two people tie?", "In invite races, whoever joined the event first stays ahead. In streak events, whoever logged in on more days that month wins the tie, then whoever got there first."],
      ["How are winners paid?", "When an event ends, the top places on its final board win the listed prizes. The Suffrova team checks the invites and then contacts winners to send the prize."],
    ],
  },
  {
    id: "fair",
    title: "Playing fair",
    items: [
      ["Fake accounts", "Invites are checked before any prize is paid. Fake, duplicate or throwaway accounts don't count, and cheating can get you removed from an event."],
      ["Be kind in chat", "No harassment, hate, nudity or scams. Links aren't allowed in the Lounge. Anyone can report a message or profile, and the team can remove messages, pictures, or ban people from chat."],
      ["Photos", "You can send photos to friends in DMs. Posting photos in the Lounge unlocks at Level 3."],
    ],
  },
  {
    id: "streaks",
    title: "Streaks, XP & levels",
    items: [
      ["How do streaks work?", `Open Suffrova once a day to add a day to your streak. Miss a day and it starts again from one. Days reset at 00:00 UTC for everyone (${localResetTime()} your time).`],
      ["Daily quests", "Three quests a day: invite a friend plus two that change daily. Claim each for XP, and finishing all three adds a bonus."],
    ],
  },
  {
    id: "you",
    title: "Your account",
    items: [
      ["Who can see my email?", "Nobody. Other people only ever see your username, picture and profile."],
      ["What's public?", "Your username, profile picture, bio, level, badges and invite counts on leaderboards. DMs and DM photos are only visible to you and the person you're chatting with."],
      ["Moments", "A Moment can only be opened by someone with its link, and it disappears after 5 days."],
      ["Does the shop affect rankings?", "Never. Frames, name effects, banners and badges are purely cosmetic."],
    ],
  },
];

function RulesPage({ standalone = false }) {
  return (
    <main className={`page rules-page ${standalone ? "rules-standalone" : ""}`}>
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
        <span className="eyebrow">Rules & FAQ</span>
        <h1>
          How Suffrova <span className="mark">works.</span>
        </h1>
        <p>Short answers to what people ask most. Still stuck? Ask in the Discord.</p>
      </header>

      <nav className="rules-jump" aria-label="Sections">
        {SECTIONS.map((section) => (
          <a key={section.id} href={`#${section.id}`}>{section.title}</a>
        ))}
        <a href="#xp">XP table</a>
      </nav>

      {SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="rules-section">
          <h2>{section.title}</h2>

          <div className="rules-list">
            {section.items.map(([question, answer]) => (
              <details key={question} className="rules-item card">
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      ))}

      <section id="xp" className="rules-section">
        <h2>XP table</h2>

        <ul className="rules-xp card">
          {XP_RULES.map((rule) => (
            <li key={rule.label}>
              <span>{rule.label}</span>
              <strong className="mono">{rule.xp}</strong>
            </li>
          ))}
        </ul>
      </section>

      <p className="rules-foot">
        Questions or problems? <Link to="/discord">Ask on Discord</Link>.
      </p>
    </main>
  );
}

export default RulesPage;
