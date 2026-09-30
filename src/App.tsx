import { useEffect, useState } from "react";
import it from "./i18n/it.json";
import { Characters } from "./pages/Characters";
import { Placeholder } from "./pages/Placeholder";
import { ImportDialog, Settings, exportNow } from "./pages/Settings";
import type { ImportPreview } from "./db/backup";
import { TabBar, icons, type TabDef } from "./ui/xp";
import { useApp } from "./ui/useApp";

type TabId = "characters" | "sheet" | "equip" | "magic" | "homebrew";

export function App() {
  const init = useApp((s) => s.init);
  const ready = useApp((s) => s.ready);
  const current = useApp((s) => s.current);
  const hand = useApp((s) => s.settings.hand);
  const saveStatus = useApp((s) => s.saveStatus);
  const flush = useApp((s) => s.flush);
  const exportAll = useApp((s) => s.exportAll);
  const previewImport = useApp((s) => s.previewImport);
  const [tab, setTab] = useState<TabId>("characters");
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const [importing, setImporting] = useState<ImportPreview | null>(null);

  useEffect(() => { void init(); }, [init]);
  // Salva subito quando l'app va in secondo piano o si chiude
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") void flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", onHide); };
  }, [flush]);

  const need = !current;
  const tabs: TabDef[] = [
    { id: "characters", label: it.tabs.characters, icon: "characters" },
    { id: "sheet", label: it.tabs.sheet, icon: "sheet", disabled: need },
    { id: "equip", label: it.tabs.equip, icon: "equip", disabled: need },
    { id: "magic", label: it.tabs.magic, icon: "magic", disabled: need },
    { id: "homebrew", label: it.tabs.homebrew, icon: "homebrew" },
  ];
  const shown: TabId = need && (tab === "sheet" || tab === "equip" || tab === "magic") ? "characters" : tab;
  const Menu = icons.menu;
  const pickFile = () => {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "application/json,.json" });
    input.onchange = () => { const f = input.files?.[0]; if (f) void f.text().then(previewImport).then(setImporting); };
    input.click();
  };

  if (!ready) return null;
  return (
    <div className={`xp-app hand-${hand}`}>
      <header className="xp-title">
        <h1>{current ? current.name || it.characters.unnamed : it.app.title}</h1>
        <span className="xp-status" role="status" aria-live="polite">{saveStatus === "saved" ? "" : it.settings.saveStatus[saveStatus]}</span>
        <button type="button" className="xp-title-btn" aria-label={it.menu.open} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><Menu /></button>
      </header>
      {menu && (
        <div className="xp-menu" role="menu" onClick={() => setMenu(false)}>
          <button type="button" role="menuitem" onClick={() => setSettings(true)}>{it.menu.settings}</button>
          <button type="button" role="menuitem" onClick={() => void exportNow(exportAll)}>{it.menu.export}</button>
          <button type="button" role="menuitem" onClick={pickFile}>{it.menu.import}</button>
        </div>
      )}
      <main className="xp-body">
        {settings ? <Settings onBack={() => setSettings(false)} /> : (
          <>
            {shown === "characters" && <Characters onOpened={() => setTab("sheet")} />}
            {shown === "sheet" && <Placeholder title={it.tabs.sheet} text={it.soon.sheet} />}
            {shown === "equip" && <Placeholder title={it.tabs.equip} text={it.soon.equip} />}
            {shown === "magic" && <Placeholder title={it.tabs.magic} text={it.soon.magic} />}
            {shown === "homebrew" && <Placeholder title={it.tabs.homebrew} text={it.soon.homebrew} />}
          </>
        )}
      </main>
      <TabBar tabs={tabs} current={shown} onSelect={(id) => { setSettings(false); setTab(id as TabId); }} />
      {importing && <ImportDialog preview={importing} onClose={() => setImporting(null)} onDone={() => setImporting(null)} />}
    </div>
  );
}
