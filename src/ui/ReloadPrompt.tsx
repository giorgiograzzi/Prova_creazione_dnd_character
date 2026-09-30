import { useRegisterSW } from "virtual:pwa-register/react";
import it from "../i18n/it.json";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Controlla periodicamente se c'è un nuovo build
      if (registration) setInterval(() => void registration.update(), CHECK_INTERVAL_MS);
    },
  });

  if (!needRefresh && !offlineReady) return null;

  const close = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 1000,
        maxWidth: 320,
        padding: 12,
        background: "#ece9d8",
        color: "#000",
        border: "2px solid #0a246a",
        boxShadow: "2px 2px 6px rgba(0,0,0,.4)",
      }}
    >
      <p style={{ margin: "0 0 8px" }}>
        {needRefresh ? it.pwa.updateAvailable : it.pwa.offlineReady}
      </p>
      {needRefresh && (
        <button onClick={() => void updateServiceWorker(true)}>{it.pwa.update}</button>
      )}{" "}
      <button onClick={close}>{needRefresh ? it.pwa.later : it.pwa.close}</button>
    </div>
  );
}
