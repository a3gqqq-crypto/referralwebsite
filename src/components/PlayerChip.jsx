import { Link } from "react-router-dom";

import { BadgeRow, FramedAvatar, StyledName } from "./Cosmetics";
import { LevelBadge } from "./Level";
import StaffTag from "./StaffTag";
import { displayNameOf, equippedFrom } from "../data/cosmetics";

export const PLAYER_COLUMNS =
  "id, username, display_name, referral_count, created_at, equipped_frame, equipped_name, equipped_badges, xp, avatar";

function PlayerChip({ player, size = 36, isMe = false, showBadges = true }) {
  const equipped = equippedFrom(player);
  const name = displayNameOf(player);

  const inner = (
    <>
      <FramedAvatar name={name} frame={equipped.frame} avatar={equipped.avatar} size={size} />

      <span className="player-chip-name">
        <StyledName name={name} effect={equipped.name} />
      </span>

      <StaffTag userId={player?.id} />

      <LevelBadge xp={player?.xp} />

      {showBadges && <BadgeRow ids={equipped.badges} size={18} />}

      {isMe && <span className="player-chip-you">You</span>}
    </>
  );

  if (!player?.username) {
    return <span className="player-chip">{inner}</span>;
  }

  return (
    <Link
      to={`/u/${encodeURIComponent(player.username)}`}
      className="player-chip"
    >
      {inner}
    </Link>
  );
}

export default PlayerChip;
