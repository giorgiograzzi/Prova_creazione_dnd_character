import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeCharacter } from "../compute";
import { allQuestions, previewDecision } from "../creation";
import { emptyCharacter } from "../character";
import { castSpell, spellModNotes } from "../magic";
import { runAction, SORCERY_POINTS } from "./index";
import { buildRuleset } from "../ruleset";
import type { Character } from "../types";

// Punto 2 di PLAN3 (limiti della magia di Warlock e Mago) con i dati veri: gira solo dove esiste data/private (non tracciato)
const DIR = "data/private";
describe.skipIf(!existsSync(`${DIR}/classes.json`))("Limiti della magia: Warlock e Mago con i dati veri", () => {
  const R = buildRuleset(readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))));
  const mk = (cls: string, level: number, decisions: Record<string, string[]> = {}): Character => ({
    ...emptyCharacter("t"), baseScores: { str: 12, dex: 14, con: 14, int: 16, wis: 12, cha: 16 }, backgroundId: "soldier", speciesId: "human",
    classes: [{ classId: cls, level, hpRolls: [] }], decisions,
  });
  const q = (c: Character, key: string) => allQuestions(c, R).find((x) => x.key === key)!;
  const opt = (c: Character, key: string, id: string) => q(c, key).options.find((o) => o.id === id)!;

  describe("Warlock: invocazioni", () => {
    const base = { warlock_cantrips: ["eldritch_blast", "chill_touch"], warlock_invocations: [] as string[] };
    it("il Patto della lama scelto nello stesso elenco sblocca Colpo occulto (prima restava bloccato)", () => {
      const c = mk("warlock", 5, { ...base });
      expect(opt(c, "warlock_invocations", "eldritch_smite")).toMatchObject({ enabled: false, disabledReason: expect.stringMatching(/Patto della lama/) });
      const withPact = mk("warlock", 5, { ...base, warlock_invocations: ["pact_of_the_blade"] });
      expect(opt(withPact, "warlock_invocations", "eldritch_smite").enabled).toBe(true);
      const r = previewDecision(mk("warlock", 5, { ...base }), R, "warlock_invocations", ["pact_of_the_blade", "eldritch_smite", "devils_sight"]);
      expect(r.ok, r.errors.join()).toBe(true);
      expect(r.character.decisions.warlock_invocations).toEqual(["pact_of_the_blade", "eldritch_smite", "devils_sight"]);
    });
    it("senza il Patto Colpo occulto non si sceglie; togliendo il Patto la dipendente si annulla con il motivo", () => {
      const bad = previewDecision(mk("warlock", 5, { ...base }), R, "warlock_invocations", ["eldritch_smite"]);
      expect(bad.ok).toBe(false);
      const c = mk("warlock", 5, { ...base, warlock_invocations: ["pact_of_the_blade", "eldritch_smite", "devils_sight"] });
      const r = previewDecision(c, R, "warlock_invocations", ["eldritch_smite", "devils_sight"]);
      expect(r.ok).toBe(false); // lo stesso elenco senza il Patto non passa
      // modifica del trucchetto o del livello: ciò che dipende si annulla in cascata
      const lower = previewDecision({ ...c, classes: [{ ...c.classes[0]!, level: 3 }] }, R, "warlock_cantrips", ["eldritch_blast"]);
      expect(lower.ok).toBe(true);
      expect(lower.character.decisions.warlock_invocations).not.toContain("eldritch_smite");
      expect(lower.removed.some((x) => /Colpo occulto/.test(x.reason))).toBe(true);
    });
    it("Deflagrazione agonizzante e simili richiedono di conoscere il trucchetto (da Warlock che infligge danni)", () => {
      const c = mk("warlock", 3, { ...base });
      expect(opt(c, "warlock_invocations", "agonizing_blast_eldritch_blast").enabled).toBe(true);
      expect(opt(c, "warlock_invocations", "agonizing_blast_chill_touch").enabled).toBe(true);
      expect(opt(c, "warlock_invocations", "agonizing_blast_poison_spray")).toMatchObject({ enabled: false, disabledReason: "Richiede livello 2 da Warlock e incantesimo Spruzzo velenoso" });
      expect(opt(mk("warlock", 1, { ...base }), "warlock_invocations", "agonizing_blast_eldritch_blast").enabled).toBe(false); // serve il 2° livello
    });
    it("ripetibili: la stessa invocazione con trucchetti diversi (non due volte lo stesso)", () => {
      const c = mk("warlock", 3, { ...base });
      const r = previewDecision({ ...c, classes: [{ ...c.classes[0]!, level: 5 }] }, R, "warlock_invocations", ["agonizing_blast_eldritch_blast", "agonizing_blast_chill_touch", "repelling_blast_eldritch_blast"]);
      expect(r.ok, r.errors.join()).toBe(true);
      const d = computeCharacter(r.character, R);
      expect(spellModNotes(d.spellMods, { id: "eldritch_blast", level: 0 }, 0).join()).toMatch(/Deflagrazione agonizzante: con Deflagrazione occulta: \+3.*spingi di 10 ft/);
      expect(spellModNotes(d.spellMods, { id: "chill_touch", level: 0 }, 0)).toEqual(["Deflagrazione agonizzante: con Tocco gelido: +3 ai danni"]);
      expect(spellModNotes(d.spellMods, { id: "poison_spray", level: 0 }, 0)).toEqual([]);
      expect(previewDecision(c, R, "warlock_invocations", ["agonizing_blast_eldritch_blast", "agonizing_blast_eldritch_blast"]).ok).toBe(false);
    });
    it("gli elenchi dei trucchetti coincidono con i dati: da Warlock, trucchetti; Lancia occulta da 10 ft in su; Repulsiva con tiro per colpire", () => {
      const spell = (id: string) => R.spells.get(id)!;
      const all = R.classes.get("warlock")!.choices.find((x) => x.id === "warlock_invocations")!.options!;
      const by = (fam: string) => all.filter((o) => o.id.startsWith(`${fam}_`) && !["thirsting_blade"].includes(o.id)).map((o) => o.id.slice(fam.length + 1));
      for (const id of [...by("agonizing_blast"), ...by("eldritch_spear"), ...by("repelling_blast")]) {
        expect(spell(id).level, id).toBe(0);
        expect(spell(id).classes, id).toContain("warlock");
        expect(spell(id).summary, id).toMatch(/\d+d\d+/);
      }
      for (const id of by("repelling_blast")) expect(spell(id).resolution, id).toMatch(/^attack_/);
      for (const id of by("eldritch_spear")) expect(parseInt(spell(id).range), id).toBeGreaterThanOrEqual(10);
      // nessun trucchetto da Warlock con danni è stato dimenticato
      const dmg = [...R.spells.values()].filter((s) => s.level === 0 && s.classes.includes("warlock" as never) && /\d+d\d+ (forza|necrotic|veleno|tuono|psichic)/.test(s.summary)).map((s) => s.id);
      expect(by("agonizing_blast").sort()).toEqual(dmg.sort());
    });
  });

  describe("Mago: Padronanza e Incantesimi distintivi solo dal libro", () => {
    const book = ["magic_missile", "shield", "misty_step", "web", "fireball", "counterspell"];
    const ids = (c: Character, key: string) => q(c, key).options.map((o) => o.id).sort();
    it("Padronanza (18°): solo gli incantesimi di 1° e 2° livello presenti nel libro", () => {
      const c = mk("wizard", 18, { wizard_spellbook: book });
      expect(ids(c, "wizard_mastery_1")).toEqual(["magic_missile", "shield"]);
      expect(ids(c, "wizard_mastery_2")).toEqual(["misty_step", "web"]);
      expect(ids(mk("wizard", 18, { wizard_spellbook: ["fireball"] }), "wizard_mastery_1")).toEqual([]);
    });
    it("Incantesimi distintivi (20°): solo quelli di 3° livello del libro", () => {
      const c = mk("wizard", 20, { wizard_spellbook: book });
      expect(ids(c, "wizard_signature")).toEqual(["counterspell", "fireball"]);
      const r = previewDecision(c, R, "wizard_signature", ["fireball", "counterspell"]);
      expect(r.ok, r.errors.join()).toBe(true);
      expect(previewDecision(c, R, "wizard_signature", ["fireball", "fly"]).ok).toBe(false); // Volare non è nel libro
    });
    it("togliendo dal libro un incantesimo distintivo, la scelta si annulla con il motivo", () => {
      const c = mk("wizard", 20, { wizard_spellbook: book, wizard_signature: ["fireball", "counterspell"] });
      const r = previewDecision(c, R, "wizard_spellbook", book.filter((x) => x !== "fireball"));
      expect(r.ok).toBe(true);
      expect(r.character.decisions.wizard_signature).toEqual(["counterspell"]);
      expect(r.removed.some((x) => x.key === "wizard_signature")).toBe(true);
    });
  });

  describe("Stregone: effetto delle Metamagie al lancio", () => {
    const sorc = (meta: string[]): Character => mk("sorcerer", 5, { sorcerer_metamagic: meta, sorcerer_cantrips: ["fire_bolt"], sorcerer_prepared: ["burning_hands", "shield", "hold_person"] });
    const D = (c: Character) => computeCharacter(c, R);
    const cast = (c: Character, id: string, level: number, metamagic: string[]) => castSpell(c, R, D(c), id, { kind: "slot", level }, { metamagic });
    const used = (c: Character) => c.state.resourcesUsed[SORCERY_POINTS] ?? 0;
    it("Incantesimo cauto: spende 1 punto, spende lo slot e mostra quante creature (Car, minimo 1) con i numeri veri", () => {
      const c = sorc(["careful_spell", "twinned_spell", "quickened_spell", "empowered_spell"]);
      const r = cast(c, "burning_hands", 1, ["careful_spell"]);
      expect(r.ok, r.errors.join()).toBe(true);
      expect(used(r.character)).toBe(1);
      expect(r.notes).toEqual(expect.arrayContaining(["Metamagia: speso 1 punto stregoneria", "Incantesimo cauto: fino a 3 creature superano il TS in automatico e non subiscono nemmeno metà danni"]));
      expect(r.character.state.slotsUsed).toBeDefined();
    });
    it("senza Metamagia le note delle opzioni scelte non compaiono; un'opzione non scelta non si può applicare", () => {
      const c = sorc(["careful_spell"]);
      const plain = castSpell(c, R, D(c), "burning_hands", { kind: "slot", level: 1 });
      expect(plain.notes.join()).not.toMatch(/Incantesimo cauto/);
      expect(cast(c, "burning_hands", 1, ["heightened_spell"])).toMatchObject({ ok: false, errors: ["Opzione di Metamagia non conosciuta"] });
    });
    it("una sola opzione per incantesimo, tranne Potenziato e cercatore (costo sommato)", () => {
      const c = sorc(["careful_spell", "heightened_spell", "empowered_spell"]);
      expect(cast(c, "burning_hands", 1, ["careful_spell", "heightened_spell"]).ok).toBe(false);
      const ok = cast(c, "burning_hands", 1, ["heightened_spell", "empowered_spell"]);
      expect(ok.ok, ok.errors.join()).toBe(true);
      expect(used(ok.character)).toBe(3); // accentuato 2 + potenziato 1
      expect(ok.notes.join("|")).toMatch(/ritiri fino a 3 dadi.*Svantaggio ai TS/);
    });
    it("Incantesimo rapido: costa 2 e vale solo per incantesimi di un'azione (non per una Reazione)", () => {
      const c = sorc(["quickened_spell"]);
      const bad = cast(c, "shield", 1, ["quickened_spell"]);
      expect(bad.ok).toBe(false);
      expect(bad.errors[0]).toMatch(/tempo di lancio di un'azione/);
      expect(bad.character).toBe(c); // niente spesa
      const ok = cast(c, "burning_hands", 1, ["quickened_spell"]);
      expect(ok.ok, ok.errors.join()).toBe(true);
      expect(used(ok.character)).toBe(2);
    });
    it("Incantesimo gemello: livello effettivo +1; punti insufficienti: il lancio non parte", () => {
      const c = sorc(["twinned_spell"]);
      expect(cast(c, "hold_person", 2, ["twinned_spell"]).notes.join()).toMatch(/livello effettivo 3/);
      const poor = { ...c, state: { ...c.state, resourcesUsed: { [SORCERY_POINTS]: 5 } } };
      const r = cast(poor, "hold_person", 2, ["twinned_spell"]);
      expect(r).toMatchObject({ ok: false, errors: ["Punti stregoneria insufficienti"] });
      expect(r.character).toBe(poor);
    });
    it("avviso (non blocco) se l'incantesimo non costringe a un TS e usi Incantesimo cauto", () => {
      const c = sorc(["careful_spell"]);
      const r = cast(c, "shield", 1, ["careful_spell"]);
      expect(r.ok).toBe(true);
      expect(r.notes.join()).toMatch(/Controlla: l'incantesimo non sembra costringere a un tiro salvezza/);
    });
  });

  describe("Costo alternativo in slot (anche di altre classi)", () => {
    const D = (c: Character) => computeCharacter(c, R);
    const withSub = (cls: string, level: number, subclassId: string): Character => ({ ...mk(cls, level), classes: [{ classId: cls, level, subclassId, hpRolls: [] }] });
    const fiend = (over: Partial<Character> = {}): Character => ({ ...withSub("warlock", 14, "fiend"), ...over });
    // Mago 10° (Illusionista) con un livello di Patto: slot di classe e slot del Patto insieme
    const multi = (over: Partial<Character> = {}): Character => ({ ...mk("wizard", 10), classes: [{ classId: "wizard", level: 10, subclassId: "illusionist", hpRolls: [] }, { classId: "warlock", level: 5, hpRolls: [] }], ...over });
    it("Scagliare all'inferno: solo uno slot del Patto, non uno slot di classe; spende lo slot e non il contatore", () => {
      const c = fiend();
      const d = D(c);
      expect(d.actions.find((a) => a.id === "hurl_through_hell_slot")).toMatchObject({ slot: { minLevel: 1, pactOnly: true }, cost: 0 });
      expect(runAction(c, d, "hurl_through_hell_slot").errors[0]).toBe("Scegli lo slot da spendere");
      expect(runAction(c, d, "hurl_through_hell_slot", undefined, undefined, { kind: "slot", level: 1 }).errors[0]).toBe("Serve uno slot del Patto");
      const r = runAction(c, d, "hurl_through_hell_slot", undefined, undefined, { kind: "pact" });
      expect(r.ok, r.errors.join()).toBe(true);
      expect(r.character.state.pactUsed).toBe(1);
      expect(r.character.state.resourcesUsed.hurl_through_hell).toBeUndefined();
      expect(D(r.character).spellSlots.pact!.remaining).toBe(d.spellSlots.pact!.remaining - 1);
    });
    it("Sé illusorio (Mago): uno slot di 2°+ di qualsiasi classe, anche del Patto; uno slot di 1° non basta", () => {
      const c = multi();
      const d = D(c);
      expect(d.actions.find((a) => a.id === "illusory_self_slot")).toMatchObject({ slot: { minLevel: 2, pactOnly: false } });
      expect(runAction(c, d, "illusory_self_slot", undefined, undefined, { kind: "slot", level: 1 }).errors[0]).toMatch(/2° livello o superiore/);
      const viaClass = runAction(c, D(c), "illusory_self_slot", undefined, undefined, { kind: "slot", level: 2 });
      expect(viaClass.ok, viaClass.errors.join()).toBe(true);
      expect(viaClass.character.state.slotsUsed[2]).toBe(1);
      const viaPact = runAction(c, d, "illusory_self_slot", undefined, undefined, { kind: "pact" });
      expect(viaPact.ok, viaPact.errors.join()).toBe(true); // slot del Patto di 5°
    });
    it("senza slot rimasti l'azione non parte e il personaggio non cambia", () => {
      const f = fiend({ state: { ...emptyCharacter("t").state, pactUsed: 3 } });
      const r = runAction(f, D(f), "hurl_through_hell_slot", undefined, undefined, { kind: "pact" });
      expect(r).toMatchObject({ ok: false, errors: ["Nessuno slot del Patto rimasto"] });
      expect(r.character).toBe(f);
      const m = multi({ state: { ...emptyCharacter("t").state, slotsUsed: { 2: 3 } } });
      expect(runAction(m, D(m), "illusory_self_slot", undefined, undefined, { kind: "slot", level: 2 }).errors[0]).toBe("Nessuno slot di 2° livello disponibile");
    });
    it("Passo di luce lunare: uno slot di 2°+ restituisce un uso", () => {
      const c = { ...withSub("druid", 10, "moon"), state: { ...emptyCharacter("t").state, resourcesUsed: { moonlight_step: 2 } } };
      const d = D(c);
      const r = runAction(c, d, "moonlight_step_slot", undefined, undefined, { kind: "slot", level: 2 });
      expect(r.ok, r.errors.join()).toBe(true);
      expect(r.character.state.resourcesUsed.moonlight_step).toBe(1);
      expect(r.character.state.slotsUsed[2]).toBe(1);
    });
    it("Difese ammalianti e Combattente chiaroveggente: qualsiasi slot", () => {
      for (const [sub, id] of [["archfey", "beguiling_defenses_slot"], ["great_old_one", "clairvoyant_combatant_slot"]] as const) {
        const c = withSub("warlock", 14, sub);
        const r = runAction(c, D(c), id, undefined, undefined, { kind: "pact" });
        expect(r.ok, `${id}: ${r.errors.join()}`).toBe(true);
      }
    });
  });
});
