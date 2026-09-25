import { Link } from "react-router-dom";

import Icon from "../components/Icon";

import "../styles/notFound.css";

function NotFound({
  title = "Page not found.",
  message = "This link doesn't lead anywhere — it may have expired, been mistyped, or moved.",
}) {
  return (
    <main className="page not-found-page">
      <div className="not-found-card card">
        <span className="not-found-code mono">404</span>

        <h1>{title}</h1>

        <p>{message}</p>

        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary">
            <Icon name="arrowLeft" />
            Back home
          </Link>

          <Link to="/events" className="btn">
            See events
          </Link>
        </div>
      </div>
    </main>
  );
}

export default NotFound;
