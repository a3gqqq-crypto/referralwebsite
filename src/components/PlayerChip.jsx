import { Link } from "react-router-dom";

import { BadgeRow, FramedAvatar, StyledName } from "./Cosmetics";
import { equippedFrom } from "../data/cosmetics";

export const PLAYER_COLUMNS =
  "id, username, referral_count, created_at, equipped_frame, equipped_name, equipped_badges";

function PlayerChip({ player, size = 36, isMe = false, showBadges = true }) {
  const equipped = equippedFrom(player);
  const name = player?.username || "Player";

  const inner = (
    <>
      <FramedAvatar name={name} frame={equipped.frame} size={size} />

      <span className="player-chip-name">
        <StyledName name={name} effect={equipped.name} />
      </span>

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
