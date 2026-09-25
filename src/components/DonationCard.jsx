import { Link } from "react-router-dom";

import Icon from "./Icon";

function DonationCard() {
  return (
    <div className="donation-layout">

      <section className="donation-card card">
        <span className="chip chip-upcoming">Not live yet</span>

        <h2>Donations are coming soon.</h2>

        <p>
          We're setting this up properly before we take
          anyone's money. It'll be announced in the Discord
          the day it opens.
        </p>

        <Link to="/discord" className="btn btn-primary">
          <Icon name="bell" />
          Get notified on Discord
        </Link>
      </section>


      <section className="donation-free">
        <span className="eyebrow">Free ways to help today</span>

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
            <Link to="/discord">
              <span aria-hidden="true">💬</span>
              <strong>Hang out in the Discord</strong>
              <Icon name="arrowRight" size={16} />
            </Link>
          </li>
        </ul>
      </section>

    </div>
  );
}

export default DonationCard;
