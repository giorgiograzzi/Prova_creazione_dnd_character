import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeCharacter } from "../engine/compute";
import { classOptions, creationProgress } from "../engine/creation";
import { buildRuleset } from "../engine/ruleset";
import { emptyCharacter } from "../engine/character";
import { autoComplete, finalizeCharacter, isFinalized, reopenCreation } from "./logic";

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
});
