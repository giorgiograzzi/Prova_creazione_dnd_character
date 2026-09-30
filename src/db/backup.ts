import { z } from "zod";
import type { Character } from "../engine/types";
import { migrateCharacter } from "./migrations";

export const BACKUP_FORMAT = "dnd-personaggi-backup";
export const BACKUP_VERSION = 1;

const containerSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().min(1),
  exportedAt: z.number(),
  characters: z.array(z.unknown()),
  settings: z.unknown().optional(),
});
export interface Backup { format: typeof BACKUP_FORMAT; version: number; exportedAt: number; characters: Character[]; settings?: unknown }

export function exportBackup(characters: Character[], settings?: unknown, now = Date.now()): string {
  const b: Backup = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now, characters, ...(settings !== undefined ? { settings } : {}) };
  return JSON.stringify(b, null, 2);
}

// new = id sconosciuto; same = identico a quello già presente; conflict = stesso id ma contenuto diverso
export type ImportStatus = "new" | "same" | "conflict" | "invalid";
export interface ImportItem { index: number; id: string; name: string; status: ImportStatus; migratedFrom?: number; error?: string; character?: Character }
export type ImportPreview = { ok: true; exportedAt: number; items: ImportItem[]; settings?: unknown } | { ok: false; error: string };

export function previewImport(text: string, existing: Character[]): ImportPreview {
  let json: unknown;
  try { json = JSON.parse(text); } catch { return { ok: false, error: "Il file non è un JSON leggibile." }; }
  // Accetta anche un singolo personaggio esportato da solo
  const single = migrateCharacter(json);
  const container = containerSchema.safeParse(json);
  if (!container.success) {
    if (single.ok) return { ok: true, exportedAt: 0, items: [classify(0, single.character, single.migratedFrom, existing)] };
    return { ok: false, error: "Il file non è un backup di questa app." };
  }
  if (container.data.version > BACKUP_VERSION) return { ok: false, error: `Backup creato da una versione più recente dell'app (formato ${container.data.version}). Aggiorna l'app.` };
  const items = container.data.characters.map((raw, i): ImportItem => {
    const r = migrateCharacter(raw);
    if (!r.ok) {
      const o = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
      return { index: i, id: typeof o.id === "string" ? o.id : "", name: typeof o.name === "string" ? o.name : "", status: "invalid", error: r.error };
    }
    return classify(i, r.character, r.migratedFrom, existing);
  });
  return { ok: true, exportedAt: container.data.exportedAt, items, ...(container.data.settings !== undefined ? { settings: container.data.settings } : {}) };
}

function classify(index: number, ch: Character, migratedFrom: number | undefined, existing: Character[]): ImportItem {
  const cur = existing.find((e) => e.id === ch.id);
  const status: ImportStatus = !cur ? "new" : JSON.stringify(cur) === JSON.stringify(ch) ? "same" : "conflict";
  return { index, id: ch.id, name: ch.name, status, ...(migratedFrom !== undefined ? { migratedFrom } : {}), character: ch };
}

// Cosa fare con i conflitti: sostituire l'esistente, tenere entrambi (copia con nuovo id) o saltare. Default: tenere entrambi.
export type Resolution = "replace" | "copy" | "skip";
export function applyImport(preview: ImportPreview, resolutions: Record<string, Resolution> = {}, newId: () => string = () => crypto.randomUUID()): Character[] {
  if (!preview.ok) return [];
  const out: Character[] = [];
  for (const it of preview.items) {
    if (!it.character || it.status === "invalid" || it.status === "same") continue;
    if (it.status === "new") { out.push(it.character); continue; }
    const r = resolutions[it.id] ?? "copy";
    if (r === "replace") out.push(it.character);
    else if (r === "copy") out.push({ ...it.character, id: newId(), name: `${it.character.name} (importato)` });
  }
  return out;
}
