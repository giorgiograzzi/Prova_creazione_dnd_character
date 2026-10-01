// Lotto 5 di PLAN2 — Chierico, Druido e Bardo: Incanalare divinità, Forma selvatica, Ispirazione bardica, modificatori degli incantesimi. Numeri dai riepiloghi in docs/rules.
import { action, active, lvl, ranges, rider, T, type Patch } from "./play-lot1";

type Json = Record<string, any>;
const CD_WIS = "8 + mod:wis + pb";
const dieOf = (v: number | string) => Number(String(v).replace(/^\d*d/, ""));
// Incantesimi di cura dei dati (il riepilogo non dice quali curano: l'elenco è curato qui)
const HEALING = ["cure_wounds", "healing_word", "prayer_of_healing", "mass_cure_wounds", "mass_healing_word", "aura_of_vitality", "heal", "power_word_heal"];
const spellMod = (label: string, text: string, extra: Json = {}) => ({ op: "spellModifier", label, text, cantrip: false, ...extra });
const potent = (when?: string): Json => spellMod("Incantesimi potenti", "se il trucchetto infligge danni, aggiungi +{0} ai danni", { cantrip: true, values: ["mod:wis"], ...(when ? { when } : {}) });
const choiceOption = (f: Json, choiceId: string, optionId: string, ...effects: Json[]) => {
  const o = f.choices.find((c: Json) => c.id === choiceId)?.options?.find((x: Json) => x.id === optionId);
  if (!o) throw new Error(`Scelta ${choiceId}/${optionId} non trovata in ${f.id}`);
  (o.effects ??= []).push(...effects);
};
const dice = (from: number, to: number, cls: string) => lvl(cls, from, to);

