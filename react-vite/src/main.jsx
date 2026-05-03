import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/app.css";
import "./styles/enhancements.css";
import "./styles/image-gallery.css";
import "./styles/form-input.css";
import "./styles/pagination.css";
import { setupFocusIndicators, improveColorContrast } from "./lib/accessibility";

// Dark mode removed — UI will remain light-only.
// Initialize accessibility features
setupFocusIndicators();
improveColorContrast();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
