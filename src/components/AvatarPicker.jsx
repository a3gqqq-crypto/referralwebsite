import { useRef } from "react";

import Icon from "./Icon";
import { FramedAvatar } from "./Cosmetics";
import { BUILTIN_AVATARS } from "../data/avatars";

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

function AvatarPicker({ username, frame, current, busy, onPick, onUpload }) {
  const fileRef = useRef(null);
  const hasUpload = current?.startsWith("upload:");

  return (
    <div className="avatar-picker">
      <div className="avatar-upload">
        <FramedAvatar name={username} frame={frame} avatar={current} size={88} />

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

      <div className="locker-panel-head">
        <span className="muted">Or pick one — free</span>
      </div>

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

        {hasUpload && (
          <Tile selected busy={busy} onClick={() => {}} label="Your photo" meta="Uploaded">
            <FramedAvatar name={username} frame={frame} avatar={current} size={60} />
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

      <p className="avatar-rules">
        Keep it friendly. Pictures that break the rules get removed.
      </p>
    </div>
  );
}

export default AvatarPicker;
