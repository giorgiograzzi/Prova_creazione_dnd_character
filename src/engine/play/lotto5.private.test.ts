import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { emptyCharacter } from "../character";
import { spellModNotes } from "../magic";
import { buildRuleset } from "../ruleset";
import type { Character } from "../types";
import { runAction, setActive } from "./index";

// Lotto 5 di PLAN2 (Chierico, Druido, Bardo) con i dati veri: gira solo dove esiste data/private (non tracciato)
const DIR = "data/private";
describe.skipIf(!existsSync(`${DIR}/classes.json`))("Lotto 5: Chierico, Druido e Bardo con i dati veri", () => {
  const R = buildRuleset(readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))));
  const mk = (cls: string, level: number, sub?: string, over: Partial<Character> = {}): Character => ({
    ...emptyCharacter("t"), baseScores: { str: 12, dex: 14, con: 14, int: 12, wis: 16, cha: 16 }, backgroundId: "soldier",
    classes: [{ classId: cls, level, ...(sub ? { subclassId: sub } : {}), hpRolls: [] }], inventory: [{ itemId: "mace", qty: 1, state: "wielded" }], ...over,
  });
  const D = (c: Character) => computeCharacter(c, R);
  const mace = (c: Character) => D(c).attacks.find((a) => a.id === "mace")!;
  const act = (c: Character, id: string) => D(c).actions.find((a) => a.id === id) as never as Record<string, unknown> | undefined;
  const on = (c: Character, id: string, picks: string[] = []) => { const r = setActive(c, R, D(c), id, true, picks); expect(r.errors, r.errors.join()).toEqual([]); return r.character; };
  const mods = (c: Character, spell: string, level: number, slot: number) => spellModNotes(D(c).spellMods, { id: spell, level }, slot);

  describe("Chierico", () => {
    it("Scintilla divina: 1d8 + Sag, e più dadi al 7°, 13° e 18°; Scacciare non morti con la CD", () => {
      for (const [lv, n] of [[2, 1], [6, 1], [7, 2], [13, 3], [18, 4]] as const) expect(act(mk("cleric", lv), "divine_spark"), `livello ${lv}`).toMatchObject({ die: 8, count: n, bonus: 3, resource: "channel_divinity" });
      expect((act(mk("cleric", 4), "turn_undead") as { text: string }).text).toMatch(/CD 13\)\.?$|CD 13\)/);
      expect((act(mk("cleric", 5), "turn_undead") as { text: string }).text).toMatch(/subisce 3d8 radiosi/); // Bruciare non morti: dadi = mod Sag
    });
    it("Colpi benedetti: Colpo divino 1d8 (2d8 al 14°) una volta per turno con un'arma; Incantesimi potenti nei lanci", () => {
      const strike = mk("cleric", 7, undefined, { decisions: { blessed_strikes: ["divine_strike"] } });
      expect(mace(strike).extras.find((e) => e.id === "divine_strike")).toMatchObject({ dice: "1d8", limit: "turn" });
      expect(D(mk("cleric", 14, undefined, { decisions: { blessed_strikes: ["divine_strike"], } })).attacks.find((a) => a.id === "mace")!.extras.find((e) => e.id === "divine_strike")).toMatchObject({ dice: "2d8" });
      expect(D(mk("cleric", 14, undefined, { decisions: { blessed_strikes: ["divine_strike"] } })).attacks.find((a) => a.id === "unarmed")!.extras.map((e) => e.id)).not.toContain("divine_strike");
      const potent = mk("cleric", 7, undefined, { decisions: { blessed_strikes: ["potent_spellcasting"] } });
      expect(mace(potent).extras.map((e) => e.id)).not.toContain("divine_strike");
      expect(mods(potent, "sacred_flame", 0, 0)).toEqual(["Incantesimi potenti: se il trucchetto infligge danni, aggiungi +3 ai danni"]);
      expect(mods(mk("cleric", 14, undefined, { decisions: { blessed_strikes: ["potent_spellcasting"] } }), "sacred_flame", 0, 0)).toHaveLength(2);
      expect(mods(mk("cleric", 7), "sacred_flame", 0, 0)).toEqual([]); // scelta non fatta
    });
    it("Vita: cura extra con slot, Preservare la vita 5 × livello; Luce: Radiosità dell'alba; Guerra: Colpo guidato, resistenze", () => {
      const life = mk("cleric", 3, "life");
      expect(mods(life, "cure_wounds", 1, 2)).toEqual(["Discepolo della vita: la cura fa recuperare altri 4 PF"]);
      expect(mods(life, "bless", 1, 1)).toEqual([]);
      expect(act(life, "preserve_life")).toMatchObject({ bonus: 15, resource: "channel_divinity" });
      expect(mods(mk("cleric", 17, "life"), "heal", 6, 6).join("|")).toMatch(/massimo/);
      expect(act(mk("cleric", 3, "light"), "radiance_of_the_dawn")).toMatchObject({ die: 10, count: 2, bonus: 3 });
      expect(act(mk("cleric", 3, "war"), "guided_strike")).toMatchObject({ bonus: 10 });
      expect(D(mk("cleric", 17, "war")).resistances).toEqual(expect.arrayContaining(["bludgeoning", "piercing", "slashing"]));
      expect(D(mk("cleric", 16, "war")).resistances).toEqual([]);
    });
  });

  describe("Druido", () => {
    it("Forma selvatica: PF temporanei = livello; con le Forme del circolo ×3 e CA 13 + Sag (l'armatura non conta)", () => {
      expect(act(mk("druid", 5), "wild_shape_hp")).toMatchObject({ bonus: 5, cost: 0 });
      const moon = mk("druid", 5, "moon", { inventory: [{ itemId: "leather", qty: 1, state: "worn" }] });
      expect(act(moon, "wild_shape_hp")).toMatchObject({ bonus: 15 });
      expect(D(moon).ac.value).toBe(13); // armatura di cuoio: 11 + Des 2
      const shaped = on(moon, "wild_shape");
      expect(D(shaped).ac.value).toBe(16); // 13 + Sag 3
      const r = runAction(shaped, D(shaped), "wild_shape_hp");
      expect(r.character.state.tempHp).toBe(15);
    });
    it("Luna: Forma lunare 2d10 radiosi solo in forma, Con salvezza + Sag", () => {
      const c = mk("druid", 14, "moon");
      expect(mace(c).extras.find((e) => e.id === "lunar_form")).toBeUndefined();
      expect(mace(on(c, "wild_shape")).extras.find((e) => e.id === "lunar_form")).toMatchObject({ dice: "2d10", type: "radiant", limit: "turn" });
      expect(D(on(mk("druid", 6, "moon"), "wild_shape")).saves.con.bonus.sources.some((s) => /Forme del circolo/.test(s.label) && s.value === 3)).toBe(true);
    });
    it("Terra: Aiuto della terra 2d6/3d6/4d6; Protezione della natura toglie Avvelenato", () => {
      for (const [lv, n] of [[3, 2], [10, 3], [14, 4]] as const) expect(act(mk("druid", lv, "land"), "lands_aid"), `livello ${lv}`).toMatchObject({ die: 6, count: n, resource: "wild_shape" });
      const st = (lv: number) => D(mk("druid", lv, "land", { state: { ...emptyCharacter("t").state, conditions: ["poisoned"] } })).conditions.active;
      expect(st(9)).toContain("poisoned");
      expect(st(10)).toEqual([]);
    });
    it("Mare: Ira del mare con tanti d6 quanto la Sag, Affinità acquatica e Nato dalla tempesta", () => {
      const c = on(mk("druid", 10, "sea"), "wrath_of_the_sea");
      expect(c.state.resourcesUsed.wild_shape).toBe(1);
      expect(act(c, "wrath_of_the_sea")).toMatchObject({ die: 6, count: 3, cost: 0 });
      expect(act(mk("druid", 10, "sea"), "wrath_of_the_sea")).toBeUndefined(); // solo con l'emanazione attiva
      expect(D(mk("druid", 6, "sea")).speed.swim.value).toBe(30);
      expect(D(c).speed.fly.value).toBe(30);
      expect(D(c).resistances).toEqual(expect.arrayContaining(["cold", "lightning", "thunder"]));
      expect(D(mk("druid", 10, "sea")).speed.fly.value).toBe(0);
    });
    it("Stelle: Forma stellare con la costellazione scelta (Arciere 1d8 + Sag, 2d8 al 10°; Drago: minimo 10 a Int e Sag)", () => {
      const archer = on(mk("druid", 3, "stars"), "starry_form", ["archer"]);
      expect(archer.state.resourcesUsed.wild_shape).toBe(1);
      expect(act(archer, "starry_archer")).toMatchObject({ die: 8, count: 1, bonus: 3 });
      expect(act(on(mk("druid", 10, "stars"), "starry_form", ["archer"]), "starry_archer")).toMatchObject({ count: 2 });
      const dragon = D(on(mk("druid", 3, "stars"), "starry_form", ["dragon"]));
      expect(dragon.skills.arcana.floor).toMatchObject([{ min: 10, on: "die" }]);
      expect(dragon.checks.wis.floor).toMatchObject([{ min: 10, on: "die" }]);
      expect(dragon.skills.athletics.floor).toBeUndefined();
      expect(D(on(mk("druid", 10, "stars"), "starry_form", ["dragon"])).speed.fly.value).toBe(20);
      expect(mods(on(mk("druid", 3, "stars"), "starry_form", ["chalice"]), "cure_wounds", 1, 1)[0]).toMatch(/Calice: curando con uno slot.*1d8 \+ 3/);
      expect(D(on(mk("druid", 14, "stars"), "starry_form", ["archer"])).resistances).toEqual(expect.arrayContaining(["slashing"]));
    });
    it("Furia elementale: Colpo primordiale 1d8 (2d8 al 15°) oppure Incantesimi potenti", () => {
      const p = (lv: number) => mace(mk("druid", lv, undefined, { decisions: { elemental_fury: ["primal_strike"] } })).extras.find((e) => e.id === "primal_strike");
      expect(p(7)).toMatchObject({ dice: "1d8", limit: "turn" });
      expect(p(15)).toMatchObject({ dice: "2d8" });
      expect(p(6)).toBeUndefined();
      expect(mods(mk("druid", 7, undefined, { decisions: { elemental_fury: ["potent_spellcasting"] } }), "shillelagh", 0, 0).join()).toMatch(/\+3/);
    });
  });

  describe("Bardo", () => {
    it("Ispirazione bardica: il dado del livello nel pulsante; Fonte di ispirazione dal 5° ricarica anche col Riposo Breve", () => {
      const label = (lv: number) => D(mk("bard", lv)).actions.find((a) => a.id === "bardic_inspiration")?.label;
      expect(label(1)).toBe("Dai Ispirazione bardica (d6)");
      expect(label(5)).toBe("Dai Ispirazione bardica (d8)");
      expect(label(10)).toBe("Dai Ispirazione bardica (d10)");
      expect(label(15)).toBe("Dai Ispirazione bardica (d12)");
      expect(D(mk("bard", 4)).resources.bardic_inspiration!.recharge).toBe("long_rest");
      expect(D(mk("bard", 5)).resources.bardic_inspiration!.recharge).toBe("short_rest");
      expect(D(mk("bard", 5)).resources.bardic_inspiration!.max.value).toBe(3);
      const r = runAction(mk("bard", 3), D(mk("bard", 3)), "bardic_inspiration");
      expect(r.character.state.resourcesUsed.bardic_inspiration).toBe(1);
    });
    it("Collegi: Parole taglienti e Abilità impareggiabile con il dado del livello, Passi in tandem, Manto dell'ispirazione", () => {
      expect(act(mk("bard", 3, "lore"), "cutting_words")).toMatchObject({ die: 6, resource: "bardic_inspiration", cost: 1 });
      expect(act(mk("bard", 10, "lore"), "cutting_words")).toMatchObject({ die: 10 });
      expect(act(mk("bard", 14, "lore"), "peerless_skill")).toMatchObject({ die: 10 });
      expect(act(mk("bard", 6, "dance"), "tandem_footwork")).toMatchObject({ die: 8 });
      expect(act(mk("bard", 3, "glamour"), "mantle_of_inspiration")).toMatchObject({ die: 6 });
      expect(D(on(mk("bard", 14, "glamour"), "unbreakable_majesty")).featureList.find((f) => f.id === "unbreakable_majesty")!.active).toBe(true);
    });
  });
});
