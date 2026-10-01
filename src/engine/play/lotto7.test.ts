import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { testCharacter, testRuleset } from "../compute/testkit";
import { rollD20 } from "./index";

// Fortuna (Halfling): il d20 che dà 1 si ritira; vale per TS, prove, attacchi e Iniziativa
const F = (o: Record<string, unknown>) => ({ description: "", effects: [], choices: [], level: 1, needsReview: false, origin: "private", ...o }) as never;
const rs = (() => {
  const r = testRuleset();
  const sp = r.species.values().next().value!;
  sp.traits.push(F({ id: "luck", name: { it: "Fortuna" }, effects: [{ op: "rerollOnes" }] }));
  return r;
})();
const d = (over = {}) => computeCharacter(testCharacter(over), rs);
const seq = (...v: number[]) => { let i = 0; return () => (v[i++]! - 1) / 20 + 0.001; }; // d20 = v

describe("Fortuna: ritiro di un 1 sul d20", () => {
  it("compare tra i tiri con l'etichetta del tratto", () => {
    const x = d();
    expect(x.d20Reroll).toEqual([{ min: 1, on: "reroll", label: expect.any(String) }]);
    expect(x.saves.str.floor?.some((f) => f.on === "reroll")).toBe(true);
    expect(x.checks.dex.floor?.some((f) => f.on === "reroll")).toBe(true);
  });
  it("un 1 si ritira e conta il nuovo risultato", () => {
    const luck = d().d20Reroll;
    const r = rollD20(2, "normal", seq(1, 14), luck);
    expect(r.natural).toBe(14);
    expect(r.total).toBe(16);
    expect(r.fumble).toBe(false);
    expect(r.raised).toMatch(/ritirato un 1/);
  });
  it("il nuovo risultato vale anche se è un altro 1; gli altri tiri non cambiano", () => {
    const luck = d().d20Reroll;
    expect(rollD20(0, "normal", seq(1, 1), luck).natural).toBe(1);
    expect(rollD20(0, "normal", seq(9), luck).natural).toBe(9);
  });
  it("con Vantaggio ritira ogni dado che dà 1 prima di scegliere", () => {
    const luck = d().d20Reroll;
    expect(rollD20(0, "advantage", seq(1, 12, 1, 5), luck).natural).toBe(12);
    expect(rollD20(0, "advantage", seq(1, 3, 20), luck).natural).toBe(20);
  });
  it("senza il tratto non c'è nessun ritiro", () => {
    const x = computeCharacter(testCharacter(), testRuleset());
    expect(x.d20Reroll).toEqual([]);
    expect(rollD20(0, "normal", seq(1), x.d20Reroll).natural).toBe(1);
  });
});
