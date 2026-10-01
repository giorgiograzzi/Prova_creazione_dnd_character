// Lotto 2 di PLAN2 — Ladro e Monaco: Attacco furtivo e Colpo astuto, punti disciplina, dadi psionici. Numeri dai riepiloghi in docs/rules.
import { action, active, lvl, ranges, rider, T, type Patch } from "./play-lot1";

type Json = Record<string, any>;
const dieOf = (v: number | string) => Number(String(v).replace(/^\d*d/, ""));
const countOf = (v: number | string) => Number(/^(\d+)d/.exec(String(v))?.[1] ?? 1);
const FOCUS = "monks_focus";
const CD_WIS = "8 + mod:wis + pb";
// Ogni tipo di danno tranne la forza (Difesa superiore)
const ALL_BUT_FORCE = ["acid", "bludgeoning", "cold", "fire", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];

// un'azione per ogni intervallo di livello in cui cambia il dado (tabella `col` della classe o della sottoclasse)
const perDie = (f: Json, col: (number | string)[], cls: string, make: (die: number) => Json) => {
  for (const [from, to, v] of ranges(col)) f.effects.push({ ...make(dieOf(v)), when: lvl(cls, from, to) });
};

// Un effetto di Colpo astuto: costa `dice` d6 dell'Attacco furtivo
const forgo = (optionId: string, label: string, dice: number, extra: Json = {}): Json => ({ op: "forgoOption", riderId: "sneak_attack", optionId, label, dice, ...extra });

