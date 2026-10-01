import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { emptyCharacter } from "../character";
import { buildRuleset } from "../ruleset";
import type { Character } from "../types";
import { applyExtra, longRest, newTurn, runAction, setActive } from "./index";

// Lotto 1 di PLAN2 (Barbaro e Guerriero) con i dati veri: gira solo dove esiste data/private (non tracciato)
const DIR = "data/private";
describe.skipIf(!existsSync(`${DIR}/classes.json`))("Lotto 1: Barbaro e Guerriero con i dati veri", () => {
  const R = buildRuleset(readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))));
  const mk = (cls: string, level: number, sub?: string, over: Partial<Character> = {}): Character => ({
    ...emptyCharacter("t"), baseScores: { str: 16, dex: 12, con: 14, int: 14, wis: 16, cha: 10 },
    classes: [{ classId: cls, level, ...(sub ? { subclassId: sub } : {}), hpRolls: [] }],
    inventory: [{ itemId: "greataxe", qty: 1, state: "wielded" }], ...over,
  });
  const D = (c: Character) => computeCharacter(c, R);
  const axe = (c: Character) => D(c).attacks.find((a) => a.weaponId === "greataxe")!;
  const on = (c: Character, id: string, picks: string[] = []) => { const r = setActive(c, R, D(c), id, true, picks); expect(r.errors, r.errors.join()).toEqual([]); return r.character; };

  it("Attacco irruento: Vantaggio agli attacchi con la Forza solo da attivo, senza consumare Ira", () => {
    const c = mk("barbarian", 2);
    expect(axe(c).mode).toBe("normal");
    const r = on(c, "reckless_attack");
    expect(axe(r).mode).toBe("advantage");
    expect(r.state.resourcesUsed).toEqual({});
    expect(D(r).notes.join()).toMatch(/Vantaggio/);
  });
  it("Ira: Vantaggio alle prove di Forza (Atletica) e ai TS di Forza", () => {
    const d = D(on(mk("barbarian", 1), "rage"));
    expect(d.skills.athletics.mode).toBe("advantage");
    expect(d.checks.str.mode).toBe("advantage");
    expect(d.saves.str.mode).toBe("advantage");
    expect(D(mk("barbarian", 1)).skills.athletics.mode).toBe("normal");
  });
  it("Istinto ferino: Vantaggio all'Iniziativa dal 7° livello", () => {
    expect(D(mk("barbarian", 6)).conditions.initiativeMode.mode).toBe("normal");
    expect(D(mk("barbarian", 7)).conditions.initiativeMode.mode).toBe("advantage");
  });
  it("Colpo brutale: 1d10 dal 9°, 2d10 dal 17°, solo con Attacco irruento, una volta per turno", () => {
    expect(axe(mk("barbarian", 9)).extras).toEqual([]);
    for (const [lv, dice] of [[9, "1d10"], [16, "1d10"], [17, "2d10"]] as const) {
      const c = on(mk("barbarian", lv), "reckless_attack");
      expect(axe(c).extras.find((x) => x.id === "brutal_strike"), `livello ${lv}`).toMatchObject({ dice, limit: "turn", used: false });
    }
    const c = on(mk("barbarian", 9), "reckless_attack");
    const x = axe(c).extras.find((e) => e.id === "brutal_strike")!;
    const r = applyExtra(c, D(c), x);
    expect(axe(r.character).extras.find((e) => e.id === "brutal_strike")!.used).toBe(true);
    expect(axe(newTurn(r.character)).extras.find((e) => e.id === "brutal_strike")!.used).toBe(false);
  });
  it("Berserker: Frenesia con tanti d6 quanto il Danno ira (2, 3 al 9°, 4 al 16°), Ira senza mente toglie Spaventato", () => {
    for (const [lv, n] of [[3, 2], [9, 3], [16, 4]] as const) {
      const c = on(on(mk("barbarian", lv, "berserker"), "reckless_attack"), "rage");
      expect(axe(c).extras.find((x) => x.id === "frenzy"), `livello ${lv}`).toMatchObject({ dice: `${n}d6`, limit: "turn" });
    }
    const base = mk("barbarian", 6, "berserker", { state: { ...emptyCharacter("t").state, conditions: ["frightened", "charmed"] } });
    expect(D(base).conditions.active).toEqual(expect.arrayContaining(["frightened", "charmed"]));
    const raging = D(on(base, "rage"));
    expect(raging.conditions.active).toEqual([]);
    expect(raging.conditions.immune).toEqual(expect.arrayContaining(["frightened", "charmed"]));
    expect(D(mk("barbarian", 5, "berserker", { state: { ...emptyCharacter("t").state, conditions: ["frightened"] } })).conditions.active).toContain("frightened"); // prima del 6°
  });
  it("Zelota: Furia divina 1d6 + metà livello, riserva di d12 che cura, Ira degli dèi attivabile", () => {
    const c = on(mk("barbarian", 14, "zealot"), "rage");
    expect(axe(c).extras.find((x) => x.id === "divine_fury")).toMatchObject({ dice: "1d6", bonus: 7 });
    for (const [lv, n] of [[3, 4], [6, 5], [11, 5], [12, 6], [17, 7]] as const) expect(D(mk("barbarian", lv, "zealot")).resources.warrior_of_the_gods!.max.value, `livello ${lv}`).toBe(n);
    const low = { ...c, state: { ...c.state, hp: 1 } };
    const r = runAction(low, D(low), "warrior_of_the_gods", 2, () => 0.5);
    expect(r).toMatchObject({ ok: true, spent: 2, rolls: [7, 7], total: 14 });
    expect(r.character.state.hp).toBe(15);
    const g = on(c, "rage_of_the_gods");
    expect(D(g).speed.fly.value).toBe(40); // Velocità 30 + Movimento veloce (+10): volare pari alla Velocità
    expect(D(g).resistances).toEqual(expect.arrayContaining(["necrotic", "psychic", "radiant"]));
  });
  it("Cuore selvaggio: Orso con resistenze, Falco con volo solo senza armatura, Aspetto con scelta", () => {
    const base = on(mk("barbarian", 14, "wild_heart"), "rage");
    expect(setActive(mk("barbarian", 14, "wild_heart"), R, D(mk("barbarian", 14, "wild_heart")), "rage_of_the_wilds", true, ["bear"]).ok).toBe(false); // serve l'Ira
    const bear = on(base, "rage_of_the_wilds", ["bear"]);
    expect(D(bear).resistances).toEqual(expect.arrayContaining(["fire", "cold", "poison", "slashing"]));
    expect(D(bear).resistances).not.toContain("psychic");
    const falcon = on(base, "power_of_the_wilds", ["falcon"]);
    expect(D(falcon).speed.fly.value).toBe(30 + 10); // Velocità base + movimento veloce
    const armored = { ...falcon, inventory: [...falcon.inventory, { itemId: "chain_mail", qty: 1, state: "worn" as const }] };
    expect(D(armored).speed.fly.value).toBe(0);
    const owl = { ...mk("barbarian", 6, "wild_heart"), decisions: { aspect_of_the_wilds: ["owl"] } };
    expect(D(owl).senses.darkvision?.value).toBe(60);
    expect(D({ ...owl, decisions: { aspect_of_the_wilds: ["panther"] } }).speed.climb.value).toBe(30);
  });
  it("Albero del mondo: PF temporanei pari al livello entrando in Ira", () => {
    const c = on(mk("barbarian", 3, "world_tree"), "rage");
    const r = runAction(c, D(c), "vitality_of_the_tree");
    expect(r).toMatchObject({ ok: true, total: 3 });
    expect(r.character.state.tempHp).toBe(3);
  });
  it("Possanza indomita e Ira persistente", () => {
    const d = D(mk("barbarian", 18));
    expect(d.checks.str.floor).toMatchObject([{ min: 16, on: "total" }]);
    expect(d.saves.str.floor).toMatchObject([{ min: 16, on: "total" }]);
    let c = on(mk("barbarian", 15), "rage");
    c = { ...c, state: { ...c.state, active: {} } };
    c = on(c, "rage");
    expect(D(c).resources.rage!.remaining).toBe(D(c).resources.rage!.max.value - 2);
    c = runAction(c, D(c), "persistent_rage").character;
    expect(D(c).resources.rage!.remaining).toBe(D(c).resources.rage!.max.value);
    expect(runAction(c, D(c), "persistent_rage").ok).toBe(false);
    expect(D(longRest(c, D(c))).resources.persistent_rage!.remaining).toBe(1);
  });
  it("Berserker: Presenza intimidatoria si ripristina spendendo un'Ira", () => {
    let c = mk("barbarian", 14, "berserker", { state: { ...emptyCharacter("t").state, resourcesUsed: { intimidating_presence: 1 } } });
    c = runAction(c, D(c), "intimidating_presence_rage").character;
    expect(c.state.resourcesUsed).toEqual({ rage: 1 });
  });
  it("Guerriero: Seconda ripresa cura 1d10 + livello e consuma un uso; Mente tattica spende lo stesso uso", () => {
    const f = mk("fighter", 5, undefined, { state: { ...emptyCharacter("t").state, hp: 1 } });
    expect(D(f).resources.second_wind!.max.value).toBe(3);
    const r = runAction(f, D(f), "second_wind", undefined, () => 0.5);
    expect(r).toMatchObject({ ok: true, rolls: [6], total: 11 });
    expect(r.character.state.hp).toBe(12);
    expect(r.character.state.resourcesUsed.second_wind).toBe(1);
    expect(runAction(r.character, D(r.character), "tactical_mind", undefined, () => 0.1).character.state.resourcesUsed.second_wind).toBe(2);
  });
  it("Campione: Atleta straordinario (Vantaggio a Iniziativa e Atletica); Critico migliorato resta", () => {
    const d = D(mk("fighter", 3, "champion"));
    expect(d.conditions.initiativeMode.mode).toBe("advantage");
    expect(d.skills.athletics.mode).toBe("advantage");
    expect(d.skills.acrobatics.mode).toBe("normal");
    expect(d.attacks.find((a) => a.weaponId === "greataxe")!.critRange).toBe(19);
  });
  it("Maestro di battaglia: dado di superiorità per livello (d8, d10 al 10°, d12 al 18°) e recupero di Conosci il nemico", () => {
    const act = (lv: number) => D(mk("fighter", lv, "battle_master")).actions.filter((a) => a.id === "maneuver");
    expect(act(3)).toMatchObject([{ die: 8, resource: "superiority_dice" }]);
    expect(act(10)).toMatchObject([{ die: 10 }]);
    expect(act(18)).toMatchObject([{ die: 12 }]);
    const c = mk("fighter", 7, "battle_master", { state: { ...emptyCharacter("t").state, resourcesUsed: { know_your_enemy: 1 } } });
    const r = runAction(c, D(c), "know_your_enemy_die");
    expect(r.character.state.resourcesUsed).toEqual({ superiority_dice: 1 });
  });
  it("Guerriero psionico: Colpo psionico con il dado per livello + Int e costo in dadi; Mente protetta dà resistenza psichica", () => {
    for (const [lv, die] of [[3, 6], [5, 8], [11, 10], [17, 12]] as const) {
      const x = axe(mk("fighter", lv, "psi_warrior")).extras.find((e) => e.id === "psionic_strike");
      expect(x, `livello ${lv}`).toMatchObject({ dice: `1d${die}`, bonus: 2, type: "force", cost: "psionic_energy", limit: "turn" });
    }
    expect(D(mk("fighter", 10, "psi_warrior")).resistances).toContain("psychic");
    expect(D(mk("fighter", 9, "psi_warrior")).resistances).not.toContain("psychic");
  });
});
