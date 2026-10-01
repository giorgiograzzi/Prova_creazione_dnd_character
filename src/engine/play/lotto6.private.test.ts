import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { emptyCharacter } from "../character";
import { castSpell, spellbook, spellModNotes } from "../magic";
import { buildRuleset } from "../ruleset";
import type { Character } from "../types";
import { createSlot, extraDice, runAction, setActive, SORCERY_POINTS, spendPoints } from "./index";

// Lotto 6 di PLAN2 (Stregone, Mago, Warlock) con i dati veri: gira solo dove esiste data/private (non tracciato)
const DIR = "data/private";
describe.skipIf(!existsSync(`${DIR}/classes.json`))("Lotto 6: Stregone, Mago e Warlock con i dati veri", () => {
  const R = buildRuleset(readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))));
  const mk = (cls: string, level: number, sub?: string, over: Partial<Character> = {}): Character => ({
    ...emptyCharacter("t"), baseScores: { str: 12, dex: 14, con: 14, int: 16, wis: 12, cha: 16 }, backgroundId: "soldier",
    classes: [{ classId: cls, level, ...(sub ? { subclassId: sub } : {}), hpRolls: [] }], inventory: [{ itemId: "longsword", qty: 1, state: "wielded" }], ...over,
  });
  const D = (c: Character) => computeCharacter(c, R);
  const act = (c: Character, id: string) => D(c).actions.find((a) => a.id === id) as never as Record<string, unknown> | undefined;
  const on = (c: Character, id: string, picks: string[] = []) => { const r = setActive(c, R, D(c), id, true, picks); expect(r.errors, r.errors.join()).toEqual([]); return r.character; };
  const free = (c: Character, id: string) => spellbook(c, R, D(c)).find((e) => e.id === id)?.sources.find((s) => s.free)?.free;

  describe("Stregone", () => {
    it("Stregoneria innata: CD +1 e Vantaggio ai tiri per colpire con incantesimo da attiva; a usi finiti, con 2 punti dal 7°", () => {
      const c = mk("sorcerer", 5);
      const base = D(c).spellcasting[0]!.dc.value;
      const raging = on(c, "innate_sorcery");
      expect(D(raging).spellcasting[0]).toMatchObject({ attackMode: "advantage" });
      expect(D(raging).spellcasting[0]!.dc.value).toBe(base + 1);
      expect(raging.state.resourcesUsed.innate_sorcery).toBe(1);
      const out = (lv: number) => mk("sorcerer", lv, undefined, { state: { ...emptyCharacter("t").state, resourcesUsed: { innate_sorcery: 2 } } });
      expect(setActive(out(6), R, D(out(6)), "innate_sorcery", true).ok).toBe(false);
      const seven = on(out(7), "innate_sorcery");
      expect(seven.state.resourcesUsed[SORCERY_POINTS]).toBe(2);
    });
    it("Punti stregoneria e Metamagia: 10 opzioni con il loro costo, quelle scelte con il costo; punti → slot", () => {
      const c = mk("sorcerer", 5, undefined, { decisions: { sorcerer_metamagic: ["careful_spell", "quickened_spell", "empowered_spell", "subtle_spell"] } });
      const costs = Object.fromEntries(D(c).chosenOptions.map((o) => [o.id, o.cost]));
      expect(costs).toEqual({ careful_spell: 1, quickened_spell: 2, empowered_spell: 1, subtle_spell: 1 });
      expect(D(c).resources[SORCERY_POINTS]).toMatchObject({ max: { value: 5 }, remaining: 5 });
      const r = createSlot(c, D(c), 2);
      expect(r.ok).toBe(true);
      expect(D(r.character).spellSlots.slots[1]).toBe(D(c).spellSlots.slots[1]! + 1);
      expect(spendPoints(c, D(c), 2).character.state.resourcesUsed[SORCERY_POINTS]).toBe(2);
      const metamagic = R.classes.get("sorcerer")!.choices.find((x) => x.id === "sorcerer_metamagic")!;
      expect(metamagic.options).toHaveLength(10);
    });
    it("Ripristino stregonesco recupera fino a metà livello in punti", () => {
      const c = mk("sorcerer", 5, undefined, { state: { ...emptyCharacter("t").state, resourcesUsed: { [SORCERY_POINTS]: 5 } } });
      expect(act(c, "sorcerous_restoration")).toMatchObject({ restore: { resource: SORCERY_POINTS, amount: 2 } });
      expect(runAction(c, D(c), "sorcerous_restoration").character.state.resourcesUsed).toEqual({ [SORCERY_POINTS]: 3, sorcerous_restoration: 1 });
    });
    it("Draconica: Affinità elementale con resistenza e bonus Car; Ali di drago anche con 3 punti", () => {
      const c = mk("sorcerer", 6, "draconic", { decisions: { draconic_affinity: ["affinity_fire"] } });
      expect(D(c).resistances).toContain("fire");
      expect(spellModNotes(D(c).spellMods, R.spells.get("fireball")!, 3)).toEqual(["Affinità elementale: se infligge danni da fuoco: +3 a un tiro di danno"]);
      // solo sugli incantesimi che infliggono quel tipo (prima compariva su tutti)
      expect(spellModNotes(D(c).spellMods, R.spells.get("cone_of_cold")!, 5)).toEqual([]);
      expect(spellModNotes(D(c).spellMods, R.spells.get("shield")!, 1)).toEqual([]);
      const out = mk("sorcerer", 14, "draconic", { state: { ...emptyCharacter("t").state, resourcesUsed: { dragon_wings: 1 } } });
      const r = setActive(out, R, D(out), "dragon_wings", true);
      expect(r.ok, r.errors.join()).toBe(true);
      expect(r.character.state.resourcesUsed[SORCERY_POINTS]).toBe(3);
      expect(D(r.character).speed.fly.value).toBe(60);
    });
    it("Magia meccanica: Bastione della legge con 1-5 d8, Trance dell'ordine con 5 punti; Magia selvaggia: Piegare la fortuna", () => {
      expect(act(mk("sorcerer", 6, "clockwork"), "bastion_of_law")).toMatchObject({ die: 8, resource: SORCERY_POINTS });
      const out = mk("sorcerer", 14, "clockwork", { state: { ...emptyCharacter("t").state, resourcesUsed: { trance_of_order: 1 } } });
      const t = on(out, "trance_of_order");
      expect(t.state.resourcesUsed[SORCERY_POINTS]).toBe(5);
      expect(D(t).skills.arcana.floor).toMatchObject([{ min: 10, on: "die" }]);
      expect(D(t).saves.dex.floor).toMatchObject([{ min: 10, on: "die" }]);
      expect(act(mk("sorcerer", 6, "wild_magic"), "bend_luck")).toMatchObject({ die: 4, cost: 1 });
    });
  });

  describe("Mago", () => {
    it("Incantesimi distintivi: 2 incantesimi di 3° sempre preparati, 1 lancio gratuito per Riposo Breve o Lungo; Padronanza: a volontà", () => {
      const c = mk("wizard", 20, undefined, { decisions: { wizard_signature: ["counterspell", "dispel_magic"], wizard_mastery_1: ["charm_person"], wizard_mastery_2: ["alter_self"] } });
      expect(free(c, "counterspell")).toMatchObject({ max: 1, recharge: "short_rest" });
      expect(free(c, "dispel_magic")).toMatchObject({ max: 1 });
      expect(free(c, "charm_person")).toMatchObject({ unlimited: true });
      expect(free(c, "alter_self")).toMatchObject({ unlimited: true });
      const cast = castSpell(c, R, D(c), "charm_person", { kind: "free", resourceId: "spell:charm_person" });
      expect(cast.ok, cast.errors.join()).toBe(true);
      expect(cast.character.state.resourcesUsed).toEqual({});
      const sig = castSpell(c, R, D(c), "counterspell", { kind: "free", resourceId: "spell:counterspell" });
      expect(sig.character.state.resourcesUsed["spell:counterspell"]).toBe(1);
      expect(free(mk("wizard", 19, undefined, { decisions: { wizard_signature: ["counterspell", "dispel_magic"] } }), "counterspell")).toBeUndefined();
    });
    it("Abiurazione: Protezione arcana come riserva (2 × livello + Int); Divinazione: Presagio con 2 dadi (3 al 14°); Invocazione: bonus Int", () => {
      expect(D(mk("wizard", 3, "abjurer")).resources.arcane_ward!.max.value).toBe(9); // 2 × 3 + Int +3
      expect(act(mk("wizard", 3, "abjurer"), "arcane_ward")).toMatchObject({ variable: true, resource: "arcane_ward" });
      expect(D(mk("wizard", 3, "diviner")).resources.portent!.max.value).toBe(2);
      expect(D(mk("wizard", 14, "diviner")).resources.portent!.max.value).toBe(3);
      expect(act(mk("wizard", 14, "diviner"), "portent_roll")).toMatchObject({ die: 20, count: 3, cost: 0 });
      expect(spellModNotes(D(mk("wizard", 10, "evoker")).spellMods, { id: "fireball", level: 3, school: "evocation" }, 3)).toEqual(["Invocazione potenziata: +3 a un tiro di danno"]);
      expect(spellModNotes(D(mk("wizard", 10, "evoker")).spellMods, { id: "shield", level: 1, school: "abjuration" }, 1)).toEqual([]);
      expect(spellModNotes(D(mk("wizard", 3, "evoker")).spellMods, { id: "fire_bolt", level: 0, school: "evocation" }, 0)).toEqual(["Trucchetto potente: se manca o il bersaglio supera il TS, subisce comunque metà danni"]);
    });
  });

  describe("Warlock", () => {
    const inv = (ids: string[], level = 11, over: Partial<Character> = {}) => mk("warlock", level, undefined, { decisions: { warlock_invocations: ids }, ...over });
    it("le 25 invocazioni singole e le 13 coppie (invocazione ripetibile, trucchetto) ci sono, con requisiti di livello e di Patto", () => {
      const o = R.classes.get("warlock")!.choices.find((x) => x.id === "warlock_invocations")!.options!;
      expect(o).toHaveLength(25 + 13);
      expect(o.find((x) => x.id === "eldritch_smite")!.requires).toBe("classLevel:warlock>=5 && hasFeature:pact_of_the_blade");
      expect(o.find((x) => x.id === "armor_of_shadows")!.requires).toBeUndefined();
    });
    it("incantesimi a volontà: Armatura di ombre, Passo ascendente, Sussurri della tomba", () => {
      const c = inv(["armor_of_shadows", "ascendant_step", "whispers_of_the_grave"]);
      for (const s of ["mage_armor", "levitate", "speak_with_dead"]) expect(free(c, s), s).toMatchObject({ unlimited: true });
      expect(free(inv([]), "mage_armor")).toBeUndefined();
      const r = castSpell(c, R, D(c), "mage_armor", { kind: "free", resourceId: "spell:mage_armor" });
      expect(r.ok, r.errors.join()).toBe(true);
    });
    it("Deflagrazione agonizzante, Lancia occulta e Deflagrazione respingente compaiono nei trucchetti", () => {
      const c = inv(["agonizing_blast_eldritch_blast", "eldritch_spear_eldritch_blast", "repelling_blast_eldritch_blast"]);
      const notes = spellModNotes(D(c).spellMods, { id: "eldritch_blast", level: 0 }, 0);
      expect(notes).toEqual(expect.arrayContaining(["Deflagrazione agonizzante: con Deflagrazione occulta: +3 ai danni", "Lancia occulta: con Deflagrazione occulta: gittata +330 ft"]));
      expect(notes.join()).toMatch(/spingi di 10 ft/);
      // il bonus vale solo per il trucchetto scelto
      expect(spellModNotes(D(c).spellMods, { id: "poison_spray", level: 0 }, 0)).toEqual([]);
    });
    it("Patto della Lama: Lama assetata e divoratrice danno attacchi extra; Punizione occulta costa uno slot del Patto (1d8 + 1d8 per livello)", () => {
      expect(D(inv(["pact_of_the_blade"], 5)).attacksPerAction).toBe(1);
      expect(D(inv(["pact_of_the_blade", "thirsting_blade"], 5)).attacksPerAction).toBe(2);
      expect(D(inv(["pact_of_the_blade", "thirsting_blade", "devouring_blade"], 12)).attacksPerAction).toBe(3);
      const c = inv(["pact_of_the_blade", "eldritch_smite", "lifedrinker"], 11);
      const sword = D(c).attacks.find((a) => a.id === "longsword")!;
      const x = sword.extras.find((e) => e.id === "eldritch_smite")!;
      expect(x).toMatchObject({ dice: "1d8", pactSlot: true, baseLevel: 0, perSlotLevel: 1, type: "force", limit: "turn" });
      expect(extraDice(x, D(c).spellSlots.pact!.level)).toBe("6d8"); // slot del Patto di 5°: 1d8 + 5d8
      expect(sword.extras.find((e) => e.id === "lifedrinker")).toMatchObject({ dice: "1d6", limit: "turn" });
    });
    it("Altre invocazioni: Vista del diavolo (120 ft), Vista stregata (30 ft di vista del vero), Dono degli abissi (nuoto)", () => {
      const d = D(inv(["devils_sight", "witch_sight", "gift_of_the_depths"], 15));
      expect(d.senses.darkvision?.value).toBe(120);
      expect(d.senses.truesight?.value).toBe(30);
      expect(d.speed.swim.value).toBe(30);
      expect(free(inv(["gift_of_the_depths"], 15), "water_breathing")).toMatchObject({ max: 1, recharge: "long_rest" });
    });
    it("Arcanum mistico: una scelta per livello di incantesimo (6° all'11°, 7° al 13°...), sempre preparati con 1 lancio gratuito", () => {
      const c = mk("warlock", 13, undefined, { decisions: { warlock_arcanum_6: ["eyebite"], warlock_arcanum_7: ["forcecage"] } });
      expect(free(c, "eyebite")).toMatchObject({ max: 1, recharge: "long_rest" });
      expect(free(c, "forcecage")).toMatchObject({ max: 1 });
      expect(free(mk("warlock", 12, undefined, { decisions: { warlock_arcanum_6: ["eyebite"], warlock_arcanum_7: ["forcecage"] } }), "forcecage")).toBeUndefined(); // il 7° si ottiene al 13°
      const r = castSpell(c, R, D(c), "eyebite", { kind: "free", resourceId: "spell:eyebite" });
      expect(r.ok, r.errors.join()).toBe(true);
      expect(r.character.state.resourcesUsed["spell:eyebite"]).toBe(1);
    });
    it("Sottoclassi: Difese ammalianti (Affascinato), Luce curativa, Benedizione dell'Oscuro, Fortuna dell'Oscuro, Resilienza immonda", () => {
      const st = (conditions: string[]) => ({ ...emptyCharacter("t").state, conditions });
      expect(D(mk("warlock", 10, "archfey", { state: st(["charmed"]) })).conditions.active).toEqual([]);
      expect(D(mk("warlock", 9, "archfey", { state: st(["charmed"]) })).conditions.active).toContain("charmed");
      expect(act(mk("warlock", 3, "celestial"), "healing_light")).toMatchObject({ die: 6, variable: true, resource: "healing_light" });
      expect(act(mk("warlock", 3, "fiend"), "dark_ones_blessing")).toMatchObject({ bonus: 6, apply: "tempHp" }); // Car +3 + livello 3
      expect(act(mk("warlock", 6, "fiend"), "dark_ones_own_luck")).toMatchObject({ die: 10, cost: 1 });
      expect(D(mk("warlock", 10, "fiend", { decisions: { fiendish_resilience: ["fire"] } })).resistances).toContain("fire");
    });
  });
});
