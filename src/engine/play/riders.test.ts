import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { testCharacter, testRuleset } from "../compute/testkit";
import { characterSchema } from "../schema";
import type { Character } from "../types";
import { applyExtra, clearOnce, longRest, newTurn, rollExpr, setActive } from "./index";

// Extra d'attacco (M1) e promemoria "1 volta per turno" (M2): Lotto 1 di PLAN2
const F = (o: Record<string, unknown>) => ({ description: "", effects: [], choices: [], level: 1, needsReview: false, origin: "private", ...o }) as never;
const rs = (() => {
  const r = testRuleset();
  r.classes.get("barbarian")!.features.push(
    F({ id: "rage", name: { it: "Ira" }, usage: { uses: 3, recharge: "long_rest" }, activation: { resource: "rage" } }),
    F({ id: "reckless_attack", name: { it: "Attacco irruento" }, level: 2, activation: {} }),
    // Colpo brutale: 1d10 una volta per turno, con Attacco irruento e Forza
    F({ id: "brutal_strike", name: { it: "Colpo brutale" }, level: 9, effects: [
      { op: "attackRider", riderId: "brutal_strike", label: "Colpo brutale", count: 1, die: 10, limit: "turn", attackType: "any", auto: false, when: "active:reckless_attack && attackAbility:str" }] }),
    // Furia del Berserker: dadi = danno ira, una volta per Ira
    F({ id: "frenzy", name: { it: "Frenesia" }, level: 3, effects: [
      { op: "attackRider", riderId: "frenzy", label: "Frenesia", count: 2, die: 6, limit: "rage", attackType: "any", auto: false, when: "active:rage && active:reckless_attack && attackAbility:str" }] }),
    // costo in risorsa
    F({ id: "smite", name: { it: "Colpo costoso" }, effects: [
      { op: "resource", resourceId: "ki", uses: 2, recharge: "short_rest" },
      { op: "attackRider", riderId: "smite", label: "Colpo costoso", count: 1, die: 8, bonus: "mod:str", damageType: "radiant", limit: "none", cost: "ki", attackType: "melee", auto: false }] }),
    // senza dadi, costo di 3 usi, testo con numeri calcolati, solo a mani nude
    F({ id: "palm", name: { it: "Palmo" }, effects: [
      { op: "resource", resourceId: "focus", uses: 5, recharge: "short_rest" },
      { op: "attackRider", riderId: "palm", label: "Palmo", count: 0, limit: "none", cost: "focus", costAmount: 3, attackType: "any", auto: false, when: "unarmed", values: ["8 + mod:str + pb", "classLevel:barbarian"], text: "CD {0}, livello {1}" }] }),
    // minimo dei dadi di danno e riconoscimento del tipo di danno dell'arma
    F({ id: "floor", name: { it: "Minimo" }, effects: [
      { op: "damageDieFloor", min: 3, attackType: "melee", when: "attackType:melee && twoHanded" },
      { op: "attackRider", riderId: "slash", label: "Taglio", count: 0, limit: "turn", attackType: "any", auto: false, when: "damageType:slashing" },
      { op: "attackRider", riderId: "bludgeon", label: "Botta", count: 0, limit: "turn", attackType: "any", auto: false, when: "damageType:bludgeoning" }] }),
    // sempre attivo
    F({ id: "radiant_strikes", name: { it: "Colpi radianti" }, effects: [
      { op: "attackRider", riderId: "radiant_strikes", label: "Colpi radianti", count: 1, die: 8, limit: "none", attackType: "melee", auto: true, when: "attackAbility:str" }] }),
  );
  return r;
})();
const barb = (_feats: string[], level = 9): Character => testCharacter({
  classes: [{ classId: "barbarian", level, hpRolls: [] }], inventory: [{ itemId: "longsword", qty: 1, state: "wielded" }],
});
const d = (c: Character) => computeCharacter(c, rs);
const sword = (c: Character) => d(c).attacks.find((a) => a.id === "longsword")!;
const on = (c: Character, id: string) => setActive(c, rs, d(c), id, true).character;

describe("extra d'attacco applicabili", () => {
  it("compaiono sull'attacco solo con lo stato giusto (Attacco irruento + Forza)", () => {
    expect(sword(barb([])).extras.map((x) => x.id)).not.toContain("brutal_strike");
    const c = on(barb([]), "reckless_attack");
    expect(sword(c).extras.map((x) => x.id)).toEqual(expect.arrayContaining(["brutal_strike", "smite"]));
    expect(sword(c).extras.find((x) => x.id === "brutal_strike")).toMatchObject({ dice: "1d10", bonus: 0, limit: "turn", used: false });
  });
  it("i dadi si calcolano da numero o formula, con bonus e tipo di danno", () => {
    const x = sword(barb([])).extras.find((e) => e.id === "smite")!;
    expect(x).toMatchObject({ dice: "1d8", bonus: 2, type: "radiant", cost: "ki" });
  });
  it("l'extra sempre attivo si somma ai dadi del danno", () => {
    expect(sword(barb([])).damage.dice).toBe("1d8+1d8"); // spada lunga a una mano + Colpi radianti
  });
  it("la Frenesia ha due dadi (qui il numero è scritto nei dati) e vale solo con Ira e Attacco irruento", () => {
    expect(sword(on(barb([]), "reckless_attack")).extras.map((e) => e.id)).not.toContain("frenzy");
    const c = on(on(barb([]), "reckless_attack"), "rage");
    expect(sword(c).extras.find((e) => e.id === "frenzy")).toMatchObject({ dice: "2d6", limit: "rage" });
  });
});

