import type { Derived } from "../compute/types";
import type { Character } from "../types";
import { rollExpr, type Rng } from "./dice";
import { applyHealing, setTempHp } from "./hp";
import { useResource } from "./state";

export interface ActionResult { ok: boolean; errors: string[]; character: Character; total?: number; rolls?: number[]; spent?: number; text?: string }

// Esegue un'azione di risorsa (Seconda ripresa...): spende gli usi, tira i dadi, applica cure/PF temporanei, restituisce usi.
// `n` = usi da spendere per le azioni variabili (Imposizione delle mani: 1 uso = 1 PF).
export function runAction(ch: Character, d: Pick<Derived, "actions" | "resources" | "hp">, actionId: string, n?: number, rng?: Rng): ActionResult {
  const fail = (e: string): ActionResult => ({ ok: false, errors: [e], character: ch });
  const a = d.actions.find((x) => x.id === actionId);
  if (!a) return fail("Azione sconosciuta");
  const r = a.resource ? d.resources[a.resource] : undefined;
  const units = a.variable ? Math.floor(n ?? 1) : a.cost;
  if (a.variable && (units < 1 || units > (r?.remaining ?? 0))) return fail(`Scegli da 1 a ${r?.remaining ?? 0} usi`);
  if (units > 0 && (!a.resource || !r || r.remaining < units)) return fail("Nessun uso rimasto");
  let next = units > 0 && r && a.resource ? useResource(ch, a.resource, r.max.value, units) : ch;
  let rolls: number[] = [], total = a.variable ? units : 0; // Imposizione delle mani: 1 uso = 1 PF; le altre azioni valgono solo dadi e bonus
  if (a.die) {
    const roll = rollExpr(`${Math.max(1, units) * (a.count ?? 1)}d${a.die}`, rng);
    rolls = roll?.rolls ?? []; total = rolls.reduce((s, v) => s + v, 0);
  }
  total += a.bonus;
  if (a.apply === "heal") next = applyHealing(next, d.hp.max.value, total);
  if (a.apply === "tempHp") next = setTempHp(next, total);
  if (a.restore) {
    const t = d.resources[a.restore.resource];
    if (t) {
      const used = next.state.resourcesUsed[a.restore.resource] ?? 0;
      next = useResource(next, a.restore.resource, t.max.value, a.restore.amount === "all" ? -used : -Math.min(used, a.restore.amount));
    }
  }
  return { ok: true, errors: [], character: next, total, rolls, spent: units, ...(a.text ? { text: a.text } : {}) };
}
