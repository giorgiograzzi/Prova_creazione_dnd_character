import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { emptyCharacter } from "../character";
import { dealsDamageType, spellModNotes } from "../magic";
import { endConcentration } from "../magic";
import { forgoDice, longRest } from "./index";
import { buildRuleset } from "../ruleset";
import type { Character } from "../types";

// Punto 3 di PLAN3 (piccole lacune) con i dati veri: gira solo dove esiste data/private (non tracciato)
const DIR = "data/private";
describe.skipIf(!existsSync(`${DIR}/classes.json`))("Piccole lacune con i dati veri", () => {
  const R = buildRuleset(readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))));
  const mk = (cls: string, level: number, sub?: string, over: Partial<Character> = {}): Character => ({
    ...emptyCharacter("t"), baseScores: { str: 14, dex: 16, con: 14, int: 14, wis: 12, cha: 16 }, backgroundId: "soldier", speciesId: "human",
    classes: [{ classId: cls, level, ...(sub ? { subclassId: sub } : {}), hpRolls: [] }], inventory: [{ itemId: "shortsword", qty: 1, state: "wielded" }], ...over,
  });
  const D = (c: Character) => computeCharacter(c, R);
  const notes = (c: Character, spell: string, level = 3) => spellModNotes(D(c).spellMods, R.spells.get(spell)!, level);

  describe("Adepto elementale sui tiri degli incantesimi", () => {
    const feat = (...types: string[]): Character => mk("wizard", 4, undefined, { feats: types.map((t) => ({ featId: "elemental_adept", choices: { elemental_adept_type: [t] } })) } as never);
    it("per il tipo scelto compare la nota (1 conta 2, ignori la resistenza) solo sugli incantesimi di quel tipo", () => {
      const c = feat("fire");
      expect(notes(c, "fireball")).toEqual(["Adepto elementale: ignori la resistenza a questo tipo e sui dadi di danno di questo tipo gli 1 contano come 2"]);
      expect(notes(c, "fire_bolt", 0)).toHaveLength(1);
      expect(notes(c, "cone_of_cold", 5)).toEqual([]);
      expect(notes(c, "shield", 1)).toEqual([]);
    });
    it("ripetibile con un tipo diverso: due note, una per tipo; Sfera cromatica le prende tutte (tipo scelto)", () => {
      const c = feat("fire", "cold");
      expect(notes(c, "cone_of_cold", 5)).toHaveLength(1);
      expect(notes(c, "chromatic_orb", 1)).toHaveLength(2);
    });
    it("il lettore del riassunto: dadi seguiti dal tipo, non semplici parole", () => {
      expect(dealsDamageType("Sfera 20 ft: TS Des o 8d6 fuoco, metà se riesce", "fire")).toBe(true);
      expect(dealsDamageType("Lama di fuoco in mano: attacco 3d6 + mod caratteristica fuoco", "fire")).toBe(true);
      expect(dealsDamageType("Piccoli effetti naturali: accendi una candela o fiamma piccola.", "fire")).toBe(false);
      expect(dealsDamageType("Cubo 20 ft di ragnatele; infiammabile.", "fire")).toBe(false);
      expect(dealsDamageType(undefined, "fire")).toBe(false);
      expect(dealsDamageType("1d10 fuoco", "force")).toBe(false); // tipo senza parola nota
    });
  });

  describe("Colpi astuti: effetti comprati con i dadi dell'Attacco furtivo", () => {
    const sneak = (c: Character) => D(c).attacks.find((a) => a.weaponId === "shortsword")!.extras.find((e) => e.id === "sneak_attack")!;
    it("5°: Veleno, Sbilanciare e Ritirata costano 1d6 ciascuno, uno solo per volta, con la CD (8 + Des + competenza)", () => {
      const x = sneak(mk("rogue", 5));
      expect(x).toMatchObject({ dice: "3d6", forgoMax: 1 });
      expect(x.forgo!.map((o) => [o.id, o.dice])).toEqual([["poison", 1], ["trip", 1], ["withdraw", 1]]);
      expect(x.forgo![0]!.text).toBe("CD 14: TS Costituzione o Avvelenato per 1 minuto (serve la Borsa da avvelenatore).");
    });
    it("niente Colpo astuto prima del 5°; due effetti insieme dall'11°; Colpi subdoli dal 14° con costi 2, 6 e 3 dadi", () => {
      expect(sneak(mk("rogue", 3)).forgo).toBeUndefined();
      expect(sneak(mk("rogue", 10)).forgoMax).toBe(1);
      expect(sneak(mk("rogue", 11))).toMatchObject({ forgoMax: 2, dice: "6d6" });
      expect(sneak(mk("rogue", 13)).forgo!.map((o) => o.id)).toEqual(["poison", "trip", "withdraw"]);
      const x = sneak(mk("rogue", 14));
      expect(x.forgo!.filter((o) => o.dice > 1).map((o) => [o.id, o.dice])).toEqual([["daze", 2], ["knock_out", 6], ["obscure", 3]]);
    });
    it("Ladro (sottoclasse) al 9°: Attacco furtivo nascosto come effetto in più", () => {
      expect(sneak(mk("rogue", 9, "thief")).forgo!.map((o) => o.id)).toContain("hidden_sneak");
      expect(sneak(mk("rogue", 9, "assassin")).forgo!.map((o) => o.id)).not.toContain("hidden_sneak");
    });
    it("i dadi rimasti dopo la rinuncia", () => {
      expect(forgoDice("6d6", 2)).toBe("4d6");
      expect(forgoDice("3d6", 3)).toBe("");
      expect(forgoDice("3d6", 0)).toBe("3d6");
      expect(forgoDice("3d6", 5)).toBe("");
    });
  });

  describe("Creatura marcata (Marchio del cacciatore, Voto di inimicizia)", () => {
    const rng = (over: Partial<Character> = {}) => mk("ranger", 5, "hunter", { inventory: [{ itemId: "longbow", qty: 1, state: "wielded" }, { itemId: "arrow", qty: 20, state: "stowed" }], ...over });
    const bow = (c: Character) => D(c).attacks.find((a) => a.weaponId === "longbow")!;
    it("Cacciatore preciso: il Vantaggio non è sempre acceso, vale solo se l'attacco è contro la creatura marcata", () => {
      const c = { ...rng({ state: { ...emptyCharacter("t").state, concentration: "hunters_mark" } }), classes: [{ classId: "ranger", level: 17, subclassId: "hunter", hpRolls: [] }] };
      const a = bow(c);
      expect(a.mode).toBe("normal"); // prima era Vantaggio su ogni attacco
      expect(a.markedMode).toMatchObject({ mode: "advantage" });
      expect(a.markedMode!.modeSources.join()).toMatch(/Cacciatore preciso/);
    });
    it("l'extra del Marchio vale solo contro la creatura marcata, ed esiste solo mentre ti concentri", () => {
      expect(bow(rng()).extras.find((e) => e.id === "hunters_mark")).toBeUndefined();
      const x = bow(rng({ state: { ...emptyCharacter("t").state, concentration: "hunters_mark" } })).extras.find((e) => e.id === "hunters_mark")!;
      expect(x).toMatchObject({ dice: "1d6", type: "force", vsMarked: true });
    });
    it("senza il Marchio nessun modo «contro la marcata»", () => {
      expect(bow(rng()).markedMode).toBeUndefined();
    });
    it("Voto di inimicizia (Vendetta): Vantaggio solo contro la creatura del Voto", () => {
      const pal: Character = { ...mk("paladin", 9, "vengeance"), inventory: [{ itemId: "longsword", qty: 1, state: "wielded" }], state: { ...emptyCharacter("t").state, active: { vow_of_enmity: [] } } };
      const a = D(pal).attacks.find((x) => x.weaponId === "longsword")!;
      expect(a.mode).toBe("normal");
      expect(a.markedMode).toMatchObject({ mode: "advantage" });
    });
    it("finire la Concentrazione o riposare toglie il nome della creatura marcata", () => {
      const st = { ...emptyCharacter("t").state, concentration: "hunters_mark", markedTarget: "Goblin capo" };
      const c = rng({ state: st });
      expect(endConcentration(c).state.markedTarget).toBeUndefined();
      expect(longRest(c, D(c)).state.markedTarget).toBeUndefined();
    });
  });
});
