import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createRepo } from "../db/repo";
import { createAppStore, type Scheduler } from "./app";
import { backupDue, DEFAULT_APP_SETTINGS, normalizeSettings } from "./settings";

let n = 0;
function setup() {
  const tasks = new Map<number, () => void>();
  let id = 0, ids = 0, clock = 1000;
  const scheduler: Scheduler = { set: (fn) => { tasks.set(++id, fn); return id; }, clear: (h) => { tasks.delete(h as number); } };
  const repo = createRepo(`store-${++n}`);
  const store = createAppStore({ repo, scheduler, now: () => clock, newId: () => `id${++ids}` });
  const tick = () => { const all = [...tasks.values()]; tasks.clear(); all.forEach((f) => f()); };
  return { repo, store, tasks, tick, advance: (ms: number) => { clock += ms; } };
}

describe("store: salvataggio automatico", () => {
  it("modifica → pending → salva dopo la pausa (una sola scrittura per raffica)", async () => {
    const { store, repo, tasks, tick } = setup();
    await store.getState().init();
    const ch = await store.getState().create();
    store.getState().update((c) => ({ ...c, name: "A" }));
    store.getState().update((c) => ({ ...c, name: "Ab" }));
    expect(store.getState().saveStatus).toBe("pending");
    expect(tasks.size).toBe(1); // il timer è stato riarmato, non moltiplicato
    tick();
    await store.getState().flush();
    expect(store.getState().saveStatus).toBe("saved");
    const l = await repo.load(ch.id);
    expect(l.ok && l.character.name).toBe("Ab");
  });
  it("flush salva subito e cambiare personaggio non perde modifiche", async () => {
    const { store, repo } = setup();
    await store.getState().init();
    const a = await store.getState().create();
    store.getState().update((c) => ({ ...c, name: "Prima" }));
    const b = await store.getState().create(); // create fa flush del precedente
    expect(b.id).not.toBe(a.id);
    const l = await repo.load(a.id);
    expect(l.ok && l.character.name).toBe("Prima");
    expect(store.getState().list).toHaveLength(2);
  });
  it("apre, segnala errori di apertura e cancella", async () => {
    const { store, repo } = setup();
    await store.getState().init();
    const a = await store.getState().create();
    await store.getState().close();
    expect(store.getState().current).toBeNull();
    expect(await store.getState().open(a.id)).toBe(true);
    await repo.save({ ...a, id: "rotto", schemaVersion: 99 } as never, 5);
    expect(await store.getState().open("rotto")).toBe(false);
    expect(store.getState().error).toContain("più recente");
    await store.getState().remove(a.id);
    expect(store.getState().list.map((x) => x.id)).toEqual(["rotto"]);
  });
  it("update senza personaggio aperto non fa nulla", async () => {
    const { store, tasks } = setup();
    store.getState().update((c) => ({ ...c, name: "x" }));
    expect(tasks.size).toBe(0);
  });
  it("errore di scrittura → stato error, poi riprova", async () => {
    const { store, repo } = setup();
    await store.getState().init();
    await store.getState().create();
    const real = repo.save;
    repo.save = async () => { throw new Error("disco pieno"); };
    store.getState().update((c) => ({ ...c, name: "X" }));
    await store.getState().flush();
    expect(store.getState().saveStatus).toBe("error");
    expect(store.getState().error).toContain("disco pieno");
    repo.save = real;
    store.getState().update((c) => ({ ...c, name: "Y" }));
    await store.getState().flush();
    expect(store.getState().saveStatus).toBe("saved");
  });
});

describe("store: backup e impostazioni", () => {
  it("export → import in un archivio vuoto ricrea tutto", async () => {
    const A = setup();
    await A.store.getState().init();
    await A.store.getState().create();
    A.store.getState().update((c) => ({ ...c, name: "Eroe", notes: "ciao" }));
    await A.store.getState().create();
    const text = await A.store.getState().exportAll();
    expect(A.store.getState().settings.lastBackupAt).toBe(1000);

    const B = setup();
    await B.store.getState().init();
    const p = await B.store.getState().previewImport(text);
    expect(p.ok && p.items.map((i) => i.status)).toEqual(["new", "new"]);
    expect(await B.store.getState().commitImport(p)).toBe(2);
    expect(B.store.getState().list).toHaveLength(2);
    // reimportando lo stesso file non cambia nulla
    const again = await B.store.getState().previewImport(text);
    expect(again.ok && again.items.every((i) => i.status === "same")).toBe(true);
    expect(await B.store.getState().commitImport(again)).toBe(0);
  });
  it("le impostazioni persistono e sono tolleranti ai valori sbagliati", async () => {
    const { store, repo } = setup();
    await store.getState().init();
    await store.getState().updateSettings({ weaponSwap: "official", backupReminderDays: 7 });
    expect(await repo.getSetting("app")).toMatchObject({ weaponSwap: "official", backupReminderDays: 7 });
    expect(normalizeSettings({ weaponSwap: "boh", hand: 3, allowReroll: "sì", backupReminderDays: -3, lastBackupAt: "x" })).toEqual(DEFAULT_APP_SETTINGS);
    expect(normalizeSettings(null)).toEqual(DEFAULT_APP_SETTINGS);
  });
  it("promemoria backup", () => {
    const day = 86_400_000;
    expect(backupDue({ ...DEFAULT_APP_SETTINGS, lastBackupAt: null }, 0)).toBe(true);
    expect(backupDue({ ...DEFAULT_APP_SETTINGS, lastBackupAt: 0 }, 29 * day)).toBe(false);
    expect(backupDue({ ...DEFAULT_APP_SETTINGS, lastBackupAt: 0 }, 30 * day)).toBe(true);
    expect(backupDue({ ...DEFAULT_APP_SETTINGS, backupReminderDays: 0 }, 999 * day)).toBe(false);
  });
});