export const LOT2: Record<string, Patch> = {
  // ── Ladro ───────────────────────────────────────────────────────────────
  // Attacco furtivo: dadi dalla colonna della tabella; arma Accurata o a distanza (due condizioni, il `when` non ha parentesi)
  "rogue/sneak_attack": (f, cls) => {
    for (const [from, to, v] of ranges(cls.table?.attacco_furtivo ?? [])) {
      const base = "1 volta per turno, con Vantaggio o con un alleato non Incapacitato entro 5 ft dal bersaglio (e senza Svantaggio).";
      const text = from >= 5 ? `${base} Con Colpo astuto puoi rinunciare a dadi per un effetto (CD {0}).` : base;
      const common = { riderId: "sneak_attack", label: "Attacco furtivo", count: countOf(v), die: dieOf(v), limit: "turn", text, values: ["8 + mod:dex + pb"] };
      f.effects.push(
        rider({ ...common, when: `weaponProperty:finesse && ${lvl("rogue", from, to)}` }),
        rider({ ...common, when: `attackType:ranged && !weaponProperty:finesse && ${lvl("rogue", from, to)}` }));
    }
  },
  // Colpo astuto: effetti comprati rinunciando a d6 dell'Attacco furtivo (CD 8 + Des + competenza); dal 11° due insieme, dal 14° i Colpi subdoli
  "rogue/cunning_strike": (f) => {
    const cd = (txt: string) => ({ text: `CD {0}: ${txt}`, values: ["8 + mod:dex + pb"] });
    f.effects.push(
      forgo("poison", "Veleno", 1, cd("TS Costituzione o Avvelenato per 1 minuto (serve la Borsa da avvelenatore).")),
      forgo("trip", "Sbilanciare", 1, cd("TS Destrezza o Prono (Grande o più piccolo).")),
      forgo("withdraw", "Ritirata", 1, { text: "Dopo l'attacco ti muovi di metà Velocità senza provocare attacchi di opportunità." }));
  },
  "rogue/improved_cunning_strike": (f) => { f.effects.push({ op: "forgoLimit", riderId: "sneak_attack", max: 2 }); },
  "rogue/devious_strikes": (f) => {
    const cd = (txt: string) => ({ text: `CD {0}: ${txt}`, values: ["8 + mod:dex + pb"] });
    f.effects.push(
      forgo("daze", "Stordire", 2, cd("TS Costituzione o nel suo prossimo turno può fare solo una tra movimento, azione o Azione Bonus.")),
      forgo("knock_out", "Tramortire", 6, cd("TS Costituzione o Privo di sensi per 1 minuto.")),
      forgo("obscure", "Accecare", 3, cd("TS Destrezza o Accecato fino alla fine del suo prossimo turno.")));
  },
  "thief/supreme_sneak": (f) => {
    f.effects.push(forgo("hidden_sneak", "Attacco furtivo nascosto", 1, { text: "Se sei Invisibile per Nascondersi, l'attacco non termina la condizione se a fine turno sei dietro copertura tre quarti o totale." }));
  },
  "rogue/steady_aim": (f) => {
    f.activation = { label: T("Mira stabile"), duration: "fino alla fine del turno" };
    f.effects.push({ op: "attackAdvantage", mode: "advantage", attackType: "any", when: active("steady_aim") },
      { op: "note", text: "La tua Velocità è 0 fino alla fine del turno", when: active("steady_aim") });
  },
  "rogue/reliable_talent": (f) => { f.effects.push({ op: "rollFloor", min: 10, on: "die", proficientOnly: true, saves: false, rawChecks: false }); },
  // ── Assassino ───────────────────────────────────────────────────────────
  "assassin/assassinate": (f) => {
    f.effects.push({ op: "initiativeAdvantage", mode: "advantage" },
      rider({ riderId: "assassinate", label: "Assassinare", count: 0, bonus: "classLevel:rogue", limit: "turn", text: "Solo nel primo round, contro chi non ha ancora agito: somma al tuo Attacco furtivo." }));
  },
  "assassin/death_strike": (f) => {
    f.effects.push(rider({ riderId: "death_strike", label: "Colpo mortale", count: 0, limit: "turn", values: ["8 + mod:dex + pb"],
      text: "Nel primo round, con Attacco furtivo: TS Cos (CD {0}) o il danno dell'attacco raddoppia." }));
  },
  // ── Lama dell'anima ─────────────────────────────────────────────────────
  "soulknife/psionic_power": (f, sub) => {
    f.effects.push({ op: "resource", resourceId: "psionic_energy", uses: { table: sub.table?.dadi_energia ?? [] }, recharge: "long_rest", partialShortRest: 1 });
    perDie(f, sub.table?.dado_energia ?? [], "rogue", (die) => action({ actionId: "enhanced_talent", label: "Talento potenziato (dado)", resource: "psionic_energy", die,
      text: "Prova fallita con abilità o strumento competente: aggiungi il dado; si spende solo se riesci." }));
  },
  "soulknife/soul_blades": (f, sub) => {
    perDie(f, sub.table?.dado_energia ?? [], "rogue", (die) => action({ actionId: "homing_strikes", label: "Colpi guidati (dado)", resource: "psionic_energy", die,
      text: "Se manchi con una lama psichica, aggiungi il dado; se colpisci, il dado è speso." }));
    perDie(f, sub.table?.dado_energia ?? [], "rogue", (die) => action({ actionId: "psychic_teleport", label: "Teletrasporto psichico (dado)", resource: "psionic_energy", die,
      text: "Azione Bonus: ti teletrasporti fino a 10 × il risultato in piedi." }));
  },
  "soulknife/psychic_veil": (f) => { f.effects.push(action({ actionId: "psychic_veil_die", label: "Ripristina spendendo un dado", resource: "psionic_energy", restore: { resource: "psychic_veil", amount: 1 } })); },
  "soulknife/rend_mind": (f) => { f.effects.push(action({ actionId: "rend_mind_dice", label: "Ripristina spendendo 3 dadi", resource: "psionic_energy", cost: 3, restore: { resource: "rend_mind", amount: 1 } })); },
  // ── Ladro (sottoclasse) ─────────────────────────────────────────────────
  "thief/second_story_work": (f) => { f.effects.push({ op: "setSpeed", mode: "climb", value: "speed" }); },
  // ── Monaco ──────────────────────────────────────────────────────────────
  // Punti disciplina: i tre usi base costano 1 PD (le versioni potenziate dal 10° cambiano il testo)
  "monk/monks_focus": (f) => {
    const spend = (id: string, label: string, text: string, when: string) => action({ actionId: id, label, resource: FOCUS, text, when });
    f.effects.push(
      spend("flurry_2", "Raffica di colpi (1 PD)", "Azione Bonus: due colpi senz'armi.", "classLevel:monk<=9"),
      spend("flurry_3", "Raffica di colpi (1 PD)", "Azione Bonus: tre colpi senz'armi.", "classLevel:monk>=10"),
      spend("patient_defense", "Difesa paziente (1 PD)", "Disimpegno e anche Schivata come Azione Bonus.", "classLevel:monk<=9"),
      spend("step_of_wind", "Passo del vento (1 PD)", "Scatto e anche Disimpegno, salto raddoppiato.", "classLevel:monk<=9"),
      spend("step_of_wind_big", "Passo del vento (1 PD)", "Come prima, e porti con te una creatura consenziente Grande o inferiore.", "classLevel:monk>=10"),
      { op: "note", text: "CD dei punti disciplina: {0}", values: [CD_WIS], when: "classLevel:monk>=2" });
  },
  "monk/heightened_focus": (f, cls) => {
    perDie(f, cls.table?.arti_marziali ?? [], "monk", (die) => action({ actionId: "patient_defense_hp", label: "Difesa paziente con PF temporanei (1 PD)", resource: FOCUS, die, count: 2, apply: "tempHp",
      text: "Disimpegno e Schivata come Azione Bonus; PF temporanei pari a 2 dadi di Arti marziali." }));
  },
  "monk/uncanny_metabolism": (f, cls) => {
    perDie(f, cls.table?.arti_marziali ?? [], "monk", (die) => action({ actionId: "uncanny_metabolism", label: "Metabolismo straordinario", resource: "uncanny_metabolism", die, bonus: "classLevel:monk", apply: "heal",
      restore: { resource: FOCUS, amount: "all" }, text: "Quando tiri l'Iniziativa: recuperi tutti i punti disciplina e questi PF." }));
  },
  "monk/deflect_attacks": (f, cls) => {
    f.effects.push(action({ actionId: "deflect_attacks", label: "Devia attacchi (riduzione danno)", resource: FOCUS, cost: 0, die: 10, bonus: "mod:dex + classLevel:monk", text: "Reazione: riduci il danno di questo totale." }));
    perDie(f, cls.table?.arti_marziali ?? [], "monk", (die) => action({ actionId: "deflect_return", label: "Rimanda l'attacco (1 PD)", resource: FOCUS, die, count: 2, bonus: "mod:dex",
      text: "Se azzeri il danno: TS Des (CD {0}) o la creatura subisce questo totale.", values: [CD_WIS] }));
  },
  "monk/slow_fall": (f) => {
    f.effects.push(action({ actionId: "slow_fall", label: "Caduta lenta (riduzione danno)", resource: FOCUS, cost: 0, bonus: "5 * classLevel:monk", text: "Reazione: riduci il danno da caduta di questo totale." }));
  },
  "monk/stunning_strike": (f) => {
    f.effects.push(rider({ riderId: "stunning_strike", label: "Stretta stordente", count: 0, limit: "turn", cost: FOCUS, values: [CD_WIS],
      text: "TS Cos (CD {0}) o Stordito fino all'inizio del tuo prossimo turno; se riesce, Velocità dimezzata e il prossimo attacco contro di lui ha Vantaggio." }));
  },
  "monk/disciplined_survivor": (f) => { f.effects.push(action({ actionId: "disciplined_reroll", label: "Ritira un TS (1 PD)", resource: FOCUS, text: "Se fallisci un tiro salvezza: ritiralo." })); },
  "monk/superior_defense": (f) => {
    f.activation = { resource: FOCUS, cost: 3, duration: "1 minuto" };
    f.effects.push({ op: "resistance", types: ALL_BUT_FORCE, when: active("superior_defense") });
  },
  // ── Guerriero della Misericordia ────────────────────────────────────────
  "mercy/hand_of_harm": (f, _s, cls) => {
    for (const [from, to, v] of ranges(cls?.table?.arti_marziali ?? [])) {
      f.effects.push(rider({ riderId: "hand_of_harm", label: "Mano del dolore", count: 1, die: dieOf(v), bonus: "mod:wis", damageType: "necrotic", limit: "turn", cost: FOCUS,
        when: `unarmed && ${lvl("monk", from, to)}` }));
    }
  },
  "mercy/hand_of_healing": (f, _s, cls) => {
    perDie(f, cls?.table?.arti_marziali ?? [], "monk", (die) => action({ actionId: "hand_of_healing", label: "Mano della guarigione (1 PD)", resource: FOCUS, die, bonus: "mod:wis",
      text: "Azione Magia: la creatura che tocchi recupera questi PF." }));
  },
  "mercy/hand_of_ultimate_mercy": (f) => {
    f.effects.push(action({ actionId: "ultimate_mercy", label: "Riporta in vita (5 PD)", resource: FOCUS, cost: 5, die: 10, count: 4, bonus: "mod:wis",
      text: "Azione Magia: creatura morta da meno di 24 ore recupera questi PF. Segna anche l'uso di questo privilegio." }));
  },
  // ── Guerriero dell'Ombra ────────────────────────────────────────────────
  "shadow/improved_shadow_step": (f) => { f.effects.push(action({ actionId: "improved_shadow_step", label: "Passo d'ombra senza oscurità (1 PD)", resource: FOCUS, text: "Ignori il requisito di oscurità e dopo il teletrasporto puoi fare un colpo senz'armi." })); },
  "shadow/cloak_of_shadows": (f) => { f.activation = { resource: FOCUS, cost: 3, duration: "1 minuto" }; },
  // ── Guerriero degli Elementi ────────────────────────────────────────────
  "elements/elemental_attunement": (f) => { f.activation = { resource: FOCUS, duration: "10 minuti" }; },
  "elements/elemental_burst": (f, _s, cls) => {
    perDie(f, cls?.table?.arti_marziali ?? [], "monk", (die) => action({ actionId: "elemental_burst", label: "Esplosione elementale (2 PD)", resource: FOCUS, cost: 2, die, count: 3,
      text: "Azione Magia: sfera di 20 ft entro 120 ft; TS Des (CD {0}) o questi danni (tipo a scelta), metà se riesce.", values: [CD_WIS] }));
  },
  "elements/stride_of_the_elements": (f) => {
    f.effects.push({ op: "setSpeed", mode: "fly", value: "speed", when: active("elemental_attunement") }, { op: "setSpeed", mode: "swim", value: "speed", when: active("elemental_attunement") });
  },
  // ── Guerriero della Mano aperta ─────────────────────────────────────────
  "open_hand/wholeness_of_body": (f, _s, cls) => {
    perDie(f, cls?.table?.arti_marziali ?? [], "monk", (die) => action({ actionId: "wholeness_of_body", label: "Integrità del corpo", resource: "wholeness_of_body", die, bonus: "max(1, mod:wis)", apply: "heal", text: "Azione Bonus." }));
  },
  "open_hand/quivering_palm": (f) => {
    f.effects.push(rider({ riderId: "quivering_palm", label: "Palmo tremante", count: 0, limit: "none", cost: FOCUS, costAmount: 4, when: "unarmed", values: [CD_WIS],
      text: "Vibrazioni per giorni; con un'azione le termini: TS Cos (CD {0}), 10d12 danni da forza, metà se riesce." }));
  },
};
