import { evalValue } from "./formula-eval";
import { fillText } from "./text";
import type { Ctx } from "./context";
import type { Derived, ResourceActionInfo, SpellModInfo } from "./types";

// Risorse con ricarica: usi = numero, formula ("pb", "mod:cha") o tabella per livello.
// La tabella usa il livello della classe proprietaria (o il totale se non di classe).
export function computeResources(x: Ctx): Derived["resources"] {
  const out: Derived["resources"] = {};
  for (const { effect: e, label, classId } of x.active) {
    if (e.op !== "resource") continue;
    const lv = classId ? x.classLevels[classId] ?? 0 : x.level;
    const raw = typeof e.uses === "object" && "table" in e.uses ? e.uses.table[Math.max(1, lv) - 1] ?? 0 : evalValue(e.uses as number | string, x);
    const max = Math.max(0, raw); // un modificatore negativo non dà usi negativi
    const prev = out[e.resourceId];
    // a parità di usi vince la ricarica più frequente (Fonte di ispirazione: Riposo Breve invece del Lungo)
    if (prev && (prev.max.value > max || (prev.max.value === max && !(e.recharge === "short_rest" && prev.recharge !== "short_rest")))) continue;
    const used = Math.min(x.ch.state.resourcesUsed[e.resourceId] ?? 0, max);
    out[e.resourceId] = {
      max: { value: max, sources: [{ label, value: max }] },
      used, remaining: max - used, recharge: e.recharge, ...(e.regain ? { regain: e.regain } : {}),
    };
  }
  // Lanci gratuiti di incantesimi (specie, talenti, privilegi): un contatore per incantesimo, id `spell:<incantesimo>`
  for (const { effect: e, label } of x.active) {
    if (e.op !== "grantSpell" || !e.freeCast) continue;
    const id = `spell:${e.spell}`;
    const max = Math.max(0, evalValue(e.freeCast.uses, x));
    if ((out[id]?.max.value ?? -1) >= max) continue;
    const used = Math.min(x.ch.state.resourcesUsed[id] ?? 0, max);
    const name = x.rs.spells.get(e.spell)?.name.it ?? e.spell;
    out[id] = { max: { value: max, sources: [{ label: `${label} — ${name}`, value: max }] }, used, remaining: max - used, recharge: e.freeCast.recharge };
  }
  return out;
}

// Azioni delle risorse (Seconda ripresa...): una per ogni effetto `resourceAction` attivo, con il bonus già calcolato
export function computeActions(x: Ctx, resources: Derived["resources"]): ResourceActionInfo[] {
  const out: ResourceActionInfo[] = [];
  for (const { effect: e, featureId: fid } of x.active) {
    if (e.op !== "resourceAction") continue;
    const featureId = fid ?? e.resource ?? e.actionId; // le scelte di specie non hanno un tratto: l'azione si lega alla sua risorsa
    out.push({
      id: e.actionId, featureId, label: e.label, ...(e.resource ? { resource: e.resource } : {}), cost: e.cost, variable: e.variable, ...(e.die ? { die: e.die, count: evalValue(e.count ?? 1, x) } : {}),
      bonus: e.bonus === undefined ? 0 : evalValue(e.bonus, x), apply: e.apply,
      ...(e.restore ? { restore: { resource: e.restore.resource, amount: e.restore.amount === "all" ? "all" as const : evalValue(e.restore.amount, x) } } : {}),
      ...(e.text ? { text: fillText(e.text, e.values, x) } : {}), remaining: e.resource ? resources[e.resource]?.remaining ?? 0 : 0,
    });
  }
  return out;
}

// Modificatori degli incantesimi: testo con i numeri già calcolati (il livello dello slot si mette al lancio)
export function computeSpellMods(x: Ctx): SpellModInfo[] {
  return x.active.flatMap(({ effect: e }) => (e.op === "spellModifier"
    ? [{ label: e.label, text: fillText(e.text, e.values, x), cantrip: e.cantrip, ...(e.all ? { all: true } : {}), ...(e.school ? { school: e.school } : {}), ...(e.spells ? { spells: e.spells } : {}), ...(e.minLevel ? { minLevel: e.minLevel } : {}) }] : []));
}
