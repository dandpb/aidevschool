import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { serviceWorkerUrl } from "./pwa";
import "./styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("Elemento #root não encontrado");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline só no build: em dev/testes o service worker atrapalharia o HMR.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register(serviceWorkerUrl(import.meta.env.BASE_URL));
}
