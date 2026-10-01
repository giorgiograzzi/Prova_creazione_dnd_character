import { describe, expect, it } from "vitest";
import { computeCharacter } from ".";
import { setActive } from "../play";
import { characterSchema } from "../schema";
import type { Character } from "../types";
import { testCharacter, testRuleset } from "./testkit";

// Vantaggio da effetti (attacchi, prove, Iniziativa), immunità alle condizioni e promemoria: Lotto 1 di PLAN2 (M3, M5, note)
const F = (o: Record<string, unknown>) => ({ description: "", effects: [], choices: [], level: 1, needsReview: false, origin: "private", ...o }) as never;
function rulesetM3() {
  const rs = testRuleset();
  rs.classes.get("barbarian")!.features.push(
    F({ id: "rage", name: { it: "Ira" }, usage: { uses: 3, recharge: "long_rest" }, activation: { resource: "rage" }, effects: [
      { op: "checkAdvantage", mode: "advantage", abilities: ["str"], when: "active:rage" },
      { op: "conditionImmunity", conditions: ["frightened", "poisoned"], when: "active:rage && hasFeature:mindless" },
    ] }),
    // attivabile senza risorsa: dura fino al prossimo turno
    F({ id: "reckless_attack", name: { it: "Attacco irruento" }, level: 2, activation: { duration: "fino all'inizio del prossimo turno" }, effects: [
      { op: "attackAdvantage", mode: "advantage", attackType: "melee", when: "active:reckless_attack && attackAbility:str" },
      { op: "note", text: "Gli attacchi contro di te hanno Vantaggio", when: "active:reckless_attack" },
    ] }),
    F({ id: "feral_instinct", name: { it: "Istinto ferino" }, level: 7, effects: [{ op: "initiativeAdvantage", mode: "advantage" }] }),
    F({ id: "mindless", name: { it: "Ira senza mente" }, level: 6 }),
  );
  return rs;
}
const rs = rulesetM3();
const barb = (level = 7, over: Partial<Character> = {}) => testCharacter({
  classes: [{ classId: "barbarian", level, hpRolls: [] }],
  inventory: [{ itemId: "longsword", qty: 1, state: "wielded" }, { itemId: "shortbow", qty: 1, state: "stowed" }], ...over,
});
const on = (c: Character, id: string) => setActive(c, rs, computeCharacter(c, rs), id, true).character;
const melee = (c: Character) => computeCharacter(c, rs).attacks.find((a) => a.kind === "melee" && a.id !== "unarmed")!;

describe("Attacco irruento (attivabile senza risorsa)", () => {
  it("si attiva senza consumare nulla e dà Vantaggio solo agli attacchi in mischia con la Forza", () => {
    const off = barb();
    expect(melee(off).mode).toBe("normal");
    const c = on(off, "reckless_attack");
    expect(c.state.active).toEqual({ reckless_attack: [] });
    expect(c.state.resourcesUsed).toEqual({});
    expect(melee(c)).toMatchObject({ mode: "advantage", modeSources: ["barbarian: Attacco irruento"] });
  });
  it("non vale per l'arco (Destrezza) e il promemoria compare solo da attivo", () => {
    const c = on(barb(7, { inventory: [{ itemId: "shortbow", qty: 1, state: "wielded" }] }), "reckless_attack");
    expect(computeCharacter(c, rs).attacks.find((a) => a.kind === "ranged")!.mode).toBe("normal");
    expect(computeCharacter(barb(), rs).notes.join()).not.toMatch(/Vantaggio/);
    expect(computeCharacter(on(barb(), "reckless_attack"), rs).notes.join()).toMatch(/attacchi contro di te hanno Vantaggio/);
  });
  it("Vantaggio e Svantaggio si annullano (Prono)", () => {
    const c = on(barb(7, { state: { ...testCharacter().state, conditions: ["restrained"] } }), "reckless_attack");
    expect(melee(c)).toMatchObject({ mode: "normal" }); // Trattenuto dà Svantaggio ai tuoi attacchi
  });
});

describe("Istinto ferino e Ira: Vantaggio a Iniziativa e prove", () => {
  it("Iniziativa con Vantaggio dal 7° livello, non prima", () => {
    expect(computeCharacter(barb(7), rs).conditions.initiativeMode.mode).toBe("advantage");
    expect(computeCharacter(barb(6), rs).conditions.initiativeMode.mode).toBe("normal");
  });
  it("Svantaggio all'Iniziativa (Incapacitato) e Vantaggio si annullano", () => {
    const c = barb(7, { state: { ...testCharacter().state, conditions: ["incapacitated"] } });
    expect(computeCharacter(c, rs).conditions.initiativeMode.mode).toBe("normal");
  });
  it("Ira: Vantaggio alle prove di Forza (Atletica) solo da attiva", () => {
    expect(computeCharacter(barb(), rs).skills.athletics.mode).toBe("normal");
    const d = computeCharacter(on(barb(), "rage"), rs);
    expect(d.skills.athletics.mode).toBe("advantage");
    expect(d.skills.acrobatics.mode).toBe("normal"); // Destrezza
  });
});

