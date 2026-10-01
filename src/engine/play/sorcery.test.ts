import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { testCharacter, testRuleset } from "../compute/testkit";
import type { Character } from "../types";
import { createSlot, longRest, shortRest, slotToPoints, spendPoints, SORCERY_POINTS } from "./index";

// Punti stregoneria: conversione slot ↔ punti, slot creati che spariscono al Riposo Lungo, Metamagia a costo — Lotto 6 di PLAN2
const F = (o: Record<string, unknown>) => ({ description: "", effects: [], choices: [], level: 1, needsReview: false, origin: "private", ...o }) as never;
const rs = (() => {
  const r = testRuleset();
  const s = r.classes.get("sorcerer")!;
  (s as { caster: string }).caster = "full";
  s.spellSlots = Array.from({ length: 20 }, () => [4, 3, 2]);
  s.features.push(F({ id: "font_of_magic", name: { it: "Fonte di magia" }, effects: [
    { op: "resource", resourceId: SORCERY_POINTS, uses: { table: Array.from({ length: 20 }, (_, i) => i + 1) }, recharge: "long_rest" }] }));
  s.choices.push({ id: "sorcerer_metamagic", label: { it: "Metamagia" }, count: 2, distinct: true, options: [
    { id: "careful", name: { it: "Cauto" }, description: "Protegge alcune creature", cost: 1, effects: [] },
    { id: "quickened", name: { it: "Rapido" }, cost: 2, effects: [] },
    { id: "plain", name: { it: "Senza costo" }, effects: [] },
  ] } as never);
  return r;
})();
const sorc = (over: Partial<Character> = {}) => testCharacter({ classes: [{ classId: "sorcerer", level: 5, hpRolls: [] }], ...over });
const d = (c: Character) => computeCharacter(c, rs);

describe("punti stregoneria", () => {
  it("la risorsa è quella di Fonte di magia; spendere scala e non va sotto zero", () => {
    expect(d(sorc()).resources[SORCERY_POINTS]).toMatchObject({ remaining: 5 });
    const r = spendPoints(sorc(), d(sorc()), 2);
    expect(r.ok).toBe(true);
    expect(r.character.state.resourcesUsed[SORCERY_POINTS]).toBe(2);
    expect(spendPoints(sorc(), d(sorc()), 6)).toMatchObject({ ok: false, errors: ["Punti stregoneria insufficienti"] });
  });
  it("punti → slot: costi 2, 3, 5, 6, 7; lo slot si somma al totale e sparisce con il Riposo Lungo, non con il breve", () => {
    const c = sorc();
    const a = createSlot(c, d(c), 2);
    expect(a.ok).toBe(true);
    expect(a.character.state.resourcesUsed[SORCERY_POINTS]).toBe(3);
    expect(d(a.character).spellSlots.slots).toEqual([4, 4, 2]);
    expect(d(a.character).spellSlots.remaining).toEqual([4, 4, 2]);
    expect(createSlot(c, d(c), 3).ok).toBe(true); // 5 punti: bastano
    expect(createSlot(sorc({ state: { ...c.state, resourcesUsed: { [SORCERY_POINTS]: 1 } } }), d(sorc({ state: { ...c.state, resourcesUsed: { [SORCERY_POINTS]: 1 } } })), 3)).toMatchObject({ ok: false });
    expect(createSlot(c, d(c), 6)).toMatchObject({ ok: false, errors: ["Puoi creare slot dal 1° al 5° livello"] });
    expect(d(shortRest(a.character, d(a.character))).spellSlots.slots).toEqual([4, 4, 2]);
    expect(d(longRest(a.character, d(a.character))).spellSlots.slots).toEqual([4, 3, 2]);
  });
  it("slot → punti: recuperi il livello dello slot, mai oltre il massimo; senza slot non si può", () => {
    let c = sorc({ state: { ...testCharacter().state, resourcesUsed: { [SORCERY_POINTS]: 4 } } });
    const r = slotToPoints(c, d(c), 2);
    expect(r.ok).toBe(true);
    expect(r.character.state.slotsUsed[2]).toBe(1);
    expect(r.character.state.resourcesUsed[SORCERY_POINTS]).toBe(2);
    c = sorc({ state: { ...testCharacter().state, resourcesUsed: { [SORCERY_POINTS]: 1 } } });
    expect(slotToPoints(c, d(c), 2).character.state.resourcesUsed[SORCERY_POINTS]).toBeUndefined(); // 1 punto speso, ne tornano 2: cappato a 0
    const none = sorc({ state: { ...testCharacter().state, slotsUsed: { 3: 2 } } });
    expect(slotToPoints(none, d(none), 3)).toMatchObject({ ok: false });
  });
  it("uno slot creato si può riconvertire in punti", () => {
    const c = sorc();
    const made = createSlot(c, d(c), 3).character; // +1 slot di 3° (totale 3, 5 punti spesi)
    expect(d(made).spellSlots.slots[2]).toBe(3);
    const back = slotToPoints(made, d(made), 3);
    expect(back.ok).toBe(true);
    expect(back.character.state.resourcesUsed[SORCERY_POINTS]).toBe(2); // 5 spesi, 3 tornati
  });
});

describe("opzioni scelte con un costo (Metamagia)", () => {
  it("compaiono solo quelle scelte e con un costo", () => {
    expect(d(sorc()).chosenOptions).toEqual([]);
    const c = sorc({ decisions: { sorcerer_metamagic: ["careful", "quickened", "plain"] } });
    expect(d(c).chosenOptions).toEqual([
      { id: "careful", name: "Cauto", description: "Protegge alcune creature", cost: 1, choiceId: "sorcerer_metamagic" },
      { id: "quickened", name: "Rapido", cost: 2, choiceId: "sorcerer_metamagic" },
    ]);
  });
});
