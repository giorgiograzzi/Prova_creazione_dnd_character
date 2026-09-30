// Effetti numerici dei talenti, secondo il file "Modificatori" §3d-3e (schema: ARCHITECTURE.md).
// I talenti non elencati qui hanno solo il testo in `description` (effetti di gioco, non numerici).
// Id noti al motore (step 9): medium_armor_master, great_weapon_fighting, two_weapon_fighting, unarmed_fighting.
type Json = Record<string, unknown>;
export interface FeatRule { effects?: Json[]; choices?: Json[]; needsReview?: boolean }

const T = (it: string) => ({ it });
const ABIL: [string, string][] = [["str", "Forza"], ["dex", "Destrezza"], ["con", "Costituzione"], ["int", "Intelligenza"], ["wis", "Saggezza"], ["cha", "Carisma"]];
const SKILLS_ALL = ["acrobatics", "animal_handling", "arcana", "athletics", "deception", "history", "insight", "intimidation",
  "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival"];
const skillOptions = (ids: string[]) => ids.map((id) => ({ id, name: T(id), effects: [{ op: "grantSkillProficiency", skills: [id] }] }));
const pick = (id: string, label: string, source: string, count = 1) => ({ id, label: T(label), count, source });

export const FEAT_RULES: Record<string, FeatRule> = {
  alert: { effects: [{ op: "initiativeBonus", value: "pb" }] },
  tough: { effects: [{ op: "hpMaxPerLevel", value: 2 }] },
  speedy: { effects: [{ op: "speedBonus", value: 10 }] },
  lucky: { effects: [{ op: "resource", resourceId: "lucky_points", uses: "pb", recharge: "long_rest" }] },
  tavern_brawler: { effects: [{ op: "unarmedDie", die: "1d4" }] },
  musician: { choices: [pick("musician_tools", "Strumenti musicali", "tools:musical", 3)] },
  crafter: { choices: [pick("crafter_tools", "Strumenti da artigiano", "tools:artisan", 3)] },
  skilled: { choices: [pick("skilled_picks", "3 abilità o strumenti", "skillsTools", 3)] },
  chef: { effects: [{ op: "grantToolProficiency", tools: ["cooks_utensils"] }] },
  poisoner: { effects: [{ op: "grantToolProficiency", tools: ["poisoners_kit"] }] },
  lightly_armored: { effects: [{ op: "grantArmorTraining", training: ["light", "shield"] }] },
  moderately_armored: { effects: [{ op: "grantArmorTraining", training: ["medium"] }] },
  heavily_armored: { effects: [{ op: "grantArmorTraining", training: ["heavy"] }] },
  martial_weapon_training: { effects: [{ op: "grantWeaponProficiency", weapons: ["martial"] }] },
  skill_expert: { choices: [pick("skill_expert_skill", "Abilità", "skills"), pick("skill_expert_expertise", "Maestria", "expertise")] },
  keen_mind: {
    choices: [{ id: "keen_mind_skill", label: T("Abilità"), count: 1, options: skillOptions(["arcana", "history", "investigation", "nature", "religion"]) }],
    needsReview: true, // se già competente il testo dà Maestria: regola dei duplicati (step 10)
  },
  observant: {
    choices: [{ id: "observant_skill", label: T("Abilità"), count: 1, options: skillOptions(["insight", "investigation", "perception"]) }],
    needsReview: true,
  },
  resilient: {
    choices: [{ id: "resilient_save", label: T("Tiro salvezza"), count: 1,
      options: ABIL.map(([id, it]) => ({ id, name: T(it), effects: [{ op: "grantSaveProficiency", abilities: [id] }] })) }],
    needsReview: true, // ripetibile con caratteristica diversa: la scelta va duplicata a ogni acquisizione (step 17)
  },
  magic_initiate: {
    choices: [
      { id: "magic_initiate_list", label: T("Lista"), count: 1, options: ["cleric", "druid", "wizard"].map((id) => ({ id, name: T(id) })) },
      { id: "magic_initiate_ability", label: T("Caratteristica"), count: 1, options: ["int", "wis", "cha"].map((id) => ({ id, name: T(id) })) },
      pick("magic_initiate_cantrips", "Trucchetti", "cantrips", 2),
      pick("magic_initiate_spell", "Incantesimo di 1° livello", "freespells"),
    ],
    needsReview: true, // liste e ripetizione con lista diversa (step 10)
  },
  fey_touched: {
    effects: [{ op: "grantSpell", spell: "misty_step", mode: "alwaysPrepared", freeCast: { uses: 1, recharge: "long_rest" } }],
    choices: [pick("fey_touched_spell", "Incantesimo di 1° (Ammaliamento o Divinazione)", "freespells")],
  },
  shadow_touched: {
    effects: [{ op: "grantSpell", spell: "invisibility", mode: "alwaysPrepared", freeCast: { uses: 1, recharge: "long_rest" } }],
    choices: [pick("shadow_touched_spell", "Incantesimo di 1° (Illusione o Necromanzia)", "freespells")],
  },
  telekinetic: { effects: [{ op: "grantSpell", spell: "mage_hand", mode: "cantrip" }] },
  telepathic: { effects: [{ op: "grantSpell", spell: "detect_thoughts", mode: "alwaysPrepared", freeCast: { uses: 1, recharge: "long_rest" } }] },
  skulker: { effects: [{ op: "sense", kind: "blindsight", range: 10 }] },
  // Stili di combattimento (file 03 §3d)
  archery: { effects: [{ op: "attackBonus", value: 2, attackType: "ranged" }] },
  blind_fighting: { effects: [{ op: "sense", kind: "blindsight", range: 10 }] },
  defense: { effects: [{ op: "acBonus", value: 1, when: "wearingArmor:any" }] },
  dueling: { effects: [{ op: "damageBonus", value: 2, attackType: "melee", when: "attackType:melee && !weaponProperty:two_handed" }], needsReview: true }, // "senza altre armi": step 9
  thrown_weapon_fighting: { effects: [{ op: "damageBonus", value: 2, attackType: "ranged", when: "attackType:ranged && weaponProperty:thrown" }] },
  // Doni epici
  boon_of_fortitude: { effects: [{ op: "hpMaxBonus", value: 40 }] },
  boon_of_speed: { effects: [{ op: "speedBonus", value: 30 }] },
  boon_of_truesight: { effects: [{ op: "sense", kind: "truesight", range: 60 }] },
  boon_of_skill: {
    effects: [{ op: "grantSkillProficiency", skills: SKILLS_ALL, expertise: false }],
    choices: [pick("boon_of_skill_expertise", "Maestria", "expertise")],
  },
  boon_of_energy_resistance: { choices: [pick("energy_resistance", "Tipi di danno", "resistance", 2)] },
};
