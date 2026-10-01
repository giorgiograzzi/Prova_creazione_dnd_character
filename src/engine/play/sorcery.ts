import type { Derived } from "../compute/types";
import type { Character } from "../types";
import { toggleSlot, useResource } from "./state";

// Punti stregoneria: la risorsa è quella di Fonte di magia
export const SORCERY_POINTS = "font_of_magic";
// Creare uno slot (Azione Bonus, max 5° livello, sparisce al Riposo Lungo): punti per livello — riepilogo 01 p.42 (parole nostre)
export const SLOT_COST: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 };

type Res = { ok: boolean; errors: string[]; character: Character };
const fail = (ch: Character, e: string): Res => ({ ok: false, errors: [e], character: ch });
const pts = (d: Pick<Derived, "resources">) => d.resources[SORCERY_POINTS];

// Spende punti stregoneria (costo di una Metamagia o di un privilegio)
export function spendPoints(ch: Character, d: Pick<Derived, "resources">, n: number): Res {
  const r = pts(d);
  if (!r || r.remaining < n) return fail(ch, "Punti stregoneria insufficienti");
  return { ok: true, errors: [], character: useResource(ch, SORCERY_POINTS, r.max.value, n) };
}

// Punti → slot: lo slot creato si aggiunge ai tuoi slot del livello scelto
export function createSlot(ch: Character, d: Pick<Derived, "resources">, level: number): Res {
  const cost = SLOT_COST[level];
  if (!cost) return fail(ch, "Puoi creare slot dal 1° al 5° livello");
  const spent = spendPoints(ch, d, cost);
  if (!spent.ok) return spent;
  const extra = { ...(ch.state.extraSlots ?? {}) };
  extra[String(level)] = (extra[String(level)] ?? 0) + 1;
  return { ok: true, errors: [], character: { ...spent.character, state: { ...spent.character.state, extraSlots: extra } } };
}

// Slot → punti: spendi uno slot e recuperi tanti punti quanto il suo livello (mai oltre il massimo)
export function slotToPoints(ch: Character, d: Pick<Derived, "resources" | "spellSlots">, level: number): Res {
  const r = pts(d), total = d.spellSlots.slots[level - 1] ?? 0;
  if (!r) return fail(ch, "Non hai punti stregoneria");
  if (!total || (d.spellSlots.remaining[level - 1] ?? 0) <= 0) return fail(ch, `Nessuno slot di ${level}° livello disponibile`);
  const slot = toggleSlot(ch, level, total, 1);
  return { ok: true, errors: [], character: useResource(slot, SORCERY_POINTS, r.max.value, -Math.min(level, r.used)) };
}
