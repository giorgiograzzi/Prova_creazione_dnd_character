// Effetti e scelte delle classi (file "Modificatori" §3c-3d, §4). Tabelle, privilegi, sottoclassi e
// incantesimi sempre preparati vengono dal PDF; qui solo ciò che il PDF dice a parole.
// Id noti al motore (step 9/17): extra_attack, weapon_mastery, jack_of_all_trades.
type Json = Record<string, unknown>;
const T = (it: string) => ({ it });
const ABIL_IT: Record<string, string> = { int: "Intelligenza", wis: "Saggezza", cha: "Carisma" };

export interface FeatureRule { effects?: Json[]; choices?: Json[]; resource?: { partialShortRest?: number } }
export interface ClassRule {
  columns: string[]; // etichette delle colonne dopo "Privilegi" (nell'ordine del PDF)
  featureRules?: Record<string, FeatureRule>; // chiave "<id>" oppure "<id>@<livello>"
  subclassRules?: Record<string, Record<string, FeatureRule>>; // sottoclasse → privilegio
}

const skillOpts = (ids: [string, string][]) =>
  ids.map(([id, it]) => ({ id, name: T(it), effects: [{ op: "grantSkillProficiency", skills: [id] }] }));
const orderOptions = (armor: "heavy" | "medium", skills: [string, string][]) => [
  { id: "protector", name: T(armor === "heavy" ? "Protettore" : "Custode"), effects: [
    { op: "grantWeaponProficiency", weapons: ["martial"] }, { op: "grantArmorTraining", training: [armor] }] },
  { id: armor === "heavy" ? "thaumaturge" : "magician", name: T(armor === "heavy" ? "Taumaturgo" : "Mago naturale"), effects: [
    { op: "extraCantrips", count: 1 },
    { op: "checkBonus", value: "max(1, mod:wis)", skills: skills.map(([id]) => id) }] },
];
const plain = (ids: [string, string][]) => ids.map(([id, it]) => ({ id, name: T(it) }));

export const CLASS_RULES: Record<string, ClassRule> = {
  barbarian: {
    columns: ["Ire", "Danno ira", "Maestria armi"],
    featureRules: {
      rage: { resource: { partialShortRest: 1 } }, // "Recuperi 1 uso con Riposo Breve, tutti con Riposo Lungo"
      unarmored_defense: { effects: [{ op: "acFormula", formula: "10 + mod:dex + mod:con", shieldAllowed: true, when: "wearingArmor:none" }] },
      danger_sense: { effects: [{ op: "saveAdvantage", abilities: ["dex"] }] },
      fast_movement: { effects: [{ op: "speedBonus", value: 10, when: "!wearingArmor:heavy" }] },
      primal_knowledge: { choices: [{ id: "barbarian_primal_knowledge", label: T("Competenza aggiuntiva"), count: 1,
        options: skillOpts([["animal_handling", "Addestrare Animali"], ["athletics", "Atletica"], ["intimidation", "Intimidire"],
          ["nature", "Natura"], ["perception", "Percezione"], ["survival", "Sopravvivenza"]]) }] },
      primal_champion: { effects: [{ op: "abilityScoreIncrease", abilities: ["str", "con"], amount: 4, cap: 25 }] },
    },
  },
  bard: {
    columns: ["Dado ispirazione", "Trucchetti", "Preparati", "Slot"],
    featureRules: {
      "expertise@2": { choices: [{ id: "bard_expertise_2", label: T("Maestria"), count: 2, source: "expertise" }] },
      "expertise@9": { choices: [{ id: "bard_expertise_9", label: T("Maestria"), count: 2, source: "expertise" }] },
    },
    subclassRules: {
      dance: { dazzling_footwork: { effects: [{ op: "acFormula", formula: "10 + mod:dex + mod:cha", shieldAllowed: false, when: "wearingArmor:none" }] } },
      valor: { martial_training: { effects: [{ op: "grantWeaponProficiency", weapons: ["martial"] }, { op: "grantArmorTraining", training: ["medium", "shield"] }] } },
      lore: { bonus_proficiencies: { choices: [{ id: "lore_bonus_skills", label: T("Competenze bonus"), count: 3, source: "skills" }] } },
    },
  },
  cleric: {
    columns: ["Incanalare divinita", "Trucchetti", "Preparati", "Slot"],
    featureRules: {
      divine_order: { choices: [{ id: "divine_order", label: T("Ordine divino"), count: 1, options: orderOptions("heavy", [["arcana", "Arcano"], ["religion", "Religione"]]) }] },
      blessed_strikes: { choices: [{ id: "blessed_strikes", label: T("Colpi benedetti"), count: 1,
        options: plain([["divine_strike", "Colpo divino"], ["potent_spellcasting", "Incantesimi potenti"]]) }] },
    },
  },
  druid: {
    columns: ["Forma selvatica", "Trucchetti", "Preparati", "Slot"],
    featureRules: {
      primal_order: { choices: [{ id: "primal_order", label: T("Ordine primordiale"), count: 1, options: orderOptions("medium", [["arcana", "Arcano"], ["nature", "Natura"]]) }] },
      elemental_fury: { choices: [{ id: "elemental_fury", label: T("Furia elementale"), count: 1,
        options: plain([["potent_spellcasting", "Incantesimi potenti"], ["primal_strike", "Colpo primordiale"]]) }] },
    },
  },
};

export { ABIL_IT };
