import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyFireTVFixes, setupTVNavigation } from "./utils/tv-fixes";

// Apply Fire TV fixes immediately
applyFireTVFixes();
setupTVNavigation();

createRoot(document.getElementById("root")!).render(<App />);
