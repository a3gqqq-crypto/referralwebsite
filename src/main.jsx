import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";

import "./styles/theme.css";
import "./styles/global.css";

import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    {/* Vercel Web Analytics: page views and visitors, no cookies. */}
    <Analytics />
  </StrictMode>
);