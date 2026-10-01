// Lotto 6 di PLAN2 — Stregone, Mago e Warlock: punti stregoneria e Metamagia, Incantesimi distintivi, Padronanza, Arcanum mistico, invocazioni.
// Numeri dai riepiloghi in docs/rules; le opzioni di Metamagia e le invocazioni vengono dall'estrazione a parte (private/raw), con nomi e testi nostri in italiano.
import { action, active, lvl, rider, T, type Patch } from "./play-lot1";

type Json = Record<string, any>;
const SP = "font_of_magic";
const spellMod = (label: string, text: string, extra: Json = {}) => ({ op: "spellModifier", label, text, cantrip: false, ...extra });
const choiceOf = (owner: Json, id: string): Json => {
  const c = (owner.choices ?? []).find((x: Json) => x.id === id);
  if (!c) throw new Error(`Scelta ${id} non trovata in ${owner.id}`);
  return c;
};
// Un incantesimo lanciabile a volontà senza slot (invocazioni, Padronanza): sempre preparato, lancio gratuito illimitato
const atWill = (spell: string): Json => ({ op: "grantSpell", spell, mode: "alwaysPrepared", ability: "cha", freeCast: { uses: 1, recharge: "none", unlimited: true } });
const opt = (id: string, name: string, description: string, extra: Json = {}, ...effects: Json[]): Json => ({ id, name: T(name), description, effects, ...extra });

// Metamagia: nome, costo in punti stregoneria e riassunto in parole nostre
const METAMAGIC: [string, string, number, string][] = [
  ["careful_spell", "Incantesimo cauto", 1, "Scegli fino a Car creature (almeno una): superano il TS in automatico e non subiscono nemmeno metà danni."],
  ["distant_spell", "Incantesimo distante", 1, "Raddoppi la gittata (da 5 ft in su); a contatto diventa 30 ft."],
  ["empowered_spell", "Incantesimo potenziato", 1, "Ritiri fino a Car dadi di danno (almeno uno) e usi i nuovi risultati; si somma a un'altra Metamagia."],
  ["extended_spell", "Incantesimo prolungato", 1, "Durata raddoppiata (da 1 minuto in su, massimo 24 ore); se serve Concentrazione, Vantaggio al TS per mantenerla."],
  ["heightened_spell", "Incantesimo accentuato", 2, "Un bersaglio ha Svantaggio ai TS contro l'incantesimo."],
  ["quickened_spell", "Incantesimo rapido", 2, "Il tempo di lancio passa da azione ad Azione Bonus; non se hai già lanciato un incantesimo di 1°+ nel turno."],
  ["seeking_spell", "Incantesimo cercatore", 1, "Se manchi con il tiro per colpire dell'incantesimo, ritiri il d20; si somma a un'altra Metamagia."],
  ["subtle_spell", "Incantesimo sottile", 1, "Lanci senza componenti verbali, somatiche o materiali (tranne materiali consumati o con un costo)."],
  ["transmuted_spell", "Incantesimo trasmutato", 1, "Cambi il tipo di danno tra acido, freddo, fuoco, fulmine, veleno e tuono."],
  ["twinned_spell", "Incantesimo gemello", 1, "Conta come uno slot di un livello più alto per bersagliare una creatura in più (negli incantesimi che lo permettono)."],
];

