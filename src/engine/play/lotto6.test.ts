import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { testCharacter, testRuleset } from "../compute/testkit";
import { castSpell, spellbook } from "../magic";
import type { Character } from "../types";
import { runAction, setActive } from "./index";

// Funzioni del Lotto 6: bonus agli incantesimi, lanci a volontà, costo alternativo delle attivazioni, azioni senza risorsa, recuperi da formula
const F = (o: Record<string, unknown>) => ({ description: "", effects: [], choices: [], level: 1, needsReview: false, origin: "private", ...o }) as never;
const rs = (() => {
  const r = testRuleset();
  const s = r.classes.get("sorcerer")!;
  (s as { caster: string }).caster = "full";
  s.spellSlots = Array.from({ length: 20 }, () => [4, 3, 2]);
  s.features.push(
    F({ id: "points", name: { it: "Punti" }, effects: [{ op: "resource", resourceId: "points", uses: 6, recharge: "long_rest" }] }),
    F({ id: "innate", name: { it: "Stregoneria innata" }, usage: { uses: 2, recharge: "long_rest" },
      activation: { resource: "innate", cost: 1, alt: { resource: "points", cost: 2, when: "level>=7" }, duration: "1 minuto" },
      effects: [{ op: "spellBonus", dc: 1, advantage: true, when: "active:innate" }] }),
    F({ id: "restoration", name: { it: "Ripristino" }, usage: { uses: 1, recharge: "long_rest" }, effects: [
      { op: "resourceAction", actionId: "restore_points", label: "Recupera punti", resource: "restoration", cost: 1, variable: false, apply: "none",
        restore: { resource: "points", amount: "floor(classLevel:sorcerer / 2)" } },
      { op: "resourceAction", actionId: "free_note", label: "Promemoria", cost: 0, variable: false, apply: "none", bonus: "classLevel:sorcerer * 5", text: "senza risorsa" },
      { op: "grantSpell", spell: "charm", mode: "alwaysPrepared", ability: "cha", freeCast: { uses: 1, recharge: "none", unlimited: true } }] }),
  );
  return r;
})();
const sorc = (level: number, over: Partial<Character> = {}) => testCharacter({ classes: [{ classId: "sorcerer", level, hpRolls: [] }], ...over });
const d = (c: Character) => computeCharacter(c, rs);

describe("bonus agli incantesimi (Stregoneria innata)", () => {
  it("CD e Vantaggio ai tiri per colpire solo da attiva", () => {
    const c = sorc(5);
    expect(d(c).spellcasting[0]).toMatchObject({ attackMode: "normal" });
    const base = d(c).spellcasting[0]!.dc.value;
    const on = setActive(c, rs, d(c), "innate", true);
    expect(on.ok).toBe(true);
    const sc = d(on.character).spellcasting[0]!;
    expect(sc.dc.value).toBe(base + 1);
    expect(sc.attackMode).toBe("advantage");
    expect(sc.attackModeSources).toEqual(["sorcerer: Stregoneria innata"]);
    expect(sc.dc.sources.some((s) => /Stregoneria innata/.test(s.label))).toBe(true);
  });
});

describe("costo alternativo delle attivazioni", () => {
  it("a usi finiti si paga con la risorsa alternativa solo se vale la sua condizione (livello 7)", () => {
    const used = { innate: 2 };
    const low = sorc(5, { state: { ...testCharacter().state, resourcesUsed: used } });
    expect(setActive(low, rs, d(low), "innate", true)).toMatchObject({ ok: false, errors: ["Nessun uso rimasto"] });
    const hi = sorc(7, { state: { ...testCharacter().state, resourcesUsed: used } });
    const r = setActive(hi, rs, d(hi), "innate", true);
    expect(r.ok, r.errors.join()).toBe(true);
    expect(r.character.state.resourcesUsed).toEqual({ innate: 2, points: 2 });
    const poor = sorc(7, { state: { ...testCharacter().state, resourcesUsed: { innate: 2, points: 5 } } });
    expect(setActive(poor, rs, d(poor), "innate", true).ok).toBe(false);
  });
});

describe("azioni senza risorsa e recuperi da formula", () => {
  it("un'azione senza risorsa mostra il suo numero e non spende nulla", () => {
    const c = sorc(6);
    expect(d(c).actions.find((a) => a.id === "free_note")).toMatchObject({ cost: 0, bonus: 30, remaining: 0 });
    const r = runAction(c, d(c), "free_note");
    expect(r).toMatchObject({ ok: true, total: 30, spent: 0 });
    expect(r.character.state.resourcesUsed).toEqual({});
  });
  it("il recupero ha l'ammontare calcolato dalla formula (metà livello) e non supera i punti spesi", () => {
    const c = sorc(6, { state: { ...testCharacter().state, resourcesUsed: { points: 5 } } });
    expect(d(c).actions.find((a) => a.id === "restore_points")!.restore).toEqual({ resource: "points", amount: 3 });
    const r = runAction(c, d(c), "restore_points");
    expect(r.character.state.resourcesUsed).toEqual({ restoration: 1, points: 2 });
  });
});

describe("lanci a volontà", () => {
  it("un incantesimo con freeCast illimitato si lancia senza consumare nulla, anche più volte", () => {
    const c = sorc(5);
    const e = spellbook(c, rs, d(c)).find((x) => x.id === "charm")!;
    expect(e.sources.find((s) => s.free)!.free).toMatchObject({ unlimited: true });
    const r1 = castSpell(c, rs, d(c), "charm", { kind: "free", resourceId: "spell:charm" });
    expect(r1.ok, r1.errors.join()).toBe(true);
    expect(r1.notes.join()).toMatch(/volontà/);
    const r2 = castSpell(r1.character, rs, d(r1.character), "charm", { kind: "free", resourceId: "spell:charm" });
    expect(r2.ok).toBe(true);
    expect(r2.character.state.resourcesUsed).toEqual({});
    expect(r2.character.state.slotsUsed).toEqual({});
  });
});

describe("condizione della scelta (when): vale anche per gli effetti delle opzioni scelte", () => {
  it("Arcanum mistico: l'incantesimo di 7° vale solo dal 13° livello", () => {
    const r = testRuleset();
    const w = r.classes.get("wizard")!;
    (w as { caster: string }).caster = "full";
    w.features.push(F({ id: "arc", name: { it: "Arcanum" }, choices: [{ id: "arc_7", label: { it: "7°" }, count: 1, distinct: true, source: "freespells", when: "classLevel:wizard>=13", filter: { level: 3 } }] }));
    const c = (level: number) => testCharacter({ classes: [{ classId: "wizard", level, hpRolls: [] }], decisions: { arc_7: ["bolt"] } });
    expect(computeCharacter(c(12), r).grantedSpells.map((g) => g.spell)).not.toContain("bolt");
    expect(computeCharacter(c(13), r).grantedSpells.map((g) => g.spell)).toContain("bolt");
  });
});
