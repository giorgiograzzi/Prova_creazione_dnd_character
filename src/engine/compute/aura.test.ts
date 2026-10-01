import { describe, expect, it } from "vitest";
import { computeCharacter } from ".";
import { extraDice } from "../play";
import type { Character } from "../types";
import { testCharacter, testRuleset } from "./testkit";

// Aure sugli alleati (M4), Concentrazione come condizione e costo in slot degli extra (Punizione divina): Lotto 3 di PLAN2
const F = (o: Record<string, unknown>) => ({ description: "", effects: [], choices: [], level: 1, needsReview: false, origin: "private", ...o }) as never;
const rs = (() => {
  const r = testRuleset();
  r.classes.get("fighter")!.features.push(
    F({ id: "protection", name: { it: "Aura di protezione" }, effects: [
      { op: "saveBonus", value: "max(1, mod:cha)" },
      { op: "aura", auraId: "protection", label: "Aura di protezione", radius: 10, text: "Gli alleati aggiungono +{0} ai tiri salvezza", values: ["max(1, mod:cha)"] }] }),
    F({ id: "expansion", name: { it: "Espansione" }, level: 5, effects: [{ op: "aura", auraId: "protection", label: "Aura di protezione", radius: 30, text: "x" }] }),
    F({ id: "mark", name: { it: "Marchio" }, effects: [
      { op: "attackRider", riderId: "mark", label: "Marchio", count: 1, die: 6, damageType: "force", limit: "none", attackType: "any", auto: false, when: "concentrating:charm" },
      { op: "attackAdvantage", mode: "advantage", attackType: "any", when: "concentrating:charm" }] }),
    F({ id: "smite", name: { it: "Punizione" }, effects: [
      { op: "attackRider", riderId: "smite", label: "Punizione", count: 2, die: 8, damageType: "radiant", limit: "none", attackType: "melee", auto: false, slotSpell: "ward", perSlotLevel: 1 }] }),
  );
  return r;
})();
const fighter = (over: Partial<Character> = {}, level = 5) => testCharacter({
  classes: [{ classId: "fighter", level, hpRolls: [] }], inventory: [{ itemId: "longsword", qty: 1, state: "wielded" }], ...over,
});
const d = (c: Character) => computeCharacter(c, rs);
const sword = (c: Character) => d(c).attacks.find((a) => a.id === "longsword")!;

describe("aure", () => {
  it("testo con il numero calcolato; l'espansione porta il raggio da 10 a 30 ft senza duplicare", () => {
    expect(d(fighter({}, 4)).auras).toEqual([{ id: "protection", label: "Aura di protezione", radius: 10, text: "Gli alleati aggiungono +1 ai tiri salvezza" }]);
    expect(d(fighter({}, 5)).auras).toMatchObject([{ id: "protection", radius: 30 }]);
  });
  it("l'effetto su di te resta tra i numeri (bonus ai TS) e il bonus minimo è +1", () => {
    expect(d(fighter({ baseScores: { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 18 } })).saves.wis.bonus.sources.some((s) => s.value === 4)).toBe(true);
    expect(d(fighter()).saves.wis.bonus.sources.some((s) => s.label.includes("Aura") && s.value === 1)).toBe(true); // Car 12 → +1
  });
});

describe("Concentrazione come condizione (Marchio del cacciatore)", () => {
  it("extra e Vantaggio valgono solo mentre ti concentri su quell'incantesimo", () => {
    expect(sword(fighter()).extras.find((e) => e.id === "mark")).toBeUndefined();
    expect(sword(fighter()).mode).toBe("normal");
    const c = fighter({ state: { ...testCharacter().state, concentration: "charm" } });
    expect(sword(c).extras.find((e) => e.id === "mark")).toMatchObject({ dice: "1d6", type: "force" });
    expect(sword(c).mode).toBe("advantage");
    expect(sword(fighter({ state: { ...testCharacter().state, concentration: "omen" } })).extras.find((e) => e.id === "mark")).toBeUndefined();
  });
});

describe("extra con costo in slot (Punizione divina)", () => {
  it("l'extra porta l'incantesimo, il suo livello e i dadi in più per slot", () => {
    const x = sword(fighter()).extras.find((e) => e.id === "smite")!;
    expect(x).toMatchObject({ dice: "2d8", slotSpell: "ward", baseLevel: 1, perSlotLevel: 1, type: "radiant" });
    expect(extraDice(x, 1)).toBe("2d8");
    expect(extraDice(x, 3)).toBe("4d8");
    expect(extraDice({ dice: "1d6" }, 5)).toBe("1d6"); // senza costo in slot niente cambia
  });
});