// Invocazioni: [id, nome, riassunto, requisito (condizione), effetti]
const PACT = (id: string) => `hasFeature:${id}`;
const L = (n: number) => `classLevel:warlock>=${n}`;
const INVOCATIONS: [string, string, string, string | undefined, Json[]][] = [
  ["agonizing_blast", "Deflagrazione agonizzante", "Scegli un trucchetto da Warlock che infligge danni: aggiungi Car ai suoi danni. Ripetibile con trucchetti diversi.", L(2),
    [spellMod("Deflagrazione agonizzante", "con il trucchetto scelto: +{0} ai danni", { cantrip: true, values: ["mod:cha"] })]],
  ["armor_of_shadows", "Armatura d'ombra", "Lanci Armatura magica su di te senza slot.", undefined, [atWill("mage_armor")]],
  ["ascendant_step", "Passo ascendente", "Lanci Levitazione su di te senza slot.", L(5), [atWill("levitate")]],
  ["devils_sight", "Vista del diavolo", "Vedi normalmente nella luce fioca e nell'oscurità, anche magica, entro 120 ft.", L(2), [{ op: "sense", kind: "darkvision", range: 120 }]],
  ["devouring_blade", "Lama divoratrice", "L'attacco extra della Lama assetata diventa di due attacchi extra.", `${L(12)} && ${PACT("thirsting_blade")}`, []],
  ["eldritch_mind", "Mente occulta", "Vantaggio ai TS di Costituzione per mantenere la Concentrazione.", undefined,
    [{ op: "note", text: "Vantaggio ai TS di Costituzione per mantenere la Concentrazione" }]],
  ["eldritch_smite", "Colpo occulto", "Una volta per turno, colpendo con l'arma del patto puoi spendere uno slot del Patto: +1d8 di forza più 1d8 per livello dello slot, e Prono se il bersaglio è Enorme o più piccolo.", `${L(5)} && ${PACT("pact_of_the_blade")}`,
    [rider({ riderId: "eldritch_smite", label: "Colpo occulto", count: 1, die: 8, damageType: "force", limit: "turn", pactSlot: true, perSlotLevel: 1, when: "attackType:melee",
      text: "Con l'arma del patto; se il bersaglio è Enorme o più piccolo può cadere Prono." })]],
  ["eldritch_spear", "Lancia occulta", "Scegli un trucchetto da Warlock che infligge danni, con gittata di almeno 10 ft: la gittata aumenta di 30 ft per livello da Warlock. Ripetibile.", L(2),
    [spellMod("Lancia occulta", "con il trucchetto scelto: gittata +{0} ft", { cantrip: true, values: ["30 * classLevel:warlock"] })]],
  ["fiendish_vigor", "Vigore immondo", "Lanci Vita falsa su di te senza slot, con il risultato massimo dei PF temporanei.", L(2), [atWill("false_life")]],
  ["gaze_of_two_minds", "Sguardo delle due menti", "Azione Bonus: percepisci attraverso i sensi di una creatura consenziente toccata, fino alla fine del tuo prossimo turno (si mantiene con altre Azioni Bonus).", L(5), []],
  ["gift_of_the_depths", "Dono degli abissi", "Respiri sott'acqua e hai Velocità di nuotare pari alla Velocità; lanci Respirare sott'acqua una volta per Riposo Lungo.", L(5),
    [{ op: "setSpeed", mode: "swim", value: "speed" }, { op: "grantSpell", spell: "water_breathing", mode: "alwaysPrepared", ability: "cha", freeCast: { uses: 1, recharge: "long_rest" } }]],
  ["gift_of_the_protectors", "Dono dei protettori", "Una pagina del Libro delle ombre: le creature con il nome scritto (fino a Car) scendono a 1 PF invece che a 0 una volta, finché non finisci un Riposo Lungo.", `${L(9)} && ${PACT("pact_of_the_tome")}`, []],
  ["investment_of_the_chain_master", "Investitura del maestro della catena", "Quando lanci Trova famiglio, il famiglio ottiene volo o nuoto 40 ft, attacco veloce, danni necrotici o radiosi, la tua CD e la resistenza con la tua Reazione.", `${L(5)} && ${PACT("pact_of_the_chain")}`, []],
  ["lessons_of_the_first_ones", "Lezioni dei Primi", "Ottieni un talento di Origine a tua scelta. Ripetibile con talenti diversi (da aggiungere a mano ai talenti del personaggio).", L(2), []],
  ["lifedrinker", "Bevitore di vita", "Una volta per turno, colpendo con l'arma del patto: +1d6 necrotici, psichici o radiosi; puoi spendere un Dado Vita per recuperare PF pari al tiro + Cos.", `${L(9)} && ${PACT("pact_of_the_blade")}`,
    [rider({ riderId: "lifedrinker", label: "Bevitore di vita", count: 1, die: 6, limit: "turn", when: "attackType:melee", text: "Necrotici, psichici o radiosi, a tua scelta; con l'arma del patto." })]],
  ["mask_of_many_faces", "Maschera dai molti volti", "Lanci Camuffare sé stessi senza slot.", L(2), [atWill("disguise_self")]],
  ["master_of_myriad_forms", "Maestro delle mille forme", "Lanci Alterare sé stessi senza slot.", L(5), [atWill("alter_self")]],
  ["misty_visions", "Visioni nebbiose", "Lanci Immagine silenziosa senza slot.", L(2), [atWill("silent_image")]],
  ["one_with_shadows", "Uno con le ombre", "In luce fioca o oscurità lanci Invisibilità su di te senza slot.", L(5), [atWill("invisibility")]],
  ["otherworldly_leap", "Balzo ultraterreno", "Lanci Saltare su di te senza slot.", L(2), [atWill("jump")]],
  ["pact_of_the_blade", "Patto della lama", "Azione Bonus: evochi un'arma del patto (o leghi un'arma magica): competenza, focus, Car per attacco e danni, danni necrotici, psichici o radiosi a scelta.", undefined, []],
  ["pact_of_the_chain", "Patto della catena", "Impari Trova famiglio (lo lanci senza slot) con forme speciali; un tuo attacco può lasciarlo attaccare con la sua Reazione.", undefined, [atWill("find_familiar")]],
  ["pact_of_the_tome", "Patto del tomo", "Un Libro delle ombre con 3 trucchetti e 2 rituali di 1° livello, da qualsiasi lista, preparati finché hai il libro.", undefined, []],
  ["repelling_blast", "Deflagrazione repulsiva", "Con un trucchetto scelto che richiede un tiro per colpire, spingi di 10 ft una creatura Grande o più piccola che colpisci. Ripetibile.", L(2),
    [spellMod("Deflagrazione repulsiva", "con il trucchetto scelto: se colpisci una creatura Grande o più piccola, la spingi di 10 ft", { cantrip: true })]],
  ["thirsting_blade", "Lama assetata", "Attacco extra: attacchi due volte con l'arma del patto quando fai l'azione di Attacco.", `${L(5)} && ${PACT("pact_of_the_blade")}`, []],
  ["visions_of_distant_realms", "Visioni di reami lontani", "Lanci Occhio arcano senza slot.", L(9), [atWill("arcane_eye")]],
  ["whispers_of_the_grave", "Sussurri della tomba", "Lanci Parlare con i morti senza slot.", L(7), [atWill("speak_with_dead")]],
  ["witch_sight", "Vista della strega", "Hai Vista del vero entro 30 ft.", L(15), [{ op: "sense", kind: "truesight", range: 30 }]],
];

