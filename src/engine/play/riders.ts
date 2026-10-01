import type { AttackExtra, Derived } from "../compute/types";
import type { Character } from "../types";
import { useResource } from "./state";

// «Nuovo turno»: azzera gli extra d'attacco "1 volta per turno". Non c'è un tracciamento automatico dei turni: lo preme il giocatore.
export function newTurn(ch: Character): Character {
  const once = Object.fromEntries(Object.entries(ch.state.once ?? {}).filter(([, scope]) => scope !== "turn"));
  return { ...ch, state: { ...ch.state, once } };
}

// Applica un extra d'attacco: segna l'uso (se ha un limite) e spende il costo. Il giocatore somma i dadi al danno.
export function applyExtra(ch: Character, d: Pick<Derived, "resources">, x: Pick<AttackExtra, "id" | "limit" | "cost" | "used">): { ok: boolean; errors: string[]; character: Character } {
  const fail = (e: string) => ({ ok: false, errors: [e], character: ch });
  if (x.limit !== "none" && ch.state.once?.[x.id]) return fail(x.limit === "turn" ? "Già usato in questo turno" : "Già usato finché è attivo");
  let next = ch;
  if (x.cost) {
    const r = d.resources[x.cost];
    if (!r || r.remaining <= 0) return fail("Nessun uso rimasto");
    next = useResource(next, x.cost, r.max.value, 1);
  }
  if (x.limit !== "none") next = { ...next, state: { ...next.state, once: { ...(next.state.once ?? {}), [x.id]: x.limit } } };
  return { ok: true, errors: [], character: next };
}
