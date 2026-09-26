import { Component } from "react";
import "../styles/errorBoundary.css";

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Suffrova crashed:", error, info);
  }

  handleReload = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-page">
          <div className="error-boundary-card">

            <div className="error-boundary-icon" aria-hidden="true">
              🫠
            </div>

            <h1>
              Something broke.
            </h1>

            <p>
              Suffrova hit an unexpected error. Reloading
              usually fixes it.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={this.handleReload}
            >
              Reload Suffrova
            </button>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
