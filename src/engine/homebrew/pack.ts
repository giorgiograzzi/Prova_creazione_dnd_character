import type { z } from "zod";
import type { Ruleset } from "../ruleset";
import { armorSchema, featSchema, itemSchema, SCHEMA_VERSION, spellSchema, weaponSchema } from "../schema";

// Homebrew: voci create dall'utente (armi, armature, oggetti, talenti, incantesimi). Stanno nell'archivio del browser,
// si attivano/disattivano, e si scambiano come pacchetto .json versionato. Ogni voce attiva entra nel ruleset come un dato qualunque.
export const HB_KINDS = ["weapons", "armors", "items", "feats", "spells"] as const;
export type HbKind = (typeof HB_KINDS)[number];

const SCHEMAS = { weapons: weaponSchema, armors: armorSchema, items: itemSchema, feats: featSchema, spells: spellSchema } as const;
export type HbData = Record<string, unknown> & { id: string; name: { it: string } };
export interface HbEntry { kind: HbKind; enabled: boolean; data: HbData }

export const hbKey = (e: { kind: HbKind; data: { id: string } }) => `${e.kind}/${e.data.id}`;

export const slugify = (name: string): string =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

// Id nuovo e libero: "hb_" + nome, con un numero se già preso (da altri homebrew o dai dati di gioco)
export function newHbId(name: string, taken: (id: string) => boolean): string {
  const base = `hb_${slugify(name) || "voce"}`;
  let id = base;
  for (let i = 2; taken(id); i++) id = `${base}_${i}`;
  return id;
}
export const takenIds = (rs: Ruleset, entries: HbEntry[]) => (id: string) =>
  HB_KINDS.some((k) => (rs[k] as Map<string, unknown>).has(id)) || entries.some((e) => e.data.id === id);

const where = (path: PropertyKey[]) => (path.length ? path.join(".") : "");

// Controlla una voce con lo schema del motore. Ritorna la voce completa (con i valori predefiniti) o gli errori in italiano.
export function validateEntry(kind: HbKind, data: unknown, rs: Ruleset): { ok: true; data: HbData } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const name = (data as { name?: { it?: string } } | null)?.name?.it;
  if (!name || !name.trim()) errors.push("Dai un nome.");
  const r = (SCHEMAS[kind] as z.ZodType).safeParse({ ...(data as object), origin: "homebrew" });
  if (!r.success) for (const i of r.error.issues.slice(0, 5)) errors.push(`${where(i.path)} ${i.message}`.trim());
  if (errors.length) return { ok: false, errors };
  const out = r.data as HbData & Record<string, unknown>;
  // riferimenti ai dati di gioco
  if (kind === "weapons") {
    if (!rs.masteries.has(String(out.mastery))) errors.push(`Maestria sconosciuta: ${String(out.mastery)}`);
    if (!rs.damageTypes.has(String(out.damageType))) errors.push(`Tipo di danno sconosciuto: ${String(out.damageType)}`);
  }
  if (kind === "feats") for (const e of (out.effects as { op: string; spell?: string }[])) if (e.op === "grantSpell" && e.spell && !rs.spells.has(e.spell)) errors.push(`Incantesimo sconosciuto: ${e.spell}`);
  // un id dei dati di gioco non si può sovrascrivere
  const clash = (rs[kind] as Map<string, { origin?: string }>).get(out.id);
  if (clash && clash.origin !== "homebrew") errors.push(`L'id "${out.id}" è già usato dai dati di gioco.`);
  return errors.length ? { ok: false, errors } : { ok: true, data: out };
}

// Voci attive → file di dati per il ruleset
export function entryFiles(entries: HbEntry[]): { kind: HbKind; entries: unknown[] }[] {
  return HB_KINDS.map((kind) => ({ kind, entries: entries.filter((e) => e.kind === kind && e.enabled).map((e) => ({ ...e.data, origin: "homebrew" })) }))
    .filter((f) => f.entries.length > 0);
}

export function buildPack(name: string, entries: HbEntry[]): string {
  const pack: Record<string, unknown> = { schemaVersion: SCHEMA_VERSION, name };
  for (const k of HB_KINDS) pack[k] = entries.filter((e) => e.kind === k).map((e) => e.data);
  return JSON.stringify(pack, null, 2);
}

export type ParsedPack = { ok: true; name: string; entries: HbEntry[]; errors: string[] } | { ok: false; error: string };

// Legge un pacchetto: file illeggibile o di una versione più nuova → errore; singole voci invalide → scartate con il motivo.
export function parsePack(text: string, rs: Ruleset): ParsedPack {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: "Il file non è un JSON valido." }; }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ok: false, error: "Il file non è un pacchetto homebrew." };
  const p = raw as Record<string, unknown>;
  if (typeof p.schemaVersion !== "number" || !Number.isInteger(p.schemaVersion) || p.schemaVersion < 1) return { ok: false, error: "Manca la versione del pacchetto (schemaVersion)." };
  if (p.schemaVersion > SCHEMA_VERSION) return { ok: false, error: `Pacchetto di una versione più recente (${p.schemaVersion}): aggiorna l'app.` };
  const entries: HbEntry[] = [], errors: string[] = [];
  for (const kind of HB_KINDS) {
    const list = p[kind];
    if (list === undefined) continue;
    if (!Array.isArray(list)) { errors.push(`${kind}: deve essere una lista.`); continue; }
    for (const item of list) {
      const label = (item as { name?: { it?: string }; id?: string } | null)?.name?.it ?? (item as { id?: string } | null)?.id ?? "?";
      const r = validateEntry(kind, item, rs);
      if (r.ok) entries.push({ kind, enabled: true, data: r.data });
      else errors.push(`${label}: ${r.errors.join(" ")}`);
    }
  }
  return { ok: true, name: typeof p.name === "string" ? p.name : "Pacchetto", entries, errors };
}

// Unisce voci importate a quelle esistenti: stesso id = aggiorna la voce (l'attivazione resta com'era)
export function mergeEntries(existing: HbEntry[], incoming: HbEntry[]): { entries: HbEntry[]; added: number; updated: number } {
  let added = 0, updated = 0;
  const out = [...existing];
  for (const e of incoming) {
    const i = out.findIndex((x) => hbKey(x) === hbKey(e));
    if (i >= 0) { out[i] = { ...e, enabled: out[i]!.enabled }; updated++; } else { out.push(e); added++; }
  }
  return { entries: out, added, updated };
}

export function duplicateEntry(e: HbEntry, rs: Ruleset, all: HbEntry[]): HbEntry {
  const name = `${e.data.name.it} (copia)`;
  return { ...e, enabled: false, data: { ...e.data, id: newHbId(name, takenIds(rs, all)), name: { ...e.data.name, it: name } } };
}
