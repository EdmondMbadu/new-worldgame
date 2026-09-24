import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
createRoot(document.getElementById("root")!).render(<App />);
window.addEventListener("vite:preloadError", () => location.reload());
// After the first visit the game plays from the device, even on a weak connection.
if (import.meta.env.PROD && "serviceWorker" in navigator)
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {});
  });
