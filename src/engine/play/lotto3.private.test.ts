import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { emptyCharacter } from "../character";
import { castSpell } from "../magic";
import { buildRuleset } from "../ruleset";
import type { Character } from "../types";
import { extraDice, runAction, setActive } from "./index";

// Lotto 3 di PLAN2 (Paladino e Ranger) con i dati veri: gira solo dove esiste data/private (non tracciato)
const DIR = "data/private";
describe.skipIf(!existsSync(`${DIR}/classes.json`))("Lotto 3: Paladino e Ranger con i dati veri", () => {
  const R = buildRuleset(readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))));
  const mk = (cls: string, level: number, sub?: string, over: Partial<Character> = {}): Character => ({
    ...emptyCharacter("t"), baseScores: { str: 16, dex: 14, con: 14, int: 10, wis: 16, cha: 16 }, backgroundId: "soldier",
    classes: [{ classId: cls, level, ...(sub ? { subclassId: sub } : {}), hpRolls: [] }],
    inventory: [{ itemId: "longsword", qty: 1, state: "wielded" }], ...over,
  });
  const D = (c: Character) => computeCharacter(c, R);
  const sword = (c: Character) => D(c).attacks.find((a) => a.id === "longsword")!;
  const unarmed = (c: Character) => D(c).attacks.find((a) => a.id === "unarmed")!;
  const ex = (a: { extras: { id: string }[] }, id: string) => a.extras.find((e) => e.id === id) as never as Record<string, unknown> | undefined;
  const on = (c: Character, id: string) => { const r = setActive(c, R, D(c), id, true); expect(r.errors, r.errors.join()).toEqual([]); return r.character; };
  const conc = (c: Character, spell: string): Character => ({ ...c, state: { ...c.state, concentration: spell } });

  describe("Paladino", () => {
    it("Punizione divina: 2d8 con slot di 1°, +1d8 per livello, anche a mani nude; lancio gratuito 1 volta per Riposo Lungo", () => {
      const c = mk("paladin", 5);
      const x = ex(sword(c), "divine_smite")!;
      expect(x).toMatchObject({ dice: "2d8", slotSpell: "divine_smite", baseLevel: 1, perSlotLevel: 1, type: "radiant" });
      expect(extraDice(x as never, 3)).toBe("4d8");
      expect(ex(unarmed(c), "divine_smite")).toMatchObject({ dice: "2d8" });
      expect(D(c).resources["spell:divine_smite"]).toMatchObject({ max: { value: 1 }, remaining: 1 });
      const r = castSpell(c, R, D(c), "divine_smite", { kind: "slot", level: 2 });
      expect(r.ok, r.errors.join()).toBe(true);
      expect(r.character.state.slotsUsed[2]).toBe(1);
      const free = castSpell(c, R, D(c), "divine_smite", { kind: "free", resourceId: "spell:divine_smite" });
      expect(free.ok, free.errors.join()).toBe(true);
      expect(free.character.state.resourcesUsed["spell:divine_smite"]).toBe(1);
    });
    it("Colpi radiosi: +1d8 sempre, dall'11° livello", () => {
      expect(sword(mk("paladin", 10)).damage.dice).toBe("1d8");
      expect(sword(mk("paladin", 11)).damage.dice).toBe("1d8+1d8");
      expect(unarmed(mk("paladin", 11)).damage.dice).toBe("1+1d8");
    });
    it("Aura di protezione: bonus ai TS per te e testo per gli alleati; 30 ft con l'Espansione", () => {
      expect(D(mk("paladin", 5)).auras.filter((a) => a.id === "protection")).toEqual([]);
      const a6 = D(mk("paladin", 6)).auras.find((a) => a.id === "protection")!;
      expect(a6).toMatchObject({ radius: 10 });
      expect(a6.text).toMatch(/\+3 ai tiri salvezza/);
      expect(D(mk("paladin", 6)).saves.wis.bonus.sources.some((s) => /Aura di protezione/.test(s.label) && s.value === 3)).toBe(true);
      expect(D(mk("paladin", 18)).auras.every((a) => a.radius === 30)).toBe(true);
    });
    it("Aura di coraggio: Spaventato non ti riguarda; compare nelle aure; Devozione fa lo stesso con Affascinato", () => {
      const st = (conditions: string[]) => ({ ...emptyCharacter("t").state, conditions });
      expect(D(mk("paladin", 9, undefined, { state: st(["frightened"]) })).conditions.active).toContain("frightened");
      const d10 = D(mk("paladin", 10, undefined, { state: st(["frightened"]) }));
      expect(d10.conditions.active).toEqual([]);
      expect(d10.conditions.immune).toContain("frightened");
      expect(d10.auras.map((a) => a.id)).toEqual(expect.arrayContaining(["protection", "courage"]));
      const dev = D(mk("paladin", 7, "devotion", { state: st(["charmed"]) }));
      expect(dev.conditions.active).toEqual([]);
      expect(dev.auras.map((a) => a.id)).toContain("devotion");
    });
    it("Imposizione delle mani: riserva 5 × livello, spesa variabile su di sé; 5 punti per Avvelenato", () => {
      const c = mk("paladin", 3, undefined, { state: { ...emptyCharacter("t").state, hp: 1 } });
      expect(D(c).resources.lay_on_hands!.max.value).toBe(15);
      const r = runAction(c, D(c), "lay_on_hands_self", 6);
      expect(r).toMatchObject({ ok: true, total: 6 });
      expect(r.character.state.hp).toBe(7);
      expect(runAction(c, D(c), "lay_on_hands_poison")).toMatchObject({ ok: true, spent: 5 });
    });
    it("Arma sacra: attivabile con Incanalare divinità, bonus al colpire = Car; Voto di inimicizia: Vantaggio; Atleta impareggiabile", () => {
      const base = sword(mk("paladin", 3, "devotion")).toHit.value;
      const c = on(mk("paladin", 3, "devotion"), "sacred_weapon");
      expect(c.state.resourcesUsed.channel_divinity).toBe(1);
      expect(sword(c).toHit.value - base).toBe(3);
      expect(sword(on(mk("paladin", 3, "vengeance"), "vow_of_enmity")).mode).toBe("advantage");
      const g = D(on(mk("paladin", 3, "glory"), "peerless_athlete"));
      expect(g.skills.athletics.mode).toBe("advantage");
      expect(g.skills.acrobatics.mode).toBe("advantage");
      expect(g.skills.stealth.mode).toBe("normal");
    });
    it("Incanalare divinità: Abiurare nemici con CD e numero di creature; Punizione ispiratrice con dadi", () => {
      const a = D(mk("paladin", 9)).actions.find((x) => x.id === "abjure_foes")!;
      expect(a.text).toMatch(/fino a 3 creature.*CD 15/); // CD 8 + Car 3 + competenza 4
      expect(D(mk("paladin", 3, "glory")).actions.find((x) => x.id === "inspiring_smite")).toMatchObject({ die: 8, count: 2, bonus: 3 });
    });
    it("Antichi e Gloria: Aura di protezione magica e di alacrità nelle aure; Aureola sacra attivabile", () => {
      expect(D(mk("paladin", 7, "ancients")).auras.map((a) => a.id)).toContain("warding");
      expect(D(mk("paladin", 7, "glory")).auras.find((a) => a.id === "alacrity")!.text).toMatch(/\+10 ft/);
      const h = D(on(mk("paladin", 20, "devotion"), "holy_nimbus"));
      expect(h.auras.find((a) => a.id === "holy_nimbus")!.text).toMatch(/9 danni radiosi/); // Car +3 e competenza +6
    });
  });

  describe("Ranger", () => {
    it("Marchio del cacciatore: d6 di forza a ogni colpo solo mentre ti concentri su di esso (d10 al 20°)", () => {
      expect(ex(sword(mk("ranger", 5)), "hunters_mark")).toBeUndefined();
      expect(ex(sword(conc(mk("ranger", 5), "hunters_mark")), "hunters_mark")).toMatchObject({ dice: "1d6", type: "force", limit: "none" });
      expect(ex(sword(conc(mk("ranger", 19), "hunters_mark")), "hunters_mark")).toMatchObject({ dice: "1d6" });
      expect(ex(sword(conc(mk("ranger", 20), "hunters_mark")), "hunters_mark")).toMatchObject({ dice: "1d10" });
      expect(ex(sword(conc(mk("ranger", 5), "bless")), "hunters_mark")).toBeUndefined();
    });
    it("Cacciatore preciso: Vantaggio mentre il Marchio è attivo, dal 17°", () => {
      expect(sword(conc(mk("ranger", 17), "hunters_mark")).mode).toBe("advantage");
      expect(sword(mk("ranger", 17)).mode).toBe("normal");
      expect(sword(conc(mk("ranger", 16), "hunters_mark")).mode).toBe("normal");
    });
    it("Vagabondo: scalata e nuoto pari alla Velocità dal 6°; Instancabile dà PF temporanei 1d8 + Sag", () => {
      expect(D(mk("ranger", 6)).speed.climb.value).toBe(30);
      expect(D(mk("ranger", 6)).speed.swim.value).toBe(30);
      expect(D(mk("ranger", 5)).speed.climb.value).toBe(0);
      const c = mk("ranger", 10);
      const r = runAction(c, D(c), "tireless", undefined, () => 0.5);
      expect(r).toMatchObject({ ok: true, rolls: [5], total: 8 }); // d8 → 5, + Sag 3
      expect(r.character.state.tempHp).toBe(8);
    });
    it("Cacciatore: Preda del cacciatore a scelta (Uccisore di colossi 1d8 una volta per turno), Tattiche difensive", () => {
      expect(ex(sword(mk("ranger", 3, "hunter")), "colossus_slayer")).toBeUndefined();
      const c = mk("ranger", 3, "hunter", { decisions: { hunters_prey: ["colossus_slayer"] } });
      expect(ex(sword(c), "colossus_slayer")).toMatchObject({ dice: "1d8", limit: "turn" });
      const h = mk("ranger", 7, "hunter", { decisions: { hunters_prey: ["horde_breaker"], defensive_tactics: ["escape_the_horde"] } });
      expect(D(h).notes.join(" ")).toMatch(/Spezzaorde/);
      expect(D(h).notes.join(" ")).toMatch(/attacchi di opportunità contro di te/);
    });
    it("Vagabondo oscuro: Colpo del terrore 2d6 (2d8 all'11°), 1 volta per turno, consuma un uso", () => {
      expect(ex(sword(mk("ranger", 3, "gloom_stalker")), "dread_strike")).toMatchObject({ dice: "2d6", cost: "dread_ambusher", limit: "turn", type: "psychic" });
      expect(ex(sword(mk("ranger", 11, "gloom_stalker")), "dread_strike")).toMatchObject({ dice: "2d8" });
    });
    it("Vagabondo fatato: Colpi terrificanti 1d4 (1d6 all'11°)", () => {
      expect(ex(sword(mk("ranger", 3, "fey_wanderer")), "dreadful_strikes")).toMatchObject({ dice: "1d4", type: "psychic" });
      expect(ex(sword(mk("ranger", 11, "fey_wanderer")), "dreadful_strikes")).toMatchObject({ dice: "1d6" });
    });
  });
});
