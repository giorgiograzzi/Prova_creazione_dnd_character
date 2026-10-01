// Lotto 3 di PLAN2 — Paladino e Ranger: Punizione divina a slot, aure, Marchio del cacciatore, Incanalare divinità. Numeri dai riepiloghi in docs/rules.
import { action, active, lvl, rider, T, type Patch } from "./play-lot1";

type Json = Record<string, any>;
const CD = "8 + mod:cha + pb";
const CHA = "max(1, mod:cha)";
const MARK = "concentrating:hunters_mark";

// Aura dei Paladini: raggio 10 ft, 30 ft con Espansione dell'aura (due effetti con condizioni opposte)
const aura = (auraId: string, label: string, text: string, extra: Json = {}, when?: string): Json[] => [
  { op: "aura", auraId, label, radius: 10, text, ...extra, when: [when, "!hasFeature:aura_expansion"].filter(Boolean).join(" && ") },
  { op: "aura", auraId, label, radius: 30, text, ...extra, when: [when, "hasFeature:aura_expansion"].filter(Boolean).join(" && ") },
];
const channel = (id: string, label: string, text: string, extra: Json = {}) => action({ actionId: id, label, resource: "channel_divinity", text, ...extra });
const cdValue = [CD];
const choice = (f: Json, id: string, label: string, options: Json[]) => f.choices.push({ id, label: T(label), count: 1, distinct: true, options });

