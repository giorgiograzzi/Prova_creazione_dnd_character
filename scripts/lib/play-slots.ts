// Punto 2 di PLAN3 — privilegi che si usano «1 volta per riposo o spendendo uno slot» (Warlock, Mago, Druido): azione con costo in slot.
// Lo slot può essere di qualsiasi classe, anche del Patto (le classi condividono gli slot: file 02); Scagliare all'inferno vuole uno slot del Patto.
// L'azione non tocca il contatore del privilegio: è il costo alternativo. I numeri vengono dalla riga del privilegio nel riepilogo 01.
import { action, type Patch } from "./play-lot1";

export const SLOTS: Record<string, Patch> = {
  "archfey/beguiling_defenses": (f) => {
    f.effects.push(action({ actionId: "beguiling_defenses_slot", label: "Difese ammalianti (con uno slot)", cost: 0, slot: { minLevel: 1 },
      text: "Reazione quando una creatura ti colpisce: dimezzi il danno e l'attaccante fa un TS Saggezza o subisce danni psichici pari al danno che hai subito. Paghi con uno slot al posto dell'uso." }));
  },
  "fiend/hurl_through_hell": (f) => {
    f.effects.push(action({ actionId: "hurl_through_hell_slot", label: "Scagliare all'inferno (con uno slot del Patto)", cost: 0, slot: { minLevel: 1, pactOnly: true },
      text: "Una volta per turno, colpendo con un attacco: TS Carisma o il bersaglio subisce 8d10 psichici ed è Incapacitato fino alla fine del tuo prossimo turno. Paghi con uno slot del Patto al posto dell'uso." }));
  },
  "great_old_one/clairvoyant_combatant": (f) => {
    f.effects.push(action({ actionId: "clairvoyant_combatant_slot", label: "Combattente chiaroveggente (con uno slot)", cost: 0, slot: { minLevel: 1 },
      text: "Creando il legame: TS Saggezza o la creatura ha Svantaggio contro di te e tu Vantaggio contro di lei. Paghi con uno slot al posto dell'uso." }));
  },
  "illusionist/illusory_self": (f) => {
    f.effects.push(action({ actionId: "illusory_self_slot", label: "Sé illusorio (con uno slot di 2°+)", cost: 0, slot: { minLevel: 2 },
      text: "Reazione quando vieni attaccato: l'attacco manca automaticamente. Paghi con uno slot di 2° livello o superiore al posto dell'uso." }));
  },
  "moon/moonlight_step": (f) => {
    f.effects.push(action({ actionId: "moonlight_step_slot", label: "Recupera un uso di Passo di luce lunare (slot di 2°+)", cost: 0, slot: { minLevel: 2 },
      restore: { resource: "moonlight_step", amount: 1 }, text: "Spendi uno slot di 2° livello o superiore: recuperi un uso." }));
  },
};
