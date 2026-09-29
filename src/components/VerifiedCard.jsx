import { useState } from "react";

import Icon from "./Icon";
import VerifiedTick from "./VerifiedTick";
import CryptoCheckout from "./CryptoCheckout";
import { supabase } from "../lib/supabaseClient";
import {
  VERIFIED_ITEM_ID,
  VERIFIED_TIERS,
  daysUntilTier,
  loadVerified,
  nextVerifiedTier,
  verifiedDaysLeft,
  verifiedMonths,
  verifiedTier,
} from "../data/verified";

import "../styles/verified.css";

const ITEM = { id: VERIFIED_ITEM_ID, name: "Verified (30 days)", price: 700, type: "membership" };

const ladderLabel = (months) =>
  months === 1 ? "Start" : months % 12 === 0 ? `${months / 12} ${months === 12 ? "year" : "years"}` : `${months} months`;

// Shop banner for the Verified membership: the evolving badge ladder, your
// status and a way to buy (or, for the owner, get it free).
function VerifiedCard({ profile, cryptoReady, isOwner, onChanged }) {
  const [checkout, setCheckout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const tier = verifiedTier(profile);
  const next = nextVerifiedTier(tier);
  const months = verifiedMonths(profile);
  const daysLeft = verifiedDaysLeft(profile);
  const untilNext = daysUntilTier(profile, next);
  const reachedIndex = VERIFIED_TIERS.findIndex((item) => item.id === tier?.id);

  const buy = () => {
    setNotice(null);
    if (!cryptoReady) {
      setNotice("Checkout isn't open yet. It's coming soon.");
      return;
    }
    setCheckout(true);
  };

  const getFree = async () => {
    setBusy(true);
    setNotice(null);
    const { error } = await supabase.rpc("owner_grant_verified", { p_months: 1 });
    setBusy(false);
    if (error) setNotice(error.message || "Couldn't add it.");
    else {
      loadVerified({ force: true });
      onChanged?.();
    }
  };

  return (
    <section className="verified-card card">
      {checkout && (
        <CryptoCheckout
          item={ITEM}
          onClose={() => setCheckout(false)}
          onPaid={() => {
            loadVerified({ force: true });
            onChanged?.();
          }}
        />
      )}

      <div className="verified-card-hero">
        <VerifiedTick tier={(tier || VERIFIED_TIERS[0]).id} size={64} />
        <div>
          <span className="eyebrow">Membership</span>
          <h2>
            Get Verified <span className="verified-card-price">$7 / month</span>
          </h2>
          <p className="muted">
            A badge next to your name everywhere. It evolves the longer you stay verified, from Bronze all the way to Opal.
            Buying lots of months at once doesn't skip ahead: time does.
          </p>
        </div>
      </div>

      <ol className="verified-ladder" aria-label="How the badge evolves">
        {VERIFIED_TIERS.map((item, index) => (
          <li
            key={item.id}
            className={`${tier && index <= reachedIndex ? "is-reached" : ""} ${tier?.id === item.id ? "is-current" : ""}`}
          >
            <VerifiedTick tier={item.id} size={30} title={false} />
            <strong>{item.name}</strong>
            <small>{ladderLabel(item.months)}</small>
          </li>
        ))}
      </ol>

      <div className="verified-card-foot">
        <span className="verified-card-status">
          {tier ? (
            <>
              <strong>
                {tier.name} badge · verified {months < 1 ? "this month" : `${months} ${months === 1 ? "month" : "months"}`}
              </strong>
              <span>
                {daysLeft} {daysLeft === 1 ? "day" : "days"} paid
                {next ? ` · evolves to ${next.name} in ${untilNext} ${untilNext === 1 ? "day" : "days"}` : " · max badge"}
              </span>
            </>
          ) : (
            <span>Not verified yet. Each payment adds 30 days.</span>
          )}
        </span>

        {isOwner ? (
          <button type="button" className="btn btn-sun" onClick={getFree} disabled={busy}>
            <Icon name="crown" size={16} />
            {busy ? "Adding…" : tier ? "Add a month free · Owner" : "Get it free · Owner"}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={buy}>
            <Icon name="sparkles" size={16} />
            {tier ? "Add 30 days · $7" : "Get Verified · $7"}
          </button>
        )}
      </div>

      {notice && <div className="notice notice-gold">{notice}</div>}
    </section>
  );
}

export default VerifiedCard;
