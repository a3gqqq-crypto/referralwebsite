import { useState } from "react";

import Icon from "./Icon";
import { cosmeticById } from "../data/cosmetics";
import { avatarSrc } from "../data/avatars";

import "../styles/cosmetics.css";

export function FramedAvatar({ name, frame, avatar, size = 40, className = "" }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const src = avatarSrc(avatar);
  const [failed, setFailed] = useState(null);

  return (
    <span
      className={`fav ${frame ? `fav-framed ${frame}` : ""} ${className}`}
      style={{ "--fav-size": `${size}px` }}
    >
      <span className="fav-face">
        {src && failed !== src ? (
          <img
            className="fav-img"
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            draggable="false"
            onError={() => setFailed(src)}
          />
        ) : (
          initial
        )}
      </span>

      {frame === "frame-crowned" && (
        <span className="fav-crown" aria-hidden="true">
          <Icon name="crown" size={Math.max(12, size * 0.34)} strokeWidth={2} />
        </span>
      )}
    </span>
  );
}

export function StyledName({ name, effect, className = "" }) {
  return (
    <span
      className={`sname ${effect || ""} ${className}`}
      data-text={name}
    >
      {name}
    </span>
  );
}

export function BadgeIcon({ id, size = 22, showTitle = true }) {
  const badge = cosmeticById(id);

  if (!badge) return null;

  return (
    <span
      className={`badge-icon rarity-${badge.rarity}`}
      style={{ "--badge-size": `${size}px` }}
      title={showTitle ? badge.name : undefined}
      aria-label={badge.name}
      role="img"
    >
      <Icon name={badge.icon} size={Math.round(size * 0.58)} strokeWidth={2.2} />
    </span>
  );
}

export function BadgeRow({ ids = [], size = 20 }) {
  if (!ids.length) return null;

  return (
    <span className="badge-row">
      {ids.map((id) => (
        <BadgeIcon key={id} id={id} size={size} />
      ))}
    </span>
  );
}

export function ProfileBanner({ banner, className = "", children }) {
  return (
    <div className={`pbanner ${banner || "banner-midnight"} ${className}`}>
      {children}
    </div>
  );
}

export function CosmeticPreview({ item, username = "you", avatar = null }) {
  if (item.type === "frame") {
    return <FramedAvatar name={username} frame={item.id} avatar={avatar} size={76} />;
  }

  if (item.type === "name") {
    return (
      <StyledName
        name={username}
        effect={item.id}
        className="cosmetic-preview-name"
      />
    );
  }

  if (item.type === "banner") {
    return <ProfileBanner banner={item.id} className="cosmetic-preview-banner" />;
  }

  return <BadgeIcon id={item.id} size={58} showTitle={false} />;
}
