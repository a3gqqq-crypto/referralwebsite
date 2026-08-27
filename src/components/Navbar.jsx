import { NavLink } from "react-router-dom";

function Navbar({ user, onLogout }) {
  const username =
    user?.user_metadata?.username || "Member";

  return (
    <nav className="navbar">

      <div className="navbar-inner">

        {/* ===============================
            BRAND
        =============================== */}

        <NavLink
          to="/"
          className="navbar-brand"
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
          >
            Home
          </NavLink>

          <NavLink
            to="/events"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            Events
          </NavLink>

          <NavLink
            to="/events/top-inviter/leaderboard"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            Event Leaderboard
          </NavLink>

          <NavLink
            to="/invites"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            Invites
          </NavLink>

          <NavLink
            to="/donations"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            Donations
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
            onClick={onLogout}
          >
            Log Out
          </button>

        </div>

      </div>

    </nav>
  );
}

export default Navbar;