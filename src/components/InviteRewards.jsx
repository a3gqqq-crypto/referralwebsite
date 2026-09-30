import { Link } from "react-router-dom";

import Icon from "./Icon";
import { CosmeticPreview } from "./Cosmetics";
import { COSMETICS, displayNameOf, equippedFrom } from "../data/cosmetics";
import { useMyProfile } from "../context/ProfileContext";

// Everything you can earn just by inviting, in order.
const ROAD = COSMETICS.filter((item) => item.earn?.referrals).sort(
  (a, b) => a.earn.referrals - b.earn.referrals
);

const TYPE_LABEL = { badge: "Badge", frame: "Frame", name: "Name effect" };

function InviteRewards() {
  const { profile, owned } = useMyProfile();
  const count = profile?.referral_count || 0;
  const next = ROAD.find((item) => count < item.earn.referrals) || null;
  const previous = [...ROAD].reverse().find((item) => count >= item.earn.referrals);
  const from = previous?.earn.referrals || 0;
  const progress = next ? (count - from) / (next.earn.referrals - from) : 1;
  const equipped = equippedFrom(profile);
  const name = displayNameOf(profile, "you");

  return (
    <section className="invite-road card">
      <div className="invite-road-head">
        <div>
          <span className="eyebrow">Invite rewards</span>
          <h2>{next ? `${next.earn.referrals - count} more for ${next.name}` : "You unlocked every reward 👑"}</h2>
        </div>
        <Link to="/profile" className="btn btn-sm btn-ghost">
          Wear them <Icon name="arrowRight" size={14} />
        </Link>
      </div>

      {next && (
        <div className="invite-road-bar" aria-hidden="true">
          <span style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }} />
        </div>
      )}

      <ol className="invite-road-list">
        {ROAD.map((item) => {
          const done = count >= item.earn.referrals || owned.has(item.id);
          return (
            <li key={item.id} className={`invite-road-item ${done ? "is-done" : ""} ${item === next ? "is-next" : ""}`}>
              <span className="invite-road-preview">
                <CosmeticPreview item={item} username={name} avatar={profile?.avatar} body={equipped.body} />
              </span>
              <strong className={`rarity-text-${item.rarity}`}>{item.name}</strong>
              <span className="invite-road-meta">
                {done ? (
                  <>
                    <Icon name="check" size={12} /> Unlocked
                  </>
                ) : (
                  `${TYPE_LABEL[item.type] || "Reward"} · ${item.earn.referrals}`
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default InviteRewards;
