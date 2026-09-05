import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./theme.css";
import "./dashboard/controls.css";
import "./dashboard/ux.css";
import "./dashboard/quick-open.css";
import "./dashboard/editor-safety.css";
import "./dashboard/tax-editor.css";
import "./dashboard/holding-components.css";
import "./dashboard/company-overview.css";
import "./dashboard/outstanding-center.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
