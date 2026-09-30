import type { Ruleset } from "../ruleset";
import type { Character } from "../types";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.floor(n)));
const set = (ch: Character, s: Partial<Character["state"]>): Character => ({ ...ch, state: { ...ch.state, ...s } });

// Condizioni (l'Esaurimento ha i livelli 0-6 e si imposta a parte). Quelle che richiedono una fonte (Affascinato, Spaventato,
// Afferrato) ricordano chi le causa.
export function setCondition(ch: Character, rs: Ruleset, id: string, on: boolean, source?: string): Character {
  const def = rs.conditions.get(id);
  if (!def || def.stackable) return ch;
  const has = ch.state.conditions.includes(id);
  const src = { ...(ch.state.conditionSources ?? {}) };
  if (on) { if (def.requiresSource && source) src[id] = source; return set(ch, { conditions: has ? ch.state.conditions : [...ch.state.conditions, id], conditionSources: src }); }
  delete src[id];
  return set(ch, { conditions: ch.state.conditions.filter((c) => c !== id), conditionSources: src });
}
export const setExhaustion = (ch: Character, level: number): Character => set(ch, { exhaustion: clamp(level, 0, 6) });

// Risorse a usi limitati (Recuperare energie, Ira...)
export function useResource(ch: Character, id: string, max: number, delta: number): Character {
  const used = clamp((ch.state.resourcesUsed[id] ?? 0) + delta, 0, max);
  const r = { ...ch.state.resourcesUsed };
  if (used === 0) delete r[id]; else r[id] = used;
  return set(ch, { resourcesUsed: r });
}
export function toggleSlot(ch: Character, level: number, total: number, delta: number): Character {
  const used = clamp((ch.state.slotsUsed[level] ?? 0) + delta, 0, total);
  const s = { ...ch.state.slotsUsed };
  if (used === 0) delete s[level]; else s[level] = used;
  return set(ch, { slotsUsed: s });
}

export const setInspiration = (ch: Character, on: boolean): Character => set(ch, { inspiration: on });
export const setCoins = (ch: Character, coins: Partial<Character["coins"]>): Character => ({
  ...ch, coins: Object.fromEntries(Object.entries({ ...ch.coins, ...coins }).map(([k, v]) => [k, Math.max(0, Math.floor(v))])) as Character["coins"],
});

// Valori forzati a mano: solo questi numeri si possono sovrascrivere; togliendo il valore si torna al calcolato
export const OVERRIDE_KEYS = ["ac", "hp.max", "initiative", "speed.walk", "passivePerception"] as const;
export type OverrideKey = (typeof OVERRIDE_KEYS)[number];
export function setOverride(ch: Character, key: OverrideKey, value: number | undefined): Character {
  const o = { ...ch.overrides };
  if (value === undefined || !Number.isFinite(value)) delete o[key]; else o[key] = Math.round(value);
  return { ...ch, overrides: o };
}