export const LOT3: Record<string, Patch> = {
  // ── Paladino ────────────────────────────────────────────────────────────
  "paladin/lay_on_hands": (f) => {
    f.effects.push(
      action({ actionId: "lay_on_hands_self", label: "Imposizione delle mani su di te", resource: "lay_on_hands", variable: true, apply: "heal", text: "Azione Bonus: ogni punto speso è 1 PF." }),
      action({ actionId: "lay_on_hands_other", label: "Imposizione delle mani su un'altra creatura", resource: "lay_on_hands", variable: true, text: "Azione Bonus: la creatura toccata recupera questi PF." }),
      action({ actionId: "lay_on_hands_poison", label: "Termina Avvelenato (5 punti)", resource: "lay_on_hands", cost: 5, text: "Azione Bonus: termina la condizione Avvelenato." }));
  },
  // Punizione divina: dadi a seconda dello slot (2d8 al 1°, +1d8 per livello); un'arma da mischia o un colpo senz'armi
  "paladin/paladins_smite": (f) => {
    const base = { riderId: "divine_smite", label: "Punizione divina", count: 2, die: 8, damageType: "radiant", limit: "none", slotSpell: "divine_smite", perSlotLevel: 1,
      text: "Subito dopo aver colpito (Azione Bonus); +1d8 se il bersaglio è Immondo o Non morto." };
    f.effects.push(rider({ ...base, attackType: "melee", when: "attackType:melee" }), rider({ ...base, attackType: "any", when: "unarmed" }));
  },
  "paladin/channel_divinity": (f) => {
    f.effects.push(channel("divine_sense", "Senso divino", "Azione Bonus, 10 minuti: percepisci Celestiali, Immondi e Non morti entro 60 ft e luoghi consacrati o profanati."));
  },
  "paladin/aura_of_protection": (f) => {
    f.effects.push(...aura("protection", "Aura di protezione", "Gli alleati nell'aura aggiungono +{0} ai tiri salvezza (tu non sei Incapacitato).", { values: [CHA] }));
  },
  "paladin/aura_expansion": () => { /* le aure leggono hasFeature:aura_expansion */ },
  "paladin/abjure_foes": (f) => {
    f.effects.push(channel("abjure_foes", "Abiurare nemici", "Azione Magia: fino a {1} creature entro 60 ft, TS Sag (CD {0}) o Spaventate per 1 minuto.", { values: [CD, CHA] }));
  },
  "paladin/aura_of_courage": (f) => {
    f.effects.push({ op: "conditionImmunity", conditions: ["frightened"] }, ...aura("courage", "Aura di coraggio", "Gli alleati nell'aura sono immuni a Spaventato."));
  },
  "paladin/radiant_strikes": (f) => {
    const r = { riderId: "radiant_strikes", label: "Colpi radiosi", count: 1, die: 8, damageType: "radiant", limit: "none", auto: true };
    f.effects.push(rider({ ...r, attackType: "melee", when: "attackType:melee" }), rider({ ...r, attackType: "any", when: "unarmed" }));
  },
  "paladin/restoring_touch": (f) => {
    f.effects.push(action({ actionId: "restoring_touch", label: "Tocco ristoratore (5 punti)", resource: "lay_on_hands", cost: 5, text: "Con Imposizione delle mani: termina Accecato, Affascinato, Assordato, Spaventato, Paralizzato o Stordito (5 punti ciascuna)." }));
  },
  // ── Devozione ───────────────────────────────────────────────────────────
  "devotion/sacred_weapon": (f) => {
    f.activation = { resource: "channel_divinity", duration: "10 minuti" };
    f.effects.push({ op: "attackBonus", value: CHA, attackType: "melee", when: active("sacred_weapon") });
  },
  "devotion/aura_of_devotion": (f) => {
    f.effects.push({ op: "conditionImmunity", conditions: ["charmed"] }, ...aura("devotion", "Aura di devozione", "Gli alleati nell'aura sono immuni ad Affascinato."));
  },
  "devotion/holy_nimbus": (f) => {
    f.activation = { resource: "holy_nimbus", duration: "10 minuti" };
    f.effects.push({ op: "saveAdvantage", against: "Immondi e Non morti", when: active("holy_nimbus") },
      ...aura("holy_nimbus", "Aureola sacra", "I nemici che iniziano il turno nell'aura subiscono {0} danni radiosi.", { values: ["mod:cha + pb"] }, active("holy_nimbus")));
  },
  // ── Gloria ──────────────────────────────────────────────────────────────
  "glory/inspiring_smite": (f) => {
    f.effects.push(channel("inspiring_smite", "Punizione ispiratrice", "Subito dopo Punizione divina: distribuisci questi PF temporanei tra creature entro 30 ft.", { die: 8, count: 2, bonus: "classLevel:paladin" }));
  },
  "glory/peerless_athlete": (f) => {
    f.activation = { resource: "channel_divinity", duration: "1 ora" };
    f.effects.push({ op: "checkAdvantage", mode: "advantage", skills: ["athletics", "acrobatics"], when: active("peerless_athlete") });
  },
  "glory/aura_of_alacrity": (f) => { f.effects.push(...aura("alacrity", "Aura di alacrità", "Gli alleati che iniziano o entrano nell'aura ottengono +10 ft di Velocità fino a fine turno.")); },
  "glory/living_legend": (f) => {
    f.activation = { resource: "living_legend", duration: "10 minuti" };
    f.effects.push({ op: "checkAdvantage", mode: "advantage", abilities: ["cha"], when: active("living_legend") },
      { op: "note", text: "1 volta per turno un tuo attacco mancato colpisce; puoi ritirare un TS fallito", when: active("living_legend") });
  },
  // ── Vendetta ────────────────────────────────────────────────────────────
  "vengeance/vow_of_enmity": (f) => {
    f.activation = { resource: "channel_divinity", duration: "1 minuto" };
    f.effects.push({ op: "attackAdvantage", mode: "advantage", attackType: "any", when: active("vow_of_enmity") },
      { op: "note", text: "Il Vantaggio vale solo contro la creatura del Voto (entro 30 ft)", when: active("vow_of_enmity") });
  },
  // ── Antichi ─────────────────────────────────────────────────────────────
  "ancients/natures_wrath": (f) => {
    f.effects.push(channel("natures_wrath", "Ira della natura", "Azione Magia: creature a scelta entro 15 ft, TS For (CD {0}) o Trattenute per 1 minuto.", { values: cdValue }));
  },
  "ancients/aura_of_warding": (f) => { f.effects.push(...aura("warding", "Aura di protezione magica", "Gli alleati nell'aura hanno resistenza ai danni necrotici, psichici e radiosi.")); },
  "ancients/elder_champion": (f) => {
    f.activation = { resource: "elder_champion", duration: "1 minuto" };
    f.effects.push({ op: "note", text: "All'inizio del turno recuperi 10 PF; i nemici nell'aura hanno Svantaggio ai TS contro i tuoi incantesimi e Incanalare divinità", when: active("elder_champion") });
  },
  // ── Ranger ──────────────────────────────────────────────────────────────
  // Marchio del cacciatore: d6 di forza a ogni colpo mentre ti concentri su di esso (d10 al 20°)
  "ranger/favored_enemy": (f) => {
    for (const [from, to, die] of [[1, 19, 6], [20, 20, 10]] as const) {
      f.effects.push(rider({ riderId: "hunters_mark", label: "Marchio del cacciatore", count: 1, die, damageType: "force", limit: "none", when: `${MARK} && ${lvl("ranger", from, to)}`,
        text: "Sul bersaglio marchiato." }));
    }
  },
  "ranger/precise_hunter": (f) => {
    f.effects.push({ op: "attackAdvantage", mode: "advantage", attackType: "any", when: MARK }, { op: "note", text: "Vantaggio solo contro la creatura marchiata", when: MARK });
  },
  "ranger/roving": (f) => { f.effects.push({ op: "setSpeed", mode: "climb", value: "speed" }, { op: "setSpeed", mode: "swim", value: "speed" }); },
  "ranger/tireless": (f) => {
    f.effects.push(action({ actionId: "tireless", label: "PF temporanei", resource: "tireless", die: 8, bonus: "mod:wis", apply: "tempHp", text: "Azione Magia." }));
  },
  // ── Cacciatore ──────────────────────────────────────────────────────────
  "hunter/hunters_lore": (f) => { f.effects.push({ op: "note", text: "Conosci immunità, resistenze e vulnerabilità del bersaglio marchiato", when: MARK }); },
  "hunter/hunters_prey": (f) => {
    choice(f, "hunters_prey", "Preda del cacciatore (cambia a ogni riposo)", [
      { id: "colossus_slayer", name: T("Uccisore di colossi"), description: "1 volta per turno +1d8 a una creatura sotto i PF massimi.",
        effects: [rider({ riderId: "colossus_slayer", label: "Uccisore di colossi", count: 1, die: 8, limit: "turn", text: "Solo se il bersaglio è sotto i PF massimi." })] },
      { id: "horde_breaker", name: T("Spezzaorde"), description: "1 volta per turno un attacco extra contro un'altra creatura entro 5 ft dal bersaglio.",
        effects: [{ op: "note", text: "Spezzaorde: 1 volta per turno un attacco extra contro un'altra creatura entro 5 ft dal bersaglio" }] },
    ]);
  },
  "hunter/defensive_tactics": (f) => {
    choice(f, "defensive_tactics", "Tattiche difensive (cambia a ogni riposo)", [
      { id: "escape_the_horde", name: T("Sfuggire all'orda"), description: "Attacchi di opportunità contro di te con Svantaggio.", effects: [{ op: "note", text: "Gli attacchi di opportunità contro di te hanno Svantaggio" }] },
      { id: "multiattack_defense", name: T("Difesa dagli attacchi multipli"), description: "Chi ti colpisce ha Svantaggio agli altri attacchi contro di te nel turno.", effects: [{ op: "note", text: "Dopo un colpo subito, quella creatura ha Svantaggio agli altri attacchi contro di te nel turno" }] },
    ]);
  },
  "hunter/superior_hunters_prey": (f) => { f.effects.push({ op: "note", text: "1 volta per turno il danno del Marchio colpisce anche un'altra creatura entro 30 ft dalla prima", when: MARK }); },
  // ── Vagabondo oscuro ────────────────────────────────────────────────────
  "gloom_stalker/dread_ambusher": (f) => {
    for (const [from, to, die] of [[3, 10, 6], [11, 20, 8]] as const) {
      f.effects.push(rider({ riderId: "dread_strike", label: "Colpo del terrore", count: 2, die, damageType: "psychic", limit: "turn", cost: "dread_ambusher", when: lvl("ranger", from, to),
        text: "1 volta per turno; consuma un uso di Terribile predatore." }));
    }
  },
  // ── Vagabondo fatato ────────────────────────────────────────────────────
  "fey_wanderer/dreadful_strikes": (f) => {
    for (const [from, to, die] of [[3, 10, 4], [11, 20, 6]] as const) {
      f.effects.push(rider({ riderId: "dreadful_strikes", label: "Colpi terrificanti", count: 1, die, damageType: "psychic", limit: "none", when: lvl("ranger", from, to),
        text: "1 volta per turno per bersaglio (tienine conto tu)." }));
    }
  },
};
