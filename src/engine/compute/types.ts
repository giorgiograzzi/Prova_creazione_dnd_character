import type { Ability, SKILLS } from "../schema";
import type { Sourced } from "../types";

export type Skill = (typeof SKILLS)[number];
export type RollMode = "advantage" | "disadvantage" | "normal";
export interface RollFloor { min: number; on: "die" | "total"; label: string }
export interface Roll { bonus: Sourced; mode: RollMode; modeSources: string[]; floor?: RollFloor[] }
export type Proficiency = "none" | "half" | "proficient" | "expertise";

export interface GrantedSpell {
  spell: string; mode: "cantrip" | "alwaysPrepared" | "known"; source: string;
  ability?: Ability; dc?: number; attack?: number;
  freeCast?: { uses: number; recharge: string; unlimited?: boolean };
}

// Un attacco pronto da tirare (arma impugnata, lanciata, mano secondaria o colpo senz'armi)
export interface AttackOption {
  id: string; // id dell'oggetto, oppure "unarmed"
  weaponId?: string;
  label: string;
  kind: "melee" | "ranged";
  thrown: boolean; offhand: boolean; hands: 0 | 1 | 2;
  ability: Ability; abilityWhy: string;
  proficient: boolean;
  toHit: Sourced; mode: RollMode; modeSources: string[];
  damage: { dice: string; bonus: Sourced; type: string; text: string }; // text = "2d6 + 3 tagliente"
  critRange: number; // 20, oppure 19/18 (Campione)
  dieFloor?: number; // minimo di ogni dado di danno (Combattere con armi possenti: 3)
  reach: number; // ft
  range?: { normal: number; long: number };
  mastery?: { id: string; name: string; active: boolean; dc?: number };
  ammo?: { itemId: string; available: number };
  riders: string[]; // danni extra a parole (Attacco furtivo...)
  extras: AttackExtra[]; // extra d'attacco applicabili (Colpo brutale...): somma i dadi al danno e segna l'uso
  notes: string[]; // promemoria: Svantaggio a gittata lunga, Ricarica, ecc.
}

export interface SpellModInfo { label: string; text: string; cantrip: boolean; all?: boolean; school?: string; spells?: string[]; minLevel?: number }
export interface AuraInfo { id: string; label: string; radius: number; text: string }

export interface AttackExtra {
  id: string; label: string; dice: string; bonus: number; type?: string; limit: string; cost?: string; costAmount?: number; // cost: risorsa di cui si spendono costAmount usi
  used: boolean; // già usato (1 per turno / 1 per Ira)
  text?: string;
  slotSpell?: string; pactSlot?: boolean; baseLevel?: number; perSlotLevel?: number; // costo in slot: l'incantesimo, il suo livello e i dadi in più per livello di slot
}

// Azione di una risorsa (Seconda ripresa...): vedi l'op `resourceAction`
export interface ResourceActionInfo {
  id: string; featureId: string; label: string; resource?: string; cost: number; variable: boolean; die?: number; count?: number; bonus: number;
  apply: "heal" | "tempHp" | "none"; restore?: { resource: string; amount: number | "all" }; text?: string; // restore.amount: già calcolato
  remaining: number; // usi rimasti della risorsa che si spende
}

// Opzione scelta con un costo (Metamagia: punti stregoneria)
export interface ChosenOption { id: string; name: string; description?: string; cost: number; choiceId: string }

export interface LoadoutSummary { handsUsed: number; handsMax: number; body?: string; shield?: string; attuned: number; weight: number; capacity: number; problems: string[] }

// Un privilegio, tratto o talento del personaggio, per l'elenco della scheda (descrizione, usi, attivazione)
export interface FeatureInfo {
  id: string; name: string; description: string;
  kind: "species" | "background" | "class" | "subclass" | "feat";
  source: string; // chi lo dà: "Barbaro", "Aasimar", "Iniziato alla magia"
  level: number; // livello di sblocco (0 = talento)
  resourceId?: string; // contatore degli usi (in Derived.resources)
  activation?: { resource?: string; cost?: number; alt?: { resource: string; cost: number; when?: string }; requires?: string; label?: string; duration?: string; options: { id: string; name: string; description?: string }[] };
  active: boolean;
  picked: string[]; // scelta fatta all'attivazione
  needsReview: boolean;
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
  checks: Record<Ability, { mode: RollMode; modeSources: string[]; floor?: RollFloor[] }>; // prove di caratteristica pure
  initiative: Sourced;
  passivePerception: Sourced;
  hp: { max: Sourced; hitDice: { die: number; total: number }[]; hitDiceRemaining: number };
  ac: Sourced & { formula: string };
  speed: Record<"walk" | "fly" | "swim" | "climb", Sourced>;
  senses: Partial<Record<"darkvision" | "blindsight" | "truesight", Sourced>>;
  resistances: string[];
  resources: Record<string, { max: Sourced; used: number; remaining: number; recharge: string; regain?: string }>;
  // Incantesimi concessi da specie, classi, sottoclassi, talenti (con la caratteristica risolta dalle scelte)
  grantedSpells: GrantedSpell[];
  // Slot per livello (indice 0 = 1°): totale, spesi, rimasti; Warlock: slot del patto a parte
  spellSlots: { casterLevel: number; slots: number[]; used: number[]; remaining: number[]; pact?: { count: number; level: number; used: number; remaining: number } };
  spellcasting: { classId: string; ability: Ability; dc: Sourced; attack: Sourced; attackMode: RollMode; attackModeSources: string[] }[];
  chosenOptions: ChosenOption[]; // opzioni scelte che hanno un costo (Metamagia)
  spellMods: SpellModInfo[]; // modificatori degli incantesimi lanciati (note del lancio)
  auras: AuraInfo[]; // aure che valgono anche per gli alleati (raggio e testo)
  actions: ResourceActionInfo[]; // azioni delle risorse (cura, recuperi...)
  carryCapacity: number;
  proficiencies: { weapons: string[]; tools: string[]; armor: string[] };
  languages: string[];
  features: string[];
  feats: string[];
  featureList: FeatureInfo[]; // privilegi, tratti e talenti con descrizione, usi e attivazione
  notes: string[];  // vantaggi condizionati e simili, da mostrare come testo
  warnings: string[]; // es. armatura senza addestramento
  spellcastingBlocked: boolean;
  conditions: ConditionState;
  attacksPerAction: number;
  attacks: AttackOption[];
  loadout: LoadoutSummary;
}
