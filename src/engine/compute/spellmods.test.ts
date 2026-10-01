import { describe, expect, it } from "vitest";
import { computeCharacter } from ".";
import { castSpell, spellModNotes } from "../magic";
import { runAction } from "../play";
import type { Character } from "../types";
import { testCharacter, testRuleset } from "./testkit";

// Modificatori degli incantesimi, CA di Forme del circolo e dadi da formula: Lotto 5 di PLAN2
const F = (o: Record<string, unknown>) => ({ description: "", effects: [], choices: [], level: 1, needsReview: false, origin: "private", ...o }) as never;
const rs = (() => {
  const r = testRuleset();
  const w = r.classes.get("wizard")!;
  (w as { caster: string }).caster = "full";
  w.spellSlots = Array.from({ length: 20 }, () => [4, 3, 2]);
  w.choices.push(
    { id: "wizard_cantrips", label: { it: "Trucchetti" }, count: 1, source: "cantrips:wizard", distinct: true } as never,
    { id: "wizard_prepared", label: { it: "Preparati" }, count: 2, source: "spells:wizard", distinct: true } as never);
  w.features.push(
    F({ id: "potent", name: { it: "Incantesimi potenti" }, effects: [
      { op: "spellModifier", label: "Incantesimi potenti", text: "aggiungi +{0} ai danni", values: ["max(1, mod:int)"], cantrip: true }] }),
    F({ id: "disciple", name: { it: "Discepolo" }, effects: [
      { op: "spellModifier", label: "Discepolo", text: "cura +{L+2} PF", cantrip: false, spells: ["ward"] },
      { op: "spellModifier", label: "Alto livello", text: "solo dallo slot 3°", cantrip: false, spells: ["ward"], minLevel: 3 }] }),
    F({ id: "dice", name: { it: "Dadi" }, effects: [
      { op: "resource", resourceId: "forma", uses: 3, recharge: "short_rest" },
      { op: "resourceAction", actionId: "ira", label: "Ira del mare", resource: "forma", cost: 0, variable: false, die: 6, count: "max(1, mod:int)", apply: "none" }] }),
    F({ id: "forms", name: { it: "Forme" }, effects: [
      { op: "acFormula", formula: "13 + mod:int", shieldAllowed: true, ignoresArmor: true, when: "active:wild" }] }),
    F({ id: "wild", name: { it: "Forma" }, activation: {}, effects: [] }),
  );
  return r;
})();
const wiz = (over: Partial<Character> = {}) => testCharacter({
  classes: [{ classId: "wizard", level: 5, hpRolls: [] }], baseScores: { str: 8, dex: 14, con: 13, int: 16, wis: 10, cha: 10 }, decisions: { wizard_cantrips: ["spark"], wizard_prepared: ["charm", "ward"] }, ...over,
});
const d = (c: Character) => computeCharacter(c, rs);

describe("modificatori degli incantesimi", () => {
  it("il testo ha i numeri calcolati; il livello dello slot si mette al lancio", () => {
    expect(d(wiz()).spellMods[0]).toMatchObject({ label: "Incantesimi potenti", text: "aggiungi +3 ai danni", cantrip: true });
    const mods = d(wiz()).spellMods;
    expect(spellModNotes(mods, { id: "spark", level: 0 }, 0)).toEqual(["Incantesimi potenti: aggiungi +3 ai danni"]);
    expect(spellModNotes(mods, { id: "ward", level: 1 }, 2)).toEqual(["Discepolo: cura +4 PF"]);
    expect(spellModNotes(mods, { id: "ward", level: 1 }, 3)).toEqual(["Discepolo: cura +5 PF", "Alto livello: solo dallo slot 3°"]);
    expect(spellModNotes(mods, { id: "charm", level: 1 }, 1)).toEqual([]);
  });
  it("compaiono tra le note del lancio con il livello giusto", () => {
    const c = wiz();
    const r = castSpell(c, rs, d(c), "ward", { kind: "slot", level: 2 });
    expect(r.ok, r.errors.join()).toBe(true);
    expect(r.notes).toContain("Discepolo: cura +4 PF");
    const t = castSpell(c, rs, d(c), "spark", { kind: "cantrip" });
    expect(t.notes).toContain("Incantesimi potenti: aggiungi +3 ai danni");
  });
});

describe("dadi da formula nelle azioni", () => {
  it("count può essere una formula: tira tanti dadi quanto il modificatore", () => {
    const c = wiz();
    expect(d(c).actions.find((a) => a.id === "ira")).toMatchObject({ die: 6, count: 3 });
    expect(runAction(c, d(c), "ira", undefined, () => 0.5)).toMatchObject({ ok: true, rolls: [4, 4, 4], total: 12 });
  });
});

describe("CA che ignora l'armatura (Forme del circolo)", () => {
  it("con lo stato attivo vale la formula anche con armatura addosso; senza stato, l'armatura", () => {
    const armored = wiz({ inventory: [{ itemId: "chain_mail", qty: 1, state: "worn" }] });
    expect(d(armored).ac.value).toBe(16);
    const on = { ...armored, state: { ...armored.state, active: { wild: [] } } };
    expect(d(on).ac.value).toBe(16); // 13 + 3 = 16 (pari: la formula è sola, senza il 16 dell'armatura)
    expect(d(on).ac.formula).toMatch(/Forme/);
    const better = { ...on, baseScores: { ...on.baseScores, int: 20 } };
    expect(d(better).ac.value).toBe(18); // 13 + 5
    expect(d(wiz()).ac.value).toBe(12); // senza armatura: 10 + Des 2
  });
});
