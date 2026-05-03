import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/app.css";
import "./styles/enhancements.css";
import { initDarkMode } from "./lib/theme";
import { setupFocusIndicators, improveColorContrast } from "./lib/accessibility";

// Initialize dark mode
initDarkMode();

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
