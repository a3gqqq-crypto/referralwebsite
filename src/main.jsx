import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";

import "./styles/theme.css";
import "./styles/global.css";

import App from "./App.jsx";
import { registerServiceWorker } from "./lib/push";
// Loaded first so the browser's one-time "can install" event isn't missed.
import "./lib/install";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    {/* Vercel Web Analytics: page views and visitors, no cookies. */}
    <Analytics />
  </StrictMode>
);

registerServiceWorker();
