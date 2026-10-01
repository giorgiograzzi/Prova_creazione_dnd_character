import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { emptyCharacter } from "../character";
import { buildRuleset } from "../ruleset";
import type { Character } from "../types";
import { runAction, setActive } from "./index";

// Lotto 7 di PLAN2 (Specie) con i dati veri: gira solo dove esiste data/private (non tracciato)
const DIR = "data/private";
describe.skipIf(!existsSync(`${DIR}/species.json`))("Lotto 7: specie con i dati veri", () => {
  const R = buildRuleset(readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))));
  const mk = (species: string, level = 1, over: Partial<Character> = {}): Character => ({
    ...emptyCharacter("t"), speciesId: species, baseScores: { str: 14, dex: 12, con: 16, int: 10, wis: 10, cha: 14 }, backgroundId: "soldier",
    classes: [{ classId: "fighter", level, hpRolls: [] }], inventory: [{ itemId: "mace", qty: 1, state: "wielded" }], ...over,
  });
  const D = (c: Character) => computeCharacter(c, R);
  const act = (c: Character, id: string) => D(c).actions.find((a) => a.id === id) as never as Record<string, unknown> | undefined;
  const extras = (c: Character) => D(c).attacks.find((a) => a.id === "mace")!.extras;
  const on = (c: Character, id: string, picks: string[] = []) => { const r = setActive(c, R, D(c), id, true, picks); expect(r.errors, r.errors.join()).toEqual([]); return r.character; };
  const max = () => 0.999; // ogni dado dà il massimo

  it("Aasimar: Mani guaritrici (d4 per competenza) curano e spendono l'uso; Rivelazione celestiale aggiunge la competenza una volta per turno", () => {
    const c = mk("aasimar", 5);
    expect(act(c, "healing_hands")).toMatchObject({ die: 4, count: 3, apply: "heal", resource: "healing_hands" });
    const hurt = { ...c, state: { ...c.state, hp: 1 } } as Character;
    const r = runAction(hurt, D(hurt), "healing_hands", undefined, max);
    expect(r.ok).toBe(true);
    expect(r.character.state.hp).toBe(13);
    expect(runAction(r.character, D(r.character), "healing_hands").ok).toBe(false); // 1 uso per Riposo Lungo
    expect(extras(c).map((e) => e.id)).not.toContain("celestial_revelation");
    const rev = on(c, "celestial_revelation", ["celestial_wings"]);
    // il tipo di danno si sceglie a ogni colpo: necrotico o radioso
    expect(extras(rev).find((e) => e.id === "celestial_revelation")).toMatchObject({ limit: "turn", bonus: 3, types: ["necrotic", "radiant"] });
  });

  it("Dragonide: Arma del soffio 1d10 (2d10 al 5°, 3d10 all'11°, 4d10 al 17°), CD con la Costituzione, competenza usi", () => {
    for (const [lv, n] of [[1, 1], [4, 1], [5, 2], [11, 3], [17, 4]] as const) {
      const a = act(mk("dragonborn", lv, { decisions: { draconic_ancestry: ["red"] } }), "breath_weapon");
      expect(a, `livello ${lv}`).toMatchObject({ die: 10, count: n, resource: "breath_weapon" });
    }
    const c = mk("dragonborn", 5, { decisions: { draconic_ancestry: ["red"] } });
    expect((act(c, "breath_weapon") as { text: string }).text).toMatch(/CD 14\)/); // 8 + Cos 3 + competenza 3
    expect(D(c).resources.breath_weapon!.max.value).toBe(3);
    expect(D(c).resistances).toContain("fire");
  });
  it("Arma del soffio: il tipo di danno è quello dell'ascendenza scelta (testo e resistenza), senza ascendenza non c'è azione", () => {
    for (const [anc, type, word] of [["red", "fire", "fuoco"], ["blue", "lightning", "fulmine"], ["black", "acid", "acido"], ["white", "cold", "freddo"], ["green", "poison", "veleno"]] as const) {
      const c = mk("dragonborn", 5, { decisions: { draconic_ancestry: [anc] } });
      const a = act(c, "breath_weapon") as { text: string; label: string };
      expect(a.label, anc).toMatch(new RegExp(`\\(${word}\\)`));
      expect(a.text, anc).toMatch(new RegExp(`danni da ${word}`));
      expect(D(c).resistances, anc).toContain(type);
    }
    expect(act(mk("dragonborn", 5), "breath_weapon")).toBeUndefined();
  });

  it("Nano: Percezione tellurica si attiva spendendo un uso", () => {
    const c = on(mk("dwarf", 5), "stonecunning");
    expect(D(c).resources.stonecunning!.remaining).toBe(2);
    expect(D(c).notes.join("|")).toMatch(/Percezione tellurica 60 ft/);
  });

  it("Golia: i doni dell'Ascendenza gigante usano la risorsa (competenza per Riposo Lungo)", () => {
    const fire = mk("goliath", 5, { decisions: { giant_ancestry: ["fire"] } });
    expect(extras(fire).find((e) => e.id === "fires_burn")).toMatchObject({ dice: "1d10" });
    expect(D(fire).resources.giant_ancestry!.max.value).toBe(3);
    expect(extras(mk("goliath", 5, { decisions: { giant_ancestry: ["frost"] } })).find((e) => e.id === "frosts_chill")).toMatchObject({ dice: "1d6" });
    expect(extras(mk("goliath", 5, { decisions: { giant_ancestry: ["frost"] } })).map((e) => e.id)).not.toContain("fires_burn"); // solo il dono scelto
    expect(act(mk("goliath", 5, { decisions: { giant_ancestry: ["stone"] } }), "stones_endurance")).toMatchObject({ die: 12, bonus: 3, resource: "giant_ancestry" });
    expect(act(mk("goliath", 5, { decisions: { giant_ancestry: ["storm"] } }), "storms_thunder")).toMatchObject({ die: 8 });
    expect(act(mk("goliath", 5, { decisions: { giant_ancestry: ["cloud"] } }), "clouds_jaunt")).toBeDefined();
    expect(act(mk("goliath", 5, { decisions: { giant_ancestry: ["fire"] } }), "stones_endurance")).toBeUndefined();
  });

  it("Golia: Forma grande dà Vantaggio alle prove di Forza e +10 ft solo da attiva", () => {
    const c = mk("goliath", 5, { decisions: { giant_ancestry: ["fire"] } });
    expect(D(c).checks.str.mode).toBe("normal");
    const big = on(c, "large_form");
    expect(D(big).checks.str.mode).toBe("advantage");
    expect(D(big).speed.walk.value).toBe(D(c).speed.walk.value + 10);
  });

  it("Halfling: Fortuna ritira un 1 sui d20 (prove, TS, attacchi, Iniziativa)", () => {
    const c = mk("halfling");
    expect(D(c).d20Reroll).toHaveLength(1);
    expect(D(c).saves.dex.floor?.some((f) => f.on === "reroll")).toBe(true);
    expect(D(mk("human")).d20Reroll).toEqual([]);
  });

  it("Orco: Scarica di adrenalina dà PF temporanei pari alla competenza; Resistenza implacabile ti lascia a 1 PF", () => {
    const c = mk("orc", 5);
    const r = runAction(c, D(c), "adrenaline_rush");
    expect(r.ok).toBe(true);
    expect(r.character.state.tempHp).toBe(3);
    expect(D(r.character).resources.adrenaline_rush!.remaining).toBe(2);
    const down = { ...c, state: { ...c.state, hp: 0 } } as Character;
    const k = runAction(down, D(down), "relentless_endurance");
    expect(k.ok).toBe(true);
    expect(k.character.state.hp).toBe(1);
    expect(runAction(k.character, D(k.character), "relentless_endurance").ok).toBe(false);
  });
});
