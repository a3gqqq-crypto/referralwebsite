import { Link } from "react-router-dom";

import "../styles/rules.css";
import "../styles/legal.css";

const UPDATED = "29 September 2026";
const CONTACT = (
  <>
    email <a href="mailto:support@suffrova.com">support@suffrova.com</a> or DM us on Instagram at{" "}
    <a href="https://www.instagram.com/suffrova" target="_blank" rel="noreferrer">
      @suffrova
    </a>
  </>
);

// Plain-language legal pages. Each section is a heading plus paragraphs or
// bullet lists (arrays).
const DOCS = {
  terms: {
    title: "Terms of Service",
    intro:
      "These terms are the rules for using Suffrova (suffrova.com). By creating an account or using the site, you agree to them. If you don't agree, please don't use Suffrova.",
    sections: [
      {
        heading: "Who we are",
        body: [
          "Suffrova is a social community site (chat, calls, avatars and referral events) run by a small independent team (three friends), not a company. When these terms say \"we\" or \"us\", they mean the Suffrova team.",
        ],
      },
      {
        heading: "Who can use Suffrova",
        body: [
          [
            "You must be at least 13 years old.",
            "If you're under 18, you need a parent or guardian's permission to use Suffrova, and you need their permission before buying anything.",
            "One account per person. Don't share your account or use someone else's.",
            "You're responsible for keeping your password safe and for what happens on your account.",
          ],
        ],
      },
      {
        heading: "Referral events and prizes",
        body: [
          [
            "Events, their dates, rules and prizes are shown on each event page. Only invites that follow the rules count.",
            "Fake accounts, inviting yourself, bots, paid sign-ups, or anything that tricks the leaderboard is cheating. We can remove those referrals, disqualify you, take back prizes and close accounts.",
            "We check winners before paying. We contact winners to arrange how the prize is paid. If we can't reach a winner within 30 days, the prize may be given to the next person.",
            "We decide winners and can fix mistakes in the standings. We can change, pause or cancel an event if something goes wrong (for example, cheating or a technical problem), and we'll tell you if we do.",
          ],
        ],
      },
      {
        heading: "Be kind: community rules",
        body: [
          "Kids use Suffrova too. In chat, calls, names, bios, photos and anything else you post, don't:",
          [
            "swear, bully, harass, threaten or tell anyone to hurt themselves",
            "post sexual content, hate speech, slurs, violence or anything illegal",
            "share anyone's personal info (phone numbers, addresses, emails), including your own in the Lounge",
            "spam, scam, advertise, or pretend to be someone else (including staff)",
            "try to meet up with or get private photos from anyone",
          ],
          "We use filters, and you can report and block people. We can delete content, mute, ban or close accounts that break these rules, at any time. The Lounge needs Level 3, and only friends can message or gift each other.",
        ],
      },
      {
        heading: "Your content",
        body: [
          "You own what you post. By posting it, you let us store and show it on Suffrova so the site works (for example, showing your messages to the people you sent them to). Don't post anything you don't have the right to share.",
        ],
      },
      {
        heading: "Shop items and Verified",
        body: [
          [
            "Shop items (frames, avatar packs, emotes, stickers, banners, badges and so on) are cosmetic. They don't affect rankings, have no cash value, and can't be sold or traded. You can gift them to friends.",
            "Verified costs $7 for 30 days. It doesn't renew automatically: each payment adds 30 days. We send reminders before it ends.",
            "The Verified badge levels up with time you stay verified (not months bought at once). If it lapses for more than 30 days, it starts again at Bronze.",
            "The Early Supporter badge goes to anyone who gets Verified before 1 January 2028, and stays on their account after that.",
            "If we have to close your account for breaking these rules, you lose access to items and Verified without a refund.",
            "Refunds are covered by our Refund Policy.",
          ],
        ],
      },
      {
        heading: "Paying with crypto",
        body: [
          [
            "We accept USDT and USDC on BNB Smart Chain and Polygon. Send the exact amount shown, on the network shown, before the order expires.",
            "Crypto payments can't be reversed. Coins sent on the wrong network, to the wrong address, or in the wrong token may be lost, and we may not be able to recover them.",
            "Payments on a blockchain are public. Your wallet address and the transaction can be seen by anyone on the blockchain.",
          ],
        ],
      },
      {
        heading: "Calls",
        body: [
          "Voice calls happen live and aren't recorded. Be respectful: the same rules apply in calls as in chat. We keep short technical logs (for example, whether a microphone connected) for 3 days to fix call problems.",
        ],
      },
      {
        heading: "Things we can't promise",
        body: [
          "We work hard to keep Suffrova running, but it's provided \"as is\". It may sometimes be down, slow or have bugs. As far as the law allows, we're not responsible for indirect losses, and our total responsibility to you is limited to what you paid us in the last 3 months.",
        ],
      },
      {
        heading: "Closing your account",
        body: [
          "You can stop using Suffrova at any time, and you can ask us to delete your account. We can suspend or close accounts that break these terms.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "We may update these terms. If the changes are important, we'll let you know on the site. Using Suffrova after changes means you accept them.",
        ],
      },
      {
        heading: "Law",
        body: ["These terms are governed by the laws of India."],
      },
      {
        heading: "Contact",
        body: [<>Questions? {CONTACT}.</>],
      },
    ],
  },

  privacy: {
    title: "Privacy Policy",
    intro:
      "This explains what information Suffrova keeps about you, why, who helps us run the site, and your choices. We keep as little as we can, and we never sell your data.",
    sections: [
      {
        heading: "What we collect",
        body: [
          [
            "Account: your email address, username, password (stored securely by our login provider, never readable by us), and who invited you.",
            "Profile: display name, bio, profile picture or photo you upload, your 3D avatar, badges, items, level and XP.",
            "Activity: referrals, events you join, daily check-ins, quests, Moments, friends, blocks and reports.",
            "Messages: Lounge and private messages and photos you send, so they can be shown to the right people.",
            "Calls: who joined which call, and short technical logs (no audio) kept for 3 days to fix problems. Calls are not recorded.",
            "Payments: your orders, the amount, network and transaction ID. We never see your wallet's private keys or bank details.",
            "Notifications: if you turn on phone notifications, a push subscription for your browser.",
            "Usage: anonymous page-view statistics (no ads, no cross-site tracking), plus the basic technical data (like IP address) any website receives.",
          ],
        ],
      },
      {
        heading: "Why we use it",
        body: [
          [
            "to run your account, events, leaderboards, chat, calls and the shop",
            "to check referrals and pay prizes fairly",
            "to keep people safe: filtering messages, handling reports, stopping cheating and abuse",
            "to send notifications and emails you'd expect (like password resets and Verified reminders)",
            "to fix bugs and understand which pages are used",
          ],
        ],
      },
      {
        heading: "Who can see what",
        body: [
          [
            "Public: your username, display name, profile picture, avatar, bio, badges, level, referral count and whether you're online.",
            "Your friends: your private messages to them.",
            "Everyone in the Lounge: your Lounge messages.",
            "Suffrova staff: reported content and what's needed to run the site and keep it safe.",
            "Never public: your email address and password.",
          ],
        ],
      },
      {
        heading: "Services that help us run Suffrova",
        body: [
          "These providers store or process data for us, only to run the site:",
          [
            "Supabase: database, logins and file storage",
            "Vercel: website hosting and anonymous page statistics",
            "LiveKit: voice and video calls",
            "Resend: sending emails",
            "Public blockchains (BNB Smart Chain, Polygon): crypto payments are public there by design",
          ],
          "We don't sell your data, and we don't use advertising trackers.",
        ],
      },
      {
        heading: "Kids",
        body: [
          "Suffrova is for people 13 and older. Users under 18 need a parent or guardian's permission. If you're a parent and think your child under 13 has an account, contact us and we'll delete it.",
          "To keep kids safe we filter chat, require Level 3 for the Lounge, block phone numbers and emails in the Lounge, and only let friends message or gift each other.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "We keep your information while your account exists. Call logs are deleted after 3 days. If you delete your account, we remove your profile and personal information, except what we must keep for payment records, cheating checks or the law.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          [
            "Edit your name, bio, picture and avatar any time from your profile.",
            "Turn phone notifications off in your browser settings.",
            "Block people and report anything that isn't okay.",
            <>Ask us for a copy of your data, to correct it, or to delete your account: {CONTACT}.</>,
          ],
        ],
      },
      {
        heading: "Security",
        body: [
          "We use secure connections (HTTPS), locked-down database access and trusted providers. No website is 100% secure, so use a strong password you don't use anywhere else.",
        ],
      },
      {
        heading: "Changes",
        body: ["If we change this policy in an important way, we'll tell you on the site."],
      },
    ],
  },

  refunds: {
    title: "Refund Policy",
    intro:
      "Shop items and Verified are digital and show up on your account right away, so most purchases can't be refunded. Here's exactly when you can get your money back.",
    sections: [
      {
        heading: "We'll always sort it out if",
        body: [
          [
            "You paid but didn't get the item or Verified: we'll add it to your account, or refund you if we can't.",
            "You paid twice for the same thing by mistake: we refund the extra payment.",
            "You sent more than the order amount: we refund the extra.",
            "You sent less than the order amount, or the order expired before your payment arrived: we'll either complete the order or refund what you sent.",
          ],
        ],
      },
      {
        heading: "What can't be refunded",
        body: [
          [
            "Items and Verified that were delivered to your account, including if you changed your mind.",
            "Unused days of Verified (there are no partial refunds).",
            "Gifts that were delivered to a friend.",
            "Donations.",
            "Purchases on an account we closed for breaking our Terms of Service.",
            "Coins sent on the wrong network, to the wrong address, or in the wrong token (we'll try to help, but we may not be able to recover them).",
          ],
        ],
      },
      {
        heading: "How refunds are paid",
        body: [
          "Refunds are sent back in the same coin, to the wallet the payment came from, minus the network fee for sending it.",
        ],
      },
      {
        heading: "How to ask",
        body: [
          <>
            {CONTACT} within 14 days of your payment. Include your username, what you bought, and the transaction
            ID. We usually reply within a few days.
          </>,
        ],
      },
      {
        heading: "Under 18?",
        body: [
          "If you bought something without your parent or guardian's permission, they can contact us within 14 days and we'll look at it case by case.",
        ],
      },
    ],
  },
};

export const LEGAL_LINKS = [
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
  { to: "/refunds", label: "Refunds" },
];

function Block({ item }) {
  if (Array.isArray(item)) {
    return (
      <ul>
        {item.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
    );
  }
  return <p>{item}</p>;
}

// doc: "terms" | "privacy" | "refunds". standalone: shown to logged-out visitors.
function LegalPage({ doc, standalone = false }) {
  const page = DOCS[doc];

  return (
    <main className={`page rules-page legal-page ${standalone ? "rules-standalone" : ""}`}>
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
        <span className="eyebrow">Legal</span>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
        <p className="legal-updated">Last updated {UPDATED}</p>
      </header>

      <nav className="legal-tabs" aria-label="Legal pages">
        {LEGAL_LINKS.map((link) => (
          <Link key={link.to} to={link.to} className={link.to === `/${doc}` ? "active" : ""}>
            {link.label}
          </Link>
        ))}
      </nav>

      <article className="legal-doc card">
        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body.map((item, index) => (
              <Block key={index} item={item} />
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}

export default LegalPage;
