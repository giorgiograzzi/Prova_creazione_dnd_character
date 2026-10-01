import { useCallback, useEffect, useRef, useState } from "react";
import it from "./i18n/it.json";
import { Characters } from "./pages/Characters";
import { Homebrew } from "./pages/Homebrew";
import { Sheet } from "./pages/Sheet";
import { ImportDialog, Settings, exportNow } from "./pages/Settings";
import type { ImportPreview } from "./db/backup";
import { SectionBar, TabBar, icons, type IconName, type TabDef } from "./ui/xp";
import { SHEET_SECTIONS, isSheetView, type SheetView } from "./sheet/sections";
import { isFinalized } from "./wizard/logic";
import { ReloadPrompt } from "./ui/ReloadPrompt";
import { useApp } from "./ui/useApp";

const SECTION_ICONS: Record<(typeof SHEET_SECTIONS)[number], IconName> = { sheet: "heart", equip: "equip", magic: "magic", misc: "notes" };
// Le tab principali non riguardano un personaggio; Scheda, Equip e Magie sono sezioni della scheda
type TabId = "characters" | "sheet" | "homebrew";

// Posizione nell'app: ogni cambio si registra nella history, così il tasto/gesto "indietro" del telefono torna alla schermata precedente invece di uscire
interface Nav { tab: TabId; section: SheetView; settings: boolean }
const START: Nav = { tab: "characters", section: "sheet", settings: false };
const same = (a: Nav, b: Nav) => a.tab === b.tab && a.section === b.section && a.settings === b.settings;
const navOf = (st: unknown): Nav | null => {
  const n = st && typeof st === "object" && "nav" in st ? (st as { nav: Nav }).nav : null;
  return n && isSheetView(n.section) ? n : null; // voci di una versione precedente (sezioni che non esistono più): si riparte dall'inizio
};

export function App() {
  const init = useApp((s) => s.init);
  const ready = useApp((s) => s.ready);
  const current = useApp((s) => s.current);
  const hand = useApp((s) => s.settings.hand);
  const saveStatus = useApp((s) => s.saveStatus);
  const flush = useApp((s) => s.flush);
  const exportAll = useApp((s) => s.exportAll);
  const previewImport = useApp((s) => s.previewImport);
  const [nav, setNav] = useState<Nav>(() => navOf(history.state) ?? START);
  const { tab, section, settings } = nav;
  const [menu, setMenu] = useState(false);
  const body = useRef<HTMLElement>(null);
  // cambiando schermata si riparte dall'alto
  useEffect(() => { body.current?.scrollTo(0, 0); }, [tab, section, settings]);
  const [importing, setImporting] = useState<ImportPreview | null>(null);

  useEffect(() => { void init(); }, [init]);
  // history: la voce iniziale porta lo stato; "indietro" lo ripristina (le voci dei popup ne portano una copia)
  useEffect(() => {
    if (!navOf(history.state)) history.replaceState({ ...history.state, nav: navOf(history.state) ?? START }, "");
    const onPop = (e: PopStateEvent) => { setMenu(false); setNav(navOf(e.state) ?? START); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const go = useCallback((patch: Partial<Nav>) => {
    const next = { ...nav, ...patch };
    if (same(next, nav)) return;
    history.pushState({ nav: next }, "");
    setNav(next);
  }, [nav]);
  const setSection = (section: SheetView) => go({ section });
  const closeSettings = () => { if (navOf(history.state)?.settings) history.back(); else go({ settings: false }); };
  // Salva subito quando l'app va in secondo piano o si chiude
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") void flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", onHide); };
  }, [flush]);

  const tabs: TabDef[] = [
    { id: "characters", label: it.tabs.characters, icon: "characters" },
    { id: "homebrew", label: it.tabs.homebrew, icon: "homebrew" },
  ];
  const shown: TabId = !current && tab === "sheet" ? "characters" : tab;
  // scheda giocabile aperta: la barra in basso mostra le sue sezioni invece delle tab principali
  const inSheet = shown === "sheet" && !!current && isFinalized(current);
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
        <span className="xp-status" role="status" aria-live="polite">{saveStatus === "error" ? it.settings.saveStatus.error : ""}</span>
        <button type="button" className="xp-title-btn" aria-label={it.menu.open} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><Menu /></button>
      </header>
      {menu && (
        <div className="xp-menu" role="menu" onClick={() => setMenu(false)}>
          <button type="button" role="menuitem" onClick={() => go({ settings: true })}>{it.menu.settings}</button>
          <button type="button" role="menuitem" onClick={() => void exportNow(exportAll)}>{it.menu.export}</button>
          <button type="button" role="menuitem" onClick={pickFile}>{it.menu.import}</button>
        </div>
      )}
      <main ref={body} className="xp-body">
        {settings ? <Settings onBack={closeSettings} /> : (
          <>
            {shown === "characters" && <Characters onOpened={() => go({ section: "sheet", tab: "sheet", settings: false })} />}
            {shown === "sheet" && <Sheet section={section} onSection={setSection} />}
            {shown === "homebrew" && <Homebrew />}
          </>
        )}
      </main>
      {inSheet
        ? <SectionBar items={SHEET_SECTIONS.map((id) => ({ id, label: it.play.tabs[id], icon: SECTION_ICONS[id] }))} current={section === "conditions" ? "sheet" : section} backLabel={it.play.back}
            onSelect={(id) => go({ settings: false, section: id as SheetView })} onBack={() => go({ settings: false, tab: "characters" })} />
        : <TabBar tabs={tabs} current={shown} onSelect={(id) => go({ settings: false, tab: id as TabId })} />}
      {importing && <ImportDialog preview={importing} onClose={() => setImporting(null)} onDone={() => setImporting(null)} />}
      <ReloadPrompt />
    </div>
  );
}
