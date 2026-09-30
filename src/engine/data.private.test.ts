import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildRuleset } from "./ruleset";
import { checkReferences } from "./validate";
import { buildCtx, computeCharacter } from "./compute";
import { testCharacter } from "./compute/testkit";

// Questi test girano solo dove esiste data/private (non tracciata): altrove vengono saltati.
const DIR = "data/private";
const has = existsSync(`${DIR}/weapons.json`);

describe.skipIf(!has)("dati privati (step 4)", () => {
  const rs = buildRuleset(readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))));

  it("validi e con riferimenti coerenti", () => {
    expect(rs.errors).toEqual([]);
    expect(checkReferences(rs)).toEqual([]);
  });
  it("quantità attese", () => {
    const n = (m: Map<unknown, unknown>) => m.size;
    expect([n(rs.skills), n(rs.languages), n(rs.sizes), n(rs.damageTypes), n(rs.conditions), n(rs.coins)]).toEqual([18, 19, 6, 13, 15, 5]);
    expect([n(rs.weapons), n(rs.armors), n(rs.tools), n(rs.weaponProperties), n(rs.masteries)]).toEqual([38, 13, 37, 10, 8]);
    expect([...rs.weapons.values()].filter((w) => w.category === "simple")).toHaveLength(14);
  });
  it("talenti e background (step 5)", () => {
    const cat = (c: string) => [...rs.feats.values()].filter((f) => f.category === c).length;
    expect([cat("origin"), cat("general"), cat("fighting_style"), cat("epic_boon"), rs.backgrounds.size]).toEqual([10, 43, 10, 12, 16]);
    // ogni background porta un talento di Origine
    for (const b of rs.backgrounds.values()) expect(rs.feats.get(b.feat)?.category).toBe("origin");
    // i talenti generali hanno tutti il prerequisito di livello 4, i Doni epici il 19
    for (const f of rs.feats.values()) {
      if (f.category === "general") expect(f.prerequisites).toContain("level>=4");
      if (f.category === "epic_boon") expect(f.prerequisites).toContain("level>=19");
    }
  });
  it("Soldato con Attaccante selvaggio, Allerta e Robusto usano i dati veri", () => {
    const full = buildRuleset([
      ...readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))),
      { kind: "classes", entries: [{
        id: "fighter", name: { it: "Guerriero" }, hitDie: 10, primaryAbility: ["str"], saves: ["str", "con"],
        skillChoices: { count: 2, from: "any" }, armorTraining: [], weaponProficiency: [], equipment: {}, features: [],
      }] },
    ]);
    const ch = testCharacter({ backgroundId: "soldier", feats: [{ featId: "alert" }, { featId: "tough" }] });
    const d = computeCharacter(ch, full);
    expect(d.feats).toEqual(["alert", "savage_attacker", "tough"]);
    expect(d.skills.athletics.proficiency).toBe("proficient");
    expect(d.initiative.value).toBe(2 + 2); // Des +2, Allerta = competenza +2
    expect(d.hp.max.value).toBe(10 + 1 + 2); // d10 + Cos 13 (+1) + Robusto (+2 per livello)
  });
  describe("specie (step 6)", () => {
    const fullRs = buildRuleset([
      ...readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))),
      { kind: "classes", entries: [{
        id: "fighter", name: { it: "Guerriero" }, hitDie: 10, primaryAbility: ["str"], saves: ["str", "con"],
        skillChoices: { count: 2, from: "any" }, armorTraining: [], weaponProficiency: [], equipment: {}, features: [],
      }] },
    ]);
    const mk = (speciesId: string, level = 1, decisions: Record<string, string[]> = {}) =>
      testCharacter({ speciesId, decisions, classes: [{ classId: "fighter", level, hpRolls: [] }] });
    const spells = (ch: ReturnType<typeof mk>) =>
      buildCtx(ch, fullRs).active.flatMap(({ effect: e }) => (e.op === "grantSpell" ? [e.spell] : []));

    it("10 specie, ognuna con velocità e taglie", () => {
      expect(fullRs.species.size).toBe(10);
      for (const sp of fullRs.species.values()) expect(sp.sizes.length).toBeGreaterThan(0);
      expect([...fullRs.species.values()].filter((s) => s.sizes.length > 1).map((s) => s.id).sort()).toEqual(["aasimar", "human", "tiefling"]);
    });
    it("Nano: scurovisione 120, resistenza al veleno, +1 PF per livello (retroattivo)", () => {
      const d1 = computeCharacter(mk("dwarf", 1), fullRs), d5 = computeCharacter(mk("dwarf", 5), fullRs);
      expect(d1.senses.darkvision?.value).toBe(120);
      expect(d1.resistances).toEqual(["poison"]);
      const base5 = computeCharacter(mk("human", 5), fullRs).hp.max.value;
      expect(d5.hp.max.value - base5).toBe(5);
    });
    it("Goliath 35 ft; Elfo dei boschi 35 ft solo con quel lignaggio", () => {
      expect(computeCharacter(mk("goliath"), fullRs).speed.walk.value).toBe(35);
      expect(computeCharacter(mk("elf"), fullRs).speed.walk.value).toBe(30);
      expect(computeCharacter(mk("elf", 1, { elven_lineage: ["wood_elf"] }), fullRs).speed.walk.value).toBe(35);
    });
    it("Elfo Drow: scurovisione 120 e incantesimi sbloccati al 3° e 5° livello TOTALE", () => {
      const at = (l: number) => spells(mk("elf", l, { elven_lineage: ["drow"] }));
      expect(computeCharacter(mk("elf", 1, { elven_lineage: ["drow"] }), fullRs).senses.darkvision?.value).toBe(120);
      expect(at(1)).toEqual(["dancing_lights"]);
      expect(at(3)).toEqual(["dancing_lights", "faerie_fire"]);
      expect(at(5)).toEqual(["dancing_lights", "faerie_fire", "darkness"]);
    });
    it("Elfo: Sensi acuti dà la competenza scelta", () => {
      const d = computeCharacter(mk("elf", 1, { keen_senses: ["survival"] }), fullRs);
      expect(d.skills.survival.proficiency).toBe("proficient");
      expect(d.skills.insight.proficiency).toBe("none");
    });
    it("Dragonide: resistenza del colore scelto; usi del soffio = competenza", () => {
      const d = computeCharacter(mk("dragonborn", 1, { draconic_ancestry: ["gold"] }), fullRs);
      expect(d.resistances).toEqual(["fire"]);
      expect(d.resources.breath_weapon?.max.value).toBe(2);
      expect(computeCharacter(mk("dragonborn", 5, { draconic_ancestry: ["gold"] }), fullRs).resources.breath_weapon?.max.value).toBe(3);
    });
    it("tratti di livello 3 e 5 si attivano dal livello totale (Aasimar, Dragonide)", () => {
      const has = (sp: string, l: number, r: string) => computeCharacter(mk(sp, l), fullRs).resources[r] !== undefined;
      expect([has("aasimar", 2, "celestial_revelation"), has("aasimar", 3, "celestial_revelation")]).toEqual([false, true]);
      expect([has("dragonborn", 4, "draconic_flight"), has("dragonborn", 5, "draconic_flight")]).toEqual([false, true]);
    });
    it("Tiefling infernale: resistenza al fuoco; Gnomo: vantaggio ai TS Int/Sag/Car", () => {
      expect(computeCharacter(mk("tiefling", 1, { fiendish_legacy: ["infernal"] }), fullRs).resistances).toEqual(["fire"]);
      const g = computeCharacter(mk("gnome"), fullRs);
      expect([g.saves.int.mode, g.saves.wis.mode, g.saves.cha.mode, g.saves.str.mode]).toEqual(["advantage", "advantage", "advantage", "normal"]);
    });
    it("Umano: Abile e Versatile concedono abilità e talento", () => {
      const d = computeCharacter(mk("human", 1, { skillful: ["arcana"], versatile: ["skilled"] }), fullRs);
      expect(d.skills.arcana.proficiency).toBe("proficient");
      expect(d.feats).toContain("skilled");
    });
  });

  it("il motore usa i dati veri: Cotta di maglia + Scudo = CA 18", () => {
    const ch = testCharacter({
      classes: [{ classId: "fighter", level: 1, hpRolls: [] }],
      inventory: [{ itemId: "chain_mail", qty: 1, state: "worn" }, { itemId: "shield", qty: 1, state: "worn" }],
    });
    const fighter = buildRuleset([{ kind: "classes", entries: [{
      id: "fighter", name: { it: "Guerriero" }, hitDie: 10, primaryAbility: ["str"], saves: ["str", "con"],
      skillChoices: { count: 2, from: "any" }, armorTraining: ["light", "medium", "heavy", "shield"], weaponProficiency: [], equipment: {}, features: [],
    }] }]);
    fighter.armors = rs.armors;
    expect(computeCharacter(ch, fighter).ac.value).toBe(18);
  });
});
