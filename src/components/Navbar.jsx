import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import Icon from "./Icon";
import { FramedAvatar, StyledName } from "./Cosmetics";
import { LevelBadge } from "./Level";
import { useMyProfile } from "../context/ProfileContext";
import { useSocial } from "../context/SocialContext";
import { equippedFrom } from "../data/cosmetics";

const NAV_LINKS = [
  {
    to: "/events",
    label: "Events",
    match: (path) =>
      path.startsWith("/events") && !path.endsWith("/leaderboard"),
  },
  {
    to: "/leaderboard",
    label: "Leaderboard",
    match: (path) => path.endsWith("/leaderboard"),
  },
  { to: "/invites", label: "Invites" },
  { to: "/chat", label: "Chat", badge: true, match: (path) => path.startsWith("/chat") },
  {
    to: "/people",
    label: "People",
    match: (path) => path.startsWith("/people") || path.startsWith("/u/"),
  },
  { to: "/moments", label: "Moments" },
  { to: "/shop", label: "Shop", highlight: true },
];

function playClick() {
  try {
    const audio = new Audio("/sounds/click.mp3");
    audio.volume = 0.18;
    audio.play().catch(() => {});
  } catch {
    // Never let audio break navigation.
  }
}

function Navbar({ user, onLogout }) {
  const { profile, username: profileName, isAdmin } = useMyProfile();
  const { badgeCount } = useSocial();

  const username =
    profileName || user?.user_metadata?.username || "Member";

  const equipped = equippedFrom(profile);

  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1100) setMenuOpen(false);
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const links = NAV_LINKS.map((link) => (
    <NavLink
      key={link.to}
      to={link.to}
      end={link.end}
      className={({ isActive }) =>
        [
          (link.match ? link.match(pathname) : isActive) ? "active" : "",
          link.highlight ? "nav-shop" : "",
        ].join(" ")
      }
      onClick={playClick}
    >
      {link.highlight && <Icon name="sparkles" size={15} />}
      {link.label}
      {link.badge && badgeCount > 0 && (
        <span className="nav-badge" aria-label={`${badgeCount} new`}>
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      )}
    </NavLink>
  ));

  const logout = () => {
    playClick();
    onLogout();
  };

  return (
    <header className={`navbar ${menuOpen ? "menu-open" : ""}`}>
      <div className="navbar-inner">

        <Link to="/" className="navbar-brand" onClick={playClick}>
          <span className="brand-mark" aria-hidden="true">V</span>
          <span className="brand-word">Vexora</span>
        </Link>

        <nav className="navbar-links" aria-label="Main">
          {links}
        </nav>

        <div className="navbar-account">
          <Link
            to="/profile"
            className="navbar-me"
            onClick={playClick}
          >
            <FramedAvatar name={username} frame={equipped.frame} size={32} />
            <StyledName name={username} effect={equipped.name} className="navbar-me-name" />
            <LevelBadge xp={profile?.xp} />
          </Link>

          {isAdmin && (
            <NavLink
              to="/admin"
              className="navbar-logout navbar-admin"
              onClick={playClick}
              aria-label="Admin panel"
              title="Admin panel"
            >
              <Icon name="shield" size={18} />
            </NavLink>
          )}

          <button
            type="button"
            className="navbar-logout"
            onClick={logout}
            aria-label="Log out"
            title="Log out"
          >
            <Icon name="logout" size={18} />
          </button>

          <button
            type="button"
            className="navbar-burger"
            onClick={() => {
              playClick();
              setMenuOpen((open) => !open);
            }}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <Icon name={menuOpen ? "close" : "menu"} size={21} />
            {badgeCount > 0 && !menuOpen && (
              <span className="nav-badge navbar-burger-badge">
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            )}
          </button>
        </div>

      </div>

      {menuOpen && (
        <div className="navbar-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      <div className="navbar-mobile-menu">
        <nav aria-label="Main mobile">
          <NavLink to="/" end onClick={playClick}>Home</NavLink>
          {links}
          {isAdmin && (
            <NavLink to="/admin" onClick={playClick}>
              <Icon name="shield" size={15} />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="navbar-mobile-footer">
          <Link to="/profile" className="navbar-me" onClick={playClick}>
            <FramedAvatar name={username} frame={equipped.frame} size={36} />
            <StyledName name={username} effect={equipped.name} className="navbar-me-name" />
          </Link>

          <button type="button" className="btn btn-sm" onClick={logout}>
            <Icon name="logout" size={16} />
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
