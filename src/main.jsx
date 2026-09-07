import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./theme.css";
import "./dashboard/controls.css";
import "./dashboard/feedback.css";
import "./dashboard/workspace-recovery.css";
import "./dashboard/workspace-session.css";
import "./dashboard/company-entry.css";
import "./dashboard/ux.css";
import "./dashboard/quick-open.css";
import "./dashboard/editor-safety.css";
import "./dashboard/tax-editor.css";
import "./dashboard/holding-components.css";
import "./dashboard/company-overview.css";
import "./dashboard/outstanding-center.css";
import "./dashboard/outstanding-entry.css";
import "./dashboard/follow-up.css";
import "./dashboard/deadline-alerts.css";

import "./dashboard/schedule-usability.css";
import "./dashboard/report-usability.css";
import "./dashboard/template-library.css";
import "./dashboard/template-start.css";
import "./dashboard/annual-source.css";
import "./dashboard/template-transfer.css";

import "./dashboard/workspace-space.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
