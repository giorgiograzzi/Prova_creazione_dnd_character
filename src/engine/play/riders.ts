import type { AttackExtra, Derived } from "../compute/types";
import type { Character } from "../types";
import { useResource } from "./state";

// «Nuovo turno»: azzera gli extra d'attacco "1 volta per turno". Non c'è un tracciamento automatico dei turni: lo preme il giocatore.
export function newTurn(ch: Character): Character {
  const once = Object.fromEntries(Object.entries(ch.state.once ?? {}).filter(([, scope]) => scope !== "turn"));
  return { ...ch, state: { ...ch.state, once } };
}

// Applica un extra d'attacco: segna l'uso (se ha un limite) e spende il costo. Il giocatore somma i dadi al danno.
export function applyExtra(ch: Character, d: Pick<Derived, "resources">, x: Pick<AttackExtra, "id" | "limit" | "cost" | "costAmount" | "used">): { ok: boolean; errors: string[]; character: Character } {
  const fail = (e: string) => ({ ok: false, errors: [e], character: ch });
  if (x.limit !== "none" && ch.state.once?.[x.id]) return fail(x.limit === "turn" ? "Già usato in questo turno" : "Già usato finché è attivo");
  let next = ch;
  if (x.cost) {
    const r = d.resources[x.cost];
    const n = x.costAmount ?? 1;
    if (!r || r.remaining < n) return fail("Nessun uso rimasto");
    next = useResource(next, x.cost, r.max.value, n);
  }
  if (x.limit !== "none") next = { ...next, state: { ...next.state, once: { ...(next.state.once ?? {}), [x.id]: x.limit } } };
  return { ok: true, errors: [], character: next };
}

// Dadi di un extra con costo in slot: "2d8" al livello dell'incantesimo, +perSlotLevel dadi per ogni livello di slot in più (Punizione divina)
export function extraDice(x: Pick<AttackExtra, "dice" | "baseLevel" | "perSlotLevel">, slotLevel: number): string {
  const m = x.perSlotLevel === undefined ? null : /^(\d+)d(\d+)$/.exec(x.dice);
  return m ? `${Number(m[1]) + Math.max(0, slotLevel - (x.baseLevel ?? 1)) * (x.perSlotLevel ?? 1)}d${m[2]}` : x.dice;
}

// Dadi di un extra dopo aver rinunciato a `n` dadi per un effetto (Colpo astuto): "4d6" − 2 → "2d6"; tutti i dadi → ""
export function forgoDice(dice: string, n: number): string {
  const m = /^(\d+)d(\d+)$/.exec(dice);
  if (!m || n <= 0) return dice;
  const left = Number(m[1]) - n;
  return left > 0 ? `${left}d${m[2]}` : "";
}
