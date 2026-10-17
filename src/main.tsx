import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./ui/tokens.css";
import "./ui/app.css";
import "./ui/studio.css";
import "./ui/entry.css";
import "./ui/atelier.css";
import "./ui/brand-intro.css";
import "./ui/profile-sheet.css";
import "./ui/settings.css";
import "./ui/select.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => undefined);
  });
}
