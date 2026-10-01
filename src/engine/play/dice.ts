import type { RollMode } from "../compute/types";

export type Rng = () => number;
const die = (sides: number, rng: Rng) => 1 + Math.floor(rng() * sides);

export interface D20Roll { dice: number[]; natural: number; kept: number; total: number; mode: RollMode; crit: boolean; fumble: boolean; raised?: string }
export interface D20Floor { min: number; on: "die" | "total" | "reroll"; label: string }

// Tiro di d20 con Vantaggio (si tiene il più alto) o Svantaggio (il più basso)
// floors: minimi del tiro. Sul dado (Talento affidabile) un d20 più basso conta come il minimo; sul totale (Possanza indomita) il totale non scende sotto il minimo.
export function rollD20(bonus: number, mode: RollMode = "normal", rng: Rng = Math.random, floors: D20Floor[] = []): D20Roll {
  const luck = floors.find((f) => f.on === "reroll");
  const raised: string[] = [];
  // Fortuna: ogni d20 che dà 1 si ritira (il nuovo risultato vale)
  const roll20 = () => { const r = die(20, rng); if (luck && r === 1) { if (!raised.includes(luck.label)) raised.push(`${luck.label}: ritirato un 1`); return die(20, rng); } return r; };
  const dice = mode === "normal" ? [roll20()] : [roll20(), roll20()];
  const kept = mode === "advantage" ? Math.max(...dice) : mode === "disadvantage" ? Math.min(...dice) : dice[0]!;
  let used = kept, total = kept + bonus;
  const die_ = floors.find((f) => f.on === "die"), tot = floors.find((f) => f.on === "total");
  if (die_ && kept < die_.min) { used = die_.min; total = used + bonus; raised.push(die_.label); }
  if (tot && total < tot.min) { total = tot.min; raised.push(tot.label); }
  return { dice, natural: kept, kept: used, total, mode, crit: kept === 20, fumble: kept === 1, ...(raised.length ? { raised: raised.join(", ") } : {}) };
}

export interface DiceRoll { rolls: number[]; bonus: number; total: number; expr: string }

// "2d6 + 3", "1d8", "d20", "5": somma di dadi e costanti (segni + e -). Null se non riconosciuta.
export function rollExpr(expr: string, rng: Rng = Math.random, opts: { crit?: boolean; floor?: number } = {}): DiceRoll | null {  // floor: minimo di ogni dado (Combattere con armi possenti)
  const terms = expr.replace(/\s+/g, "").match(/[+-]?[^+-]+/g);
  if (!terms) return null;
  const rolls: number[] = [];
  let bonus = 0;
  for (const t of terms) {
    const sign = t.startsWith("-") ? -1 : 1;
    const body = t.replace(/^[+-]/, "");
    const m = /^(\d*)d(\d+)$/i.exec(body);
    if (m) {
      const n = (m[1] ? Number(m[1]) : 1) * (opts.crit ? 2 : 1), sides = Number(m[2]);
      if (!sides || n > 100) return null;
      for (let i = 0; i < n; i++) rolls.push(sign * Math.max(opts.floor ?? 1, die(sides, rng)));
    } else if (/^\d+$/.test(body)) bonus += sign * Number(body);
    else return null;
  }
  return { rolls, bonus, total: rolls.reduce((a, b) => a + b, 0) + bonus, expr };
}
