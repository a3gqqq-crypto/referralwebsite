import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import { SQUAD_COLORS, SQUAD_EMBLEMS, loadSquads, squadGradient } from "../data/squads";

import "../styles/social.css";
import "../styles/squads.css";

export function SquadEmblem({ squad, size = 44 }) {
  return (
    <span
      className="squad-emblem"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.52), background: squadGradient(squad?.color) }}
      aria-hidden="true"
    >
      {squad?.emblem || "⚡"}
    </span>
  );
}

function useDialog() {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return ref;
}

// "Night Owls" -> "NO", "Fire" -> "FIRE"
const suggestTag = (name) => {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(" ").filter(Boolean);
  if (!words.length) return "";
  return (words.length === 1 ? words[0] : words.map((word) => word[0]).join("")).slice(0, 4);
};

function Pickers({ emblem, setEmblem, color, setColor }) {
  return (
    <>
      <div className="field">
        <label>Emblem</label>
        <div className="squad-picker">
          {SQUAD_EMBLEMS.map((item) => (
            <button
              key={item}
              type="button"
              className={item === emblem ? "is-on" : ""}
              onClick={() => setEmblem(item)}
              aria-label={`Emblem ${item}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Colour</label>
        <div className="squad-picker">
          {Object.entries(SQUAD_COLORS).map(([id, item]) => (
            <button
              key={id}
              type="button"
              className={id === color ? "is-on" : ""}
              style={{ background: squadGradient(id) }}
              onClick={() => setColor(id)}
              aria-label={item.label}
              title={item.label}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export function CreateSquadModal({ onClose }) {
  const ref = useDialog();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [tagEdited, setTagEdited] = useState(false);
  const [emblem, setEmblem] = useState("⚡");
  const [color, setColor] = useState("sunset");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const shownTag = tagEdited ? tag : suggestTag(name);

  const create = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { error: createError } = await supabase.rpc("create_squad", {
      p_name: name,
      p_tag: shownTag,
      p_emblem: emblem,
      p_color: color,
      p_description: description,
    });
    setBusy(false);
    if (createError) {
      setError(createError.message);
      return;
    }
    await loadSquads({ force: true });
    onClose();
    navigate(`/squads/${shownTag.toUpperCase()}`);
  };

  return (
    <dialog ref={ref} className="report-modal group-modal" onCancel={onClose}>
      <form className="report-modal-body squad-form" onSubmit={create}>
        <h2>Start a squad</h2>

        <div className="squad-preview" style={{ background: squadGradient(color) }}>
          <SquadEmblem squad={{ emblem, color: "night" }} size={48} />
          <strong>{name.trim() || "Your squad"}</strong>
          <span className="squad-tag" style={{ background: "rgba(0,0,0,0.3)" }}>
            {emblem} {shownTag || "TAG"}
          </span>
        </div>

        <div className="squad-form-row">
          <div className="field">
            <label htmlFor="squad-name">Name</label>
            <input
              id="squad-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={24}
              placeholder="Night Owls"
              autoComplete="off"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="squad-tag">Tag</label>
            <input
              id="squad-tag"
              name="tag"
              value={shownTag}
              onChange={(event) => {
                setTagEdited(true);
                setTag(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4));
              }}
              maxLength={4}
              placeholder="OWL"
              autoComplete="off"
              required
            />
          </div>
        </div>

        <Pickers emblem={emblem} setEmblem={setEmblem} color={color} setColor={setColor} />

        <div className="field">
          <label htmlFor="squad-desc">About (optional)</label>
          <textarea
            id="squad-desc"
            rows={2}
            maxLength={140}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="We check in every day and never lose."
          />
        </div>

        {error && <div className="notice notice-error">{error}</div>}

        <div className="report-modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || name.trim().length < 3 || shownTag.length < 2}
          >
            {busy ? "Creating…" : "Create squad"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function EditSquadModal({ squad, onClose }) {
  const ref = useDialog();
  const [emblem, setEmblem] = useState(squad.emblem);
  const [color, setColor] = useState(squad.color);
  const [description, setDescription] = useState(squad.description || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { error: saveError } = await supabase.rpc("update_squad", {
      p_description: description,
      p_emblem: emblem,
      p_color: color,
    });
    setBusy(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    await loadSquads({ force: true });
    onClose();
  };

  return (
    <dialog ref={ref} className="report-modal group-modal" onCancel={onClose}>
      <form className="report-modal-body squad-form" onSubmit={save}>
        <h2>Edit squad</h2>

        <Pickers emblem={emblem} setEmblem={setEmblem} color={color} setColor={setColor} />

        <div className="field">
          <label htmlFor="squad-edit-desc">About</label>
          <textarea
            id="squad-edit-desc"
            rows={2}
            maxLength={140}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        {error && <div className="notice notice-error">{error}</div>}

        <div className="report-modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
