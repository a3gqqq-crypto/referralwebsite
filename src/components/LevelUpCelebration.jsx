import { useEffect, useRef, useState } from "react";

import Icon from "./Icon";
import { useStoryShare } from "./StoryShare";
import { useMyProfile } from "../context/ProfileContext";
import { displayNameOf, equippedFrom } from "../data/cosmetics";
import { levelInfo, TIERS } from "../data/levels";
import { referralLinkFor } from "../hooks/useCopy";
import { renderLevelImage } from "../lib/levelImage";
import { drawFullBody } from "../lib/avatarRender";
import { parseDicebear } from "../data/avatarParts";

import "../styles/levelup.css";

// What a level unlocks, shown in the celebration.
function unlocksFor(level) {
  const list = [];
  if (level === 3) list.push("💬 You can now chat and use voice in the Lounge");
  if (level === 5) list.push("📷 You can now post photos in the Lounge");
  const tier = TIERS.find((item) => item.minLevel === level && level > 1);
  if (tier) list.push(`🏅 New rank: ${tier.name}`);
  return list;
}

const storageKey = (id) => `suffrova_level_seen_${id}`;

// Pops up once when your level goes up (on any page), with a story card to share.
function LevelUpCelebration() {
  const { profile, username } = useMyProfile();
  const [shown, setShown] = useState(null);
  const [share, sheet] = useStoryShare();
  const dialogRef = useRef(null);

  const id = profile?.id;
  const level = profile ? levelInfo(profile.xp).level : null;

  useEffect(() => {
    if (!id || !level) return;

    let seen = null;
    try {
      seen = Number(localStorage.getItem(storageKey(id))) || null;
    } catch {
      return;
    }

    // First visit on this device: remember quietly, no party for old levels.
    if (seen == null) {
      try {
        localStorage.setItem(storageKey(id), String(level));
      } catch {
        // Private mode.
      }
      return;
    }

    if (level > seen) {
      try {
        localStorage.setItem(storageKey(id), String(level));
      } catch {
        // Private mode.
      }
      setShown({ from: seen, level });
    }
  }, [id, level]);

  useEffect(() => {
    if (shown) dialogRef.current?.showModal();
  }, [shown]);

  if (!shown && !sheet) return null;

  const info = levelInfo(profile?.xp);
  const equipped = equippedFrom(profile);
  const options = parseDicebear(equipped.body)?.s === "fb" ? parseDicebear(equipped.body).o : null;
  const figure = options ? drawFullBody({ ...options, pose: "flex", eyes: "star", mouth: "grin" }, "live") : null;
  const unlocks = shown ? Array.from({ length: shown.level - shown.from }, (_, i) => unlocksFor(shown.from + i + 1)).flat() : [];
  const close = () => {
    dialogRef.current?.close();
    setShown(null);
  };

  return (
    <>
      {shown && (
        <dialog ref={dialogRef} className="report-modal levelup" onCancel={close}>
          <div className="levelup-confetti" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => (
              <span key={i} style={{ "--i": i }} />
            ))}
          </div>

          <div className="report-modal-body levelup-body">
            {figure && <img className="levelup-figure" src={figure} alt="" draggable="false" />}
            <span className="levelup-eyebrow mono">LEVEL UP</span>
            <strong className="levelup-number">Level {shown.level}</strong>
            <span className="levelup-tier">{info.tier.name} rank</span>

            {unlocks.length > 0 && (
              <ul className="levelup-unlocks">
                {unlocks.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}

            <p className="levelup-next">
              {info.toNext} XP to Level {info.level + 1}. Keep going!
            </p>

            <div className="levelup-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const link = referralLinkFor(profile?.username || username);
                  close();
                  share({
                    link,
                    text: `I just hit Level ${shown.level} on Suffrova 🎉 Come hang out: ${link}`,
                    render: () =>
                      renderLevelImage({
                        username: displayNameOf(profile, username || "me"),
                        body: equipped.body,
                        level: shown.level,
                        tierName: info.tier.name,
                        link,
                      }),
                  });
                }}
              >
                <Icon name="instagram" size={16} />
                Share to story
              </button>
              <button type="button" className="btn" onClick={close}>
                Nice!
              </button>
            </div>
          </div>
        </dialog>
      )}
      {sheet}
    </>
  );
}

export default LevelUpCelebration;
