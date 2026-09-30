import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeCharacter } from "../engine/compute";
import { classOptions, creationProgress } from "../engine/creation";
import { buildRuleset } from "../engine/ruleset";
import { emptyCharacter } from "../engine/character";
import { autoComplete, finalizeCharacter, isFinalized, reopenCreation } from "./logic";
import { levelUp } from "../engine/levelup";

// Gira solo dove esistono i dati privati (non tracciati)
const DIR = "data/private";
describe.skipIf(!existsSync(`${DIR}/creation.json`))("creazione completa con i dati veri (step 13)", () => {
  const R = buildRuleset(readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))));
  const make = (classId: string, speciesId: string, backgroundId: string, name: string) => {
    const base = { ...emptyCharacter(`t-${classId}`), name, classes: [{ classId, level: 1, hpRolls: [] }], speciesId, backgroundId };
    return autoComplete(base, R);
  };

  for (const [classId, species, bg] of [["fighter", "human", "soldier"], ["wizard", "elf", "sage"], ["cleric", "dwarf", "acolyte"], ["rogue", "halfling", "criminal"]] as const) {
    it(`${classId}: dalle scelte al personaggio giocabile`, () => {
      const ch = make(classId, species, bg, `Prova ${classId}`);
      const prog = creationProgress(ch, R);
      expect(prog.steps.filter((s) => !s.complete), JSON.stringify(prog.steps.filter((s) => !s.complete))).toEqual([]);
      expect(prog.complete).toBe(true);
      const fin = finalizeCharacter(ch, R, { gaming_set: [...R.tools.values()].find((t) => t.group === "gaming")?.id });
      expect(fin.errors).toEqual([]);
      expect(isFinalized(fin.character)).toBe(true);
      const d = computeCharacter(fin.character, R);
      expect(d.hp.max.value).toBeGreaterThan(0);
      expect(fin.character.state.hp).toBe(d.hp.max.value);
      expect(d.ac.value).toBeGreaterThanOrEqual(10);
      expect(fin.character.inventory.length).toBeGreaterThan(0);
      expect(d.warnings).toEqual([]);
      // riaperta, la creazione torna modificabile senza perdere le scelte
      const re = reopenCreation(fin.character);
      expect(isFinalized(re)).toBe(false);
      expect(creationProgress(re, R).complete).toBe(true);
    });
  }
  it("il Mago ha slot e incantesimi dopo la creazione", () => {
    const fin = finalizeCharacter(make("wizard", "elf", "sage", "Mago"), R);
    const d = computeCharacter(fin.character, R);
    expect(d.spellSlots.slots[0]).toBe(2);
    expect(d.spellcasting[0]?.classId).toBe("wizard");
  });
  it("senza nome o con scelte mancanti non si può chiudere", () => {
    const ch = make("fighter", "human", "soldier", "");
    expect(finalizeCharacter(ch, R).ok).toBe(false);
    expect(finalizeCharacter({ ...ch, name: "X", decisions: {} }, R).ok).toBe(false);
  });
  it("le classi bloccate dal multiclasse hanno il motivo", () => {
    const ch = make("fighter", "human", "soldier", "F");
    expect(classOptions(ch, R).filter((o) => !o.enabled).every((o) => o.disabledReason)).toBe(true);
  });
  it("modifica: salire di livello a creazione riaperta tiene PF già tirati, equipaggiamento, monete e PF attuali", () => {
    const fin = finalizeCharacter(make("fighter", "human", "soldier", "Modifica"), R).character;
    const damaged = { ...fin, coins: { ...fin.coins, gp: 77 }, inventory: [...fin.inventory, { itemId: "dagger", qty: 3, state: "stowed" as const }], state: { ...fin.state, hp: 4 } };
    const editing = reopenCreation(damaged);
    expect(isFinalized(editing)).toBe(false);
    const up = levelUp(editing, R, "fighter", 3); // tiro del dado: 3
    expect(up.ok).toBe(true);
    const done = finalizeCharacter(autoComplete(up.character, R), R);
    expect(done.errors).toEqual([]);
    const c = done.character;
    expect(isFinalized(c)).toBe(true);
    expect(c.editing).toBe(false);
    expect(c.classes[0]!.level).toBe(2);
    expect(c.classes[0]!.hpRolls).toEqual([10, 3]); // il tiro resta (non torna alla media)
    expect(c.coins.gp).toBe(77);
    expect(c.inventory.find((i) => i.itemId === "dagger")?.qty).toBe(3);
    expect(c.inventory.length).toBe(damaged.inventory.length);
    const d = computeCharacter(c, R);
    expect(c.state.hp).toBe(4 + up.hpGain); // i PF attuali salgono dei PF guadagnati, non tornano al massimo
    expect(c.state.hp).toBeLessThanOrEqual(d.hp.max.value);
  });
  it("prima creazione: salire di livello nel riepilogo e poi chiudere dà i PF corretti", () => {
    const ch = make("wizard", "human", "sage", "Livello 2");
    const up = levelUp(ch, R, "wizard", "avg");
    const done = finalizeCharacter(autoComplete(up.character, R), R);
    expect(done.errors).toEqual([]);
    const d = computeCharacter(done.character, R);
    expect(d.level).toBe(2);
    expect(done.character.state.hp).toBe(d.hp.max.value);
    expect(done.character.classes[0]!.hpRolls).toEqual([6, "avg"]);
  });
});
