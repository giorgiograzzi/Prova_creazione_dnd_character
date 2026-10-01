import type { SpellModInfo } from "../compute/types";
import type { Spell } from "../types";

// Note del lancio dai modificatori degli incantesimi (Incantesimi potenti, Discepolo della vita...): {L} = livello dello slot, {L+2} = livello + 2.
// `applied` = opzioni di Metamagia applicate al lancio: i loro effetti compaiono solo se applicate.
export function spellModNotes(mods: SpellModInfo[], spell: Pick<Spell, "id" | "level"> & Partial<Pick<Spell, "school">>, castLevel: number, applied: string[] = []): string[] {
  return mods.filter((m) => (m.metamagic ? applied.includes(m.metamagic)
    : (m.all && (!m.school || m.school === spell.school)) || (m.cantrip && spell.level === 0) || (m.spells?.includes(spell.id) && (!m.minLevel || castLevel >= m.minLevel))))
    .map((m) => `${m.label}: ${m.text.replace(/\{L(?:\+(\d+))?\}/g, (_x: string, k?: string) => String(castLevel + Number(k ?? 0)))}`);
}
