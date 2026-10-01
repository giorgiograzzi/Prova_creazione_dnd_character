import { describe, expect, it } from "vitest";
import { emptyCharacter } from "../character";
import { characterSchema } from "../schema/character";
import { addCompanion, hurtCompanion, MAX_COMPANIONS, removeCompanion, updateCompanion } from "./companions";

describe("compagni a mano", () => {
  const base = () => addCompanion(emptyCharacter("t"), "Fido");
  it("si aggiunge con valori neutri e id univoci anche dopo una rimozione", () => {
    const a = addCompanion(base(), "Micio");
    expect(a.companions!.map((c) => c.id)).toEqual(["companion-1", "companion-2"]);
    const b = addCompanion(removeCompanion(a, "companion-1"), "Gufo");
    expect(b.companions!.map((c) => c.id)).toEqual(["companion-2", "companion-1"]);
    expect(a.companions![0]).toMatchObject({ name: "Fido", hp: 0, hpMax: 0, ac: 10 });
  });
  it("i PF restano tra 0 e il massimo, anche quando il massimo cambia", () => {
    let c = updateCompanion(base(), "companion-1", { hpMax: 20, hp: 99 });
    expect(c.companions![0]).toMatchObject({ hp: 20, hpMax: 20 });
    c = hurtCompanion(c, "companion-1", 7);
    expect(c.companions![0]!.hp).toBe(13);
    c = hurtCompanion(c, "companion-1", -100);
    expect(c.companions![0]!.hp).toBe(20);
    c = hurtCompanion(c, "companion-1", 100);
    expect(c.companions![0]!.hp).toBe(0);
    c = updateCompanion(updateCompanion(c, "companion-1", { hp: 15 }), "companion-1", { hpMax: 10 });
    expect(c.companions![0]!.hp).toBe(10);
  });
  it("c'è un massimo di compagni e un id sconosciuto non cambia nulla", () => {
    let c = emptyCharacter("t");
    for (let i = 0; i < MAX_COMPANIONS + 2; i++) c = addCompanion(c);
    expect(c.companions).toHaveLength(MAX_COMPANIONS);
    expect(hurtCompanion(c, "nessuno", 5)).toEqual(c);
  });
  it("il salvataggio vecchio (senza compagni) e il nuovo sono entrambi validi", () => {
    const old = emptyCharacter("t");
    expect(characterSchema.safeParse(old).success).toBe(true);
    expect(characterSchema.safeParse(updateCompanion(base(), "companion-1", { hpMax: 8, hp: 8, speed: "40 ft" })).success).toBe(true);
  });
});