describe("immunità alle condizioni dei privilegi", () => {
  const state = (conditions: string[]) => ({ ...testCharacter().state, conditions });
  it("Spaventato e Avvelenato non si applicano con l'Ira senza mente e tornano a Ira finita", () => {
    const base = barb(7, { state: state(["frightened", "poisoned"]) });
    expect(computeCharacter(base, rs).conditions.active).toEqual(expect.arrayContaining(["frightened", "poisoned"]));
    const raging = computeCharacter(on(base, "rage"), rs);
    expect(raging.conditions.active).toEqual([]);
    expect(raging.conditions.immune).toEqual(expect.arrayContaining(["frightened", "poisoned"]));
    expect(raging.attacks.find((a) => a.id === "longsword")!.mode).toBe("normal"); // niente Svantaggio da Avvelenato
    expect(computeCharacter(base, rs).attacks.find((a) => a.id === "longsword")!.mode).toBe("disadvantage");
  });
  it("lo stato resta valido per il formato di salvataggio", () => {
    expect(characterSchema.safeParse(on(barb(), "reckless_attack")).success).toBe(true);
  });
});

describe("minimo del tiro e metà competenza (M12)", () => {
  const rsM = (() => {
    const r = testRuleset();
    r.classes.get("fighter")!.features.push(
      F({ id: "remarkable_athlete", name: { it: "Atleta straordinario" }, effects: [{ op: "halfProficiency", abilities: ["str", "dex", "con"] }] }),
      F({ id: "reliable_talent", name: { it: "Talento affidabile" }, effects: [{ op: "rollFloor", min: 10, on: "die", proficientOnly: true, saves: false, rawChecks: false }] }),
      F({ id: "indomitable_might", name: { it: "Possanza indomita" }, effects: [{ op: "rollFloor", min: "score:str", on: "total", abilities: ["str"], proficientOnly: false, saves: true, rawChecks: true }] }),
    );
    return r;
  })();
  const fighter = (over: Partial<Character> = {}) => testCharacter({ classes: [{ classId: "fighter", level: 5, hpRolls: [] }], ...over });
  it("Atleta straordinario: metà competenza (per difetto) alle prove di For/Des/Cos non competenti, non a Int", () => {
    const d = computeCharacter(fighter(), rsM);
    expect(d.skills.acrobatics.proficiency).toBe("half"); // Des
    expect(d.skills.acrobatics.bonus.value).toBe(2 + 1); // mod Des +2, metà di +3 = 1
    expect(d.skills.arcana.proficiency).toBe("none"); // Int
    expect(d.skills.athletics.proficiency).toBe("proficient"); // già competente: nessun cambio
  });
  it("Talento affidabile: minimo 10 sul dado, solo nelle abilità competenti", () => {
    const d = computeCharacter(fighter(), rsM);
    expect(d.skills.acrobatics.floor).toBeUndefined();
    expect(d.checks.str.floor).toMatchObject([{ min: 15, on: "total" }]); // Possanza indomita sulle prove pure di For
    expect(d.saves.str.floor).toMatchObject([{ min: 15, on: "total" }]);
    expect(d.saves.dex.floor).toBeUndefined();
    // Atletica: Talento affidabile (sul dado) e Possanza indomita (sul totale) valgono insieme
    expect(d.skills.athletics.floor).toMatchObject([{ min: 10, on: "die" }, { min: 15, on: "total" }]);
  });
});

import { rollD20 } from "../play";
describe("tiro con minimo", () => {
  const seq = (...n: number[]) => { let i = 0; return () => (n[i++]! - 1) / 20 + 0.001; };
  it("sul dado: un 4 conta come 10; sul totale: non si scende sotto il minimo", () => {
    expect(rollD20(3, "normal", seq(4), [{ min: 10, on: "die", label: "Talento affidabile" }])).toMatchObject({ natural: 4, kept: 10, total: 13, raised: "Talento affidabile" });
    expect(rollD20(3, "normal", seq(15), [{ min: 10, on: "die", label: "x" }])).toMatchObject({ kept: 15, total: 18 });
    expect(rollD20(1, "normal", seq(5), [{ min: 15, on: "total", label: "Possanza indomita" }])).toMatchObject({ total: 15, raised: "Possanza indomita" });
    expect(rollD20(1, "normal", seq(5), [{ min: 10, on: "die", label: "a" }, { min: 15, on: "total", label: "b" }])).toMatchObject({ total: 15, raised: "a, b" });
  });
  it("il 20 naturale resta un critico anche con il minimo", () => {
    expect(rollD20(0, "normal", seq(20), [{ min: 10, on: "die", label: "a" }]).crit).toBe(true);
  });
});
