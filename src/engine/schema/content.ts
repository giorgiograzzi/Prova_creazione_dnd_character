import { z } from "zod";
import { choiceSchema } from "./choice";
import { condition, effectSchema } from "./effect";
import {
  ability, armorTraining, damageType, id, SCHEMA_VERSION, skill, text,
} from "./primitives";

// Campi comuni a ogni voce dei dati
const base = {
  id,
  name: text,
  description: z.string().default(""),
  origin: z.enum(["srd", "private", "homebrew"]).default("private"),
  needsReview: z.boolean().default(false), // dubbio da verificare sul manuale (DATA_TODO.md)
  effects: z.array(effectSchema).default([]),
  choices: z.array(choiceSchema).default([]),
};

export const featureSchema = z.object({
  ...base, level: z.number().int().min(1).max(20).default(1),
});

export const speciesSchema = z.object({
  ...base,
  sizes: z.array(z.enum(["tiny", "small", "medium", "large"])).min(1),
  speed: z.number().int().default(30),
  traits: z.array(featureSchema).default([]), // con livello di sblocco (1/3/5)
});

// Equipaggiamento iniziale: opzione A/B/C = oggetti + monete (mo). "$tool" = lo strumento scelto.
export const equipmentSet = z.object({
  items: z.array(z.object({ item: z.string(), qty: z.number().int().min(1).default(1), note: z.string().optional() })).default([]),
  gp: z.number().default(0),
});

export const backgroundSchema = z.object({
  ...base,
  abilityOptions: z.tuple([ability, ability, ability]), // le 3 caratteristiche aumentabili
  skills: z.array(skill).length(2),
  tool: z.string(), // id, oppure gruppo a scelta: "artisan" | "gaming" | "musical"
  feat: id,
  featConfig: z.record(z.string(), z.string()).optional(), // es. { list: "cleric" } per Iniziato alla magia
  equipment: z.partialRecord(z.enum(["A", "B", "C"]), equipmentSet),
});

export const featSchema = z.object({
  ...base,
  category: z.enum(["origin", "general", "fighting_style", "epic_boon"]),
  prerequisites: z.array(condition).default([]), // condizioni, tutte da soddisfare
  repeatable: z.boolean().default(false),
  abilityIncrease: z.array(ability).optional(), // "+1 a una tra ..."
});

export const subclassSchema = z.object({
  ...base, classId: id, features: z.array(featureSchema).default([]),
  // Tabelle proprie della sottoclasse (dadi di superiorità, terzo incantatore...): 20 valori, 0/"" prima del 3° livello
  table: z.record(z.string(), z.array(z.union([z.number(), z.string()])).length(20)).default({}),
  caster: z.enum(["none", "third"]).default("none"),
  spellAbility: ability.optional(),
  spellList: id.optional(),
  spellSlots: z.array(z.array(z.number().int())).length(20).optional(),
});

export const classSchema = z.object({
  ...base,
  hitDie: z.union([z.literal(6), z.literal(8), z.literal(10), z.literal(12)]),
  primaryAbility: z.array(ability),
  saves: z.tuple([ability, ability]),
  skillChoices: z.object({ count: z.number().int(), from: z.array(skill).or(z.literal("any")) }),
  armorTraining: z.array(armorTraining),
  weaponProficiency: z.array(z.string()),
  toolProficiency: z.array(z.string()).default([]), // strumenti iniziali fissi (solo 1ª classe)
  caster: z.enum(["none", "full", "half", "third", "pact"]).default("none"),
  spellAbility: ability.optional(),
  spellList: id.optional(), // lista di incantesimi della classe (es. "cleric")
  spellSlots: z.array(z.array(z.number().int())).length(20).optional(), // per livello di classe: slot di 1°, 2°, ...
  pactSlots: z.array(z.object({ count: z.number().int(), level: z.number().int() })).length(20).optional(), // Warlock
  multiclassRequirement: z.string().optional(), // solo annotato (step 17)
  equipment: z.partialRecord(z.enum(["A", "B", "C"]), equipmentSet),
  features: z.array(featureSchema),
  // Colonne della tabella 1-20 (ire, dadi, trucchetti, preparati...); 20 valori ciascuna
  table: z.record(z.string(), z.array(z.union([z.number(), z.string()])).length(20)).default({}),
  subclassLevel: z.number().int().default(3),
});

