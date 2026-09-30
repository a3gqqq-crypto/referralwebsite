import { Link } from "react-router-dom";

import { squadGradient, useSquadOf } from "../data/squads";

import "../styles/squads.css";

// "[OWL]" chip next to someone's name, in their squad's colours. Nothing if
// they aren't in a squad.
function SquadTag({ userId, link = true }) {
  const squad = useSquadOf(userId);
  if (!squad) return null;

  const chip = (
    <span className="squad-tag" style={{ background: squadGradient(squad.color) }} title={`${squad.name} squad`}>
      <span aria-hidden="true">{squad.emblem}</span>
      {squad.tag}
    </span>
  );

  return link ? (
    <Link to={`/squads/${squad.tag}`} className="squad-tag-link" onClick={(event) => event.stopPropagation()}>
      {chip}
    </Link>
  ) : (
    chip
  );
}

export default SquadTag;
