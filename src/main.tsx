import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import "./ui/xp/xp.css";
import it from "./i18n/it.json";
import { setHomebrewFiles } from "./data/ruleset";
import { entryFiles } from "./engine/homebrew";
import { appStore } from "./store";

// L'homebrew attivo entra nel ruleset: ad ogni modifica (e appena caricato) si ricostruisce
appStore.subscribe((s, prev) => { if (s.homebrew !== prev.homebrew) setHomebrewFiles(entryFiles(s.homebrew)); });

// Reset forzato una tantum: svuota le cache e il service worker vecchi (i dati dei personaggi, in localStorage/IndexedDB, restano intatti).
// Per forzarne un altro dopo una modifica delle icone/risorse, basta cambiare CACHE_RESET_KEY.
const CACHE_RESET_KEY = "cache-reset-2026-10-icona-d20";
async function resetCachesOnce() {
  try {
    if (localStorage.getItem(CACHE_RESET_KEY)) return;
    localStorage.setItem(CACHE_RESET_KEY, "1");
    const regs = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistrations() : [];
    const keys = "caches" in window ? await caches.keys() : [];
    await Promise.all([...regs.map((r) => r.unregister()), ...keys.map((k) => caches.delete(k))]);
    if (regs.length || keys.length) location.reload();
  } catch { /* storage o API non disponibili: si prosegue senza reset */ }
}
void resetCachesOnce();

document.title = it.app.title;
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </StrictMode>,
);