export const LOT6: Record<string, Patch> = {
  // ── Stregone ────────────────────────────────────────────────────────────
  "sorcerer/innate_sorcery": (f) => {
    f.activation = { resource: "innate_sorcery", cost: 1, duration: "1 minuto", alt: { resource: SP, cost: 2, when: "hasFeature:sorcery_incarnate" } };
    f.effects.push({ op: "spellBonus", dc: 1, advantage: true, when: active("innate_sorcery") });
  },
  "sorcerer/metamagic": (_f, cls) => {
    choiceOf(cls, "sorcerer_metamagic").options = METAMAGIC.map(([id, name, cost, d]) => ({ id, name: T(name), description: d, cost, effects: [] }));
  },
  "sorcerer/sorcerous_restoration": (f) => {
    f.effects.push(action({ actionId: "sorcerous_restoration", label: "Ripristina punti stregoneria", resource: "sorcerous_restoration", restore: { resource: SP, amount: "floor(classLevel:sorcerer / 2)" },
      text: "Terminando un Riposo Breve: recuperi punti fino a metà del livello." }));
  },
  // ── Stirpe draconica ────────────────────────────────────────────────────
  "draconic/elemental_affinity": (f) => {
    f.choices.push({ id: "draconic_affinity", label: T("Tipo di danno dell'ascendenza"), count: 1, distinct: true,
      options: [["acid", "Acido"], ["cold", "Freddo"], ["fire", "Fuoco"], ["lightning", "Fulmine"], ["poison", "Veleno"]].map(([t, n]) => opt(`affinity_${t}`, n!, `Resistenza al danno ${n!.toLowerCase()} e + Car a un tiro di danno degli incantesimi di quel tipo.`, {},
        { op: "resistance", types: [t] }, spellMod("Affinità elementale", `se infligge danni da ${n!.toLowerCase()}: +{0} a un tiro di danno`, { all: true, values: ["mod:cha"] }))) });
  },
  "draconic/dragon_wings": (f) => { f.activation = { ...(f.activation ?? {}), alt: { resource: SP, cost: 3 } }; },
  // ── Magia meccanica ─────────────────────────────────────────────────────
  "clockwork/bastion_of_law": (f) => {
    f.effects.push(action({ actionId: "bastion_of_law", label: "Bastione della legge (1-5 punti)", resource: SP, variable: true, die: 8,
      text: "Azione Magia: una creatura entro 30 ft ottiene altrettanti d8 da tirare per ridurre i danni subiti (fino al Riposo Lungo o a un nuovo uso)." }));
  },
  "clockwork/trance_of_order": (f) => {
    f.activation = { resource: "trance_of_order", duration: "1 minuto", alt: { resource: SP, cost: 5 } };
    f.effects.push({ op: "rollFloor", min: 10, on: "die", saves: true, rawChecks: true, proficientOnly: false, when: active("trance_of_order") },
      { op: "note", text: "Gli attacchi contro di te non hanno Vantaggio; nei tuoi tiri d20 (anche per colpire) un 9 o meno conta come 10", when: active("trance_of_order") });
  },
  "clockwork/clockwork_cavalcade": (f) => {
    f.effects.push(action({ actionId: "clockwork_cavalcade", label: "Cavalcata meccanica (uso)", resource: "clockwork_cavalcade", text: "Azione Magia: cubo di 30 ft; distribuisci 100 PF di cura, ripari oggetti e termini incantesimi di 6° livello o inferiore." }),
      action({ actionId: "clockwork_cavalcade_points", label: "Cavalcata meccanica (7 punti)", resource: SP, cost: 7, text: "Come sopra, spendendo punti stregoneria al posto dell'uso." }));
  },
  // ── Magia aberrante ─────────────────────────────────────────────────────
  "aberrant/warping_implosion": (f) => {
    f.effects.push(action({ actionId: "warping_implosion_points", label: "Implosione deformante (5 punti)", resource: SP, cost: 5, text: "Azione Magia: teletrasporto di 120 ft; le creature entro 30 ft dal punto lasciato, TS For o 3d10 danni da forza e trascinate verso di esso." }));
  },
  // ── Magia selvaggia ─────────────────────────────────────────────────────
  "wild_magic/bend_luck": (f) => {
    f.effects.push(action({ actionId: "bend_luck", label: "Piegare la fortuna (1 punto)", resource: SP, die: 4, text: "Reazione: una creatura che vedi tira un d20: aggiungi o sottrai questo dado." }));
  },
  // ── Mago ────────────────────────────────────────────────────────────────
  "wizard/signature_spells": (f) => {
    f.choices.push({ id: "wizard_signature", label: T("Incantesimi distintivi (due di 3° livello dal libro)"), count: 2, distinct: true, source: "signaturespells", filter: { level: 3, classes: ["wizard"] } });
  },
  "wizard/spell_mastery": (f) => {
    f.choices.push({ id: "wizard_mastery_1", label: T("Padronanza: un incantesimo di 1° livello dal libro"), count: 1, distinct: true, source: "masteryspells", filter: { level: 1, classes: ["wizard"] } },
      { id: "wizard_mastery_2", label: T("Padronanza: un incantesimo di 2° livello dal libro"), count: 1, distinct: true, source: "masteryspells", filter: { level: 2, classes: ["wizard"] } });
  },
  "abjurer/arcane_ward": (f) => {
    f.effects.push({ op: "resource", resourceId: "arcane_ward", uses: "2 * classLevel:wizard + mod:int", recharge: "long_rest" },
      action({ actionId: "arcane_ward", label: "La protezione assorbe danni", resource: "arcane_ward", variable: true, text: "Ogni punto speso è un PF di danno assorbito; con uno slot spendi un'Azione Bonus per ricaricarla di 2 × livello dello slot." }));
  },
  "diviner/portent": (f) => {
    for (const [from, to, n] of [[3, 13, 2], [14, 20, 3]] as const) {
      f.effects.push({ op: "resource", resourceId: "portent", uses: n, recharge: "long_rest", when: lvl("wizard", from, to) },
        action({ actionId: "portent_roll", label: "Tira i dadi del Presagio", cost: 0, die: 20, count: n, text: "Dopo un Riposo Lungo: annota i risultati.", when: lvl("wizard", from, to) }));
    }
    f.effects.push(action({ actionId: "portent_use", label: "Usa un dado del Presagio", resource: "portent", text: "Sostituisci una prova d20 di una creatura che vedi con uno dei risultati annotati (1 volta per turno)." }));
  },
  "evoker/potent_cantrip": (f) => { f.effects.push(spellMod("Trucchetto potente", "se manca o il bersaglio supera il TS, subisce comunque metà danni", { cantrip: true })); },
  "evoker/empowered_evocation": (f) => { f.effects.push(spellMod("Invocazione potenziata", "+{0} a un tiro di danno", { all: true, school: "evocation", values: ["mod:int"] })); },
  // ── Warlock ─────────────────────────────────────────────────────────────
  "warlock/eldritch_invocations": (_f, cls) => {
    choiceOf(cls, "warlock_invocations").options = INVOCATIONS.map(([id, name, d, req, fx]) => ({ id, name: T(name), description: d, ...(req ? { requires: req } : {}), effects: fx }));
  },
  "warlock/mystic_arcanum": (f) => {
    for (const [lv, spell] of [[11, 6], [13, 7], [15, 8], [17, 9]] as const) {
      f.choices.push({ id: `warlock_arcanum_${spell}`, label: T(`Arcanum mistico (incantesimo di ${spell}° livello)`), count: 1, distinct: true, source: "freespells", filter: { level: spell, classes: ["warlock"] }, when: L(lv) });
    }
  },
  "archfey/beguiling_defenses": (f) => { f.effects.push({ op: "conditionImmunity", conditions: ["charmed"] }); },
  "celestial/healing_light": (f) => {
    f.effects.push(action({ actionId: "healing_light", label: "Luce curativa (dadi)", resource: "healing_light", variable: true, die: 6, text: "Azione Bonus: una creatura entro 60 ft recupera questi PF (fino a Car dadi per volta)." }));
  },
  "celestial/radiant_soul": (f) => { f.effects.push(spellMod("Anima radiosa", "se infligge danni radiosi o da fuoco: +{0} a un tiro di danno (1 volta per turno)", { all: true, values: ["mod:cha"] })); },
  "celestial/celestial_resilience": (f) => {
    f.effects.push(action({ actionId: "celestial_resilience", label: "Resilienza celestiale (PF temporanei)", cost: 0, bonus: "classLevel:warlock + mod:cha", apply: "tempHp",
      text: "Con Astuzia magica o a fine riposo: PF temporanei per te; fino a 5 creature ottengono metà livello + Car." }));
  },
  "fiend/dark_ones_blessing": (f) => {
    f.effects.push(action({ actionId: "dark_ones_blessing", label: "Benedizione dell'Oscuro (PF temporanei)", cost: 0, bonus: "max(1, mod:cha + classLevel:warlock)", apply: "tempHp",
      text: "Quando riduci un nemico a 0 PF (o lo fa qualcuno entro 10 ft da te)." }));
  },
  "fiend/dark_ones_own_luck": (f) => {
    f.effects.push(action({ actionId: "dark_ones_own_luck", label: "Fortuna dell'Oscuro (d10)", resource: "dark_ones_own_luck", die: 10, text: "Aggiungi il dado a una prova di caratteristica o a un TS (max 1 per tiro)." }));
  },
  "fiend/fiendish_resilience": (f) => {
    f.choices.push({ id: "fiendish_resilience", label: T("Resistenza (cambia a ogni riposo)"), count: 1, distinct: true, source: "resistance" });
  },
};
