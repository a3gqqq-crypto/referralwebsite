import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import Icon from "./Icon";
import { FramedAvatar } from "./Cosmetics";
import VerifiedTick from "./VerifiedTick";
import { useSocial } from "../context/SocialContext";
import { displayNameOf, equippedFrom } from "../data/cosmetics";

import "../styles/verified.css";

// Pick a friend to send a gift to. Only friends can get gifts (kids use
// Suffrova, so no strangers offering "free stuff").
function GiftPicker({ itemName, busy = false, onPick, onClose }) {
  const dialogRef = useRef(null);
  const { friends } = useSocial();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const needle = search.trim().toLowerCase();
  const shown = friends
    .filter((friend) => friend.profile)
    .filter(
      (friend) =>
        !needle ||
        displayNameOf(friend.profile).toLowerCase().includes(needle) ||
        friend.profile.username?.toLowerCase().includes(needle)
    );

  return (
    <dialog ref={dialogRef} className="report-modal gift-picker" onClose={(event) => !event.currentTarget.open && onClose()}>
      <div className="report-modal-body">
        <div className="checkout-head">
          <div>
            <span className="eyebrow">Send a gift</span>
            <h2>🎁 {itemName}</h2>
          </div>
          <button type="button" className="checkout-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} strokeWidth={2.6} />
          </button>
        </div>

        {friends.length === 0 ? (
          <div className="gift-picker-empty">
            <p>You can only send gifts to friends. Add some first!</p>
            <Link to="/people" className="btn btn-primary btn-sm" onClick={onClose}>
              Find people
            </Link>
          </div>
        ) : (
          <>
            <input
              type="search"
              className="gift-picker-search"
              placeholder="Search your friends"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search your friends"
            />

            <ul className="gift-picker-list">
              {shown.map((friend) => {
                const equipped = equippedFrom(friend.profile);
                return (
                  <li key={friend.otherId}>
                    <FramedAvatar
                      userId={friend.otherId}
                      name={displayNameOf(friend.profile)}
                      frame={equipped.frame}
                      avatar={equipped.avatar}
                      size={36}
                    />
                    <span className="gift-picker-name">
                      {displayNameOf(friend.profile)}
                      <VerifiedTick player={friend.profile} size={14} />
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={busy}
                      onClick={() => onPick({ id: friend.otherId, name: displayNameOf(friend.profile) })}
                    >
                      Gift
                    </button>
                  </li>
                );
              })}
              {shown.length === 0 && <li className="muted">No friends match “{search}”.</li>}
            </ul>
          </>
        )}
      </div>
    </dialog>
  );
}

export default GiftPicker;
