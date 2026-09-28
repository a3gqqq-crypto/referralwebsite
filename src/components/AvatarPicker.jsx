import { useRef, useState } from "react";
import { Link } from "react-router-dom";

import Icon from "./Icon";
import { FramedAvatar } from "./Cosmetics";
import { BUILTIN_AVATARS } from "../data/avatars";
import {
  BACKGROUNDS,
  FB_DEFAULTS,
  FB_GROUPS,
  FB_PARTS,
  encodeDicebear,
  parseDicebear,
  premiumFor,
} from "../data/avatarParts";
import { cosmeticById, formatPrice } from "../data/cosmetics";
import { drawFullBody } from "../lib/avatarRender";

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

const NAMES = {
  guy: "Guy", girl: "Girl", stand: "Chill", wave: "Wave", hips: "Hands on hips", peace: "Peace", flex: "Flex",
  sidepart: "Side part", manbun: "Man bun", curlylong: "Long curls", catears: "Cat ears", hightops: "High-tops",
  crop: "Crop top", leather: "Leather", puffer: "Puffer", bomber: "Bomber", jersey: "Jersey", tee: "Tee",
  tank: "Tank top", varsity: "Varsity", tracksuit: "Tracksuit", trackpants: "Track pants", ripped: "Ripped jeans",
};
const nameOf = (value) => NAMES[value] || value.charAt(0).toUpperCase() + value.slice(1);

const pick = (list) => list[Math.floor(Math.random() * list.length)];

const visible = (part, draft) =>
  Object.entries(part.showIf || {}).every(([key, allowed]) => allowed.includes(draft[key]));

function randomDraft(draft, owned) {
  const next = { ...FB_DEFAULTS[draft.body], body: draft.body };
  const free = (key, values) =>
    values.filter((value) => {
      const pack = premiumFor("fb", key, value);
      return !pack || owned.has(pack);
    });

  for (const part of FB_PARTS) {
    if (part.key === "body" || part.key === "pose") continue;
    const values = free(part.key, part.values);
    const chance = { facialHair: 0.7, hat: 0.6, glasses: 0.6, necklace: 0.7, earrings: 0.5, cheeks: 0.5 }[part.key] ?? 0.3;
    next[part.key] = part.optional && Math.random() < chance ? "" : pick(values.length ? values : part.values);
  }

  if (draft.body === "guy" && Math.random() < 0.85) {
    next.hair = pick(["short", "fade", "buzz", "spiky", "sidepart", "curly", "manbun", "afro"]);
    if (["skirt"].includes(next.bottom)) next.bottom = "jeans";
    if (["dress", "crop"].includes(next.top)) next.top = "hoodie";
  }
  if (draft.body === "girl") next.facialHair = "";

  next.bg = pick(free("bg", BACKGROUNDS.map((bg) => bg.id)));
  return next;
}

