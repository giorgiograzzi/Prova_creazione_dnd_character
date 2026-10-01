import { z } from "zod";
import { isValidCondition } from "./condition";
import { isValidFormula } from "./formula";
import { ability, armorTraining, damageType, id, recharge, REGAIN, senseKind, skill } from "./primitives";

export const condition = z.string().refine(isValidCondition, "condizione non valida");
// Valore: numero fisso oppure formula (es. "pb", "max(1, mod:wis)")
export const value = z.union([z.number(), z.string().refine(isValidFormula, "formula non valida")]);

const when = { when: condition.optional() };
const e = <T extends string, S extends z.ZodRawShape>(op: T, shape: S) =>
  z.object({ op: z.literal(op), ...when, ...shape });

// Operazioni del file "Modificatori" §6, con nomi inglesi camelCase.
// Le scelte del giocatore si referenziano con "$choiceId" al posto del valore.
export const effectSchema = z.discriminatedUnion("op", [
  e("resistance", { types: z.array(damageType).min(1) }),
  e("sense", { kind: senseKind, range: value, additive: z.boolean().default(false) }), // additive: se hai già il senso, si somma (es. "Scurovisione 60 ft o +60")
  e("setSpeed", { mode: z.enum(["walk", "fly", "swim", "climb"]).default("walk"), value }),
  e("speedBonus", { value }),
  e("hpMaxPerLevel", { value, classId: id.optional() }),
  e("hpMaxBonus", { value }),
  e("acFormula", { formula: z.string().refine(isValidFormula), shieldAllowed: z.boolean(), ignoresArmor: z.boolean().default(false) }), // ignoresArmor: vale anche con armatura addosso e la sostituisce (Forme del circolo: in Forma selvatica l'armatura non conta)
  e("acBonus", { value }),
  e("attackBonus", { value, attackType: z.enum(["melee", "ranged", "any"]).default("any") }),
  e("damageBonus", { value, attackType: z.enum(["melee", "ranged", "any"]).default("any") }),
  e("initiativeBonus", { value }),
  e("saveBonus", { value, ability: ability.optional() }),
  e("checkBonus", { value, skills: z.array(skill).optional() }),
  e("critRange", { min: z.number().int().min(2).max(20) }),
  e("unarmedDie", { die: z.union([z.string().regex(/^\d*d\d+$/), z.number()]) }),
  e("extraCantrips", { count: z.number().int().min(1) }),
  e("grantSkillProficiency", {
    skills: z.array(skill).min(1), expertise: z.boolean().default(false),
    upgradeToExpertise: z.boolean().default(false), // se sei già competente, diventa Maestria (Mente acuta, Osservatore)
  }),
  e("grantSaveProficiency", { abilities: z.array(ability).min(1) }),
  e("grantWeaponProficiency", { weapons: z.array(z.string()).min(1) }), // id o categoria
  e("grantToolProficiency", { tools: z.array(z.string()).min(1) }),
  e("grantArmorTraining", { training: z.array(armorTraining).min(1) }),
  e("saveAdvantage", { abilities: z.array(ability).optional(), against: z.string().optional() }),
  // Vantaggio / Svantaggio da effetti (Attacco irruento, Istinto ferino, Ira): sugli attacchi, sulle prove (per abilità o per
  // caratteristica) e sull'Iniziativa. Vantaggio e Svantaggio si annullano come sempre (combineMode).
  // vsMarked: vale solo contro la creatura marcata (Cacciatore preciso, Voto di inimicizia): l'attacco lo dichiara nel tiro (`AttackOption.markedMode`)
  e("attackAdvantage", { mode: z.enum(["advantage", "disadvantage"]).default("advantage"), attackType: z.enum(["melee", "ranged", "any"]).default("any"), vsMarked: z.boolean().default(false) }),
  e("checkAdvantage", { mode: z.enum(["advantage", "disadvantage"]).default("advantage"), skills: z.array(skill).optional(), abilities: z.array(ability).optional() }),
  e("initiativeAdvantage", { mode: z.enum(["advantage", "disadvantage"]).default("advantage") }),
  // Modificatori al d20: metà competenza alle prove senza competenza (Jolly, Atleta straordinario) e minimo al tiro
  // (Talento affidabile: sul dado, 10; Possanza indomita: sul totale, il punteggio di Forza).
  e("halfProficiency", { abilities: z.array(ability).optional() }),
  e("rollFloor", {
    min: value, on: z.enum(["die", "total"]), skills: z.array(skill).optional(), abilities: z.array(ability).optional(),
    proficientOnly: z.boolean().default(false), // solo nelle abilità in cui sei competente
    saves: z.boolean().default(false), // vale anche per i tiri salvezza di quelle caratteristiche
    rawChecks: z.boolean().default(false), // vale anche per le prove di caratteristica pure
  }),
  // Immunità alle condizioni (Coraggio, Ira senza mente): la condizione non si applica finché l'effetto vale
  // Fortuna (Halfling): se un d20 di una prova, un TS o un attacco dà 1, lo ritiri e usi il nuovo risultato
  e("rerollOnes", {}),
  e("conditionImmunity", { conditions: z.array(id).min(1) }),
  // Extra d'attacco (Colpo brutale, Furia, Punizione...): dadi in più sul danno di un attacco, con costo e limite.
  // `auto`: si somma sempre (Colpi radianti); altrimenti compare come opzione sull'attacco ("Applica") e si segna come usata.
  //   limit: "turn" = 1 volta per turno (si azzera con «Nuovo turno»); un id di privilegio = 1 volta finché è attivo (1 per Ira); "none" = senza limite.
  //   cost: risorsa di cui si spende 1 uso quando lo applichi.
  e("attackRider", {
    riderId: id, label: z.string(), count: value.default(1), die: z.number().int().min(2).optional(), bonus: value.optional(), // senza `die` conta solo il bonus (Assassinare) o niente (Stretta stordente: solo costo e limite)
    damageType: z.string().optional(), // assente = come l'arma
    vsMarked: z.boolean().default(false), // l'extra vale solo contro la creatura marcata (Marchio del cacciatore)
    damageTypes: z.array(z.string()).min(2).optional(), // tipo di danno a scelta ogni volta che lo usi (Rivelazione celestiale: necrotico o radioso)
    attackType: z.enum(["melee", "ranged", "any"]).default("any"),
    limit: z.string().default("none"), cost: id.optional(), costAmount: z.number().int().min(1).default(1), auto: z.boolean().default(false),
    // Costo in slot (Punizione divina): `count`d`die` al livello dell'incantesimo, +`perSlotLevel` dadi per ogni livello di slot in più;
    // lo slot si sceglie nel tiro del danno e si spende lanciando l'incantesimo (o con il suo lancio gratuito)
    slotSpell: id.optional(), perSlotLevel: z.number().int().min(1).default(1),
    pactSlot: z.boolean().default(false), // costo: uno slot del Patto (Colpo occulto): 1d8 + 1d8 per livello dello slot
    text: z.string().optional(), values: z.array(z.string().refine(isValidFormula, "formula non valida")).optional(), // {0}, {1}... nel testo
  }),
  // Effetti che si comprano rinunciando a dadi di un extra d'attacco (Colpo astuto del Ladro: rinunci a d6 dell'Attacco furtivo per un effetto).
  // `forgoOption` = un effetto possibile (costo in dadi, testo con la CD); `forgoLimit` = quanti se ne possono applicare insieme (default 1).
  e("forgoOption", { riderId: id, optionId: id, label: z.string(), dice: z.number().int().min(1), text: z.string().optional(), values: z.array(z.string().refine(isValidFormula, "formula non valida")).optional() }),
  e("forgoLimit", { riderId: id, max: z.number().int().min(1) }),
  // Azione di una risorsa (Seconda ripresa, Imposizione delle mani, Ira persistente...): spende usi di `resource`, tira dadi
  // (die per ogni uso speso, più `bonus` una volta), applica cure o PF temporanei e può restituire usi di un'altra risorsa.
  //   variable: spendi da 1 a tutti gli usi rimasti (Imposizione delle mani: ogni uso è 1 PF). Senza `die`, il totale è il numero di usi spesi.
  e("resourceAction", {
    actionId: id, label: z.string(), resource: id.optional(), cost: z.number().int().min(0).default(1), variable: z.boolean().default(false), // senza `resource` l'azione è gratuita (promemoria con numeri)
    die: z.number().int().min(2).optional(), count: value.default(1), // dadi per ogni uso speso (numero o formula)
    bonus: value.optional(),
    apply: z.enum(["heal", "tempHp", "none"]).default("none"),
    restore: z.object({ resource: id, amount: z.union([z.number().int().min(1), z.literal("all"), z.string().refine(isValidFormula, "formula non valida")]) }).optional(), // amount: numero, "all" o formula (Ripristino stregonesco: metà livello)
    text: z.string().optional(), values: z.array(z.string().refine(isValidFormula, "formula non valida")).optional(),
    // Costo alternativo in slot («1 volta per Riposo Lungo o spendendo uno slot»): l'azione spende uno slot di livello `minLevel` o più, di qualsiasi
    // classe (anche del Patto: gli slot si condividono tra le classi), oppure solo del Patto con `pactOnly`. Non tocca il contatore del privilegio.
    slot: z.object({ minLevel: z.number().int().min(1).max(9).default(1), pactOnly: z.boolean().default(false) }).optional(),
    onActivate: id.optional(), // id del privilegio attivabile (Ira, Forma selvatica): attivandolo l'azione parte da sola (solo se gratuita), per esempio i PF temporanei
  }),
  // Dadi di danno con un minimo (Combattere con armi possenti: 1 e 2 contano 3): vale per tutti i dadi di danno dell'attacco
  e("damageDieFloor", { min: z.number().int().min(2), attackType: z.enum(["melee", "ranged", "any"]).default("any") }),
  // Modificatore degli incantesimi lanciati (Incantesimi potenti, Discepolo della vita): compare tra le note del lancio quando l'incantesimo
  // rientra nel filtro. Nel testo {L} = livello dello slot usato, {L+2} = livello + 2. Il filtro è esplicito (trucchetti, elenco di incantesimi),
  // perché i dati non dicono se un incantesimo cura o fa danni.
  e("spellModifier", {
    label: z.string(), text: z.string(), values: z.array(z.string().refine(isValidFormula, "formula non valida")).optional(),
    cantrip: z.boolean().default(false), spells: z.array(id).optional(), minLevel: z.number().int().min(1).max(9).optional(),
    all: z.boolean().default(false), // vale per ogni incantesimo lanciato
    school: z.string().optional(), // con `all`: solo gli incantesimi di questa scuola (Invocazione potenziata: evocation)
    damageType: z.string().optional(), // solo per gli incantesimi che nel riassunto infliggono danni di questo tipo (Adepto elementale, Affinità elementale)
    metamagic: id.optional(), // effetto di un'opzione di Metamagia: compare tra le note solo se il lancio la applica (id dell'opzione)
  }),
  // Incantesimi: CD e bonus di attacco in più, Vantaggio ai tiri per colpire con incantesimo (Stregoneria innata)
  e("spellBonus", { dc: value.optional(), attack: value.optional(), advantage: z.boolean().default(false) }),
  // Aura che dà un vantaggio anche agli alleati vicini (Aura di protezione, di coraggio...): sulla scheda l'effetto su di te
  // vale come sempre (altri effetti); qui si dichiara raggio e testo, mostrati in Stato per dirlo al tavolo. Con lo stesso `auraId` vale il raggio maggiore.
  e("aura", { auraId: id, label: z.string(), radius: value, text: z.string(), values: z.array(z.string().refine(isValidFormula, "formula non valida")).optional() }),
  // Promemoria che compare tra le note finché l'effetto vale (reazioni, effetti sugli avversari: non cambiano i numeri)
  e("note", { text: z.string().min(1), values: z.array(z.string().refine(isValidFormula, "formula non valida")).optional() }), // {0}, {1}... = formule calcolate
  e("abilityScoreIncrease", {
    abilities: z.array(ability).min(1), amount: z.number().int(), cap: z.number().int().default(20),
  }),
  e("grantSpell", {
    spell: id, mode: z.enum(["cantrip", "alwaysPrepared", "known"]), ability: ability.optional(),
    abilityFrom: id.optional(), // id di una scelta (options di caratteristiche) che fissa la caratteristica da incantatore
    freeCast: z.object({ uses: value, recharge, unlimited: z.boolean().optional() }).optional(), // unlimited: a volontà, senza slot né usi (Padronanza degli incantesimi, invocazioni)
  }),
  e("grantFeature", { feature: id }),
  e("grantFeat", { feat: id, via: z.string().optional() }), // via: id della scelta che lo concede (le sue scelte interne hanno chiave "<via>/<scelta>")
  e("grantEquipment", { item: id, qty: z.number().int().min(1).default(1) }),
  // Vincoli: prerequisiti (dell'opzione) e restrizioni (esclusioni mentre la condizione vale)
  e("prerequisite", { requires: condition, reason: z.string().optional() }),
  e("restriction", { forbids: z.string(), reason: z.string().optional() }),
  // Risorse: usi = numero, formula ("pb") o tabella per livello
  e("resource", {
    resourceId: id,
    uses: z.union([value, z.object({ table: z.array(z.number()).length(20) })]),
    recharge,
    partialShortRest: z.number().int().optional(), // usi che tornano con Riposo Breve
    regain: z.string().regex(REGAIN, "deve essere un numero o dei dadi, per esempio 2 o 1d6+1").optional(), // cariche recuperate a ogni ricarica ("1d6+1", "2"); assente = tutte. Con `regain` la ricarica è manuale (si tira)
  }),
]);
export type Effect = z.infer<typeof effectSchema>;
