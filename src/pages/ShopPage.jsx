import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import Icon from "../components/Icon";
import ProfileCard from "../components/ProfileCard";
import { CosmeticPreview } from "../components/Cosmetics";
import { useMyProfile } from "../context/ProfileContext";
import { supabase } from "../lib/supabaseClient";
import {
  COSMETICS,
  MAX_BADGES,
  PURCHASES_ENABLED,
  RARITY_LABEL,
  SLOTS,
  cosmeticById,
  equippedFrom,
  formatPrice,
} from "../data/cosmetics";

import "../styles/shop.css";

const FILTERS = ["all", "frame", "name", "banner", "badge"];

function ShopPage() {
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.includes(params.get("type")) ? params.get("type") : "all";

  const { profile, owned, username, equip, setBadges, isOwner, refresh } = useMyProfile();

  const items =
    filter === "all" ? COSMETICS : COSMETICS.filter((item) => item.type === filter);

  const [selectedId, setSelectedId] = useState(
    () => cosmeticById(params.get("item"))?.id || "frame-crowned"
  );
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const tryOnRef = useRef(null);

  const selected = cosmeticById(selectedId) || items[0];
  const equipped = equippedFrom(profile);
  const referrals = profile?.referral_count || 0;

  const tryOn = { ...equipped };

  if (selected) {
    if (selected.type === "badge") {
      tryOn.badges = equipped.badges.includes(selected.id)
        ? equipped.badges
        : [selected.id, ...equipped.badges].slice(0, MAX_BADGES);
    } else {
      tryOn[selected.type] = selected.id;
    }
  }

  const isOwned = selected && owned.has(selected.id);
  const isEquipped =
    selected &&
    (selected.type === "badge"
      ? equipped.badges.includes(selected.id)
      : equipped[selected.type] === selected.id);

  const choose = (id) => {
    setSelectedId(id);
    setNotice(null);

    if (window.matchMedia("(max-width: 940px)").matches) {
      tryOnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const setFilter = (next) => {
    setParams(next === "all" ? {} : { type: next }, { replace: true });
  };

  const equipSelected = async () => {
    setBusy(true);
    setNotice(null);

    const result =
      selected.type === "badge"
        ? await setBadges(
            equipped.badges.length >= MAX_BADGES
              ? [selected.id, ...equipped.badges.slice(0, MAX_BADGES - 1)]
              : [...equipped.badges, selected.id]
          )
        : await equip(selected.type, selected.id);

    setBusy(false);
    setNotice(
      result.ok
        ? { type: "success", text: `${selected.name} equipped.` }
        : { type: "error", text: result.error || "Could not equip that." }
    );
  };

  const buySelected = () => {
    if (!PURCHASES_ENABLED) {
      setNotice({
        type: "gold",
        text: "Checkout isn't open yet — it's coming soon. Watch the Discord for the launch.",
      });
    }
  };

  // Owners get anything for free (same server action as "Give an item" in the admin panel).
  const grantToMe = (ids) =>
    Promise.all(
      ids.map((id) => supabase.rpc("admin_grant_cosmetic", { p_user: profile.id, p_cosmetic: id }))
    );

  const getFree = async () => {
    setBusy(true);
    setNotice(null);

    const [{ error: grantError }] = await grantToMe([selected.id]);
    await refresh();

    setBusy(false);
    setNotice(
      grantError
        ? { type: "error", text: grantError.message || "Couldn't unlock that." }
        : { type: "success", text: `${selected.name} unlocked. Equip it whenever.` }
    );
  };

  const missing = COSMETICS.filter((item) => !owned.has(item.id));

  const unlockAll = async () => {
    setBusy(true);
    setNotice(null);

    const results = await grantToMe(missing.map((item) => item.id));
    await refresh();

    setBusy(false);
    const failed = results.filter((result) => result.error).length;
    setNotice(
      failed
        ? { type: "error", text: `${failed} items didn't unlock. Try again.` }
        : { type: "success", text: "Everything unlocked 👑" }
    );
  };

  const earnProgress =
    selected?.earn?.referrals
      ? Math.min(1, referrals / selected.earn.referrals)
      : null;

  return (
    <main className="page shop-page">
      <header className="page-header shop-header">
        <span className="eyebrow">The shop</span>

        <h1>
          Look the <span className="mark">part.</span>
        </h1>

        <p>
          Frames, name effects, banners and badges for your
          profile. Purely cosmetic — they never affect rankings.
        </p>
      </header>

      {isOwner && (
        <div className="shop-owner-bar">
          <span>
            <Icon name="crown" size={16} />
            Owner: everything in the shop is free for you.
          </span>

          {missing.length > 0 ? (
            <button type="button" className="btn btn-sm btn-sun" onClick={unlockAll} disabled={busy}>
              {busy ? "Unlocking…" : `Unlock all ${missing.length}`}
            </button>
          ) : (
            <span className="shop-owner-done">You own everything ✓</span>
          )}
        </div>
      )}

      <div className="shop-layout">
        <section className="shop-catalog">
          <div className="shop-filters" role="tablist" aria-label="Categories">
            {FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                className={filter === key ? "active" : ""}
                onClick={() => setFilter(key)}
              >
                {key === "all" ? "Everything" : SLOTS[key].label}
              </button>
            ))}
          </div>

          <div className="shop-grid">
            {items.map((item) => {
              const itemOwned = owned.has(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`shop-item type-${item.type} rarity-${item.rarity} ${
                    selected?.id === item.id ? "selected" : ""
                  }`}
                  onClick={() => choose(item.id)}
                  aria-pressed={selected?.id === item.id}
                >
                  <span className="shop-item-preview">
                    <CosmeticPreview item={item} username={username || "you"} avatar={profile?.avatar} />
                  </span>

                  <span className="shop-item-info">
                    <span className="shop-item-name">{item.name}</span>

                    <span className={`shop-item-rarity rarity-text-${item.rarity}`}>
                      {RARITY_LABEL[item.rarity]} {SLOTS[item.type].single.toLowerCase()}
                    </span>
                  </span>

                  <span className="shop-item-price">
                    {itemOwned ? (
                      <span className="shop-owned">
                        <Icon name="check" size={13} strokeWidth={3} />
                        Owned
                      </span>
                    ) : isOwner ? (
                      <span className="shop-earn">Free</span>
                    ) : item.price != null ? (
                      formatPrice(item.price)
                    ) : (
                      <span className="shop-earn">Earn</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>


        <aside className="shop-tryon" ref={tryOnRef}>
          <span className="eyebrow">Try it on</span>

          <ProfileCard
            size="sm"
            userId={profile?.id}
            username={username || "you"}
            displayName={profile?.display_name}
            equipped={tryOn}
            bio={profile?.bio}
            xp={profile?.xp}
          />

          {selected && (
            <div className="shop-detail card">
              <div className="shop-detail-head">
                <div>
                  <h2>{selected.name}</h2>
                  <span className={`rarity-text-${selected.rarity}`}>
                    {RARITY_LABEL[selected.rarity]} {SLOTS[selected.type].single.toLowerCase()}
                  </span>
                </div>

                {selected.price != null && !isOwned && !isOwner && (
                  <strong className="shop-detail-price">
                    {formatPrice(selected.price)}
                  </strong>
                )}
              </div>

              <p className="shop-detail-desc">{selected.description}</p>

              {isOwned ? (
                <button
                  type="button"
                  className={`btn btn-block ${isEquipped ? "btn-success" : "btn-primary"}`}
                  onClick={equipSelected}
                  disabled={isEquipped || busy}
                >
                  <Icon name="check" size={16} />
                  {isEquipped ? "Equipped" : busy ? "Equipping…" : "Equip"}
                </button>
              ) : isOwner ? (
                <button
                  type="button"
                  className="btn btn-sun btn-block"
                  onClick={getFree}
                  disabled={busy}
                >
                  <Icon name="crown" size={16} />
                  {busy ? "Unlocking…" : "Get it free · Owner"}
                </button>
              ) : selected.price != null ? (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={buySelected}
                >
                  <Icon name="bag" size={16} />
                  Buy for {formatPrice(selected.price)}
                </button>
              ) : (
                <div className="shop-earn-box">
                  <div className="shop-earn-label">
                    <Icon name="lock" size={14} />
                    {selected.earn?.label || "Earned, not sold"}
                  </div>

                  {earnProgress != null && (
                    <>
                      <div className="shop-progress" aria-hidden="true">
                        <span style={{ width: `${earnProgress * 100}%` }} />
                      </div>

                      <div className="shop-progress-text mono">
                        {Math.min(referrals, selected.earn.referrals)} / {selected.earn.referrals} referrals
                      </div>

                      <Link to="/invites" className="btn btn-sun btn-block btn-sm">
                        Get your invite link
                      </Link>
                    </>
                  )}
                </div>
              )}

              {notice && (
                <div
                  className={`notice notice-${notice.type}`}
                  role={notice.type === "error" ? "alert" : "status"}
                >
                  {notice.text}
                </div>
              )}
            </div>
          )}

          <Link to="/profile" className="shop-locker-link">
            Open your locker
            <Icon name="arrowRight" size={15} />
          </Link>
        </aside>
      </div>
    </main>
  );
}

export default ShopPage;
