import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildRuleset } from "./ruleset";
import { checkReferences } from "./validate";
import { buildCtx, computeCharacter, evalValue } from "./compute";
import { testCharacter } from "./compute/testkit";

// Questi test girano solo dove esiste data/private (non tracciata): altrove vengono saltati.
const DIR = "data/private";
const has = existsSync(`${DIR}/weapons.json`);

const files = () => readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8")));
// Ruleset completo; il Guerriero (step 7b) è finto finché non è estratto
const mockFighter = { kind: "classes", entries: [{
  id: "fighter", name: { it: "Guerriero" }, hitDie: 10, primaryAbility: ["str"], saves: ["str", "con"],
  skillChoices: { count: 2, from: "any" }, armorTraining: ["light", "medium", "heavy", "shield"], weaponProficiency: [], equipment: {}, features: [],
}] };
const fullRuleset = () => {
  const f = files();
  const hasFighter = f.some((x) => x.kind === "classes" && x.entries.some((e: { id: string }) => e.id === "fighter"));
  return buildRuleset(hasFighter ? f : [...f, mockFighter]);
};

describe.skipIf(!has)("dati privati (step 4)", () => {
  const rs = buildRuleset(files());

  it("validi e con riferimenti coerenti", () => {
    expect(rs.errors).toEqual([]);
    expect(checkReferences(rs)).toEqual([]);
  });
  it("quantità attese", () => {
    const n = (m: Map<unknown, unknown>) => m.size;
    expect([n(rs.skills), n(rs.languages), n(rs.sizes), n(rs.damageTypes), n(rs.conditions), n(rs.coins)]).toEqual([18, 19, 6, 13, 15, 5]);
    expect([n(rs.weapons), n(rs.armors), n(rs.tools), n(rs.weaponProperties), n(rs.masteries)]).toEqual([38, 13, 37, 10, 8]);
    expect([...rs.weapons.values()].filter((w) => w.category === "simple")).toHaveLength(14);
  });
  it("talenti e background (step 5)", () => {
    const cat = (c: string) => [...rs.feats.values()].filter((f) => f.category === c).length;
    expect([cat("origin"), cat("general"), cat("fighting_style"), cat("epic_boon"), rs.backgrounds.size]).toEqual([10, 43, 10, 12, 16]);
    // ogni background porta un talento di Origine
    for (const b of rs.backgrounds.values()) expect(rs.feats.get(b.feat)?.category).toBe("origin");
    // i talenti generali hanno tutti il prerequisito di livello 4, i Doni epici il 19
    for (const f of rs.feats.values()) {
      if (f.category === "general") expect(f.prerequisites).toContain("level>=4");
      if (f.category === "epic_boon") expect(f.prerequisites).toContain("level>=19");
    }
  });
  it("Soldato con Attaccante selvaggio, Allerta e Robusto usano i dati veri", () => {
    const full = fullRuleset();
    const ch = testCharacter({ backgroundId: "soldier", feats: [{ featId: "alert" }, { featId: "tough" }] });
    const d = computeCharacter(ch, full);
    expect(d.feats).toEqual(["alert", "savage_attacker", "tough"]);
    expect(d.skills.athletics.proficiency).toBe("proficient");
    expect(d.initiative.value).toBe(2 + 2); // Des +2, Allerta = competenza +2
    expect(d.hp.max.value).toBe(10 + 1 + 2); // d10 + Cos 13 (+1) + Robusto (+2 per livello)
  });
  describe("specie (step 6)", () => {
    const fullRs = fullRuleset();
    const mk = (speciesId: string, level = 1, decisions: Record<string, string[]> = {}) =>
      testCharacter({ speciesId, decisions, classes: [{ classId: "fighter", level, hpRolls: [] }] });
    const spells = (ch: ReturnType<typeof mk>) =>
      buildCtx(ch, fullRs).active.flatMap(({ effect: e }) => (e.op === "grantSpell" ? [e.spell] : []));

    it("10 specie, ognuna con velocità e taglie", () => {
      expect(fullRs.species.size).toBe(10);
      for (const sp of fullRs.species.values()) expect(sp.sizes.length).toBeGreaterThan(0);
      expect([...fullRs.species.values()].filter((s) => s.sizes.length > 1).map((s) => s.id).sort()).toEqual(["aasimar", "human", "tiefling"]);
    });
    it("Nano: scurovisione 120, resistenza al veleno, +1 PF per livello (retroattivo)", () => {
      const d1 = computeCharacter(mk("dwarf", 1), fullRs), d5 = computeCharacter(mk("dwarf", 5), fullRs);
      expect(d1.senses.darkvision?.value).toBe(120);
      expect(d1.resistances).toEqual(["poison"]);
      const base5 = computeCharacter(mk("human", 5), fullRs).hp.max.value;
      expect(d5.hp.max.value - base5).toBe(5);
    });
    it("Goliath 35 ft; Elfo dei boschi 35 ft solo con quel lignaggio", () => {
      expect(computeCharacter(mk("goliath"), fullRs).speed.walk.value).toBe(35);
      expect(computeCharacter(mk("elf"), fullRs).speed.walk.value).toBe(30);
      expect(computeCharacter(mk("elf", 1, { elven_lineage: ["wood_elf"] }), fullRs).speed.walk.value).toBe(35);
    });
    it("Elfo Drow: scurovisione 120 e incantesimi sbloccati al 3° e 5° livello TOTALE", () => {
      const at = (l: number) => spells(mk("elf", l, { elven_lineage: ["drow"] }));
      expect(computeCharacter(mk("elf", 1, { elven_lineage: ["drow"] }), fullRs).senses.darkvision?.value).toBe(120);
      expect(at(1)).toEqual(["dancing_lights"]);
      expect(at(3)).toEqual(["dancing_lights", "faerie_fire"]);
      expect(at(5)).toEqual(["dancing_lights", "faerie_fire", "darkness"]);
    });
    it("Elfo: Sensi acuti dà la competenza scelta", () => {
      const d = computeCharacter(mk("elf", 1, { keen_senses: ["survival"] }), fullRs);
      expect(d.skills.survival.proficiency).toBe("proficient");
      expect(d.skills.insight.proficiency).toBe("none");
    });
    it("Dragonide: resistenza del colore scelto; usi del soffio = competenza", () => {
      const d = computeCharacter(mk("dragonborn", 1, { draconic_ancestry: ["gold"] }), fullRs);
      expect(d.resistances).toEqual(["fire"]);
      expect(d.resources.breath_weapon?.max.value).toBe(2);
      expect(computeCharacter(mk("dragonborn", 5, { draconic_ancestry: ["gold"] }), fullRs).resources.breath_weapon?.max.value).toBe(3);
    });
    it("tratti di livello 3 e 5 si attivano dal livello totale (Aasimar, Dragonide)", () => {
      const has = (sp: string, l: number, r: string) => computeCharacter(mk(sp, l), fullRs).resources[r] !== undefined;
      expect([has("aasimar", 2, "celestial_revelation"), has("aasimar", 3, "celestial_revelation")]).toEqual([false, true]);
      expect([has("dragonborn", 4, "draconic_flight"), has("dragonborn", 5, "draconic_flight")]).toEqual([false, true]);
    });
    it("Tiefling infernale: resistenza al fuoco; Gnomo: vantaggio ai TS Int/Sag/Car", () => {
      expect(computeCharacter(mk("tiefling", 1, { fiendish_legacy: ["infernal"] }), fullRs).resistances).toEqual(["fire"]);
      const g = computeCharacter(mk("gnome"), fullRs);
      expect([g.saves.int.mode, g.saves.wis.mode, g.saves.cha.mode, g.saves.str.mode]).toEqual(["advantage", "advantage", "advantage", "normal"]);
    });
    it("Umano: Abile e Versatile concedono abilità e talento", () => {
      const d = computeCharacter(mk("human", 1, { skillful: ["arcana"], versatile: ["skilled"] }), fullRs);
      expect(d.skills.arcana.proficiency).toBe("proficient");
      expect(d.feats).toContain("skilled");
    });
  });

  it("il motore usa i dati veri: Cotta di maglia + Scudo = CA 18", () => {
    const ch = testCharacter({
      classes: [{ classId: "fighter", level: 1, hpRolls: [] }],
      inventory: [{ itemId: "chain_mail", qty: 1, state: "worn" }, { itemId: "shield", qty: 1, state: "worn" }],
    });
    const fighter = fullRuleset();
    expect(computeCharacter(ch, fighter).ac.value).toBe(18);
  });

  describe("classi 7a: Barbaro, Bardo, Chierico, Druido", () => {
    const R = fullRuleset();
    const cls = (classId: string, level: number, extra: object = {}) => ({ classId, level, hpRolls: [], ...extra });
    const mk = (classes: ReturnType<typeof cls>[], over: object = {}) => testCharacter({ classes, ...over });
    const spells = (ch: ReturnType<typeof mk>) => buildCtx(ch, R).active.flatMap(({ effect: e }) => (e.op === "grantSpell" ? [e.spell] : []));

    it("4 classi, 16 sottoclassi, tabelle 1-20 complete", () => {
      for (const id of ["barbarian", "bard", "cleric", "druid"]) {
        const c = R.classes.get(id)!;
        expect(c, id).toBeDefined();
        for (const col of Object.values(c.table)) expect(col).toHaveLength(20);
      }
      expect([...R.subclasses.values()].filter((s) => ["barbarian", "bard", "cleric", "druid"].includes(s.classId))).toHaveLength(16);
      expect(R.classes.get("cleric")!.spellSlots![4]).toEqual([4, 3, 2]); // liv. 5
      expect(R.classes.get("barbarian")!.hitDie).toBe(12);
    });
    it("Barbaro: Difesa senza armatura 10 + Des + Cos, Ira con usi dalla tabella", () => {
      const ch = mk([cls("barbarian", 1)], { baseScores: { str: 15, dex: 14, con: 14, int: 8, wis: 10, cha: 8 } });
      const d = computeCharacter(ch, R);
      expect(d.ac.value).toBe(14);
      expect(d.resources.rage?.max.value).toBe(2);
      expect(computeCharacter(mk([cls("barbarian", 12)]), R).resources.rage?.max.value).toBe(5);
      expect(d.saves.str.proficient).toBe(true);
      expect(d.hp.hitDice).toEqual([{ die: 12, total: 1 }]);
    });
    it("Barbaro: Movimento veloce dal 5° (no armatura pesante), Campione primordiale al 20° (cap 25)", () => {
      const base = { baseScores: { str: 18, dex: 10, con: 10, int: 8, wis: 10, cha: 8 } };
      expect(computeCharacter(mk([cls("barbarian", 4)], base), R).speed.walk.value).toBe(30);
      expect(computeCharacter(mk([cls("barbarian", 5)], base), R).speed.walk.value).toBe(40);
      expect(computeCharacter(mk([cls("barbarian", 20)], base), R).scores.str.value).toBe(22);
    });
    it("Bardo: Ispirazione bardica = mod Car (min 1); Factotum e Maestria", () => {
      const ch = mk([cls("bard", 2)], { baseScores: { str: 8, dex: 14, con: 12, int: 10, wis: 10, cha: 16 },
        decisions: { bard_skills: ["stealth", "arcana", "history"], bard_expertise_2: ["stealth"] } });
      const d = computeCharacter(ch, R);
      expect(d.resources.bardic_inspiration?.max.value).toBe(3);
      expect(d.skills.stealth.proficiency).toBe("expertise");
      expect(d.skills.acrobatics.proficiency).toBe("half"); // Factotum dal 2°
      expect(d.spellcasting[0]).toMatchObject({ classId: "bard", ability: "cha" });
      expect(d.spellcasting[0]!.dc.value).toBe(8 + 3 + 2);
    });
    it("Bardo della Danza: CA 10 + Des + Car senza armatura né scudo", () => {
      const ch = mk([cls("bard", 3, { subclassId: "dance" })], { baseScores: { str: 8, dex: 14, con: 12, int: 10, wis: 10, cha: 16 } });
      expect(computeCharacter(ch, R).ac.value).toBe(10 + 2 + 3);
    });
    it("Chierico: Ordine divino Taumaturgo = +mod Sag (min 1) ad Arcano e Religione; Protettore = armi marziali e armature pesanti", () => {
      const base = { baseScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } };
      const t = computeCharacter(mk([cls("cleric", 1)], { ...base, decisions: { divine_order: ["thaumaturge"] } }), R);
      expect(t.skills.arcana.bonus.value).toBe(1); // Int +0, Sag +0 → minimo +1
      expect(t.skills.history.bonus.value).toBe(0);
      const p = computeCharacter(mk([cls("cleric", 1)], { ...base, decisions: { divine_order: ["protector"] } }), R);
      expect(p.proficiencies.armor).toContain("heavy");
      expect(p.proficiencies.weapons).toContain("martial");
    });
    it("Chierico: Incanalare divinità dal 2° con usi della tabella", () => {
      expect(computeCharacter(mk([cls("cleric", 1)]), R).resources.channel_divinity).toBeUndefined(); // privilegio del 2°
      expect(computeCharacter(mk([cls("cleric", 6)]), R).resources.channel_divinity?.max.value).toBe(3);
    });
    it("Dominio della Vita: incantesimi sempre preparati per livello di classe", () => {
      const at = (l: number) => spells(mk([cls("cleric", l, { subclassId: "life" })]));
      expect(at(2)).toEqual([]);
      expect(at(3)).toEqual(["aid", "bless", "cure_wounds", "lesser_restoration"]);
      expect(at(5)).toContain("revivify");
      expect(at(5)).not.toContain("greater_restoration");
    });
    it("Druido: Circolo della Terra, terreno scelto → incantesimi per livello", () => {
      const at = (l: number) => spells(mk([cls("druid", l, { subclassId: "land" })], { decisions: { land_terrain: ["arid"] } }));
      expect(at(3)).toEqual(expect.arrayContaining(["blur", "burning_hands", "fire_bolt"]));
      expect(at(3)).not.toContain("fireball");
      expect(at(5)).toContain("fireball");
      expect(at(5)).not.toContain("blight");
      expect(computeCharacter(mk([cls("druid", 1)]), R).proficiencies.tools).toContain("herbalism_kit");
    });
    it("Druido: Ordine primordiale Custode = armi marziali + armature medie; Druidico dà Parlare con gli animali", () => {
      const d = computeCharacter(mk([cls("druid", 1)], { decisions: { primal_order: ["protector"] } }), R);
      expect(d.proficiencies.armor).toEqual(expect.arrayContaining(["medium", "light", "shield"]));
      expect(spells(mk([cls("druid", 1)]))).toContain("speak_with_animals");
    });
    it("Collegio del Sapienza: 3 competenze bonus; Valore: armature medie e armi marziali", () => {
      const lore = computeCharacter(mk([cls("bard", 3, { subclassId: "lore" })], { decisions: { lore_bonus_skills: ["arcana", "history", "nature"] } }), R);
      expect(lore.skills.nature.proficiency).toBe("proficient");
      const valor = computeCharacter(mk([cls("bard", 3, { subclassId: "valor" })]), R);
      expect(valor.proficiencies.armor).toContain("medium");
      expect(valor.proficiencies.weapons).toContain("martial");
    });
  });

  describe("classi 7b: Guerriero, Monaco, Paladino, Ranger, Ladro, Stregone, Warlock, Mago", () => {
    const R = fullRuleset();
    const cls = (classId: string, level: number, extra: object = {}) => ({ classId, level, hpRolls: [], ...extra });
    const mk = (classes: ReturnType<typeof cls>[], over: object = {}) => testCharacter({ classes, ...over });
    const scores = (o: Partial<Record<string, number>>) => ({ baseScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...o } });
    const active = (ch: ReturnType<typeof mk>) => buildCtx(ch, R).active.map((a) => a.effect);
    const spells = (ch: ReturnType<typeof mk>) => active(ch).flatMap((e) => (e.op === "grantSpell" ? [e.spell] : []));

    it("12 classi, 48 sottoclassi (3-4 per classe), tabelle 1-20 complete", () => {
      expect(R.classes.size).toBe(12);
      expect(R.subclasses.size).toBe(48);
      for (const c of R.classes.values()) {
        for (const col of Object.values(c.table)) expect(col, c.id).toHaveLength(20);
        expect(c.features.length, c.id).toBeGreaterThan(10);
        expect([...R.subclasses.values()].filter((sc) => sc.classId === c.id).length, c.id).toBeGreaterThanOrEqual(3);
      }
    });
    it("Guerriero: usi da tabella (Recupero energie, Azione impetuosa) e Campione con critico 19-20 / 18-20", () => {
      expect(computeCharacter(mk([cls("fighter", 1)]), R).resources.second_wind?.max.value).toBe(2);
      expect(computeCharacter(mk([cls("fighter", 2)]), R).resources.action_surge?.max.value).toBe(1);
      expect(computeCharacter(mk([cls("fighter", 17)]), R).resources.action_surge?.max.value).toBe(2);
      const crit = (l: number) => active(mk([cls("fighter", l, { subclassId: "champion" })])).flatMap((e) => (e.op === "critRange" ? [e.min] : []));
      expect(crit(3)).toEqual([19]);
      expect(crit(15)).toEqual([19, 18]);
    });
    it("Maestro di battaglia: dadi di superiorità dalla tabella della sottoclasse (4 → 5 al 7°)", () => {
      const r = (l: number) => computeCharacter(mk([cls("fighter", l, { subclassId: "battle_master" })]), R).resources.superiority_dice?.max.value;
      expect([r(3), r(7), r(15)]).toEqual([4, 5, 6]);
      expect(R.subclasses.get("battle_master")!.choices.find((c) => c.id === "battle_master_maneuvers")!.options).toHaveLength(20);
    });
    it("Cavaliere mistico e Mistificatore arcano: terzo incantatore con slot e trucchetti propri", () => {
      const ek = R.subclasses.get("eldritch_knight")!, at = R.subclasses.get("arcane_trickster")!;
      expect([ek.caster, ek.spellAbility, ek.spellList, ek.spellSlots![2], ek.spellSlots![19]]).toEqual(["third", "int", "wizard", [2], [4, 3, 3, 1]]);
      expect(at.table.trucchetti![2]).toBe(3);
    });
    it("Monaco: CA 10 + Des + Sag, Movimento senza armatura a scaglioni, Arti marziali d6→d8", () => {
      const b = scores({ dex: 14, wis: 14 });
      expect(computeCharacter(mk([cls("monk", 1)], b), R).ac.value).toBe(14);
      const sp = (l: number, inv: object[] = []) => computeCharacter(mk([cls("monk", l)], { ...b, inventory: inv }), R).speed.walk.value;
      expect([sp(1), sp(2), sp(6), sp(18)]).toEqual([30, 40, 45, 60]);
      expect(sp(6, [{ itemId: "shield", qty: 1, state: "worn" }])).toBe(30); // niente scudo
      const dice = (l: number) => active(mk([cls("monk", l)], b)).flatMap((e) => (e.op === "unarmedDie" ? [e.die] : []));
      expect(dice(4)).toEqual(["d6"]);
      expect(dice(5)).toEqual(["d6", "d8"]);
      expect(computeCharacter(mk([cls("monk", 2)], b), R).resources.monks_focus?.max.value).toBe(2);
    });
    it("Monaco 14°: competenza in tutti i TS; 20°: Des e Sag +4 (max 25)", () => {
      const d = computeCharacter(mk([cls("monk", 14)]), R);
      expect(Object.values(d.saves).every((x) => x.proficient)).toBe(true);
      expect(computeCharacter(mk([cls("monk", 20)], scores({ dex: 18, wis: 18 })), R).scores.dex.value).toBe(22);
    });
    it("Paladino: Imposizione delle mani = 5 × livello; Aura di protezione = mod Car ai TS dal 6°", () => {
      expect(computeCharacter(mk([cls("paladin", 3)]), R).resources.lay_on_hands?.max.value).toBe(15);
      const b = scores({ cha: 16, dex: 10 });
      expect(computeCharacter(mk([cls("paladin", 5)], b), R).saves.dex.bonus.value).toBe(0);
      expect(computeCharacter(mk([cls("paladin", 6)], b), R).saves.dex.bonus.value).toBe(3);
      expect(R.classes.get("paladin")!.spellSlots![4]).toEqual([4, 2]);
      expect(R.classes.get("paladin")!.choices.some((c) => c.id === "paladin_cantrips")).toBe(false); // il Paladino non ha trucchetti
      expect(spells(mk([cls("paladin", 2)]))).toContain("divine_smite");
    });
    it("Paladino dei Sacri Antichi: resistenze dell'aura dal 7° livello", () => {
      const r = (l: number) => computeCharacter(mk([cls("paladin", l, { subclassId: "ancients" })]), R).resistances;
      expect(r(6)).toEqual([]);
      expect(r(7)).toEqual(["necrotic", "psychic", "radiant"]);
    });
    it("Ranger: Marchio del cacciatore sempre preparato, Vagabondo, Sensi ferini, Cacciatore delle tenebre", () => {
      expect(spells(mk([cls("ranger", 1)]))).toContain("hunters_mark");
      expect(computeCharacter(mk([cls("ranger", 1)]), R).resources.favored_enemy?.max.value).toBe(2);
      expect(computeCharacter(mk([cls("ranger", 6)]), R).speed.walk.value).toBe(40);
      expect(computeCharacter(mk([cls("ranger", 18)]), R).senses.blindsight?.value).toBe(30);
      const gs = computeCharacter(mk([cls("ranger", 3, { subclassId: "gloom_stalker" })], scores({ wis: 16 })), R);
      expect(gs.initiative.value).toBe(3); // Des +0, Sag +3
    });
    it("Ladro: 4 abilità, due Maestrie (1° e 6°), Mente sfuggente al 15°", () => {
      const c = R.classes.get("rogue")!;
      expect(c.skillChoices.count).toBe(4);
      expect(c.toolProficiency).toEqual(["thieves_tools"]);
      expect(c.weaponProficiency).toEqual(["simple", "martial[finesse|light]"]);
      const d = computeCharacter(mk([cls("rogue", 6)], { decisions: { rogue_skills: ["stealth", "acrobatics", "perception", "investigation"], rogue_expertise_1: ["stealth", "perception"], rogue_expertise_6: ["acrobatics", "investigation"] } }), R);
      expect(["stealth", "perception", "acrobatics", "investigation"].map((s) => d.skills[s as "stealth"].proficiency)).toEqual(Array(4).fill("expertise"));
      const d15 = computeCharacter(mk([cls("rogue", 15)]), R);
      expect([d15.saves.wis.proficient, d15.saves.cha.proficient, d15.saves.dex.proficient]).toEqual([true, true, true]);
      expect(R.classes.get("rogue")!.table.attacco_furtivo![10]).toBe("6d6");
    });
    it("Stregone: punti stregoneria = livello, Stregoneria innata 2 usi, Metamagia con costi", () => {
      expect(computeCharacter(mk([cls("sorcerer", 5)]), R).resources.font_of_magic?.max.value).toBe(5);
      expect(computeCharacter(mk([cls("sorcerer", 1)]), R).resources.innate_sorcery?.max.value).toBe(2);
      const meta = R.classes.get("sorcerer")!.choices.find((c) => c.id === "sorcerer_metamagic")!;
      expect(meta.options).toHaveLength(10);
      expect(meta.options!.every((o) => o.cost === 1 || o.cost === 2)).toBe(true);
      expect(meta.countFrom).toBe("metamagie_note");
    });
    it("Stregone draconico: CA 10 + Des + Car e +1 PF per livello da Stregone", () => {
      const b = scores({ dex: 14, cha: 16, con: 10 });
      expect(computeCharacter(mk([cls("sorcerer", 3, { subclassId: "draconic" })], b), R).ac.value).toBe(10 + 2 + 3);
      const plain = computeCharacter(mk([cls("sorcerer", 3, { subclassId: "wild_magic" })], b), R).hp.max.value;
      expect(computeCharacter(mk([cls("sorcerer", 3, { subclassId: "draconic" })], b), R).hp.max.value - plain).toBe(3);
    });
    it("Warlock: slot del patto separati (3 slot di 5° al 11°), 28 invocazioni con prerequisiti", () => {
      const w = R.classes.get("warlock")!;
      expect(w.caster).toBe("pact");
      expect(w.spellSlots).toBeUndefined();
      expect(w.pactSlots![10]).toEqual({ count: 3, level: 5 });
      const inv = w.choices.find((c) => c.id === "warlock_invocations")!;
      expect(inv.options).toHaveLength(28);
      const blade = inv.options!.find((o) => o.id === "devouring_blade")!;
      expect(blade.requires).toBe("classLevel:warlock>=12 && hasFeature:thirsting_blade");
      // scegliere un'invocazione la rende "posseduta" per i prerequisiti di quelle successive
      const ctx = buildCtx(mk([cls("warlock", 5)], { decisions: { warlock_invocations: ["pact_of_the_blade"] } }), R);
      expect(ctx.features.has("pact_of_the_blade")).toBe(true);
    });
    it("Warlock Celestiale/Grande Antico: resistenze; Astuzia magica e Luce guaritrice come risorse", () => {
      expect(computeCharacter(mk([cls("warlock", 6, { subclassId: "celestial" })]), R).resistances).toEqual(["radiant"]);
      expect(computeCharacter(mk([cls("warlock", 10, { subclassId: "great_old_one" })]), R).resistances).toEqual(["psychic"]);
      expect(computeCharacter(mk([cls("warlock", 3, { subclassId: "celestial" })]), R).resources.healing_light?.max.value).toBe(4);
      expect(computeCharacter(mk([cls("warlock", 2)]), R).resources.magical_cunning?.max.value).toBe(1);
    });
    it("Mago: libro degli incantesimi (6), Recupero arcano, Studioso; 6 incantesimi di partenza", () => {
      const w = R.classes.get("wizard")!;
      expect(w.features.find((f) => f.id === "spellcasting")!.choices[0]).toMatchObject({ id: "wizard_spellbook", count: 6 });
      expect(computeCharacter(mk([cls("wizard", 1)]), R).resources.arcane_recovery?.max.value).toBe(1);
      const d = computeCharacter(mk([cls("wizard", 2)], { decisions: { wizard_skills: ["arcana", "history"], wizard_scholar: ["arcana"] } }), R);
      expect(d.skills.arcana.proficiency).toBe("expertise");
      expect(w.spellSlots![16]).toEqual([4, 3, 3, 3, 2, 1, 1, 1, 1]);
    });
    it("classi con lista di incantesimi: colonne trucchetti/preparati (tranne Paladino e Ranger)", () => {
      for (const id of ["bard", "cleric", "druid", "sorcerer", "warlock", "wizard"]) expect(R.classes.get(id)!.table.trucchetti, id).toBeDefined();
      for (const id of ["paladin", "ranger"]) expect(R.classes.get(id)!.table.trucchetti, id).toBeUndefined();
    });
  });

  describe("correzioni del DATA_TODO", () => {
    const R = fullRuleset();
    const cls = (classId: string, level: number, extra: object = {}) => ({ classId, level, hpRolls: [], ...extra });
    const mk = (classes: ReturnType<typeof cls>[], over: object = {}) => testCharacter({ classes, ...over });
    const spellsOf = (ch: ReturnType<typeof mk>) => computeCharacter(ch, R).grantedSpells;

    it("caratteristica da incantatore della specie: la scelta spell_ability arriva agli incantesimi concessi", () => {
      const drow = spellsOf(mk([cls("fighter", 3)], { speciesId: "elf", decisions: { elven_lineage: ["drow"], spell_ability: ["wis"] } }));
      const dl = drow.find((x) => x.spell === "dancing_lights")!;
      expect(dl.ability).toBe("wis");
      expect(dl.dc).toBe(8 + 0 + 2); // Sag 10 (+0), competenza +2
      expect(drow.find((x) => x.spell === "faerie_fire")).toMatchObject({ ability: "wis", freeCast: { uses: 1, recharge: "long_rest" } });
      expect(spellsOf(mk([cls("fighter", 1)], { speciesId: "elf", decisions: { elven_lineage: ["drow"] } }))[0]!.ability).toBeUndefined(); // scelta non ancora fatta
      const t = spellsOf(mk([cls("fighter", 1)], { speciesId: "tiefling", decisions: { spell_ability: ["cha"], fiendish_legacy: ["infernal"] } }));
      expect(t.find((x) => x.spell === "thaumaturgy")!.ability).toBe("cha");
      const g = spellsOf(mk([cls("fighter", 1)], { speciesId: "gnome", decisions: { gnomish_lineage: ["forest_gnome"], spell_ability: ["int"] } }));
      expect(g.find((x) => x.spell === "speak_with_animals")!.freeCast).toEqual({ uses: 2, recharge: "long_rest" }); // bonus competenza
    });
    it("incantesimi di classe e sottoclasse usano la caratteristica della classe", () => {
      const life = spellsOf(mk([cls("cleric", 3, { subclassId: "life" })], { baseScores: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 } }));
      expect(life.find((x) => x.spell === "bless")).toMatchObject({ ability: "wis", dc: 8 + 3 + 2, attack: 5 });
    });
    it("Iniziato alla magia: caratteristica dalla scelta; due acquisizioni con liste diverse", () => {
      const ch = mk([cls("fighter", 1)], { feats: [
        { featId: "magic_initiate", choices: { magic_initiate_ability: ["wis"], magic_initiate_cantrips: ["guidance", "resistance"], magic_initiate_spell: ["cure_wounds"] } },
        { featId: "magic_initiate", choices: { magic_initiate_ability: ["int"], magic_initiate_cantrips: ["light", "mage_hand"], magic_initiate_spell: ["sleep"] } },
      ] });
      const sp = spellsOf(ch);
      expect(sp.find((x) => x.spell === "guidance")!.ability).toBe("wis");
      expect(sp.find((x) => x.spell === "mage_hand")!.ability).toBe("int");
      expect(sp.find((x) => x.spell === "sleep")).toMatchObject({ ability: "int", mode: "alwaysPrepared", freeCast: { uses: 1, recharge: "long_rest" } });
      expect(sp.filter((x) => x.mode === "cantrip")).toHaveLength(4);
    });
    it("Resiliente ripetuto: una scelta per acquisizione (For e Sag)", () => {
      const d = computeCharacter(mk([cls("fighter", 8)], { baseScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        feats: [{ featId: "resilient", choices: { resilient_save: ["wis"] } }, { featId: "resilient", choices: { resilient_save: ["cha"] } }] }), R);
      expect([d.saves.wis.proficient, d.saves.cha.proficient, d.saves.int.proficient]).toEqual([true, true, false]);
    });
    it("un talento non ripetibile non si somma (background + talento scelto)", () => {
      const once = computeCharacter(mk([cls("fighter", 1)], { backgroundId: "criminal" }), R).initiative.value; // Allerta dal background
      const twice = computeCharacter(mk([cls("fighter", 1)], { backgroundId: "criminal", feats: [{ featId: "alert" }] }), R).initiative.value;
      expect(twice).toBe(once);
    });
    it("Mente acuta / Osservatore: Maestria se sei già competente", () => {
      const sage = { backgroundId: "sage" }; // Arcano e Storia dal background
      const km = (pick: string) => computeCharacter(mk([cls("fighter", 4)], { ...sage, feats: [{ featId: "keen_mind", choices: { keen_mind_skill: [pick] } }] }), R);
      expect(km("history").skills.history.proficiency).toBe("expertise");
      expect(km("nature").skills.nature.proficiency).toBe("proficient");
    });
    it("Guerriero benedetto/druidico: 2 trucchetti con Car/Sag, in alternativa allo Stile", () => {
      const p = R.classes.get("paladin")!.features.find((f) => f.id === "fighting_style")!;
      expect(p.choices.map((c) => [c.id, c.group])).toEqual([["paladin_fighting_style", "paladin_style"], ["paladin_blessed_warrior", "paladin_style"]]);
      const bw = spellsOf(mk([cls("paladin", 2)], { decisions: { paladin_blessed_warrior: ["guidance", "sacred_flame"] } }));
      expect(bw.filter((x) => x.mode === "cantrip").map((x) => [x.spell, x.ability])).toEqual([["guidance", "cha"], ["sacred_flame", "cha"]]);
      const dw = spellsOf(mk([cls("ranger", 2)], { decisions: { ranger_druidic_warrior: ["druidcraft"] } }));
      expect(dw.find((x) => x.spell === "druidcraft")!.ability).toBe("wis");
    });
    it("Libro del Mago: 6 incantesimi al 1°, +2 a livello (formula)", () => {
      const c = R.classes.get("wizard")!.features.find((f) => f.id === "spellcasting")!.choices[0]!;
      const n = (l: number) => evalValue(c.countFormula!, { pb: 2, level: l, classLevels: { wizard: l }, scores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } });
      expect([n(1), n(2), n(5)]).toEqual([6, 8, 14]);
    });
    it("Studente della guerra: l'abilità è dalla lista del Guerriero", () => {
      const c = R.subclasses.get("battle_master")!.features.find((f) => f.id === "student_of_war")!.choices.find((k) => k.id === "battle_master_skill")!;
      expect(c.options!.map((o) => o.id).sort()).toEqual([...(R.classes.get("fighter")!.skillChoices.from as string[])].sort());
    });
    it("incantesimi sempre preparati scritti solo a parole: Fascino, Antichi Grandi, Abiurista, Illusionista, Stelle, Guerriero psionico", () => {
      const has = (c: ReturnType<typeof cls>, spell: string) => spellsOf(mk([c])).find((x) => x.spell === spell);
      expect(has(cls("bard", 3, { subclassId: "glamour" }), "mirror_image")).toBeDefined();
      expect(has(cls("bard", 5, { subclassId: "glamour" }), "command")).toBeUndefined();
      expect(has(cls("bard", 6, { subclassId: "glamour" }), "command")!.freeCast).toEqual({ uses: 1, recharge: "long_rest" });
      expect(has(cls("bard", 20), "power_word_kill")).toBeDefined();
      expect(has(cls("warlock", 10, { subclassId: "great_old_one" }), "hex")).toBeDefined();
      expect(has(cls("wizard", 10, { subclassId: "abjurer" }), "counterspell")).toBeDefined();
      expect(has(cls("wizard", 6, { subclassId: "illusionist" }), "summon_fey")!.freeCast).toBeDefined();
      expect(has(cls("druid", 3, { subclassId: "stars" }), "guiding_bolt")).toBeDefined();
      expect(has(cls("fighter", 18, { subclassId: "psi_warrior" }), "telekinesis")).toMatchObject({ ability: "int" });
      expect(has(cls("bard", 6, { subclassId: "lore" }), "hex")).toBeUndefined();
    });
    it("Circolo della Terra: resistenza dal 10° secondo il terreno scelto", () => {
      const r = (l: number, t: string) => computeCharacter(mk([cls("druid", l, { subclassId: "land" })], { decisions: { land_terrain: [t] } }), R).resistances;
      expect(r(9, "arid")).toEqual([]);
      expect(r(10, "arid")).toEqual(["fire"]);
      expect(r(10, "polar")).toEqual(["cold"]);
      expect(r(10, "temperate")).toEqual(["lightning"]);
      expect(r(10, "tropical")).toEqual(["poison"]);
    });
    it("Scurovisione additiva: 60 ft, oppure +60 se l'hai già (Cacciatore delle tenebre, Ombra)", () => {
      const dv = (species: string, c: ReturnType<typeof cls>) => computeCharacter(mk([c], { speciesId: species }), R).senses.darkvision?.value;
      expect(dv("human", cls("ranger", 3, { subclassId: "gloom_stalker" }))).toBe(60);
      expect(dv("dwarf", cls("ranger", 3, { subclassId: "gloom_stalker" }))).toBe(180); // 120 + 60
      expect(dv("elf", cls("monk", 3, { subclassId: "shadow" }))).toBe(120); // 60 + 60
      expect(dv("human", cls("ranger", 2))).toBeUndefined();
    });
    it("Maestro d'armi, Adepto elementale, Incantatore rituale, Tocco fatato: scelte con filtri", () => {
      const f = (id: string) => R.feats.get(id)!;
      expect(f("weapon_master").choices[0]).toMatchObject({ source: "weaponMastery", count: 1 });
      expect(f("elemental_adept").choices[0]!.options!.map((o) => o.id)).toEqual(["acid", "cold", "fire", "lightning", "thunder"]);
      expect(f("ritual_caster").choices[0]).toMatchObject({ countFormula: "pb", filter: { level: 1, ritual: true } });
      expect(f("fey_touched").choices[1]!.filter).toEqual({ level: 1, schools: ["enchantment", "divination"] });
      expect(f("shadow_touched").choices[1]!.filter!.schools).toEqual(["illusion", "necromancy"]);
      const ft = spellsOf(mk([cls("fighter", 4)], { feats: [{ featId: "fey_touched", choices: { fey_touched_ability: ["cha"], fey_touched_spell: ["command"] } }] }));
      expect(ft.map((x) => [x.spell, x.ability])).toEqual([["misty_step", "cha"], ["command", "cha"]]);
    });
    it("nessun needsReview rimasto sui talenti codificati", () => {
      const left = [...R.feats.values()].filter((x) => x.needsReview).map((x) => x.id);
      expect(left).toEqual(["dueling"]); // solo Duellare (dipende dalle armi, step 9)
    });
  });
});
