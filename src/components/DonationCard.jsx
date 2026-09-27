import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Icon from "./Icon";
import CryptoCheckout from "./CryptoCheckout";
import SpendBoard from "./SpendBoard";
import { supabase } from "../lib/supabaseClient";
import { useMyProfile } from "../context/ProfileContext";

const AMOUNTS = [1, 3, 5, 10, 25];
const INSTAGRAM_URL = "https://www.instagram.com/suffrova";

function DonationCard() {
  const { refresh } = useMyProfile();

  const [ready, setReady] = useState(null);
  const [dollars, setDollars] = useState(5);
  const [custom, setCustom] = useState("");
  const [showPublicly, setShowPublicly] = useState(true);
  const [checkout, setCheckout] = useState(null);
  const [boardKey, setBoardKey] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "crypto_address")
      .maybeSingle()
      .then(({ data }) => setReady(Boolean(data?.value)));
  }, []);

  const amount = custom ? Number(custom) : dollars;

  const donate = () => {
    if (!Number.isInteger(amount) || amount < 1 || amount > 1000) {
      setError("Pick a whole-dollar amount between $1 and $1000.");
      return;
    }

    setError("");
    setCheckout({ dollars: amount, showPublicly });
  };

  return (
    <div className="donation-layout">
      {checkout && (
        <CryptoCheckout
          donation={checkout}
          onClose={() => setCheckout(null)}
          onPaid={() => {
            refresh();
            setBoardKey((key) => key + 1);
          }}
        />
      )}

      <section className="donation-card card">
        {ready === false ? (
          <>
            <span className="chip chip-upcoming">Not live yet</span>
            <h2>Donations are coming soon.</h2>
            <p>We're setting this up properly before we take anyone's money. Follow us on Instagram to hear when it opens.</p>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="btn btn-primary">
              <Icon name="instagram" />
              Follow @suffrova
            </a>
          </>
        ) : (
          <>
            <span className="chip chip-live">
              <span className="live-dot" />
              Crypto donations open
            </span>

            <h2>Chip in.</h2>
            <p>
              Every bit goes toward prize pools and more events. Donate in USDT or USDC
              (1 coin = $1) and get the <strong>Supporter</strong> badge.
            </p>

            <div className="donation-amounts" role="group" aria-label="Amount">
              {AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={!custom && dollars === value ? "active" : ""}
                  onClick={() => {
                    setDollars(value);
                    setCustom("");
                    setError("");
                  }}
                >
                  ${value}
                </button>
              ))}

              <label className={`donation-custom ${custom ? "active" : ""}`}>
                <span>$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="1000"
                  step="1"
                  placeholder="Other"
                  value={custom}
                  onChange={(event) => {
                    setCustom(event.target.value.replace(/[^0-9]/g, ""));
                    setError("");
                  }}
                  aria-label="Other amount in dollars"
                />
              </label>
            </div>

            <label className="donation-public">
              <input type="checkbox" checked={showPublicly} onChange={(event) => setShowPublicly(event.target.checked)} />
              Show me on the supporters leaderboard
            </label>

            {error && <div className="notice notice-error">{error}</div>}

            <button type="button" className="btn btn-primary donation-go" onClick={donate} disabled={ready === null}>
              <Icon name="heart" />
              Donate {Number.isFinite(amount) && amount > 0 ? `$${amount}` : ""}
            </button>
          </>
        )}
      </section>

      <div className="donation-side">
        <SpendBoard
          donationsOnly
          title="Top supporters 💛"
          empty="No supporters yet. Be the first. You'll be #1 on this board."
          reloadKey={boardKey}
        />

        <section className="donation-free">
          <span className="eyebrow">Free ways to help</span>

          <ul>
            <li>
              <Link to="/invites">
                <span aria-hidden="true">🔗</span>
                <strong>Invite a friend</strong>
                <Icon name="arrowRight" size={16} />
              </Link>
            </li>

            <li>
              <Link to="/moments">
                <span aria-hidden="true">💌</span>
                <strong>Send someone a Moment</strong>
                <Icon name="arrowRight" size={16} />
              </Link>
            </li>

            <li>
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
                <span aria-hidden="true">📸</span>
                <strong>Follow @suffrova on Instagram</strong>
                <Icon name="arrowRight" size={16} />
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export default DonationCard;