const weaponProps = z.array(z.string()); // light, finesse, heavy, thrown, versatile...
export const weaponSchema = z.object({
  ...base,
  category: z.enum(["simple", "martial"]),
  kind: z.enum(["melee", "ranged"]),
  damage: z.string().regex(/^(\d+d\d+|\d+)$/), // "1d8"; fisso "1" (Cerbottana)
  damageType,
  properties: weaponProps,
  versatileDamage: z.string().optional(),
  range: z.object({ normal: z.number(), long: z.number() }).optional(),
  mastery: id,
  weight: z.number().default(0),
  cost: z.number().default(0), // in monete di rame (1 mo = 100 mr)
});

export const armorSchema = z.object({
  ...base,
  category: z.enum(["light", "medium", "heavy", "shield"]),
  baseAc: z.number().int(), // scudo: bonus
  dexCap: z.number().int().nullable().default(null), // null = nessun limite (leggera); 0 = pesante
  strRequired: z.number().int().default(0),
  donMinutes: z.number().default(0), // tempo per indossare (0 = 1 azione, es. scudo)
  doffMinutes: z.number().default(0),
  stealthDisadvantage: z.boolean().default(false),
  weight: z.number().default(0),
  cost: z.number().default(0),
});

export const itemSchema = z.object({
  ...base,
  category: z.string(),
  weight: z.number().default(0),
  cost: z.number().default(0),
  attunement: z.boolean().default(false),
  contents: z.array(z.object({ item: id, qty: z.number().int().min(1) })).optional(), // dotazioni
});

export const toolSchema = z.object({
  ...base,
  group: z.enum(["artisan", "other", "gaming", "musical"]),
  ability,
  weight: z.number().default(0),
  cost: z.number().default(0),
});

// Voce di glossario: abilità, linguaggi, taglie, danni, condizioni, proprietà, maestrie, monete
export const termSchema = z.object({
  id,
  name: text,
  description: z.string().default(""),
  origin: z.enum(["srd", "private", "homebrew"]).default("private"),
  needsReview: z.boolean().default(false),
  extra: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
});

export const spellSchema = z.object({
  ...base,
  level: z.number().int().min(0).max(9),
  school: z.enum([
    "abjuration", "conjuration", "divination", "enchantment",
    "evocation", "illusion", "necromancy", "transmutation",
  ]),
  classes: z.array(z.enum(["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard"])),
  castingTime: z.object({
    unit: z.enum(["action", "bonus_action", "reaction", "minute", "hour"]),
    amount: z.number().default(1),
    trigger: z.string().optional(),
  }),
  range: z.string(),
  components: z.object({
    v: z.boolean(), s: z.boolean(), m: z.boolean(),
    material: z.string().optional(),
    materialCost: z.number().optional(), // in mo: blocca il lancio senza componente
    materialConsumed: z.boolean().default(false),
  }),
  duration: z.string(),
  concentration: z.boolean().default(false),
  ritual: z.boolean().default(false),
  resolution: z.enum([
    "save_str", "save_dex", "save_con", "save_int", "save_wis", "save_cha",
    "attack_melee", "attack_ranged", "none",
  ]),
  summary: z.string(),
  higherLevels: z.string().optional(),
});

// Homebrew: come i dati, ma in un pacchetto .json versionato
export const homebrewPackSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  name: z.string(),
  weapons: z.array(weaponSchema).default([]),
  armors: z.array(armorSchema).default([]),
  items: z.array(itemSchema).default([]),
  feats: z.array(featSchema).default([]),
  spells: z.array(spellSchema).default([]),
});
