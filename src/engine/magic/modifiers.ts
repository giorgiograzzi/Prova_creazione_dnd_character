import type { SpellModInfo } from "../compute/types";
import type { Spell } from "../types";

// Parole con cui i riassunti degli incantesimi (04) dicono il tipo di danno
const WORDS: Record<string, string> = {
  acid: "acid[oi]", cold: "freddo", fire: "fuoco", lightning: "fulmin[ei]", thunder: "tuon[oi]", poison: "veleno", necrotic: "necrotic[io]", radiant: "radios[oi]", psychic: "psichic[oi]",
};
export const DAMAGE_TYPES_WITH_WORDS = Object.keys(WORDS);

// L'incantesimo infligge danni di questo tipo? I dati non hanno un campo strutturato: si legge il riassunto (dadi seguiti dal tipo, oppure «del tipo scelto (…)»).
// È un'approssimazione (non vede effetti senza dadi): la nota del lancio resta un promemoria.
export function dealsDamageType(summary: string | undefined, type: string): boolean {
  const w = WORDS[type];
  if (!w || !summary) return false;
  return new RegExp(`\\d+d\\d+[^.;:()]{0,40}?(?:${w})|tipo scelto[^.]*\\([^)]*(?:${w})`, "i").test(summary);
}

// Note del lancio dai modificatori degli incantesimi (Incantesimi potenti, Discepolo della vita...): {L} = livello dello slot, {L+2} = livello + 2.
// `applied` = opzioni di Metamagia applicate al lancio: i loro effetti compaiono solo se applicate.
export function spellModNotes(mods: SpellModInfo[], spell: Pick<Spell, "id" | "level"> & Partial<Pick<Spell, "school" | "summary">>, castLevel: number, applied: string[] = []): string[] {
  return mods.filter((m) => (m.metamagic ? applied.includes(m.metamagic)
    : m.damageType ? dealsDamageType(spell.summary, m.damageType)
    : (m.all && (!m.school || m.school === spell.school)) || (m.cantrip && spell.level === 0) || (m.spells?.includes(spell.id) && (!m.minLevel || castLevel >= m.minLevel))))
    .map((m) => `${m.label}: ${m.text.replace(/\{L(?:\+(\d+))?\}/g, (_x: string, k?: string) => String(castLevel + Number(k ?? 0)))}`);
}
