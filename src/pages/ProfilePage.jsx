import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import Icon from "../components/Icon";
import ProfileCard from "../components/ProfileCard";
import { BadgeIcon } from "../components/Cosmetics";
import FriendButton from "../components/FriendButton";
import ReportModal from "../components/ReportModal";
import { useSocial } from "../context/SocialContext";
import {
  PROFILE_COLUMNS,
  cosmeticById,
  equippedFrom,
} from "../data/cosmetics";
import {
  useCopy,
  canNativeShare,
  nativeShare,
} from "../hooks/useCopy";

import "../styles/profile.css";

// Only rendered inside the signed-in app, where SocialProvider exists.
function ProfileSocialActions({ profile }) {
  const social = useSocial();
  const [reporting, setReporting] = useState(false);

  const relation = social.relationWith(profile.id);

  return (
    <>
      <FriendButton profile={profile} />

      <span className="profile-more">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReporting(true)}>
          <Icon name="flag" size={14} />
          Report
        </button>

        {relation !== "blocked" && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (window.confirm(`Block ${profile.username}? They won't be able to message or add you.`)) {
                social.block(profile.id);
              }
            }}
          >
            Block
          </button>
        )}
      </span>

      {reporting && (
        <ReportModal target={profile} kind="profile" onClose={() => setReporting(false)} />
      )}
    </>
  );
}

const formatJoined = (date) =>
  date
    ? new Date(date).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : "—";

function ProfilePage({ viewer, standalone = false }) {
  const { username } = useParams();

  const [profile, setProfile] = useState(null);
  const [rank, setRank] = useState(null);
  const [state, setState] = useState("loading");
  const [copied, copy] = useCopy();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState("loading");

      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("username", username)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        if (error) console.error(error);
        setState("missing");
        return;
      }

      setProfile(data);
      setState("ready");

      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("referral_count", data.referral_count || 0);

      if (!cancelled && typeof count === "number") {
        setRank(count + 1);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [username]);

  const isMe = viewer && profile && viewer.id === profile.id;
  const equipped = equippedFrom(profile);

  const profileLink = profile
    ? `${window.location.origin}/u/${encodeURIComponent(profile.username)}`
    : "";

  const joinLink = profile
    ? `/?ref=${encodeURIComponent(profile.username)}`
    : "/";

  const content =
    state === "loading" ? (
      <div className="profile-loading">
        <span className="brand-mark" aria-hidden="true">V</span>
      </div>
    ) : state === "missing" ? (
      <div className="card empty-state profile-missing">
        <div className="empty-state-icon" aria-hidden="true">🔍</div>
        <h3>No one goes by “{username}”.</h3>
        <p>Check the spelling, or they may have changed their name.</p>
        <div className="empty-state-actions">
          <Link to="/" className="btn">Go home</Link>
        </div>
      </div>
    ) : (
      <>
        <ProfileCard
          size="lg"
          username={profile.username}
          equipped={equipped}
          bio={profile.bio}
          xp={profile.xp}
          showProgress
          stats={[
            { label: "Referrals", value: profile.referral_count || 0 },
            { label: "Rank", value: rank ? `#${rank}` : "—" },
            { label: "Joined", value: formatJoined(profile.created_at) },
          ]}
        >
          <div className="profile-actions">
            {isMe ? (
              <>
                <Link to="/profile" className="btn btn-primary">
                  <Icon name="edit" size={16} />
                  Edit profile
                </Link>

                <button
                  type="button"
                  className={`btn ${copied ? "btn-success" : ""}`}
                  onClick={() =>
                    canNativeShare
                      ? nativeShare({
                          title: `${profile.username} on Vexora`,
                          url: profileLink,
                        })
                      : copy(profileLink)
                  }
                >
                  <Icon name={copied ? "check" : "share"} size={16} />
                  {copied ? "Link copied" : "Share profile"}
                </button>
              </>
            ) : standalone ? (
              <Link to={joinLink} className="btn btn-primary">
                Join Vexora with {profile.username}'s invite
                <Icon name="arrowRight" size={16} />
              </Link>
            ) : (
              <ProfileSocialActions profile={profile} />
            )}
          </div>
        </ProfileCard>

        {equipped.badges.length > 0 && (
          <section className="profile-badges">
            <span className="eyebrow">Showing off</span>

            <ul>
              {equipped.badges.map((id) => {
                const badge = cosmeticById(id);

                return (
                  <li key={id}>
                    <BadgeIcon id={id} size={44} showTitle={false} />
                    <div>
                      <strong>{badge.name}</strong>
                      <span>{badge.description}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </>
    );

  if (standalone) {
    return (
      <div className="profile-standalone">
        <header className="profile-standalone-bar">
          <Link to={joinLink} className="navbar-brand">
            <span className="brand-mark" aria-hidden="true">V</span>
            <span className="brand-word">Vexora</span>
          </Link>

          <Link to={joinLink} className="btn btn-sm">
            Sign up
          </Link>
        </header>

        <main className="profile-page profile-page-standalone">
          {content}
        </main>
      </div>
    );
  }

  return <main className="page profile-page">{content}</main>;
}

export default ProfilePage;