export const LOT5: Record<string, Patch> = {
  // ── Chierico ────────────────────────────────────────────────────────────
  "cleric/channel_divinity": (f) => {
    for (const [from, to, n] of [[2, 6, 1], [7, 12, 2], [13, 17, 3], [18, 20, 4]] as const) {
      f.effects.push(action({ actionId: "divine_spark", label: "Scintilla divina", resource: "channel_divinity", die: 8, count: n, bonus: "mod:wis",
        text: "Azione Magia: una creatura entro 30 ft recupera questi PF oppure subisce questi danni necrotici o radiosi (TS Cos, CD {0}, metà se riesce).", values: [CD_WIS], when: dice(from, to, "cleric") }));
    }
    f.effects.push(
      action({ actionId: "turn_undead", label: "Scacciare non morti", resource: "channel_divinity", text: "Azione Magia: i non morti entro 30 ft, TS Sag (CD {0}) o Spaventati e Incapacitati per 1 minuto.", values: [CD_WIS], when: "classLevel:cleric<=4" }),
      action({ actionId: "turn_undead", label: "Scacciare non morti", resource: "channel_divinity", text: "Azione Magia: i non morti entro 30 ft, TS Sag (CD {0}) o Spaventati e Incapacitati per 1 minuto; chi fallisce subisce {1}d8 radiosi.", values: [CD_WIS, "max(1, mod:wis)"], when: "classLevel:cleric>=5" }));
  },
  // Colpi benedetti: le due opzioni portano i loro effetti (Colpo divino: dadi per livello; Incantesimi potenti: bonus ai trucchetti)
  "cleric/blessed_strikes": (f) => {
    const strike = (die: number, from: number, to: number) => rider({ riderId: "divine_strike", label: "Colpo divino", count: die, die: 8, limit: "turn", when: `!unarmed && ${dice(from, to, "cleric")}`, text: "Danni necrotici o radiosi, a tua scelta." });
    choiceOption(f, "blessed_strikes", "divine_strike", strike(1, 7, 13), strike(2, 14, 20));
    choiceOption(f, "blessed_strikes", "potent_spellcasting", potent(),
      spellMod("Incantesimi potenti", "tu o una creatura entro 60 ft ottiene {0} PF temporanei", { cantrip: true, values: ["2 * mod:wis"], when: "classLevel:cleric>=14" }));
  },
  // ── Vita ────────────────────────────────────────────────────────────────
  "life/disciple_of_life": (f) => { f.effects.push(spellMod("Discepolo della vita", "la cura fa recuperare altri {L+2} PF", { spells: HEALING })); },
  "life/preserve_life": (f) => {
    f.effects.push(action({ actionId: "preserve_life", label: "Preservare la vita", resource: "channel_divinity", bonus: "5 * classLevel:cleric",
      text: "Azione Magia: distribuisci questi PF tra creature Sanguinanti entro 30 ft, senza portarle oltre metà dei PF massimi." }));
  },
  "life/blessed_healer": (f) => { f.effects.push(spellMod("Guaritore benedetto", "se curi un'altra creatura, recuperi anche tu {L+2} PF", { spells: HEALING })); },
  "life/supreme_healing": (f) => { f.effects.push(spellMod("Guarigione suprema", "i dadi di cura valgono il massimo", { spells: HEALING })); },
  // ── Luce ────────────────────────────────────────────────────────────────
  "light/radiance_of_the_dawn": (f) => {
    f.effects.push(action({ actionId: "radiance_of_the_dawn", label: "Radiosità dell'alba", resource: "channel_divinity", die: 10, count: 2, bonus: "classLevel:cleric",
      text: "Azione Magia: dissolvi l'oscurità magica entro 30 ft; le creature scelte entro 30 ft: TS Cos (CD {0}) o questi danni radiosi, metà se riesce.", values: [CD_WIS] }));
  },
  "light/improved_warding_flare": (f) => {
    f.effects.push(action({ actionId: "improved_warding_flare", label: "PF temporanei del Bagliore", resource: "warding_flare", cost: 0, die: 6, count: 2, bonus: "mod:wis", text: "La creatura protetta ottiene questi PF temporanei." }));
  },
  "light/corona_of_light": (f) => { f.activation = { resource: "corona_of_light", duration: "1 minuto" }; },
  // ── Inganno e Guerra ────────────────────────────────────────────────────
  "trickery/invoke_duplicity": (f) => {
    f.activation = { resource: "channel_divinity", duration: "1 minuto" };
    f.effects.push({ op: "note", text: "Vantaggio agli attacchi contro creature entro 5 ft dal duplicato (puoi lanciare incantesimi dal suo spazio)", when: active("invoke_duplicity") });
  },
  "war/guided_strike": (f) => {
    f.effects.push(action({ actionId: "guided_strike", label: "Colpo guidato", resource: "channel_divinity", bonus: 10, text: "Quando tu o una creatura entro 30 ft manca un attacco: +10 al tiro." }));
  },
  "war/war_gods_blessing": (f) => {
    f.effects.push(action({ actionId: "war_gods_blessing", label: "Benedizione del dio della guerra", resource: "channel_divinity", text: "Lanci Scudo della fede o Arma spirituale senza slot, senza Concentrazione, per 1 minuto." }));
  },
  "war/avatar_of_battle": (f) => { f.effects.push({ op: "resistance", types: ["bludgeoning", "piercing", "slashing"] }); },
  // ── Druido ──────────────────────────────────────────────────────────────
  "druid/wild_shape": (f) => {
    f.effects.push(action({ actionId: "wild_shape_hp", label: "PF temporanei della forma", resource: "wild_shape", cost: 0, bonus: "classLevel:druid", apply: "tempHp",
      text: "Quando assumi la forma.", when: `!hasFeature:circle_forms && ${active("wild_shape")}`, onActivate: "wild_shape" }));
  },
  "druid/elemental_fury": (f) => {
    const strike = (n: number, from: number, to: number) => rider({ riderId: "primal_strike", label: "Colpo primordiale", count: n, die: 8, limit: "turn", when: dice(from, to, "druid"),
      text: "Freddo, fuoco, fulmine o tuono, a tua scelta: con un'arma o in forma bestiale." });
    choiceOption(f, "elemental_fury", "primal_strike", strike(1, 7, 14), strike(2, 15, 20));
    choiceOption(f, "elemental_fury", "potent_spellcasting", potent(),
      { op: "note", text: "Incantesimi potenti: i trucchetti con gittata di almeno 10 ft ottengono +300 ft", when: "classLevel:druid>=15" });
  },
  "land/lands_aid": (f) => {
    for (const [from, to, n] of [[3, 9, 2], [10, 13, 3], [14, 20, 4]] as const) {
      f.effects.push(action({ actionId: "lands_aid", label: "Aiuto della terra", resource: "wild_shape", die: 6, count: n,
        text: "Azione Magia: sfera di 10 ft entro 60 ft; le creature scelte: TS Cos (CD {0}) o questi danni necrotici (metà se riesce); una creatura scelta recupera lo stesso tiro in PF.", values: [CD_WIS], when: dice(from, to, "druid") }));
    }
  },
  "land/natures_ward": (f) => { f.effects.push({ op: "conditionImmunity", conditions: ["poisoned"] }); },
  "land/natures_sanctuary": (f) => {
    f.effects.push(action({ actionId: "natures_sanctuary", label: "Santuario della natura", resource: "wild_shape", text: "Azione Magia: cubo di 15 ft entro 120 ft per 1 minuto; mezza copertura e resistenza di Protezione della natura per te e gli alleati dentro." }));
  },
  // Luna: in Forma selvatica CA 13 + Sag (l'armatura non conta) e PF temporanei ×3
  "moon/circle_forms": (f) => {
    f.effects.push({ op: "acFormula", formula: "13 + mod:wis", shieldAllowed: false, ignoresArmor: true, when: active("wild_shape") },
      action({ actionId: "wild_shape_hp", label: "PF temporanei della forma", resource: "wild_shape", cost: 0, bonus: "3 * classLevel:druid", apply: "tempHp", text: "Quando assumi la forma.", when: active("wild_shape"), onActivate: "wild_shape" }));
  },
  "moon/improved_circle_forms": (f) => { f.effects.push({ op: "saveBonus", value: "mod:wis", ability: "con", when: active("wild_shape") }); },
  "moon/lunar_form": (f) => {
    f.effects.push(rider({ riderId: "lunar_form", label: "Forma lunare", count: 2, die: 10, damageType: "radiant", limit: "turn", when: active("wild_shape") }));
  },
  "sea/wrath_of_the_sea": (f) => {
    f.activation = { resource: "wild_shape", duration: "10 minuti" };
    f.effects.push(action({ actionId: "wrath_of_the_sea", label: "Ira del mare", resource: "wild_shape", cost: 0, die: 6, count: "max(1, mod:wis)",
      text: "Quando attivi l'emanazione e come Azione Bonus: una creatura nell'emanazione, TS Cos (CD {0}) o questi danni da freddo e, se Grande o inferiore, spinta di 15 ft.", values: [CD_WIS], when: active("wrath_of_the_sea") }));
  },
  "sea/aquatic_affinity": (f) => { f.effects.push({ op: "setSpeed", mode: "swim", value: "speed" }); },
  "sea/stormborn": (f) => {
    f.effects.push({ op: "setSpeed", mode: "fly", value: "speed", when: active("wrath_of_the_sea") }, { op: "resistance", types: ["cold", "lightning", "thunder"], when: active("wrath_of_the_sea") });
  },
  // Stelle: Forma stellare con la scelta della costellazione
  "stars/starry_form": (f) => {
    f.activation = { resource: "wild_shape", label: T("Costellazione"), duration: "10 minuti", options: [
      { id: "archer", name: T("Arciere"), description: "Azione Bonus: attacco con incantesimo a distanza (60 ft) con danni radiosi.",
        effects: [[3, 9, 1], [10, 20, 2]].map(([from, to, n]) => action({ actionId: "starry_archer", label: "Arciere", resource: "wild_shape", cost: 0, die: 8, count: n, bonus: "mod:wis",
          text: "Azione Bonus: attacco con incantesimo a distanza entro 60 ft; questi danni radiosi.", when: dice(from!, to!, "druid") })) },
      { id: "chalice", name: T("Calice"), description: "Curando con uno slot, tu o una creatura entro 30 ft recupera PF extra.",
        effects: [[3, 9, 1], [10, 20, 2]].map(([from, to, n]) => spellMod("Calice", `curando con uno slot, tu o una creatura entro 30 ft recupera ${n}d8 + {0} PF`, { spells: HEALING, values: ["mod:wis"], when: dice(from!, to!, "druid") })) },
      { id: "dragon", name: T("Drago"), description: "Prove di Intelligenza e Saggezza: un risultato di 9 o meno conta come 10.",
        effects: [{ op: "rollFloor", min: 10, on: "die", abilities: ["int", "wis"], proficientOnly: false, saves: false, rawChecks: true },
          { op: "setSpeed", mode: "fly", value: 20, when: "classLevel:druid>=10" }] },
    ] };
  },
  "stars/full_of_stars": (f) => { f.effects.push({ op: "resistance", types: ["bludgeoning", "piercing", "slashing"], when: active("starry_form") }); },
  "stars/cosmic_omen": (f) => {
    f.effects.push(action({ actionId: "cosmic_omen", label: "Presagio cosmico", resource: "cosmic_omen", die: 6, text: "Reazione: aggiungi (Buon auspicio) o sottrai (Cattivo auspicio) il dado a una prova d20 di una creatura entro 30 ft." }));
  },
  // ── Bardo ───────────────────────────────────────────────────────────────
  "bard/bardic_inspiration": (f, cls) => {
    for (const [from, to, v] of ranges(cls.table?.dado_ispirazione ?? [])) {
      f.effects.push(action({ actionId: "bardic_inspiration", label: `Dai Ispirazione bardica (d${dieOf(v)})`, resource: "bardic_inspiration",
        text: "Azione Bonus: una creatura entro 60 ft ottiene il dado per 1 ora; può aggiungerlo a una prova d20 fallita.", when: dice(from, to, "bard") }));
    }
  },
  // Fonte di ispirazione: gli usi tornano anche con il Riposo Breve (vince la ricarica più frequente)
  "bard/font_of_inspiration": (f) => { f.effects.push({ op: "resource", resourceId: "bardic_inspiration", uses: "max(1, mod:cha)", recharge: "short_rest" }); },
  "dance/tandem_footwork": (f, _s, cls) => { spendInspiration(f, cls, "tandem_footwork", "Passi in tandem", "Tirando l'Iniziativa: tiri il dado e lo aggiungi all'Iniziativa tua e degli alleati entro 30 ft."); },
  "lore/cutting_words": (f, sub, cls) => { void sub; spendInspiration(f, cls, "cutting_words", "Parole taglienti", "Reazione: una creatura entro 60 ft riesce un tiro di danno, una prova o un tiro per colpire: sottrai il dado dal risultato."); },
  "lore/peerless_skill": (f, sub, cls) => { void sub; spendInspiration(f, cls, "peerless_skill", "Abilità impareggiabile", "Se fallisci una prova o un tiro per colpire: aggiungi il dado; se fallisci comunque, l'uso non si spende (rimettilo con +)."); },
  "glamour/mantle_of_inspiration": (f, sub, cls) => { void sub; spendInspiration(f, cls, "mantle_of_inspiration", "Manto dell'ispirazione", "Azione Bonus: fino a mod Car creature entro 60 ft ottengono PF temporanei pari al doppio del risultato e possono muoversi senza attacchi di opportunità."); },
  "glamour/unbreakable_majesty": (f) => { f.activation = { resource: "unbreakable_majesty", duration: "1 minuto" }; },
};

// Un uso di Ispirazione bardica con il dado del livello (colonna della tabella del Bardo)
function spendInspiration(f: Json, cls: Json | undefined, id: string, label: string, text: string) {
  for (const [from, to, v] of ranges(cls?.table?.dado_ispirazione ?? [])) {
    f.effects.push(action({ actionId: id, label: `${label} (d${dieOf(v)})`, resource: "bardic_inspiration", die: dieOf(v), text, when: dice(from, to, "bard") }));
  }
}