describe("limiti: una volta per turno e per Ira", () => {
  it("applicare segna l'uso; si riapplica solo dopo «Nuovo turno»", () => {
    const c0 = on(barb([]), "reckless_attack");
    const x = sword(c0).extras.find((e) => e.id === "brutal_strike")!;
    const r = applyExtra(c0, d(c0), x);
    expect(r.ok).toBe(true);
    expect(r.character.state.once).toEqual({ brutal_strike: "turn" });
    expect(sword(r.character).extras.find((e) => e.id === "brutal_strike")!.used).toBe(true);
    expect(applyExtra(r.character, d(r.character), { ...x, used: true })).toMatchObject({ ok: false, errors: ["Già usato in questo turno"] });
    const next = newTurn(r.character);
    expect(next.state.once).toEqual({});
    expect(sword(next).extras.find((e) => e.id === "brutal_strike")!.used).toBe(false);
  });
  it("1 per Ira: «Nuovo turno» non lo azzera, un'altra Ira sì", () => {
    let c = on(on(barb([]), "reckless_attack"), "rage");
    const x = sword(c).extras.find((e) => e.id === "frenzy")!;
    c = applyExtra(c, d(c), x).character;
    expect(c.state.once).toEqual({ frenzy: "rage" });
    expect(newTurn(c).state.once).toEqual({ frenzy: "rage" });
    c = setActive(c, rs, d(c), "rage", false).character; // finita l'Ira, il limite cade
    expect(c.state.once).toEqual({});
    expect(clearOnce(c, "rage")).toBe(c);
  });
  it("un riposo azzera tutto e il formato di salvataggio resta valido", () => {
    let c = on(barb([]), "reckless_attack");
    c = applyExtra(c, d(c), sword(c).extras.find((e) => e.id === "brutal_strike")!).character;
    expect(characterSchema.safeParse(c).success).toBe(true);
    expect(longRest(c, d(c)).state.once).toBeUndefined();
  });
});

describe("costo in risorsa", () => {
  it("spende un uso, e senza usi non si applica", () => {
    let c = barb([]);
    const x = sword(c).extras.find((e) => e.id === "smite")!;
    c = applyExtra(c, d(c), x).character;
    c = applyExtra(c, d(c), x).character;
    expect(c.state.resourcesUsed.ki).toBe(2);
    expect(applyExtra(c, d(c), x)).toMatchObject({ ok: false, errors: ["Nessun uso rimasto"] });
  });
});

describe("extra senza dadi, costo multiplo, testo con numeri, colpo senz'armi", () => {
  it("il testo ha i numeri calcolati e l'extra senza dadi ha solo costo e limite", () => {
    const c = barb([]);
    const unarmed = d(c).attacks.find((a) => a.id === "unarmed")!;
    const x = unarmed.extras.find((e) => e.id === "palm")!;
    expect(x).toMatchObject({ dice: "", bonus: 0, cost: "focus", costAmount: 3, text: "CD 14, livello 9" }); // 8 + For 2 + competenza 4
    expect(sword(c).extras.find((e) => e.id === "palm")).toBeUndefined(); // `unarmed`: solo senz'armi
  });
  it("spende 3 usi alla volta e si ferma quando non bastano", () => {
    let c = barb([]);
    const x = d(c).attacks.find((a) => a.id === "unarmed")!.extras.find((e) => e.id === "palm")!;
    c = applyExtra(c, d(c), x).character;
    expect(c.state.resourcesUsed.focus).toBe(3);
    expect(applyExtra(c, d(c), x)).toMatchObject({ ok: false, errors: ["Nessun uso rimasto"] });
  });
});

describe("minimo dei dadi di danno e tipo di danno dell'arma", () => {
  it("il minimo vale solo a due mani e in mischia; il tipo di danno guida gli extra (a mani nude: contundente)", () => {
    const one = barb([]);
    expect(sword(one).dieFloor).toBeUndefined();
    const two = testCharacter({ classes: [{ classId: "barbarian", level: 9, hpRolls: [] }], inventory: [{ itemId: "longsword", qty: 1, state: "wielded", grip: "two" }] });
    expect(d(two).attacks.find((a) => a.id === "longsword")!.dieFloor).toBe(3);
    expect(sword(one).extras.map((e) => e.id)).toContain("slash");
    expect(sword(one).extras.map((e) => e.id)).not.toContain("bludgeon");
    const unarmed = d(one).attacks.find((a) => a.id === "unarmed")!;
    expect(unarmed.extras.map((e) => e.id)).toContain("bludgeon");
    expect(unarmed.extras.map((e) => e.id)).not.toContain("slash");
  });
  it("rollExpr con minimo: ogni dado sotto il minimo conta come il minimo", () => {
    expect(rollExpr("2d6+1", () => 0, { floor: 3 })).toMatchObject({ rolls: [3, 3], total: 7 });
    expect(rollExpr("2d6", () => 0.99, { floor: 3 })!.rolls).toEqual([6, 6]);
    expect(rollExpr("1d8", () => 0)!.rolls).toEqual([1]); // senza minimo niente cambia
  });
});
