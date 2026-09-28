import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import Icon from "./Icon";
import { FramedAvatar } from "./Cosmetics";
import { BUILTIN_AVATARS } from "../data/avatars";
import {
  AVATAR_STYLES,
  BACKGROUNDS,
  STYLE_IDS,
  encodeDicebear,
  parseDicebear,
  premiumFor,
} from "../data/avatarParts";
import { cosmeticById, formatPrice } from "../data/cosmetics";
import { useDicebear } from "../lib/avatarRender";

import "../styles/avatar-maker.css";

function Tile({ selected, busy, onClick, label, meta, children }) {
  return (
    <button
      type="button"
      className={`locker-tile avatar-tile ${selected ? "selected" : ""}`}
      onClick={onClick}
      disabled={busy}
      aria-pressed={selected}
    >
      <span className="locker-tile-preview">{children}</span>
      <span className="locker-tile-name">{label}</span>
      {meta && <span className="locker-tile-meta">{meta}</span>}

      {selected && (
        <span className="locker-tile-check" aria-hidden="true">
          <Icon name="check" size={13} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function Drawn({ style, options, size, className = "" }) {
  const uri = useDicebear(style, options);

  return (
    <span className={`avm-drawn ${className}`} style={{ width: size, height: size }}>
      {uri ? <img src={uri} alt="" draggable="false" /> : <span className="avm-drawn-wait" />}
    </span>
  );
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function randomDraft(style, owned) {
  const def = AVATAR_STYLES[style];
  const draft = { ...def.defaults };
  const free = (key, values) => values.filter((value) => {
    const pack = premiumFor(style, key, value);
    return !pack || owned.has(pack);
  });

  for (const part of def.parts) {
    const values = free(part.key, part.values);
    draft[part.key] = part.optional && Math.random() < 0.55 ? "" : pick(values.length ? values : part.values);
  }

  draft.bg = pick(free("bg", BACKGROUNDS.map((bg) => bg.id)));
  return draft;
}

function AvatarMaker({ username, frame, current, owned, busy, onSave }) {
  const saved = parseDicebear(current);
  const [style, setStyle] = useState(saved?.s || "avataaars");
  const [draft, setDraft] = useState(saved?.o || AVATAR_STYLES.avataaars.defaults);
  const [partKey, setPartKey] = useState(AVATAR_STYLES[saved?.s || "avataaars"].parts[0].key);

  const def = AVATAR_STYLES[style];
  const parts = useMemo(
    () => [
      ...def.parts.filter((part) =>
        Object.entries(part.showIf || {}).every(([key, value]) => draft[key] === value)
      ),
      { key: "bg", label: "Background", background: true },
    ],
    [def, draft]
  );
  const part = parts.find((item) => item.key === partKey) || parts[0];

  const encoded = encodeDicebear(style, draft);
  const unchanged = encoded === current;

  // Premium bits in the draft you don't own yet (try-on is free, saving isn't).
  const needed = [
    ...new Set(
      Object.entries(draft)
        .map(([key, value]) => premiumFor(style, key, value))
        .filter((pack) => pack && !owned.has(pack))
    ),
  ];

  const switchStyle = (next) => {
    if (next === style) return;
    setStyle(next);
    setDraft({ ...AVATAR_STYLES[next].defaults, bg: draft.bg });
    setPartKey(AVATAR_STYLES[next].parts[0].key);
  };

  const set = (key, value) => setDraft((old) => ({ ...old, [key]: value }));

  const lockBadge = (pack) => {
    const item = cosmeticById(pack);
    return (
      <span className="avm-lock" title={`${item?.name} pack`}>
        <Icon name="lock" size={10} strokeWidth={2.6} />
        {item?.price ? formatPrice(item.price) : ""}
      </span>
    );
  };

  return (
    <div className="avm">
      <div className="avm-stage">
        <div className="avm-stage-art">
          <FramedAvatar name={username} frame={frame} avatar={encoded} size={132} />
        </div>

        <div className="avm-stage-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setDraft(randomDraft(style, owned))}
            disabled={busy}
          >
            <Icon name="sparkles" size={15} />
            Surprise me
          </button>

          {needed.length ? (
            <Link to={`/shop?type=avatar&item=${needed[0]}`} className="btn btn-sm btn-sun">
              <Icon name="lock" size={15} />
              Get {cosmeticById(needed[0])?.name} to save
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => onSave(encoded)}
              disabled={busy || unchanged}
            >
              <Icon name="check" size={15} />
              {busy ? "Saving…" : unchanged ? "Saved" : "Save avatar"}
            </button>
          )}
        </div>
      </div>

      <div className="avm-styles" role="tablist" aria-label="Avatar style">
        {STYLE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={style === id}
            className={style === id ? "active" : ""}
            onClick={() => switchStyle(id)}
          >
            <Drawn
              style={id}
              options={style === id ? draft : { ...AVATAR_STYLES[id].defaults, bg: draft.bg }}
              size={40}
            />
            <span>{AVATAR_STYLES[id].label}</span>
          </button>
        ))}
      </div>

      <div className="avm-parts" role="tablist" aria-label="Part">
        {parts.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={part.key === item.key}
            className={part.key === item.key ? "active" : ""}
            onClick={() => setPartKey(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {part.background ? (
        <div className="avm-swatches">
          {BACKGROUNDS.map((bg) => {
            const pack = bg.premium && !owned.has(bg.premium) ? bg.premium : null;
            return (
              <button
                key={bg.id}
                type="button"
                className={`avm-swatch is-bg ${draft.bg === bg.id ? "selected" : ""}`}
                style={{
                  background:
                    bg.colors.length > 1
                      ? `linear-gradient(135deg, #${bg.colors[0]}, #${bg.colors[1]})`
                      : `#${bg.colors[0]}`,
                }}
                onClick={() => set("bg", bg.id)}
                aria-label={`${bg.id} background`}
                aria-pressed={draft.bg === bg.id}
              >
                {pack && lockBadge(pack)}
              </button>
            );
          })}
        </div>
      ) : part.color ? (
        <div className="avm-swatches">
          {part.values.map((value) => (
            <button
              key={value}
              type="button"
              className={`avm-swatch ${draft[part.key] === value ? "selected" : ""}`}
              style={{ background: `#${value}` }}
              onClick={() => set(part.key, value)}
              aria-label={`Colour ${value}`}
              aria-pressed={draft[part.key] === value}
            />
          ))}
        </div>
      ) : (
        <div className="avm-options">
          {part.optional && (
            <button
              type="button"
              className={`avm-option ${!draft[part.key] ? "selected" : ""}`}
              onClick={() => set(part.key, "")}
              aria-pressed={!draft[part.key]}
            >
              <span className="avm-none">
                <Icon name="close" size={20} />
              </span>
              <span className="avm-option-name">None</span>
            </button>
          )}

          {part.values.map((value) => {
            const pack = premiumFor(style, part.key, value);
            const locked = pack && !owned.has(pack);

            return (
              <button
                key={value}
                type="button"
                className={`avm-option ${draft[part.key] === value ? "selected" : ""} ${locked ? "is-locked" : ""}`}
                onClick={() => set(part.key, value)}
                aria-pressed={draft[part.key] === value}
                aria-label={`${part.label}: ${value}${locked ? " (locked)" : ""}`}
              >
                <Drawn style={style} options={{ ...draft, [part.key]: value }} size={58} />
                {locked && lockBadge(pack)}
              </button>
            );
          })}
        </div>
      )}

      <p className="avm-hint">
        Locked bits are free to try on. <Link to="/shop?type=avatar">Avatar packs</Link> unlock them.
      </p>
    </div>
  );
}

function AvatarPicker({ username, frame, current, owned = new Set(), busy, onPick, onUpload }) {
  const fileRef = useRef(null);
  const hasUpload = current?.startsWith("upload:");
  const [mode, setMode] = useState(
    hasUpload ? "photo" : current?.startsWith("builtin:") ? "classic" : "maker"
  );

  return (
    <div className="avatar-picker">
      <div className="avm-modes" role="tablist" aria-label="Picture type">
        {[
          ["maker", "Avatar maker"],
          ["photo", "Photo"],
          ["classic", "Classic"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            className={mode === key ? "active" : ""}
            onClick={() => setMode(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "maker" && (
        <AvatarMaker
          username={username}
          frame={frame}
          current={current}
          owned={owned}
          busy={busy}
          onSave={onPick}
        />
      )}

      {mode === "photo" && (
        <div className="avatar-upload">
          <FramedAvatar name={username} frame={frame} avatar={hasUpload ? current : null} size={88} />

          <div className="avatar-upload-copy">
            <strong>Your own photo</strong>
            <p>JPG, PNG or WebP. It's cropped to a square and shrunk before upload.</p>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Icon name="upload" size={15} />
              {busy ? "Working…" : hasUpload ? "Upload a different photo" : "Upload a photo"}
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) onUpload(file);
              }}
            />
          </div>
        </div>
      )}

      {mode === "classic" && (
        <div className="locker-grid avatar-grid">
          <Tile
            selected={!current}
            busy={busy}
            onClick={() => current && onPick(null)}
            label="Letter"
            meta="Default"
          >
            <FramedAvatar name={username} frame={frame} size={60} />
          </Tile>

          {BUILTIN_AVATARS.map((avatar) => {
            const value = `builtin:${avatar.id}`;

            return (
              <Tile
                key={avatar.id}
                selected={current === value}
                busy={busy}
                onClick={() => current !== value && onPick(value)}
                label={avatar.name}
              >
                <FramedAvatar name={username} frame={frame} avatar={value} size={60} />
              </Tile>
            );
          })}
        </div>
      )}

      <p className="avatar-rules">
        Keep it friendly. Pictures that break the rules get removed.
      </p>
    </div>
  );
}

export default AvatarPicker;
