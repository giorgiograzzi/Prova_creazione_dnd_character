import type { Derived } from "../compute";
import type { Spell } from "../types";

// Metamagia al lancio (Stregone): si spendono punti stregoneria e l'opzione cambia l'incantesimo mentre lo lanci.
export const METAMAGIC_CHOICE = "sorcerer_metamagic";
// Queste due si possono usare anche con un'altra opzione, e a lancio fatto (ritiro dei danni, ritiro del tiro per colpire dopo aver mancato)
export const COMBINABLE = new Set(["empowered_spell", "seeking_spell"]);

export interface MetamagicCheck { ok: boolean; errors: string[]; cost: number; warnings: string[] }

// Controlla le opzioni applicate a un lancio. Errori: opzione non conosciuta, ripetuta, più di una opzione normale, rapido su un incantesimo
// che non è di un'azione, rituale. Avvisi (la scheda non sa sempre se un incantesimo costringe a un TS o richiede un tiro per colpire): nelle note.
export function checkMetamagic(d: Pick<Derived, "chosenOptions">, spell: Pick<Spell, "castingTime" | "resolution">, ids: string[], ritual: boolean): MetamagicCheck {
  const fail = (e: string): MetamagicCheck => ({ ok: false, errors: [e], cost: 0, warnings: [] });
  if (ritual) return fail("Un rituale non si può modificare con la Metamagia");
  if (new Set(ids).size !== ids.length) return fail("Opzione di Metamagia ripetuta");
  const known = ids.map((id) => d.chosenOptions.find((o) => o.id === id && o.choiceId === METAMAGIC_CHOICE));
  if (known.some((o) => !o)) return fail("Opzione di Metamagia non conosciuta");
  if (ids.filter((id) => !COMBINABLE.has(id)).length > 1) return fail("Una sola opzione di Metamagia per incantesimo (tranne Incantesimo potenziato e cercatore)");
  if (ids.includes("quickened_spell") && spell.castingTime.unit !== "action") return fail("Incantesimo rapido: solo per incantesimi con tempo di lancio di un'azione");
  const warnings: string[] = [];
  const res = String(spell.resolution ?? "");
  if ((ids.includes("careful_spell") || ids.includes("heightened_spell")) && !res.startsWith("save")) warnings.push("Controlla: l'incantesimo non sembra costringere a un tiro salvezza (cauto e accentuato servono solo per quello)");
  if (ids.includes("seeking_spell") && !res.startsWith("attack")) warnings.push("Controlla: l'incantesimo non sembra avere un tiro per colpire (il cercatore serve solo per quello)");
  return { ok: true, errors: [], cost: known.reduce((n, o) => n + (o?.cost ?? 0), 0), warnings };
}

// Effetto di un'opzione con i numeri del personaggio, per elenchi fuori dal lancio ({L+1} → «livello dello slot +1»)
export const metamagicText = (mods: { metamagic?: string; text: string }[], id: string): string | undefined =>
  mods.find((m) => m.metamagic === id)?.text.replace(/\{L(?:\+(\d+))?\}/g, (_x, k?: string) => (k ? `livello dello slot +${k}` : "livello dello slot"));
