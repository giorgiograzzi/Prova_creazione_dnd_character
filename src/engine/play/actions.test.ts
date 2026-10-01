import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { testCharacter, testRuleset } from "../compute/testkit";
import type { Character } from "../types";
import { runAction } from "./index";

// Azioni delle risorse (M11): Seconda ripresa, Imposizione delle mani, recuperi speciali — Lotto 1 di PLAN2
const F = (o: Record<string, unknown>) => ({ description: "", effects: [], choices: [], level: 1, needsReview: false, origin: "private", ...o }) as never;
const rs = (() => {
  const r = testRuleset();
  const f = r.classes.get("fighter")!;
  f.features.length = 0;
  f.features.push(
    F({ id: "second_wind", name: { it: "Seconda ripresa" }, effects: [
      { op: "resource", resourceId: "second_wind", uses: 2, recharge: "short_rest" },
      { op: "resourceAction", actionId: "second_wind_heal", label: "Cura", resource: "second_wind", cost: 1, variable: false, die: 10, bonus: "classLevel:fighter", apply: "heal" },
      { op: "resourceAction", actionId: "tactical_mind", label: "Mente tattica", resource: "second_wind", cost: 1, variable: false, die: 10, apply: "none", text: "Aggiungi il totale alla prova" },
    ] }),
    F({ id: "lay_on_hands", name: { it: "Imposizione delle mani" }, effects: [
      { op: "resource", resourceId: "loh", uses: "5 * classLevel:fighter", recharge: "long_rest" },
      { op: "resourceAction", actionId: "loh_heal", label: "Cura", resource: "loh", cost: 1, variable: true, apply: "heal" },
    ] }),
    F({ id: "persistent_rage", name: { it: "Ira persistente" }, level: 1, usage: { uses: 1, recharge: "long_rest" }, effects: [
      { op: "resource", resourceId: "rage", uses: 3, recharge: "long_rest" },
      { op: "resourceAction", actionId: "persist", label: "Recupera le Ire", resource: "persistent_rage", cost: 1, variable: false, apply: "none", restore: { resource: "rage", amount: "all" } },
    ] }),
    F({ id: "double", name: { it: "Doppio dado" }, effects: [
      { op: "resource", resourceId: "dd", uses: 3, recharge: "short_rest" },
      { op: "resourceAction", actionId: "two_dice", label: "Due dadi", resource: "dd", cost: 1, count: 2, die: 6, bonus: 1, apply: "heal", variable: false, values: ["8 + pb"], text: "CD {0}" },
      { op: "resourceAction", actionId: "free", label: "Gratis", resource: "dd", cost: 0, variable: false, apply: "none", bonus: "5 * classLevel:fighter" }] }),
    F({ id: "zealous", name: { it: "Presenza zelante" }, usage: { uses: 1, recharge: "long_rest" }, effects: [
      { op: "resourceAction", actionId: "zealous_again", label: "Ripristina spendendo un'Ira", resource: "rage", cost: 1, variable: false, apply: "none", restore: { resource: "zealous", amount: 1 } },
    ] }),
  );
  return r;
})();
const fighter = (used: Record<string, number> = {}, hp = 5, level = 5): Character => testCharacter({
  classes: [{ classId: "fighter", level, hpRolls: [] }], state: { ...testCharacter().state, hp, resourcesUsed: used },
});
const d = (c: Character) => computeCharacter(c, rs);
const fixed = (n: number) => () => (n - 1) / 10 + 0.001; // d10 → n

describe("azioni di risorsa", () => {
  it("compaiono con il privilegio che le contiene e il bonus già calcolato", () => {
    const a = d(fighter()).actions.find((x) => x.id === "second_wind_heal")!;
    expect(a).toMatchObject({ featureId: "second_wind", resource: "second_wind", cost: 1, die: 10, bonus: 5, apply: "heal", remaining: 2 });
  });
  it("Seconda ripresa: spende un uso, tira 1d10 + livello e cura (mai oltre il massimo)", () => {
    const c = fighter({}, 5);
    const r = runAction(c, d(c), "second_wind_heal", undefined, fixed(7));
    expect(r).toMatchObject({ ok: true, total: 12, rolls: [7], spent: 1 });
    expect(r.character.state.resourcesUsed.second_wind).toBe(1);
    expect(r.character.state.hp).toBe(17);
    const max = d(c).hp.max.value;
    const full = fighter({}, max - 1);
    expect(runAction(full, d(full), "second_wind_heal", undefined, fixed(10)).character.state.hp).toBe(max);
  });
  it("senza usi non parte; un'azione senza cura (Mente tattica) spende ma non cura", () => {
    const c = fighter({ second_wind: 2 });
    expect(runAction(c, d(c), "second_wind_heal")).toMatchObject({ ok: false, errors: ["Nessun uso rimasto"] });
    const t = fighter({}, 5);
    const r = runAction(t, d(t), "tactical_mind", undefined, fixed(4));
    expect(r).toMatchObject({ ok: true, total: 4, text: "Aggiungi il totale alla prova" });
    expect(r.character.state.hp).toBe(5);
    expect(r.character.state.resourcesUsed.second_wind).toBe(1);
  });
  it("Imposizione delle mani: riserva da formula, spesa variabile, 1 uso = 1 PF", () => {
    const c = fighter({}, 5);
    expect(d(c).resources.loh!.max.value).toBe(25);
    const r = runAction(c, d(c), "loh_heal", 8);
    expect(r).toMatchObject({ ok: true, total: 8, spent: 8 });
    expect(r.character.state.hp).toBe(13);
    expect(r.character.state.resourcesUsed.loh).toBe(8);
    expect(runAction(c, d(c), "loh_heal", 0).ok).toBe(false);
    expect(runAction(c, d(c), "loh_heal", 26)).toMatchObject({ ok: false, errors: ["Scegli da 1 a 25 usi"] });
  });
  it("recuperi: Ira persistente rimette tutte le Ire (una sola volta), Presenza zelante ne rimette una spendendo un'Ira", () => {
    const c = fighter({ rage: 3 });
    const r = runAction(c, d(c), "persist");
    expect(r.character.state.resourcesUsed.rage).toBeUndefined();
    expect(r.character.state.resourcesUsed.persistent_rage).toBe(1);
    expect(runAction(r.character, d(r.character), "persist")).toMatchObject({ ok: false });
    const z = fighter({ rage: 1, zealous: 1 });
    const rz = runAction(z, d(z), "zealous_again");
    expect(rz.character.state.resourcesUsed).toEqual({ rage: 2 });
  });
});

describe("dadi per uso e azioni gratuite", () => {
  it("count = dadi per ogni uso speso; il testo ha i numeri calcolati", () => {
    const c = fighter({}, 1);
    expect(d(c).actions.find((a) => a.id === "two_dice")).toMatchObject({ die: 6, count: 2, text: "CD 11" }); // 8 + competenza 3
    const r = runAction(c, d(c), "two_dice", undefined, () => 0.5);
    expect(r).toMatchObject({ ok: true, rolls: [4, 4], total: 9 });
    expect(r.character.state.hp).toBe(10);
  });
  it("un'azione senza costo vale anche a risorsa esaurita", () => {
    const c = fighter({ dd: 3 });
    expect(runAction(c, d(c), "free")).toMatchObject({ ok: true, total: 25, spent: 0 });
  });
});
