import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { emptyCharacter } from "../character";
import { buildRuleset } from "../ruleset";
import type { Character } from "../types";
import { applyExtra, runAction, setActive } from "./index";

// Lotto 2 di PLAN2 (Ladro e Monaco) con i dati veri: gira solo dove esiste data/private (non tracciato)
const DIR = "data/private";
describe.skipIf(!existsSync(`${DIR}/classes.json`))("Lotto 2: Ladro e Monaco con i dati veri", () => {
  const R = buildRuleset(readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))));
  const mk = (cls: string, level: number, sub?: string, inv: string[] = [], over: Partial<Character> = {}): Character => ({
    ...emptyCharacter("t"), baseScores: { str: 10, dex: 16, con: 14, int: 12, wis: 16, cha: 10 }, backgroundId: "soldier",
    classes: [{ classId: cls, level, ...(sub ? { subclassId: sub } : {}), hpRolls: [] }],
    inventory: inv.map((itemId) => ({ itemId, qty: 1, state: "wielded" as const })), ...over,
  });
  const D = (c: Character) => computeCharacter(c, R);
  const atk = (c: Character, pick: (a: ReturnType<typeof D>["attacks"][number]) => boolean) => D(c).attacks.find(pick)!;
  const unarmed = (c: Character) => atk(c, (a) => a.id === "unarmed");
  const on = (c: Character, id: string) => { const r = setActive(c, R, D(c), id, true); expect(r.errors, r.errors.join()).toEqual([]); return r.character; };
  const extra = (a: { extras: { id: string }[] }, id: string) => a.extras.find((e) => e.id === id) as never as Record<string, unknown> | undefined;

  describe("Ladro", () => {
    it("Attacco furtivo: dadi per livello, arma Accurata o a distanza, 1 volta per turno, CD del Colpo astuto dal 5°", () => {
      for (const [lv, dice] of [[1, "1d6"], [3, "2d6"], [5, "3d6"], [19, "10d6"]] as const) {
        expect(extra(atk(mk("rogue", lv, undefined, ["rapier"]), (a) => a.id === "rapier"), "sneak_attack"), `livello ${lv}`).toMatchObject({ dice, limit: "turn" });
      }
      const r5 = atk(mk("rogue", 5, undefined, ["rapier"]), (a) => a.id === "rapier");
      expect(extra(r5, "sneak_attack")!.text).toMatch(/CD 14\)/); // 8 + Des 3 + competenza 3
      expect(extra(atk(mk("rogue", 3, undefined, ["rapier"]), (a) => a.id === "rapier"), "sneak_attack")!.text).not.toMatch(/Colpo astuto/);
      expect(extra(atk(mk("rogue", 5, undefined, ["longsword"]), (a) => a.id === "longsword"), "sneak_attack")).toBeUndefined();
      expect(extra(atk(mk("rogue", 5, undefined, ["shortbow"]), (a) => a.id === "shortbow"), "sneak_attack")).toMatchObject({ dice: "3d6" });
    });
    it("Attacco furtivo con un pugnale (Accurata e Da lancio): un solo extra anche lanciato, mai doppio", () => {
      const all = D(mk("rogue", 5, undefined, ["dagger"])).attacks.filter((a) => a.weaponId === "dagger");
      expect(all.length).toBe(2); // mischia e lanciato
      for (const a of all) expect(a.extras.filter((e) => e.id === "sneak_attack")).toHaveLength(1);
    });
    it("Mira stabile: Vantaggio da attiva, senza risorse; Talento affidabile: minimo 10 sul dado nelle abilità competenti", () => {
      const c = mk("rogue", 7, undefined, ["rapier"]);
      expect(atk(c, (a) => a.id === "rapier").mode).toBe("normal");
      const on1 = on(c, "steady_aim");
      expect(atk(on1, (a) => a.id === "rapier").mode).toBe("advantage");
      expect(D(on1).notes.join()).toMatch(/Velocità è 0/);
      expect(on1.state.resourcesUsed).toEqual({});
      expect(D(c).skills.athletics.floor).toMatchObject([{ min: 10, on: "die" }]); // competenza dal background
      expect(D(c).skills.acrobatics.floor).toBeUndefined();
      expect(D(mk("rogue", 6)).skills.athletics.floor).toBeUndefined();
    });
    it("Assassino: Vantaggio all'Iniziativa, Assassinare somma il livello da Ladro, Colpo mortale con CD", () => {
      const c = mk("rogue", 17, "assassin", ["rapier"]);
      expect(D(c).conditions.initiativeMode.mode).toBe("advantage");
      const a = atk(c, (x) => x.id === "rapier");
      expect(extra(a, "assassinate")).toMatchObject({ dice: "", bonus: 17, limit: "turn" });
      expect(extra(a, "death_strike")!.text).toMatch(/CD 17\)/); // 8 + Des 3 + competenza 6 (17° livello)
      expect(applyExtra(c, D(c), a.extras.find((e) => e.id === "assassinate")!).ok).toBe(true);
    });
    it("Lama dell'anima: dadi psionici per livello, azioni con il dado giusto, recuperi spendendo dadi", () => {
      expect(D(mk("rogue", 3, "soulknife")).resources.psionic_energy).toMatchObject({ max: { value: 4 } });
      expect(D(mk("rogue", 5, "soulknife")).resources.psionic_energy!.max.value).toBe(6);
      expect(D(mk("rogue", 3, "soulknife")).actions.find((a) => a.id === "enhanced_talent")).toMatchObject({ die: 6, resource: "psionic_energy" });
      expect(D(mk("rogue", 5, "soulknife")).actions.find((a) => a.id === "enhanced_talent")).toMatchObject({ die: 8 });
      let c = mk("rogue", 13, "soulknife", [], { state: { ...emptyCharacter("t").state, resourcesUsed: { psychic_veil: 1 } } });
      c = runAction(c, D(c), "psychic_veil_die").character;
      expect(c.state.resourcesUsed).toEqual({ psionic_energy: 1 });
      let d = mk("rogue", 17, "soulknife", [], { state: { ...emptyCharacter("t").state, resourcesUsed: { rend_mind: 1 } } });
      d = runAction(d, D(d), "rend_mind_dice").character;
      expect(d.state.resourcesUsed).toEqual({ psionic_energy: 3 });
    });
    it("Ladro (sottoclasse): Scalata = Velocità", () => {
      expect(D(mk("rogue", 3, "thief")).speed.climb.value).toBe(30);
      expect(D(mk("rogue", 3, "assassin")).speed.climb.value).toBe(0);
    });
  });

  describe("Monaco", () => {
    it("Punti disciplina: azioni di spesa con il testo giusto prima e dopo il 10° livello, CD nelle note", () => {
      expect(D(mk("monk", 5)).resources.monks_focus!.max.value).toBe(5);
      const ids = (lv: number) => D(mk("monk", lv)).actions.map((a) => a.id);
      expect(ids(5)).toEqual(expect.arrayContaining(["flurry_2", "patient_defense", "step_of_wind"]));
      expect(ids(10)).toEqual(expect.arrayContaining(["flurry_3", "step_of_wind_big", "patient_defense_hp"]));
      expect(ids(10)).not.toContain("flurry_2");
      expect(D(mk("monk", 5)).notes.join()).toMatch(/CD dei punti disciplina: 14/); // 8 + Sag 3 + competenza 3
      let c = mk("monk", 5);
      c = runAction(c, D(c), "flurry_2").character;
      expect(c.state.resourcesUsed.monks_focus).toBe(1);
    });
    it("Stretta stordente: 1 PD, 1 volta per turno, con la CD", () => {
      const c = mk("monk", 5);
      const x = unarmed(c).extras.find((e) => e.id === "stunning_strike")!;
      expect(x).toMatchObject({ cost: "monks_focus", costAmount: 1, limit: "turn", dice: "" });
      expect(x.text).toMatch(/CD 14/);
      const r = applyExtra(c, D(c), x);
      expect(r.character.state.resourcesUsed.monks_focus).toBe(1);
      expect(applyExtra(r.character, D(r.character), x).ok).toBe(false);
      expect(unarmed(mk("monk", 4)).extras.find((e) => e.id === "stunning_strike")).toBeUndefined();
    });
    it("Metabolismo straordinario: cura dado di Arti marziali + livello e ridà tutti i PD", () => {
      const c = mk("monk", 5, undefined, [], { state: { ...emptyCharacter("t").state, hp: 1, resourcesUsed: { monks_focus: 5 } } });
      const a = D(c).actions.find((x) => x.id === "uncanny_metabolism")!;
      expect(a).toMatchObject({ die: 8, bonus: 5, apply: "heal" });
      const r = runAction(c, D(c), "uncanny_metabolism", undefined, () => 0.5);
      expect(r).toMatchObject({ ok: true, total: 10 }); // d8 → 5, + livello 5
      expect(r.character.state.hp).toBe(11);
      expect(r.character.state.resourcesUsed.monks_focus).toBeUndefined();
      expect(r.character.state.resourcesUsed.uncanny_metabolism).toBe(1);
    });
    it("Devia attacchi: riduzione 1d10 + Des + livello senza costo; Rimanda l'attacco costa 1 PD con 2 dadi di Arti marziali", () => {
      const c = mk("monk", 3);
      expect(D(c).actions.find((a) => a.id === "deflect_attacks")).toMatchObject({ die: 10, bonus: 6, cost: 0 }); // Des +3, livello 3
      const r = runAction(c, D(c), "deflect_attacks", undefined, () => 0.5);
      expect(r).toMatchObject({ ok: true, total: 12, spent: 0 });
      expect(r.character.state.resourcesUsed).toEqual({});
      const back = D(c).actions.find((a) => a.id === "deflect_return")!;
      expect(back).toMatchObject({ die: 6, count: 2, cost: 1 });
      expect(back.text).toMatch(/CD 13\)/); // 8 + Sag 3 + competenza 2
      expect(runAction(c, D(c), "deflect_return", undefined, () => 0.5).rolls).toHaveLength(2);
      expect(D(mk("monk", 4)).actions.find((a) => a.id === "slow_fall")).toMatchObject({ bonus: 20, cost: 0 });
    });
    it("Difesa superiore: attiva spende 3 PD e dà resistenza a tutto tranne la forza", () => {
      const c = on(mk("monk", 18), "superior_defense");
      expect(c.state.resourcesUsed.monks_focus).toBe(3);
      const res = D(c).resistances;
      expect(res).toEqual(expect.arrayContaining(["fire", "poison", "psychic", "slashing"]));
      expect(res).not.toContain("force");
      expect(D(mk("monk", 18)).resistances).toEqual([]);
    });
    it("Misericordia: Mano del dolore solo a mani nude, con Sag e costo in PD; Mano della guarigione per livello", () => {
      const c = mk("monk", 3, "mercy", ["quarterstaff"]);
      expect(extra(unarmed(c), "hand_of_harm")).toMatchObject({ dice: "1d6", bonus: 3, type: "necrotic", cost: "monks_focus", limit: "turn" });
      expect(extra(atk(c, (a) => a.id === "quarterstaff"), "hand_of_harm")).toBeUndefined();
      expect(D(mk("monk", 5, "mercy")).actions.find((a) => a.id === "hand_of_healing")).toMatchObject({ die: 8, bonus: 3, apply: "none" });
      expect(D(mk("monk", 17, "mercy")).actions.find((a) => a.id === "ultimate_mercy")).toMatchObject({ cost: 5, die: 10, count: 4 });
    });
    it("Mano aperta: Integrità del corpo cura dado + Sag; Palmo tremante costa 4 PD", () => {
      const c = mk("monk", 6, "open_hand", [], { state: { ...emptyCharacter("t").state, hp: 1 } });
      expect(D(c).resources.wholeness_of_body!.max.value).toBe(3);
      const r = runAction(c, D(c), "wholeness_of_body", undefined, () => 0.5);
      expect(r).toMatchObject({ ok: true, total: 8 }); // d8 → 5, + Sag 3
      expect(r.character.state.hp).toBe(9);
      expect(extra(unarmed(mk("monk", 17, "open_hand")), "quivering_palm")).toMatchObject({ cost: "monks_focus", costAmount: 4 });
      expect(extra(unarmed(mk("monk", 16, "open_hand")), "quivering_palm")).toBeUndefined();
    });
    it("Elementi: Sintonia attivabile (1 PD) e, dall'11°, volo e nuoto pari alla Velocità", () => {
      const c = on(mk("monk", 11, "elements"), "elemental_attunement");
      expect(c.state.resourcesUsed.monks_focus).toBe(1);
      expect(D(c).speed.fly.value).toBe(50); // 30 + 20 di Movimento senza armatura
      expect(D(mk("monk", 11, "elements")).speed.fly.value).toBe(0);
      expect(D(mk("monk", 6, "elements")).actions.find((a) => a.id === "elemental_burst")).toMatchObject({ cost: 2, die: 8, count: 3 });
    });
  });
});
