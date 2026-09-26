import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../../lib/supabaseClient";
import Icon from "../Icon";

const KIND_ICON = { join: "users", new: "sparkles", level: "star", passed: "trophy", moment: "heart" };

function timeAgo(date) {
  const seconds = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

const Name = ({ name }) =>
  name ? <Link to={`/u/${encodeURIComponent(name)}`}>{name}</Link> : <b>someone</b>;

function describe(item) {
  switch (item.kind) {
    case "join":
      return <><Name name={item.target} /> joined via <Name name={item.actor} /></>;
    case "new":
      return <><Name name={item.actor} /> joined Suffrova</>;
    case "level":
      return <><Name name={item.actor} /> reached Level {item.detail}</>;
    case "passed":
      return <><Name name={item.actor} /> passed <Name name={item.target} /></>;
    case "moment":
      return <><Name name={item.actor} /> sent a Moment</>;
    default:
      return null;
  }
}

function ActivityFeed() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = () =>
      supabase.rpc("activity_feed", { p_limit: 8 }).then(({ data }) => {
        if (!cancelled) setItems(data || []);
      });

    load();
    const timer = setInterval(load, 60000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <section className="dash-feed card">
      <div className="dash-card-head">
        <span className="eyebrow">
          <span className="live-dot dash-feed-dot" aria-hidden="true" />
          Happening now
        </span>
      </div>

      {!items ? (
        <div className="dash-board-empty">Loading…</div>
      ) : items.length === 0 ? (
        <div className="dash-board-empty">Quiet right now. Invite someone and you'll be the first thing here.</div>
      ) : (
        <ul className="dash-feed-list">
          {items.map((item, index) => (
            <li key={`${item.kind}-${item.created_at}-${index}`}>
              <span className={`dash-feed-icon kind-${item.kind}`} aria-hidden="true">
                <Icon name={KIND_ICON[item.kind] || "sparkles"} size={13} />
              </span>
              <span className="dash-feed-text">{describe(item)}</span>
              <time className="dash-feed-time" dateTime={item.created_at}>{timeAgo(item.created_at)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ActivityFeed;
