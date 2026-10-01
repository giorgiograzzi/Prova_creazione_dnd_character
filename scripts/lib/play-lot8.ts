// Lotto 8 di PLAN2 — rifiniture: le voci rimaste con le funzioni già esistenti (promemoria con i numeri, azioni di risorsa, extra d'attacco).
// Numeri dai riepiloghi in docs/rules.
import { action, active, lvl, ranges, rider, type Patch } from "./play-lot1";

type Json = Record<string, any>;
const dieOf = (v: number | string) => Number(String(v).replace(/^\d*d/, ""));
const CD_WIS = "8 + mod:wis + pb";
const CD_INT = "8 + mod:int + pb";
const perDie = (f: Json, col: (number | string)[], cls: string, make: (die: number) => Json) => {
  for (const [from, to, v] of ranges(col)) f.effects.push({ ...make(dieOf(v)), when: lvl(cls, from, to) });
};

export const LOT8: Record<string, Patch> = {
  // Concentrazione fanatica: ritiro di un TS fallito con il Danno ira (1 volta per Ira: lo segni tu, come l'Ira stessa)
  "zealot/fanatical_focus": (f, _s, cls) => {
    for (const [from, to, v] of ranges(cls?.table?.danno_ira ?? [])) {
      f.effects.push(action({ actionId: "fanatical_focus", label: "Concentrazione fanatica", cost: 0, bonus: Number(v), when: `${active("rage")} && ${lvl("barbarian", from, to)}`,
        text: "1 volta per Ira: se fallisci un TS lo ritiri aggiungendo questo bonus." }));
    }
  },
  // Implacabile: 1d8 al posto di un dado di superiorità (1 volta per turno)
  "battle_master/relentless": (f) => {
    f.effects.push(action({ actionId: "relentless_die", label: "Manovra senza dado", cost: 0, die: 8, text: "1 volta per turno: usi una manovra con questo d8 invece di spendere un dado di superiorità." }));
  },
  // Adepto telecinetico: Balzo psionico 1 volta per riposo o spendendo un dado; Spinta telecinetica con il Colpo psionico
  "psi_warrior/telekinetic_adept": (f) => {
    f.usage = { uses: 1, recharge: "short_rest" };
    f.effects.push(
      action({ actionId: "psionic_leap", label: "Balzo psionico", resource: "telekinetic_adept", text: "Azione Bonus: voli per {0} ft fino alla fine del turno.", values: ["speed * 2"] }),
      action({ actionId: "psionic_leap_die", label: "Ripristina il Balzo spendendo un dado", resource: "psionic_energy", restore: { resource: "telekinetic_adept", amount: 1 } }),
      action({ actionId: "telekinetic_thrust", label: "Spinta telecinetica", cost: 0, text: "Con il Colpo psionico: il bersaglio fa un TS Forza (CD {0}) o cade Prono o viene spinto di 10 ft.", values: [CD_INT] }));
  },
  // Raffica di guarigione e dolore: Mano della guarigione senza PD, usi = mod Sag
  "mercy/flurry_of_healing_and_harm": (f, _s, cls) => {
    perDie(f, cls?.table?.arti_marziali ?? [], "monk", (die) => action({ actionId: "flurry_healing", label: "Mano della guarigione (Raffica)", resource: "flurry_of_healing_and_harm", die, bonus: "mod:wis", apply: "heal",
      text: "Al posto di un colpo della Raffica: la creatura che tocchi recupera questi PF." }));
  },
  // Coronamento elementale: con la Sintonia un dado di Arti marziali in più ai colpi senz'armi, 1 volta per turno
  "elements/elemental_epitome": (f, _s, cls) => {
    for (const [from, to, v] of ranges(cls?.table?.arti_marziali ?? [])) {
      f.effects.push(rider({ riderId: "elemental_epitome", label: "Coronamento elementale", count: 1, die: dieOf(v), limit: "turn", text: "Con la Sintonia attiva: dado di Arti marziali in più (tipo elementale a tua scelta).",
        when: `unarmed && ${active("elemental_attunement")} && ${lvl("monk", from, to)}` }));
    }
  },
  // Tecnica della Mano aperta: effetti della Raffica di colpi con le CD
  "open_hand/open_hand_technique": (f) => {
    f.effects.push(action({ actionId: "open_hand_technique", label: "Tecnica della Mano aperta", cost: 0, text: "Con un colpo della Raffica: Confondere, Spingere (TS Forza CD {0}, 15 ft) o Rovesciare (TS Destrezza CD {0}).", values: [CD_WIS] }));
  },
  // Raffica del cacciatore: scelta del Colpo del terrore (il 2d8 c'è già nel Terribile predatore)
  "gloom_stalker/stalkers_flurry": (f) => {
    f.effects.push(action({ actionId: "stalkers_flurry", label: "Raffica del cacciatore", cost: 0, text: "Con il Colpo del terrore: un altro attacco contro una creatura entro 5 ft dal bersaglio, oppure Paura di massa (TS Saggezza CD {0}, bersaglio e creature entro 10 ft).", values: [CD_WIS] }));
  },
};
