import { Link } from "react-router-dom";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">

        <div className="footer-brand">
          <p className="footer-wordmark">Suffrova</p>

          <p className="footer-tagline">
            Referral competitions with real prizes.
            Invite your people, climb the board.
          </p>
        </div>

        <nav className="footer-links" aria-label="Footer">
          <div>
            <span className="eyebrow">Compete</span>
            <Link to="/events">Events</Link>
            <Link to="/leaderboard">Leaderboard</Link>
            <Link to="/invites">Your invites</Link>
          </div>

          <div>
            <span className="eyebrow">You</span>
            <Link to="/profile">Your profile</Link>
            <Link to="/shop">Shop</Link>
            <Link to="/moments">Moments</Link>
          </div>

          <div>
            <span className="eyebrow">Community</span>
            <Link to="/chat">Lounge</Link>
            <Link to="/people">Find people</Link>
            <Link to="/discord">Discord</Link>
            <Link to="/rules">Rules & FAQ</Link>
            <Link to="/donations">Support us</Link>
          </div>
        </nav>

      </div>

      <div className="footer-bottom">
        <span>© {year} Suffrova</span>
        <span>Made by two friends, not a corporation.</span>
      </div>
    </footer>
  );
}

export default Footer;
