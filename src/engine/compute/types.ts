import type { Ability, SKILLS } from "../schema";
import type { Sourced } from "../types";

export type Skill = (typeof SKILLS)[number];
export type RollMode = "advantage" | "disadvantage" | "normal";
export interface Roll { bonus: Sourced; mode: RollMode; modeSources: string[] }
export type Proficiency = "none" | "half" | "proficient" | "expertise";

export interface Derived {
  level: number;
  proficiencyBonus: Sourced;
  scores: Record<Ability, Sourced>;
  mods: Record<Ability, Sourced>;
  saves: Record<Ability, Roll & { proficient: boolean }>;
  skills: Record<Skill, Roll & { ability: Ability; proficiency: Proficiency }>;
  initiative: Sourced;
  passivePerception: Sourced;
  hp: { max: Sourced; hitDice: { die: number; total: number }[]; hitDiceRemaining: number };
  ac: Sourced & { formula: string };
  speed: Record<"walk" | "fly" | "swim" | "climb", Sourced>;
  senses: Partial<Record<"darkvision" | "blindsight" | "truesight", Sourced>>;
  resistances: string[];
  resources: Record<string, { max: Sourced; used: number; remaining: number; recharge: string }>;
  spellcasting: { classId: string; ability: Ability; dc: Sourced; attack: Sourced }[];
  carryCapacity: number;
  proficiencies: { weapons: string[]; tools: string[]; armor: string[] };
  features: string[];
  feats: string[];
  notes: string[];  // vantaggi condizionati e simili, da mostrare come testo
  warnings: string[]; // es. armatura senza addestramento
  spellcastingBlocked: boolean;
}
