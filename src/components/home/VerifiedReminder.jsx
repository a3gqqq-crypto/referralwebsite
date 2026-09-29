import { Link } from "react-router-dom";

import VerifiedTick from "../VerifiedTick";
import { useMyProfile } from "../../context/ProfileContext";
import { verifiedTier } from "../../data/verified";

const DAY = 86400000;

// Home card in the last week of Verified, and for 30 days after it ends
// (while renewing still keeps the badge level).
function VerifiedReminder() {
  const { profile } = useMyProfile();

  if (!profile?.verified_until) return null;

  const left = new Date(profile.verified_until) - Date.now();
  const days = Math.ceil(left / DAY);

  // Still verified with over a week left (or the owner's lifetime one).
  if (days > 7) return null;

  const ended = left <= 0;
  const graceLeft = Math.ceil((new Date(profile.verified_until).getTime() + 30 * DAY - Date.now()) / DAY);
  if (ended && graceLeft <= 0) return null;

  // Tier they'd keep by renewing in time.
  const tier = verifiedTier({ ...profile, verified_until: new Date(Date.now() + DAY).toISOString() });

  return (
    <section className={`verified-reminder card ${ended ? "is-ended" : ""}`}>
      <VerifiedTick tier={tier?.id || "bronze"} size={40} title={false} />
      <div className="verified-reminder-text">
        <strong>
          {ended
            ? "Your Verified badge ended"
            : days <= 1
              ? "Your Verified ends tomorrow"
              : `Your Verified ends in ${days} days`}
        </strong>
        <span>
          {ended
            ? `Renew in the next ${graceLeft} ${graceLeft === 1 ? "day" : "days"} to keep your ${tier?.name || "badge"} level.`
            : `Renew to keep your ${tier?.name || ""} badge. $7 adds another 30 days.`}
        </span>
      </div>
      <Link to="/shop" className="btn btn-sm btn-primary">
        Renew
      </Link>
    </section>
  );
}

export default VerifiedReminder;
