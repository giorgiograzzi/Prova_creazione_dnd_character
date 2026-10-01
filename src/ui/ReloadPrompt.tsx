import { useRegisterSW } from "virtual:pwa-register/react";
import it from "../i18n/it.json";
import { Button } from "./xp";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Avviso dell'app installata: c'è una versione nuova (Aggiorna ricarica), oppure l'app è pronta per l'uso offline
export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => void registration.update().catch(() => undefined);
      // Controlla periodicamente se c'è un nuovo build
      setInterval(check, CHECK_INTERVAL_MS);
      // L'app installata resta in background per giorni e i timer si fermano: si controlla anche quando torna in primo piano
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
    },
  });

  if (!needRefresh && !offlineReady) return null;

  const close = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return (
    <div className="pwa-toast" role="alert">
      <p>{needRefresh ? it.pwa.updateAvailable : it.pwa.offlineReady}</p>
      <div className="xp-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        {needRefresh && <Button variant="primary" onClick={() => void updateServiceWorker(true)}>{it.pwa.update}</Button>}
        <Button onClick={close}>{needRefresh ? it.pwa.later : it.pwa.close}</Button>
      </div>
    </div>
  );
}
