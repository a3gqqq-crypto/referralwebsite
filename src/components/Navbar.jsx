import { NavLink } from "react-router-dom";

function Navbar({ user, onLogout }) {
  const username =
    user?.user_metadata?.username || "Member";

  const playClick = () => {
    try {
      const audio =
        new Audio("/sounds/click.mp3");

      audio.volume = 0.18;
      audio.play().catch(() => {});
    } catch {
      // Never let audio break navigation.
    }
  };

  const handleNavClick = () => {
    playClick();
  };

  const handleLogoutClick = () => {
    playClick();
    onLogout();
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* ===============================
            BRAND
        =============================== */}

        <NavLink
          to="/"
          className="navbar-brand"
          onClick={handleNavClick}
        >
          <div className="navbar-logo">
            V
          </div>

          <div className="navbar-brand-text">
            <strong>
              VEXORA
            </strong>

            <span>
              COMPETITION
            </span>
          </div>
        </NavLink>


        {/* ===============================
            NAVIGATION
        =============================== */}

        <div className="navbar-links">

          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
            onClick={handleNavClick}
          >
            Home
          </NavLink>

          <NavLink
            to="/events"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
            onClick={handleNavClick}
          >
            Events
          </NavLink>

          <NavLink
            to="/events/top-inviter/leaderboard"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
            onClick={handleNavClick}
          >
            Event Leaderboard
          </NavLink>

          <NavLink
            to="/invites"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
            onClick={handleNavClick}
          >
            Invites
          </NavLink>

          <NavLink
            to="/donations"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
            onClick={handleNavClick}
          >
            Donations
          </NavLink>

          <NavLink
            to="/discord"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
            onClick={handleNavClick}
          >
            Discord
          </NavLink>

        </div>


        {/* ===============================
            ACCOUNT
        =============================== */}

        <div className="navbar-account">

          <span className="navbar-username">
            {username}
          </span>

          <button
            type="button"
            className="navbar-logout"
            onClick={handleLogoutClick}
          >
            Log Out
          </button>

        </div>

      </div>
    </nav>
  );
}

export default Navbar;