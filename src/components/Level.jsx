import Icon from "./Icon";
import { levelInfo } from "../data/levels";

import "../styles/levels.css";

export function LevelBadge({ xp, size = "sm" }) {
  if (xp == null) return null;

  const { level, tier } = levelInfo(xp);

  return (
    <span
      className={`level-badge tier-${tier.id} level-badge-${size}`}
      title={`${tier.name} · Level ${level}`}
      aria-label={`${tier.name}, level ${level}`}
    >
      <Icon name={tier.icon} size={size === "lg" ? 14 : 11} strokeWidth={2.4} />
      {level}
    </span>
  );
}

export function LevelProgress({ xp, streak }) {
  if (xp == null) return null;

  const info = levelInfo(xp);

  return (
    <div className={`level-progress tier-${info.tier.id}`}>
      <div className="level-progress-head">
        <span className="level-progress-tier">
          <Icon name={info.tier.icon} size={15} strokeWidth={2.2} />
          {info.tier.name}
        </span>

        <span className="level-progress-level">Level {info.level}</span>

        {streak > 1 && (
          <span className="level-progress-streak" title="Daily check-in streak">
            <Icon name="flame" size={14} />
            {streak} days
          </span>
        )}
      </div>

      <div
        className="level-progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(info.progress * 100)}
        aria-label={`Progress to level ${info.level + 1}`}
      >
        <span style={{ width: `${Math.max(3, info.progress * 100)}%` }} />
      </div>

      <div className="level-progress-foot mono">
        <span>{info.xp.toLocaleString()} XP</span>
        <span>
          {info.toNext.toLocaleString()} to Lv {info.level + 1}
          {info.nextTier && info.nextTier.minLevel === info.level + 1
            ? ` · ${info.nextTier.name}`
            : ""}
        </span>
      </div>
    </div>
  );
}
