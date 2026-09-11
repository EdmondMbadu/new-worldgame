import { createRoot } from "react-dom/client";
import App from "./App";

// A separate document and dependency graph: this never bootstraps Angular or Firebase.
const appRoot = createRoot(document.getElementById("root")!);
appRoot.render(<App />);

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const root = document.getElementById("root");
  if (root) {
    appRoot.unmount();
    const message = document.createElement("div");
    message.className = "failure";
    const title = document.createElement("h1");
    title.textContent = "A fresh orbit is ready.";
    const text = document.createElement("p");
    text.textContent = "The game was updated. Reload to start your rescue.";
    const button = document.createElement("button");
    button.textContent = "Reload game";
    button.className = "primary";
    button.onclick = () => location.reload();
    message.append(title, text, button);
    root.replaceChildren(message);
  }
});
