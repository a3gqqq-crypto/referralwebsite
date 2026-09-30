import { Link } from "react-router-dom";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">

        <div className="footer-brand">
          <p className="footer-wordmark">Suffrova</p>

          <p className="footer-tagline">
            Chat, call and hang out with friends.
            Build your avatar, level up, win real prizes.
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
            <a href="https://www.instagram.com/suffrova" target="_blank" rel="noreferrer">
              Instagram
            </a>
            <Link to="/rules">Rules & FAQ</Link>
            <Link to="/donations">Support us</Link>
            <a href="mailto:support@suffrova.com">support@suffrova.com</a>
          </div>
        </nav>

      </div>

      <div className="footer-bottom">
        <span>© {year} Suffrova</span>
        <span className="footer-legal">
          <Link to="/about">About</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/refunds">Refunds</Link>
        </span>
        <span>Made by three friends, not a corporation.</span>
      </div>
    </footer>
  );
}

export default Footer;
