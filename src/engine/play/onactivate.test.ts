import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { testCharacter, testRuleset } from "../compute/testkit";
import type { Character } from "../types";
import { setActive } from "./index";

// Azioni gratuite che partono da sole attivando un privilegio (PF temporanei entrando in Ira)
const F = (o: Record<string, unknown>) => ({ description: "", effects: [], choices: [], level: 1, needsReview: false, origin: "private", ...o }) as never;
const rs = (() => {
  const r = testRuleset();
  const f = r.classes.get("fighter")!;
  f.features.length = 0;
  f.features.push(
    F({ id: "rage", name: { it: "Ira" }, activation: { resource: "rage", cost: 1 }, effects: [
      { op: "resource", resourceId: "rage", uses: 2, recharge: "long_rest" },
      { op: "resourceAction", actionId: "rage_hp", label: "PF temporanei", cost: 0, variable: false, apply: "tempHp", bonus: "classLevel:fighter", when: "active:rage", onActivate: "rage" },
      { op: "resourceAction", actionId: "rage_manual", label: "Senza automatismo", cost: 0, variable: false, apply: "tempHp", bonus: 99, when: "active:rage" },
    ] }),
  );
  return r;
})();
const c = (hp = 0): Character => testCharacter({ classes: [{ classId: "fighter", level: 4, hpRolls: [] }], state: { ...testCharacter().state, tempHp: hp } });
const d = (x: Character) => computeCharacter(x, rs);

describe("onActivate", () => {
  it("attivando il privilegio l'azione parte da sola e segnala il risultato", () => {
    const r = setActive(c(), rs, d(c()), "rage", true);
    expect(r.ok).toBe(true);
    expect(r.character.state.tempHp).toBe(4);
    expect(r.notes).toEqual(["PF temporanei: 4"]);
  });
  it("non somma ai PF temporanei che hai già (resta il più alto) e le altre azioni non partono", () => {
    expect(setActive(c(10), rs, d(c(10)), "rage", true).character.state.tempHp).toBe(10);
    expect(setActive(c(), rs, d(c()), "rage", true).character.state.tempHp).toBe(4); // il 99 manuale non è scattato
  });
  it("non parte se l'attivazione fallisce (nessun uso) né disattivando", () => {
    const spent = { ...c(), state: { ...c().state, resourcesUsed: { rage: 2 } } } as Character;
    const r = setActive(spent, rs, d(spent), "rage", true);
    expect(r.ok).toBe(false);
    expect(r.character.state.tempHp).toBe(0);
    const on = setActive(c(), rs, d(c()), "rage", true).character;
    expect(setActive(on, rs, d(on), "rage", false).character.state.tempHp).toBe(4); // finire l'Ira non toglie i PF temporanei
  });
});
