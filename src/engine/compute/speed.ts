import { evalValue } from "./formula-eval";
import type { Ctx } from "./context";
import { sum, type Part } from "./sourced";
import type { Derived } from "./types";

export function computeSpeed(x: Ctx): Derived["speed"] {
  const sp = x.rs.species.get(x.ch.speciesId);
  const walk: Part[] = [{ label: sp ? `Base ${sp.name.it}` : "Base", value: sp?.speed ?? 30 }];
  const other: Record<"fly" | "swim" | "climb", Part[]> = { fly: [], swim: [], climb: [] };
  let base = walk[0]!.value;
  const bonus: Part[] = [];
  for (const { effect: e, label } of x.active) {
    if (e.op === "speedBonus") bonus.push({ label, value: evalValue(e.value, x) });
    if (e.op !== "setSpeed") continue;
    const v = evalValue(e.value, x);
    if (e.mode === "walk") { if (v > base) { base = v; walk[0] = { label, value: v }; } }
    else if (!other[e.mode].length || v > other[e.mode][0]!.value) other[e.mode] = [{ label, value: v }];
  }
  const a = x.bodyArmor;
  const heavyPenalty: Part[] =
    a && a.strRequired > x.scores.str ? [{ label: `${a.name.it}: Forza ${x.scores.str} < ${a.strRequired}`, value: -10 }] : [];
  const w = [...walk, ...bonus, ...heavyPenalty];
  return {
    walk: sum(w),
    fly: sum([...other.fly, ...(other.fly.length ? bonus : [])]),
    swim: sum(other.swim),
    climb: sum(other.climb),
  };
}

export function computeSenses(x: Ctx): Derived["senses"] {
  const best: Derived["senses"] = {};
  for (const { effect: e, label } of x.active) {
    if (e.op !== "sense") continue;
    const v = evalValue(e.range, x);
    if (v > (best[e.kind]?.value ?? 0)) best[e.kind] = { value: v, sources: [{ label, value: v }] };
  }
  return best;
}

export function computeResistances(x: Ctx): string[] {
  const s = new Set<string>();
  for (const { effect: e } of x.active) if (e.op === "resistance") e.types.forEach((t) => s.add(t));
  return [...s].sort();
}
