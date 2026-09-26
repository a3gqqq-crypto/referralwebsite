import { NavLink, useLocation } from "react-router-dom";

import Icon from "./Icon";
import { FramedAvatar } from "./Cosmetics";
import { useMyProfile } from "../context/ProfileContext";
import { useSocial } from "../context/SocialContext";
import { equippedFrom } from "../data/cosmetics";

// Phone-only bottom navigation (hidden above 700px by CSS).
function MobileTabBar() {
  const { pathname } = useLocation();
  const { profile, username, displayName } = useMyProfile();
  const { badgeCount } = useSocial();

  const ownProfile = username && pathname === `/u/${encodeURIComponent(username)}`;

  const tabs = [
    { to: "/", label: "Home", icon: "home", active: pathname === "/" },
    {
      to: "/events",
      label: "Events",
      icon: "trophy",
      active: pathname.startsWith("/events") || pathname === "/leaderboard",
    },
    { to: "/invites", label: "Invite", icon: "link", active: pathname.startsWith("/invites") },
    { to: "/chat", label: "Chat", icon: "chat", active: pathname.startsWith("/chat"), badge: badgeCount },
    { to: "/profile", label: "You", avatar: true, active: pathname === "/profile" || ownProfile },
  ];

  return (
    <nav className="tabbar" aria-label="Quick navigation">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={tab.active ? "active" : ""}
          aria-current={tab.active ? "page" : undefined}
        >
          <span className="tabbar-icon">
            {tab.avatar ? (
              <FramedAvatar
                name={displayName || "?"}
                frame={equippedFrom(profile).frame}
                avatar={profile?.avatar}
                size={26}
              />
            ) : (
              <Icon name={tab.icon} size={22} />
            )}

            {tab.badge > 0 && (
              <span className="tabbar-badge" aria-label={`${tab.badge} new`}>
                {tab.badge > 9 ? "9+" : tab.badge}
              </span>
            )}
          </span>

          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default MobileTabBar;
