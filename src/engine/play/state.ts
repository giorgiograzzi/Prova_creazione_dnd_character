import { buildCtx, computeCharacter, holds } from "../compute";
import type { Derived } from "../compute";
import { describeCondition } from "../creation/describe";
import type { Ruleset } from "../ruleset";
import type { Character } from "../types";
import { runAction } from "./actions";

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

// Toglie i limiti legati a un privilegio quando si attiva o si spegne (1 volta per Ira)
export function clearOnce(ch: Character, scope: string): Character {
  const cur = ch.state.once;
  if (!cur || !Object.values(cur).includes(scope)) return ch;
  return { ...ch, state: { ...ch.state, once: Object.fromEntries(Object.entries(cur).filter(([, s]) => s !== scope)) } };
}

// Attivare e disattivare un privilegio (Ira, Forma selvatica...). Attivare consuma un uso della risorsa indicata dal privilegio
// e, se c'è una scelta (aspetto, elemento...), ne richiede una e la salva. Disattivare non restituisce l'uso.
export function setActive(ch: Character, rs: Ruleset, d: Pick<Derived, "featureList" | "resources">, id: string, on: boolean, picks: string[] = []): { ok: boolean; errors: string[]; character: Character; notes?: string[] } {
  const fail = (e: string) => ({ ok: false, errors: [e], character: ch });
  const f = d.featureList.find((x) => x.id === id);
  if (!f?.activation) return fail("Questo privilegio non si attiva");
  const state = { ...(ch.state.active ?? {}) };
  if (!on) { delete state[id]; return { ok: true, errors: [], character: clearOnce(set(ch, { active: state }), id) }; }
  if (state[id]) return fail("È già attivo");
  const a = f.activation;
  if (a.requires && !holds(a.requires, buildCtx(ch, rs))) return fail(`Non puoi attivarlo ora: serve ${describeCondition(a.requires, rs)}`);
  if (a.options.length) {
    if (picks.length !== 1 || !a.options.some((o) => o.id === picks[0])) return fail(`Scegli ${a.label ? a.label.toLowerCase() : "un\u2019opzione"}`);
  }
  let next = ch;
  if (a.resource) {
    const r = d.resources[a.resource];
    const n = a.cost ?? 1;
    if (r && r.remaining >= n) next = useResource(ch, a.resource, r.max.value, n);
    else {
      // costo alternativo a usi finiti (Ali di drago: 3 punti stregoneria), se vale la sua condizione
      const alt = a.alt, ar = alt ? d.resources[alt.resource] : undefined;
      if (!alt || !ar || ar.remaining < alt.cost || (alt.when && !holds(alt.when, buildCtx(ch, rs)))) return fail("Nessun uso rimasto");
      next = useResource(ch, alt.resource, ar.max.value, alt.cost);
    }
  }
  const started = clearOnce(set(next, { active: { ...(next.state.active ?? {}), [id]: a.options.length ? picks : [] } }), id);
  const { character, notes } = runOnActivate(started, rs, id);
  return { ok: true, errors: [], character, ...(notes.length ? { notes } : {}) };
}

// Azioni gratuite che partono da sole quando si attiva un privilegio (PF temporanei dell'Ira del Mondo-albero e della Forma selvatica)
function runOnActivate(ch: Character, rs: Ruleset, id: string): { character: Character; notes: string[] } {
  const d = computeCharacter(ch, rs);
  let next = ch;
  const notes: string[] = [];
  for (const a of d.actions.filter((x) => x.onActivate === id && x.cost === 0 && !x.variable)) {
    const r = runAction(next, d, a.id);
    if (!r.ok) continue;
    next = r.character;
    notes.push(`${a.label}: ${r.total ?? 0}`);
  }
  return { character: next, notes };
}
