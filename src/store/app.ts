import { createStore } from "zustand/vanilla";
import { applyImport, exportBackup, previewImport, type ImportPreview, type Resolution } from "../db/backup";
import type { CharacterSummary, Repo } from "../db/repo";
import { emptyCharacter } from "../engine/character";
import type { Character } from "../engine/types";
import { normalizeSettings, type AppSettings, DEFAULT_APP_SETTINGS } from "./settings";

// Scheduler iniettabile: nei test si controlla il tempo a mano
export interface Scheduler { set(fn: () => void, ms: number): unknown; clear(handle: unknown): void }
const realScheduler: Scheduler = { set: (fn, ms) => setTimeout(fn, ms), clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) };

export type SaveStatus = "saved" | "pending" | "saving" | "error";
export interface AppState {
  ready: boolean;
  list: CharacterSummary[];
  current: Character | null;
  saveStatus: SaveStatus;
  error: string | null;
  settings: AppSettings;
}
export interface AppActions {
  init(): Promise<void>;
  create(): Promise<Character>;
  open(id: string): Promise<boolean>;
  close(): Promise<void>;
  // Modifica il personaggio aperto; il salvataggio avviene da solo dopo una breve pausa
  update(fn: (c: Character) => Character): void;
  flush(): Promise<void>;
  remove(id: string): Promise<void>;
  updateSettings(patch: Partial<AppSettings>): Promise<void>;
  exportAll(): Promise<string>;
  previewImport(text: string): Promise<ImportPreview>;
  commitImport(preview: ImportPreview, resolutions?: Record<string, Resolution>): Promise<number>;
}

export interface StoreDeps { repo: Repo; scheduler?: Scheduler; debounceMs?: number; now?: () => number; newId?: () => string }

export function createAppStore({ repo, scheduler = realScheduler, debounceMs = 800, now = Date.now, newId = () => crypto.randomUUID() }: StoreDeps) {
  let timer: unknown = null;
  let inFlight: Promise<void> = Promise.resolve();

  const store = createStore<AppState & AppActions>()((set, get) => {
    const refreshList = async () => set({ list: await repo.list() });
    const cancel = () => { if (timer !== null) { scheduler.clear(timer); timer = null; } };
    const allCharacters = async (): Promise<Character[]> => {
      const out: Character[] = [];
      for (const s of await repo.list()) { const r = await repo.load(s.id); if (r.ok) out.push(r.character); }
      return out;
    };

    const doSave = async () => {
      cancel();
      const ch = get().current;
      if (!ch || get().saveStatus === "saved") return;
      set({ saveStatus: "saving" });
      try {
        await repo.save(ch, now());
        // se nel frattempo è arrivata un'altra modifica resta "pending"
        if (get().current === ch) set({ saveStatus: "saved", error: null });
        await refreshList();
      } catch (e) {
        set({ saveStatus: "error", error: `Salvataggio fallito: ${e instanceof Error ? e.message : String(e)}` });
      }
    };
    const enqueueSave = () => { inFlight = inFlight.then(doSave); return inFlight; };

    return {
      ready: false, list: [], current: null, saveStatus: "saved", error: null, settings: DEFAULT_APP_SETTINGS,
      async init() {
        const settings = normalizeSettings(await repo.getSetting("app"));
        set({ settings, list: await repo.list(), ready: true });
      },
      async create() {
        await get().flush();
        const ch = emptyCharacter(newId());
        await repo.save(ch, now());
        set({ current: ch, saveStatus: "saved", error: null });
        await refreshList();
        return ch;
      },
      async open(id) {
        await get().flush();
        const r = await repo.load(id);
        if (!r.ok) { set({ error: r.error }); return false; }
        set({ current: r.character, saveStatus: "saved", error: null });
        return true;
      },
      async close() { await get().flush(); set({ current: null }); },
      update(fn) {
        const cur = get().current;
        if (!cur) return;
        set({ current: fn(cur), saveStatus: "pending" });
        cancel();
        timer = scheduler.set(() => { timer = null; void enqueueSave(); }, debounceMs);
      },
      async flush() { cancel(); if (get().saveStatus === "pending") await enqueueSave(); else await inFlight; },
      async remove(id) {
        if (get().current?.id === id) { cancel(); set({ current: null, saveStatus: "saved" }); }
        await inFlight;
        await repo.remove(id);
        await refreshList();
      },
      async updateSettings(patch) {
        const settings = normalizeSettings({ ...get().settings, ...patch });
        set({ settings });
        await repo.setSetting("app", settings);
      },
      async exportAll() {
        await get().flush();
        const text = exportBackup(await allCharacters(), get().settings, now());
        await get().updateSettings({ lastBackupAt: now() });
        return text;
      },
      async previewImport(text) { await get().flush(); return previewImport(text, await allCharacters()); },
      async commitImport(preview, resolutions) {
        const toSave = applyImport(preview, resolutions, newId);
        for (const c of toSave) await repo.save(c, now());
        // se si è sostituito il personaggio aperto, lo si ricarica
        const cur = get().current;
        const replaced = cur && toSave.find((c) => c.id === cur.id);
        if (replaced) set({ current: replaced, saveStatus: "saved" });
        await refreshList();
        return toSave.length;
      },
    };
  });
  return store;
}
export type AppStore = ReturnType<typeof createAppStore>;
