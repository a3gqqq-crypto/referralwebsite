import {
  BadgeRow,
  FramedAvatar,
  ProfileBanner,
  StyledName,
} from "./Cosmetics";

import "../styles/profile.css";

function ProfileCard({
  username,
  equipped,
  bio,
  stats = [],
  size = "md",
  children,
}) {
  const avatarSize = size === "lg" ? 116 : size === "sm" ? 64 : 84;

  return (
    <article className={`profile-card profile-card-${size}`}>
      <ProfileBanner banner={equipped.banner} className="profile-card-banner" />

      <div className="profile-card-body">
        <div className="profile-card-avatar">
          <FramedAvatar
            name={username}
            frame={equipped.frame}
            size={avatarSize}
          />
        </div>

        <div className="profile-card-id">
          <h2 className="profile-card-name">
            <StyledName name={username || "you"} effect={equipped.name} />
          </h2>

          <BadgeRow ids={equipped.badges} size={size === "lg" ? 26 : 22} />
        </div>

        {bio && <p className="profile-card-bio">{bio}</p>}

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
