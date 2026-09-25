import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Icon from "../components/Icon";
import ProfileCard from "../components/ProfileCard";
import AvatarPicker from "../components/AvatarPicker";
import { CosmeticPreview } from "../components/Cosmetics";
import { useMyProfile } from "../context/ProfileContext";
import {
  MAX_BADGES,
  RARITY_LABEL,
  SLOTS,
  cosmeticsOfType,
  equippedFrom,
  formatPrice,
} from "../data/cosmetics";
import { useCopy } from "../hooks/useCopy";
import { TIERS, XP_RULES, levelInfo } from "../data/levels";

import "../styles/profile.css";

const TABS = ["picture", "frame", "name", "banner", "badge", "bio"];
const TAB_LABEL = { picture: "Picture", bio: "Bio" };
const BIO_LIMIT = 160;

function lockLabel(item, referrals) {
  if (item.earn?.referrals) {
    return `${Math.min(referrals, item.earn.referrals)}/${item.earn.referrals} referrals`;
  }

  if (item.earn?.label) return item.earn.label;

  return formatPrice(item.price);
}

function LockerPage() {
  const {
    profile,
    owned,
    loading,
    error,
    username,
    equip,
    setBadges,
    saveBio,
    setAvatar,
    uploadAvatar,
  } = useMyProfile();

  const [tab, setTab] = useState("picture");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [bio, setBio] = useState("");
  const [copied, copy] = useCopy();

  useEffect(() => {
    setBio(profile?.bio || "");
  }, [profile?.bio]);

  const equipped = equippedFrom(profile);
  const referrals = profile?.referral_count || 0;

  const run = async (action, successText) => {
    setBusy(true);
    setNotice(null);

    const result = await action();

    setBusy(false);
    setNotice(
      result.ok
        ? { type: "success", text: successText }
        : { type: "error", text: result.error || "Something went wrong." }
    );
  };

  const selectItem = (slot, id) => {
    if (busy) return;

    const current = equipped[slot];

    if (current === id) return;

    run(() => equip(slot, id), id ? "Equipped." : "Removed.");
  };

  const toggleBadge = (id) => {
    if (busy) return;

    const showing = equipped.badges;
    const next = showing.includes(id)
      ? showing.filter((badge) => badge !== id)
      : [...showing, id];

    if (next.length > MAX_BADGES) {
      setNotice({
        type: "error",
        text: `You can show ${MAX_BADGES} badges at once. Remove one first.`,
      });
      return;
    }

    run(() => setBadges(next), "Badges updated.");
  };

  const profileLink = username
    ? `${window.location.origin}/u/${encodeURIComponent(username)}`
    : "";

  const renderTile = (item, { selected, onSelect }) => {
    const isOwned = owned.has(item.id);

    return (
      <button
        key={item.id}
        type="button"
        className={`locker-tile type-${item.type} ${selected ? "selected" : ""} ${
          isOwned ? "" : "locked"
        }`}
        onClick={() => isOwned && onSelect()}
        disabled={!isOwned || busy}
        aria-pressed={selected}
      >
        <span className="locker-tile-preview">
          <CosmeticPreview item={item} username={username} avatar={profile?.avatar} />
        </span>

        <span className="locker-tile-name">{item.name}</span>

        <span className={`locker-tile-meta rarity-text-${item.rarity}`}>
          {isOwned ? (
            RARITY_LABEL[item.rarity]
          ) : (
            <>
              <Icon name="lock" size={12} />
              {lockLabel(item, referrals)}
            </>
          )}
        </span>

        {selected && (
          <span className="locker-tile-check" aria-hidden="true">
            <Icon name="check" size={13} strokeWidth={3} />
          </span>
        )}
      </button>
    );
  };

  const slotItems = SLOTS[tab] ? cosmeticsOfType(tab) : [];
  const ownedCount = slotItems.filter((item) => owned.has(item.id)).length;

  return (
    <main className="page locker-page">
      <header className="page-header">
        <span className="eyebrow">Your profile</span>

        <h1>
          Make it <span className="mark">yours.</span>
        </h1>

        <p>
          Equip what you own, earn badges by inviting people,
          and pick up the rest in the shop.
        </p>
      </header>

      {error && <div className="notice notice-error">{error}</div>}

      <div className="locker-layout">
        <aside className="locker-preview">
          <ProfileCard
            userId={profile?.id}
            username={username}
            equipped={equipped}
            bio={bio.trim() || profile?.bio}
            xp={profile?.xp}
            streak={profile?.checkin_streak}
            showProgress
            stats={[
              { label: "Referrals", value: referrals },
              { label: "Owned", value: owned.size },
            ]}
          />

          <div className="locker-preview-actions">
            {username && (
              <Link to={`/u/${encodeURIComponent(username)}`} className="btn btn-sm">
                <Icon name="user" size={15} />
                View public profile
              </Link>
            )}

            <button
              type="button"
              className={`btn btn-sm ${copied ? "btn-success" : ""}`}
              onClick={() => copy(profileLink)}
              disabled={!profileLink}
            >
              <Icon name={copied ? "check" : "link"} size={15} />
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>

          <p className="locker-preview-note">
            Your profile link works as an invite link too.
          </p>
        </aside>


        <section className="locker-editor card">
          <div className="locker-tabs" role="tablist" aria-label="Customize">
            {TABS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={tab === key ? "active" : ""}
                onClick={() => {
                  setTab(key);
                  setNotice(null);
                }}
              >
                {TAB_LABEL[key] || SLOTS[key].label}
              </button>
            ))}
          </div>

          <div className="locker-panel" role="tabpanel">
            {loading ? (
              <p className="muted">Loading your locker…</p>
            ) : tab === "picture" ? (
              <AvatarPicker
                username={username}
                frame={equipped.frame}
                current={profile?.avatar || null}
                busy={busy}
                onPick={(avatar) => run(() => setAvatar(avatar), "Picture updated.")}
                onUpload={(file) => run(() => uploadAvatar(file), "Photo uploaded.")}
              />
            ) : tab === "bio" ? (
              <form
                className="locker-bio"
                onSubmit={(event) => {
                  event.preventDefault();
                  run(() => saveBio(bio), "Bio saved.");
                }}
              >
                <div className="field">
                  <label htmlFor="bio">
                    A line about you
                    <span className="mono locker-counter">
                      {bio.length}/{BIO_LIMIT}
                    </span>
                  </label>

                  <textarea
                    id="bio"
                    rows={3}
                    maxLength={BIO_LIMIT}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="e.g. chasing #1 this season 🏆"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busy || bio === (profile?.bio || "")}
                >
                  {busy ? "Saving…" : "Save bio"}
                </button>
              </form>
            ) : (
              <>
                <div className="locker-panel-head">
                  <span className="muted">
                    {tab === "badge"
                      ? `Showing ${equipped.badges.length} of ${MAX_BADGES}`
                      : `${ownedCount} of ${slotItems.length} owned`}
                  </span>

                  <Link to={`/shop?type=${tab}`} className="locker-shop-link">
                    <Icon name="sparkles" size={14} />
                    Get more
                  </Link>
                </div>

                <div className="locker-grid">
                  {tab !== "badge" && (
                    <button
                      type="button"
                      className={`locker-tile locker-tile-none ${
                        !equipped[tab] ? "selected" : ""
                      }`}
                      onClick={() => selectItem(tab, null)}
                      disabled={busy}
                      aria-pressed={!equipped[tab]}
                    >
                      <span className="locker-tile-preview">
                        <Icon name="close" size={22} />
                      </span>
                      <span className="locker-tile-name">
                        {tab === "banner" ? "Midnight" : "None"}
                      </span>
                      <span className="locker-tile-meta">Default</span>
                      {!equipped[tab] && (
                        <span className="locker-tile-check" aria-hidden="true">
                          <Icon name="check" size={13} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  )}

                  {slotItems.map((item) =>
                    renderTile(item, {
                      selected:
                        tab === "badge"
                          ? equipped.badges.includes(item.id)
                          : equipped[tab] === item.id,
                      onSelect: () =>
                        tab === "badge"
                          ? toggleBadge(item.id)
                          : selectItem(tab, item.id),
                    })
                  )}
                </div>
              </>
            )}

            {notice && (
              <div
                className={`notice notice-${notice.type} locker-notice`}
                role={notice.type === "error" ? "alert" : "status"}
              >
                {notice.text}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="locker-levels card">
        <div>
          <span className="eyebrow">Levels &amp; ranks</span>
          <h2>How to level up</h2>
          <p className="muted">
            XP only counts things the site can verify, and daily
            caps stop spam from counting.
          </p>

          <ul className="tier-ladder">
            {TIERS.map((tier) => (
              <li
                key={tier.id}
                className={`tier-${tier.id} ${
                  levelInfo(profile?.xp).tier.id === tier.id ? "current" : ""
                }`}
              >
                <Icon name={tier.icon} size={13} strokeWidth={2.4} />
                {tier.name}
                <small>Lv {tier.minLevel}+</small>
              </li>
            ))}
          </ul>
        </div>

        <ul className="xp-guide">
          {XP_RULES.map((rule) => (
            <li key={rule.label}>
              <Icon name={rule.icon} size={17} />
              <span>{rule.label}</span>
              <strong>{rule.xp}</strong>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default LockerPage;
