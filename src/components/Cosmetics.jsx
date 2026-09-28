import { useState } from "react";

import Icon from "./Icon";
import { cosmeticById } from "../data/cosmetics";
import { avatarSrc } from "../data/avatars";
import { drawFullBody, useAvatarDicebear } from "../lib/avatarRender";
import { emoteAvatar, emoteById, packPreviewAvatar, stickersInPack } from "../data/avatarParts";

// Used to preview stickers for people who haven't made a 3D avatar yet.
const SAMPLE_BODY = `db:${JSON.stringify({ s: "fb", o: {} })}`;
import { useIsOnline } from "../lib/presence";

import "../styles/cosmetics.css";

// Pass userId to show a green dot while that person is online.
export function FramedAvatar({ name, frame, avatar, size = 40, className = "", userId = null }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const drawn = useAvatarDicebear(avatar);
  const src = drawn || avatarSrc(avatar);
  const [failed, setFailed] = useState(null);
  const online = useIsOnline(userId);

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

      {online && <span className="fav-online" title="Online now" aria-label="Online now" />}
    </span>
  );
}

// A player's avatar doing an emote: animated face + big emoji.
const FRAME_TIME = 0.4;

// Stacked pictures of each move; CSS shows one at a time.
function EmoteFrames({ emote, base, loop }) {
  const frames = emote.frames || [emote.look];
  const count = frames.length;

  return (
    <span className="emote-frames">
      {frames.map((look, index) => (
        <img
          key={index}
          className="emote-body"
          src={drawFullBody({ ...base, ...look }, "live")}
          alt=""
          draggable="false"
          style={
            count > 1
              ? {
                  animation: `emote-frames-${count} ${count * FRAME_TIME}s step-end ${
                    loop ? "infinite" : 4
                  } ${-(count - index) * FRAME_TIME}s`,
                }
              : undefined
          }
        />
      ))}
    </span>
  );
}

// A player's avatar doing an emote. Full-body avatars act it out (pose and
// face change); pass `full` to show the whole body instead of the head.
export function EmoteAvatar({ emote, name, avatar, body = null, frame, size = 64, loop = true, full = false }) {
  if (!emote) return null;

  const actedBody = full ? emoteAvatar(body || avatar, emote) : null;
  const acted = actedBody || emoteAvatar(avatar, emote);
  const whole = Boolean(actedBody);

  return (
    <span
      className={`emote emote-${emote.anim} ${loop ? "is-loop" : ""} ${whole ? "is-full" : ""}`}
      style={{ "--emote-size": `${size}px` }}
      role="img"
      aria-label={`${name || "Someone"}: ${emote.name}`}
    >
      <span className="emote-face">
        {whole ? (
          <EmoteFrames emote={emote} base={acted.o} loop={loop} />
        ) : (
          <FramedAvatar name={name} avatar={acted?.avatar || avatar} frame={frame} size={size} />
        )}
      </span>
      <span className="emote-emoji" aria-hidden="true">
        {emote.emoji}
      </span>
    </span>
  );
}

// A chat sticker: the sender's 3D avatar acting it out, with a caption.
// Falls back to their profile picture if they don't have a 3D avatar.
export function Sticker({ sticker, body, avatar, name, frame, size = 118 }) {
  if (!sticker) return null;

  const acted = emoteAvatar(body, { look: sticker.look });

  return (
    <span className="sticker" style={{ "--sticker-size": `${size}px`, "--sticker-color": sticker.color }}>
      {acted ? (
        <img className="sticker-body" src={drawFullBody(acted.o, "full")} alt="" draggable="false" />
      ) : (
        <FramedAvatar name={name} avatar={avatar} frame={frame} size={Math.round(size * 0.55)} />
      )}
      <span className="sticker-caption">{sticker.text}</span>
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

export function CosmeticPreview({ item, username = "you", avatar = null, body = null }) {
  if (item.type === "avatar") {
    return <FramedAvatar name={username} avatar={packPreviewAvatar(item.id)} size={76} />;
  }

  if (item.type === "sticker") {
    return <Sticker sticker={stickersInPack(item.id)[0]} body={body || SAMPLE_BODY} size={70} />;
  }

  if (item.type === "emote") {
    return <EmoteAvatar emote={emoteById(item.id.slice(6))} name={username} avatar={body || avatar} size={58} />;
  }

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
