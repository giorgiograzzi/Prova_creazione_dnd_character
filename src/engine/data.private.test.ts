import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildRuleset } from "./ruleset";
import { checkReferences } from "./validate";
import { computeCharacter } from "./compute";
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
