import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { emptyCharacter } from "../character";
import { buildRuleset } from "../ruleset";
import type { Character } from "../types";
import { runAction, setActive } from "./index";

// Controllo a tappeto con i dati veri: ogni azione e ogni attivazione di ogni classe, sottoclasse e specie fa quello che dichiara.
const DIR = "data/private";
describe.skipIf(!existsSync(`${DIR}/classes.json`))("Controllo a tappeto di azioni e attivazioni", () => {
  const R = buildRuleset(readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))));
  const mk = (cls: string, level: number, sub?: string, species = "human"): Character => ({
    ...emptyCharacter("t"), speciesId: species, baseScores: { str: 16, dex: 14, con: 16, int: 14, wis: 16, cha: 16 }, backgroundId: "soldier",
    classes: [{ classId: cls, level, ...(sub ? { subclassId: sub } : {}), hpRolls: [] }], inventory: [{ itemId: "longsword", qty: 1, state: "wielded" }],
  });
  const hurt = (c: Character, hp = 1): Character => ({ ...c, state: { ...c.state, hp } });
  const D = (c: Character) => computeCharacter(c, R);
  const builds: [string, Character][] = [];
  for (const cls of R.classes.values()) {
    builds.push([`${cls.id} 20`, mk(cls.id, 20)]);
    for (const sub of R.subclasses.values()) if (sub.classId === cls.id) builds.push([`${cls.id}/${sub.id} 20`, mk(cls.id, 20, sub.id)]);
  }
  for (const sp of R.species.values()) builds.push([`specie ${sp.id}`, mk("fighter", 5, "champion", sp.id)]);

  it("ogni risorsa e ogni recupero nominato da un'azione esistono", () => {
    const bad: string[] = [];
    for (const [name, c] of builds) {
      const d = D(c);
      for (const a of d.actions) {
        if (a.resource && !d.resources[a.resource]) bad.push(`${name}: ${a.id} spende «${a.resource}» che non esiste`);
        if (a.restore && !d.resources[a.restore.resource]) bad.push(`${name}: ${a.id} restituisce «${a.restore.resource}» che non esiste`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("ogni azione che cura o dà PF temporanei lo fa davvero (e spende quello che dichiara)", () => {
    const bad: string[] = [];
    let n = 0;
    for (const [name, c] of builds) {
      for (const a of D(c).actions) {
        if (a.variable || a.remaining < a.cost || (a.apply === "none" && !a.restore)) continue;
        n++;
        const start = hurt(c);
        // azioni a costo in slot: si paga con uno slot adatto (del Patto se serve, altrimenti il primo livello abbastanza alto)
        const sd = D(start);
        const via = a.slot ? (a.slot.pactOnly || !sd.spellSlots.slots.some((s, i) => s > 0 && i + 1 >= a.slot!.minLevel) ? { kind: "pact" as const } : { kind: "slot" as const, level: Math.max(a.slot.minLevel, 1) }) : undefined;
        const r = runAction(start, sd, a.id, undefined, () => 0.999, via);
        if (!r.ok) { bad.push(`${name}: ${a.id} non parte (${r.errors.join()})`); continue; }
        if (a.apply === "tempHp" && r.character.state.tempHp <= 0) bad.push(`${name}: ${a.id} non dà PF temporanei`);
        if (a.apply === "heal" && r.character.state.hp <= 1) bad.push(`${name}: ${a.id} non cura`);
        if (a.resource && a.cost > 0 && D(r.character).resources[a.resource]!.remaining !== a.remaining - a.cost) bad.push(`${name}: ${a.id} non spende ${a.cost} uso/i`);
      }
    }
    expect(n).toBeGreaterThan(40);
    expect(bad).toEqual([]);
  });

  it("ogni privilegio attivabile si attiva (con la prima opzione), spende il suo costo e le azioni «onActivate» partono da sole", () => {
    const bad: string[] = [];
    let activations = 0, auto = 0;
    for (const [name, c] of builds) {
      const d = D(c);
      for (const f of d.featureList.filter((x) => x.activation)) {
        const before = d.resources[f.activation!.resource ?? ""]?.remaining;
        const r = setActive(c, R, d, f.id, true, f.activation!.options.length ? [f.activation!.options[0]!.id] : []);
        if (!r.ok) { if (!/serve|Nessun uso/.test(r.errors[0] ?? "")) bad.push(`${name}: ${f.id} non si attiva (${r.errors[0]})`); continue; }
        activations++;
        const d2 = D(r.character);
        if (!d2.featureList.find((x) => x.id === f.id)?.active) bad.push(`${name}: ${f.id} risulta non attivo dopo l'attivazione`);
        if (f.activation!.resource && before !== undefined && d2.resources[f.activation!.resource]!.remaining !== before - (f.activation!.cost ?? 1)) bad.push(`${name}: ${f.id} non spende il costo`);
        for (const a of d2.actions.filter((x) => x.onActivate === f.id && x.cost === 0 && x.apply === "tempHp")) {
          auto++;
          if (r.character.state.tempHp < a.bonus) bad.push(`${name}: ${a.id} non ha dato i PF temporanei attivando ${f.id}`);
        }
        const off = setActive(r.character, R, d2, f.id, false);
        if (!off.ok || D(off.character).featureList.find((x) => x.id === f.id)?.active) bad.push(`${name}: ${f.id} non si disattiva`);
      }
    }
    expect(activations).toBeGreaterThan(40);
    expect(auto).toBeGreaterThan(0);
    expect(bad).toEqual([]);
  });
});
