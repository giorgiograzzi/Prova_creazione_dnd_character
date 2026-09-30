import type { z } from "zod";
import type {
  armorSchema, backgroundSchema, classSchema, featSchema, itemSchema, speciesSchema,
  conditionDefSchema, spellSchema, subclassSchema, termSchema, toolSchema, weaponSchema,
} from "./schema";
import type { Ability } from "./schema";

export type { Effect, Choice, Option, Condition, Formula } from "./schema";
export type Species = z.infer<typeof speciesSchema>;
export type Background = z.infer<typeof backgroundSchema>;
export type ClassDef = z.infer<typeof classSchema>;
export type Subclass = z.infer<typeof subclassSchema>;
export type Feat = z.infer<typeof featSchema>;
export type Weapon = z.infer<typeof weaponSchema>;
export type Armor = z.infer<typeof armorSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Spell = z.infer<typeof spellSchema>;
export type Tool = z.infer<typeof toolSchema>;
export type ConditionDef = z.infer<typeof conditionDefSchema>;
export type Term = z.infer<typeof termSchema>;

export type EquipState = "stowed" | "wielded" | "worn" | "dropped";

// Il personaggio salva SOLO scelte e stato di gioco; ogni numero è derivato (compute/).
export interface Character {
  schemaVersion: number;
  id: string;
  name: string;
  classes: { classId: string; level: number; subclassId?: string; hpRolls: (number | "avg")[] }[];
  speciesId: string;
  backgroundId: string;
  baseScores: Record<Ability, number>; // prima degli aumenti
  decisions: Record<string, string[]>; // choiceId → opzioni scelte (id univoci per scelta)
  asi: { source: string; ability: Ability; amount: number; cap?: number }[]; // cap: 20 (default), 30 Doni epici // aumenti scelti (background, ASI di livello)
  feats: { featId: string; choices?: Record<string, string[]> }[];
  // grip: impugnatura a una o due mani (armi Versatili); attuned: sintonizzato (max 3)
  inventory: { itemId: string; qty: number; state: EquipState; attuned?: boolean; grip?: "one" | "two" }[];
  pactWeapon?: string; // Warlock con Patto della Lama: id dell'arma del patto (usa Carisma)
  coins: { cp: number; sp: number; ep: number; gp: number; pp: number };
  state: {
    hp: number; tempHp: number; hitDiceUsed: number;
    deathSaves: { successes: number; failures: number };
    resourcesUsed: Record<string, number>;
    slotsUsed: Record<number, number>;
    conditions: string[]; exhaustion: number; inspiration: boolean; // conditions: id (Esaurimento: livello in `exhaustion`)
    conditionSources?: Record<string, string>; // chi causa Affascinato / Spaventato / Afferrato
    mounted?: boolean; // in sella (Lancia da cavaliere)
  };
  overrides: Record<string, number>; // valori forzati a mano, visibili e rimovibili
  notes: string;
}

// Un valore calcolato con le sue fonti ("da dove viene")
export interface Sourced<T = number> {
  value: T;
  sources: { label: string; value: number | string }[];
}
