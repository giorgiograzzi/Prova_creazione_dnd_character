import type { Ability, SKILLS } from "../schema";
import type { Sourced } from "../types";

export type Skill = (typeof SKILLS)[number];
export type RollMode = "advantage" | "disadvantage" | "normal";
export interface Roll { bonus: Sourced; mode: RollMode; modeSources: string[] }
export type Proficiency = "none" | "half" | "proficient" | "expertise";

export interface GrantedSpell {
  spell: string; mode: "cantrip" | "alwaysPrepared" | "known"; source: string;
  ability?: Ability; dc?: number; attack?: number;
  freeCast?: { uses: number; recharge: string };
}

export interface Lists { adv: string[]; dis: string[] }

// Effetto delle condizioni attive sul personaggio (vedi compute/conditions.ts)
export interface ConditionState {
  active: string[]; // id, con le condizioni incluse (Paralizzato → Incapacitato) e senza quelle a cui si è immuni
  exhaustion: number; // livello 0-6
  dead: boolean; // Esaurimento al livello massimo
  immune: string[]; // condizioni bloccate da un'immunità
  cannot: string[]; // cose che il personaggio non può fare/percepire (agire, parlare, vedere...)
  speedZero: string[]; // condizioni che azzerano la Velocità
  d20Penalty: number; // Esaurimento: -2 × livello ai Tiri D20 (0 o negativo)
  speedPenalty: number; // Esaurimento: -5 ft × livello
  rolls: { attack: Lists; checks: Lists; initiative: Lists; saves: Record<Ability, Lists> };
  attackRolls: { mode: RollMode; modeSources: string[] }; // tiri per colpire del personaggio
  abilityChecks: { mode: RollMode; modeSources: string[] };
  initiativeMode: { mode: RollMode; modeSources: string[] };
  autoFailSaves: Partial<Record<Ability, string[]>>;
  autoFailChecks: string[]; // prove che richiedono vista/udito
  attacksAgainstYou: { advantage: string[]; disadvantage: string[]; autoCritical: string[] };
  resistAll: string[]; // condizioni che danno Resistenza a tutti i danni (Pietrificato)
  situational: string[]; // effetti che dipendono da fonte/situazione: restano testo ("Spaventato: ...")
}

export interface Derived {
  level: number;
  proficiencyBonus: Sourced;
  scores: Record<Ability, Sourced>;
  mods: Record<Ability, Sourced>;
  saves: Record<Ability, Roll & { proficient: boolean; autoFail: string[] }>;
  skills: Record<Skill, Roll & { ability: Ability; proficiency: Proficiency }>;
  initiative: Sourced;
  passivePerception: Sourced;
  hp: { max: Sourced; hitDice: { die: number; total: number }[]; hitDiceRemaining: number };
  ac: Sourced & { formula: string };
  speed: Record<"walk" | "fly" | "swim" | "climb", Sourced>;
  senses: Partial<Record<"darkvision" | "blindsight" | "truesight", Sourced>>;
  resistances: string[];
  resources: Record<string, { max: Sourced; used: number; remaining: number; recharge: string }>;
  // Incantesimi concessi da specie, classi, sottoclassi, talenti (con la caratteristica risolta dalle scelte)
  grantedSpells: GrantedSpell[];
  spellcasting: { classId: string; ability: Ability; dc: Sourced; attack: Sourced }[];
  carryCapacity: number;
  proficiencies: { weapons: string[]; tools: string[]; armor: string[] };
  features: string[];
  feats: string[];
  notes: string[];  // vantaggi condizionati e simili, da mostrare come testo
  warnings: string[]; // es. armatura senza addestramento
  spellcastingBlocked: boolean;
  conditions: ConditionState;
}