export function AvatarMaker({ username, frame, current, picture, owned, busy, onSave, onUseAsPicture }) {
  const saved = parseDicebear(current);
  const [draft, setDraft] = useState(() => (saved?.s === "fb" ? saved.o : FB_DEFAULTS.guy));
  const [group, setGroup] = useState("body");
  const [partKey, setPartKey] = useState("body");

  const parts = FB_PARTS.filter((part) => part.group === group && visible(part, draft));
  const part = group === "bg" ? null : parts.find((item) => item.key === partKey) || parts[0];

  // Hidden parts (e.g. bottoms under a dress) go back to defaults before saving.
  const clean = { ...draft };
  for (const item of FB_PARTS) if (!visible(item, draft)) clean[item.key] = FB_DEFAULTS.guy[item.key];
  const encoded = encodeDicebear("fb", clean);
  const unchanged = encoded === current;

  // Premium bits in the draft you don't own yet (try-on is free, saving isn't).
  const needed = [
    ...new Set(
      FB_PARTS.filter((item) => visible(item, draft))
        .map((item) => premiumFor("fb", item.key, draft[item.key]))
        .concat(premiumFor("fb", "bg", draft.bg))
        .filter((pack) => pack && !owned.has(pack))
    ),
  ];

  const set = (key, value) =>
    setDraft((old) => {
      if (key !== "body" || old.body === value) return { ...old, [key]: value };

      // Switching guy/girl: swap the other body's default bits for this one's.
      const from = FB_DEFAULTS[old.body];
      const to = FB_DEFAULTS[value];
      const next = { ...old, body: value };
      for (const item of ["hair", "top", "bottom", "bottomColor", "topColor", "cheeks", "earrings"]) {
        if (old[item] === from[item]) next[item] = to[item];
      }
      if (value === "girl") next.facialHair = "";
      return next;
    });

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
        <img className="avm-body" src={drawFullBody(draft, "live")} alt="Your avatar" draggable="false" />

        <div className="avm-stage-side">
          <FramedAvatar name={username} frame={frame} avatar={encoded} size={64} />

          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setDraft(randomDraft(draft, owned))}
            disabled={busy}
          >
            <Icon name="sparkles" size={15} />
            Surprise me
          </button>

          {unchanged && current && picture !== current && (
            <button type="button" className="btn btn-sm" onClick={() => onUseAsPicture(current)} disabled={busy}>
              <Icon name="user" size={15} />
              Use as picture
            </button>
          )}

          {needed.length ? (
            <Link to={`/shop?type=avatar&item=${needed[0]}`} className="btn btn-sm btn-sun">
              <Icon name="lock" size={15} />
              Get {cosmeticById(needed[0])?.name}
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => onSave(encoded)}
              disabled={busy || unchanged}
            >
              <Icon name="check" size={15} />
              {busy ? "Saving…" : unchanged ? "Saved" : "Save"}
            </button>
          )}
        </div>
      </div>

      <div className="avm-styles" role="tablist" aria-label="Avatar sections">
        {FB_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={group === item.id}
            className={group === item.id ? "active" : ""}
            onClick={() => {
              setGroup(item.id);
              setPartKey(FB_PARTS.find((entry) => entry.group === item.id)?.key || "bg");
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {part && parts.length > 1 && (
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
      )}

      {!part ? (
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
        <div className={`avm-options ${part.view === "full" ? "is-full" : ""}`}>
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
            const pack = premiumFor("fb", part.key, value);
            const locked = pack && !owned.has(pack);
            const preview = { ...draft, [part.key]: value };
            if (part.key === "body") Object.assign(preview, FB_DEFAULTS[value], { skin: draft.skin, bg: draft.bg });

            return (
              <button
                key={value}
                type="button"
                className={`avm-option ${draft[part.key] === value ? "selected" : ""} ${locked ? "is-locked" : ""}`}
                onClick={() => set(part.key, value)}
                aria-pressed={draft[part.key] === value}
                aria-label={`${part.label}: ${nameOf(value)}${locked ? " (locked)" : ""}`}
              >
                <img
                  className={part.view === "full" ? "avm-full" : "avm-head"}
                  src={drawFullBody(preview, part.view === "full" ? "full" : "head")}
                  alt=""
                  draggable="false"
                  loading="lazy"
                />
                {part.view === "full" && <span className="avm-option-name">{nameOf(value)}</span>}
                {locked && lockBadge(pack)}
              </button>
            );
          })}
        </div>
      )}

      <p className="avm-hint">
        Locked items are free to try on. Get them in the <Link to="/shop?type=avatar">shop</Link>.
      </p>
    </div>
  );
}

// Profile picture: your own photo, a classic picture, or your 3D avatar's face.
function AvatarPicker({ username, frame, current, body = null, busy, onPick, onUpload }) {
  const fileRef = useRef(null);
  const hasUpload = current?.startsWith("upload:");
  const [mode, setMode] = useState(hasUpload ? "photo" : "classic");

  return (
    <div className="avatar-picker">
      <div className="avm-modes" role="tablist" aria-label="Picture type">
        {[
          ["photo", "Photo"],
          ["classic", "Pick one"],
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

          {body && (
            <Tile
              selected={current === body}
              busy={busy}
              onClick={() => current !== body && onPick(body)}
              label="My 3D avatar"
              meta="Face"
            >
              <FramedAvatar name={username} frame={frame} avatar={body} size={60} />
            </Tile>
          )}

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
