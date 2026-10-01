import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { emptyCharacter } from "../character";
import { buildRuleset } from "../ruleset";
import type { Character } from "../types";
import { runAction, setActive } from "./index";

// Lotto 8 di PLAN2 (rifiniture) con i dati veri: gira solo dove esiste data/private (non tracciato)
const DIR = "data/private";
describe.skipIf(!existsSync(`${DIR}/classes.json`))("Lotto 8: rifiniture con i dati veri", () => {
  const R = buildRuleset(readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))));
  const mk = (cls: string, level: number, sub: string, over: Partial<Character> = {}): Character => ({
    ...emptyCharacter("t"), baseScores: { str: 16, dex: 14, con: 14, int: 14, wis: 16, cha: 10 }, backgroundId: "soldier",
    classes: [{ classId: cls, level, subclassId: sub, hpRolls: [] }], inventory: [], ...over,
  });
  const D = (c: Character) => computeCharacter(c, R);
  const acts = (c: Character, id: string) => D(c).actions.filter((a) => a.id === id) as never as Record<string, unknown>[];
  const act = (c: Character, id: string) => acts(c, id)[0];
  const on = (c: Character, id: string) => { const r = setActive(c, R, D(c), id, true, []); expect(r.errors, r.errors.join()).toEqual([]); return r.character; };

  it("Zelota: Concentrazione fanatica vale il Danno ira, solo con l'Ira attiva", () => {
    const c = mk("barbarian", 6, "zealot");
    expect(acts(c, "fanatical_focus")).toHaveLength(0);
    expect(act(on(c, "rage"), "fanatical_focus")).toMatchObject({ bonus: 2, cost: 0 });
    expect(act(on(mk("barbarian", 9, "zealot"), "rage"), "fanatical_focus")).toMatchObject({ bonus: 3 });
  });
  it("Maestro di battaglia: Implacabile tira 1d8 senza spendere dadi", () => {
    const c = mk("fighter", 15, "battle_master");
    expect(act(c, "relentless_die")).toMatchObject({ die: 8, cost: 0 });
    const r = runAction(c, D(c), "relentless_die", undefined, () => 0.999);
    expect(r.ok).toBe(true);
    expect(r.total).toBe(8);
    expect(D(r.character).resources.superiority_dice!.remaining).toBe(D(c).resources.superiority_dice!.remaining);
  });
  it("Guerriero psionico: Balzo psionico con il suo uso o spendendo un dado; Spinta con la CD", () => {
    const c = mk("fighter", 7, "psi_warrior");
    expect((act(c, "psionic_leap") as { text: string }).text).toMatch(/voli per 60 ft/);
    const used = runAction(c, D(c), "psionic_leap");
    expect(used.ok).toBe(true);
    expect(runAction(used.character, D(used.character), "psionic_leap").ok).toBe(false);
    const back = runAction(used.character, D(used.character), "psionic_leap_die");
    expect(back.ok).toBe(true);
    expect(D(back.character).resources.telekinetic_adept!.remaining).toBe(1);
    expect((act(c, "telekinetic_thrust") as { text: string }).text).toMatch(/CD 13\)/); // 8 + Int 2 + competenza 3
  });
  it("Monaco della Misericordia: Mano della guarigione di Raffica con usi = mod Sag", () => {
    const c = mk("monk", 11, "mercy");
    expect(act(c, "flurry_healing")).toMatchObject({ die: 10, bonus: 3, apply: "heal", resource: "flurry_of_healing_and_harm" });
    expect(D(c).resources.flurry_of_healing_and_harm!.max.value).toBe(3);
  });
  it("Monaco degli Elementi: il Coronamento elementale si somma solo con la Sintonia e a mani nude", () => {
    const c = mk("monk", 17, "elements");
    const ids = (x: Character) => D(x).attacks.find((a) => a.id === "unarmed")!.extras.map((e) => e.id);
    expect(ids(c)).not.toContain("elemental_epitome");
    expect(ids(on(c, "elemental_attunement"))).toContain("elemental_epitome");
  });
  it("Mano aperta e Vagabondo oscuro: promemoria con le CD", () => {
    expect((act(mk("monk", 3, "open_hand"), "open_hand_technique") as { text: string }).text).toMatch(/CD 13.*CD 13/);
    expect((act(mk("ranger", 11, "gloom_stalker"), "stalkers_flurry") as { text: string }).text).toMatch(/CD 15,/);
  });
});
