import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { emptyCharacter } from "../character";
import { buildRuleset } from "../ruleset";
import type { Character } from "../types";
import { runAction } from "./index";

// Lotto 4 di PLAN2 (talenti, stili di combattimento, Doni epici) con i dati veri: gira solo dove esiste data/private (non tracciato)
const DIR = "data/private";
describe.skipIf(!existsSync(`${DIR}/classes.json`))("Lotto 4: talenti con i dati veri", () => {
  const R = buildRuleset(readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))));
  const mk = (feats: string[], inv: Character["inventory"] = [], level = 5): Character => ({
    ...emptyCharacter("t"), baseScores: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10 }, backgroundId: "soldier",
    classes: [{ classId: "fighter", level, hpRolls: [] }], feats: feats.map((featId) => ({ featId })), inventory: inv,
  });
  const w = (itemId: string, extra: object = {}) => ({ itemId, qty: 1, state: "wielded" as const, ...extra });
  const D = (c: Character) => computeCharacter(c, R);
  const atk = (c: Character, id: string) => D(c).attacks.find((a) => a.id === id)!;
  const ids = (a: { extras: { id: string }[] }) => a.extras.map((e) => e.id);

  it("Maestro delle armi possenti: danni extra pari alla competenza solo con armi Pesanti", () => {
    const base = atk(mk([], [w("greatsword")]), "greatsword").damage.bonus.value;
    const gwm = atk(mk(["great_weapon_master"], [w("greatsword")]), "greatsword");
    expect(gwm.damage.bonus.value - base).toBe(3); // competenza +3 al 5° livello
    expect(gwm.damage.bonus.sources.some((s) => /Maestro delle armi possenti/.test(s.label))).toBe(true);
    expect(atk(mk(["great_weapon_master"], [w("longsword")]), "longsword").damage.bonus.value).toBe(atk(mk([], [w("longsword")]), "longsword").damage.bonus.value);
    expect(D(mk(["great_weapon_master"])).notes.join()).toMatch(/Azione Bonus/);
  });
  it("Combattere con armi possenti: i dadi di danno valgono almeno 3 a due mani in mischia", () => {
    expect(atk(mk(["great_weapon_fighting"], [w("greatsword")]), "greatsword").dieFloor).toBe(3);
    expect(atk(mk(["great_weapon_fighting"], [w("longsword")]), "longsword").dieFloor).toBeUndefined(); // a una mano
    expect(atk(mk(["great_weapon_fighting"], [w("longsword", { grip: "two" })]), "longsword").dieFloor).toBe(3);
    expect(atk(mk([], [w("greatsword")]), "greatsword").dieFloor).toBeUndefined();
  });
  it("Frantumatore, Perforatore e Squartatore: uno per tipo di danno dell'arma, una volta per turno", () => {
    const f = ["crusher", "piercer", "slasher"];
    const typed = (a: { extras: { id: string }[] }) => ids(a).filter((i) => f.includes(i)); // l'Attaccante selvaggio viene dal background
    expect(typed(atk(mk(f, [w("longsword")]), "longsword"))).toEqual(["slasher"]);
    expect(typed(atk(mk(f, [w("rapier")]), "rapier"))).toEqual(["piercer"]);
    expect(typed(atk(mk(f, [w("mace")]), "mace"))).toEqual(["crusher"]);
    expect(typed(atk(mk(f), "unarmed"))).toEqual(["crusher"]); // a mani nude: contundente
    expect(atk(mk(f, [w("longsword")]), "longsword").extras[0]).toMatchObject({ limit: "turn", dice: "" });
  });
  it("Attaccante selvaggio: solo con un'arma; Caricatore: +1d8 in mischia; Lottatore: solo a mani nude", () => {
    expect(ids(atk(mk(["savage_attacker"], [w("longsword")]), "longsword"))).toContain("savage_attacker");
    expect(ids(atk(mk(["savage_attacker"]), "unarmed"))).not.toContain("savage_attacker"); // vale per le armi
    expect(atk(mk(["charger"], [w("longsword")]), "longsword").extras.find((e) => e.id === "charger")).toMatchObject({ dice: "1d8", limit: "turn" });
    expect(ids(atk(mk(["grappler"]), "unarmed"))).toContain("grappler");
    expect(ids(atk(mk(["grappler"], [w("longsword")]), "longsword"))).not.toContain("grappler");
  });
  it("Maestro degli scudi: Colpo di scudo con la CD, solo con uno scudo e in mischia", () => {
    const withShield = atk(mk(["shield_master"], [w("longsword"), { itemId: "shield", qty: 1, state: "worn" }]), "longsword");
    const x = withShield.extras.find((e) => e.id === "shield_master") as { text?: string } | undefined;
    expect(x?.text).toMatch(/CD 14/); // 8 + For 3 + competenza 3
    expect(ids(atk(mk(["shield_master"], [w("longsword")]), "longsword"))).not.toContain("shield_master");
  });
  it("Atleta: scalata pari alla Velocità; Maestro delle armature pesanti: promemoria con la riduzione (solo con armatura pesante)", () => {
    expect(D(mk(["athlete"])).speed.climb.value).toBe(30);
    expect(D(mk([])).speed.climb.value).toBe(0);
    const heavy = D(mk(["heavy_armor_master"], [{ itemId: "plate", qty: 1, state: "worn" }]));
    expect(heavy.notes.join()).toMatch(/Riduci di 3 i danni/);
    expect(D(mk(["heavy_armor_master"])).notes.join()).not.toMatch(/Riduci di/);
  });
  it("Intercettare: promemoria con la riduzione; Dono della prodezza in combattimento: 1 volta per turno", () => {
    expect(D(mk(["interception"])).notes.join()).toMatch(/1d10 \+ 3/);
    expect(ids(atk(mk(["boon_of_combat_prowess"], [w("longsword")]), "longsword"))).toContain("boon_of_combat_prowess");
  });
  it("Dono della ripresa: riserva di 10 dadi che curano 1d10 a dado", () => {
    const c = { ...mk(["boon_of_recovery"], [], 20), state: { ...emptyCharacter("t").state, hp: 1 } };
    expect(D(c).resources.boon_of_recovery_dice!.max.value).toBe(10);
    const r = runAction(c, D(c), "boon_of_recovery_dice", 3, () => 0.5);
    expect(r).toMatchObject({ ok: true, spent: 3, rolls: [6, 6, 6], total: 18 });
    expect(r.character.state.hp).toBe(19);
  });
});
