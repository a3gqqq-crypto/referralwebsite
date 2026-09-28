import {
  BadgeRow,
  FramedAvatar,
  ProfileBanner,
  StyledName,
} from "./Cosmetics";
import { LevelBadge, LevelProgress } from "./Level";
import StaffTag from "./StaffTag";
import { lastSeenText, useIsOnline } from "../lib/presence";
import { fullBodySrc } from "../lib/avatarRender";

import "../styles/profile.css";

function ProfileCard({
  userId,
  username,
  displayName,
  equipped,
  bio,
  xp,
  streak,
  showProgress = false,
  showStatus = false,
  lastSeen = null,
  stats = [],
  size = "md",
  children,
}) {
  const avatarSize = size === "lg" ? 116 : size === "sm" ? 64 : 84;
  const online = useIsOnline(userId);
  const figure = fullBodySrc(equipped.avatar);

  return (
    <article className={`profile-card profile-card-${size}`}>
      <ProfileBanner banner={equipped.banner} className={`profile-card-banner ${figure ? "has-figure" : ""}`}>
        {figure && <img className="profile-card-figure" src={figure} alt="" draggable="false" />}
      </ProfileBanner>

      <div className="profile-card-body">
        <div className="profile-card-avatar">
          <FramedAvatar
            userId={showStatus ? userId : null}
            name={displayName || username}
            frame={equipped.frame}
            avatar={equipped.avatar}
            size={avatarSize}
          />
        </div>

        <div className="profile-card-id">
          <h2 className="profile-card-name">
            <StyledName name={displayName || username || "you"} effect={equipped.name} />
          </h2>

          {displayName && username && displayName !== username && (
            <span className="profile-card-handle">@{username}</span>
          )}

          {showStatus && (
            <span className={`profile-card-status ${online ? "is-online" : ""}`}>
              {online ? "Online now" : lastSeenText(lastSeen)}
            </span>
          )}

          <StaffTag userId={userId} size={size === "lg" ? "lg" : "sm"} />

          <LevelBadge xp={xp} size={size === "lg" ? "lg" : "sm"} />

          <BadgeRow ids={equipped.badges} size={size === "lg" ? 26 : 22} />
        </div>

        {bio && <p className="profile-card-bio">{bio}</p>}

        {showProgress && xp != null && (
          <div className="profile-card-level">
            <LevelProgress xp={xp} streak={streak} />
          </div>
        )}

        {stats.length > 0 && (
          <dl className="profile-card-stats">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd className="mono">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {children}
      </div>
    </article>
  );
}

export default ProfileCard;
