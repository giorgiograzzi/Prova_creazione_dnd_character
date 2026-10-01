// Punto 1 di PLAN3 — Manovre del Maestro di battaglia: ogni manovra scelta diventa un dado extra sull'attacco (se aggiunge danni)
// oppure un'azione che spende un dado di superiorità e tira il dado giusto per livello (colonna della tabella).
// I numeri vengono dalla tabella «Manovre» del riepilogo 01 (docs/rules); i testi sono riassunti nostri.
import { action, lvl, ranges, rider, type Patch } from "./play-lot1";

type Json = Record<string, any>;
const RES = "superiority_dice";
const CD = "8 + pb + max(mod:str, mod:dex)"; // «For o Des a scelta»: conviene sempre il più alto
const TS = (what: string) => `CD {0} (${what})`;

// Manovre che si aggiungono a un attacco: [id, tipo di attacco, testo]
const RIDERS: [string, "melee" | "any", string][] = [
  ["disarming_attack", "any", `${TS("TS Forza")}: se fallisce lascia cadere un oggetto che impugna.`],
  ["distracting_strike", "any", "Il prossimo attacco di un'altra creatura contro il bersaglio ha Vantaggio."],
  ["goading_attack", "any", `${TS("TS Saggezza")}: se fallisce ha Svantaggio agli attacchi contro chi non sei tu, fino alla fine del tuo prossimo turno.`],
  ["maneuvering_attack", "any", "Un alleato può usare la Reazione per muoversi di metà Velocità senza provocare attacchi di opportunità dal bersaglio."],
  ["menacing_attack", "any", `${TS("TS Saggezza")}: se fallisce è Spaventato fino alla fine del tuo prossimo turno.`],
  ["pushing_attack", "any", `${TS("TS Forza")}: se fallisce (Grande o più piccolo) è spinto fino a 15 ft.`],
  ["trip_attack", "any", `${TS("TS Forza")}: se fallisce (Grande o più piccolo) cade Prono.`],
  ["feinting_attack", "any", "Azione Bonus prima dell'attacco: Vantaggio al prossimo attacco contro una creatura entro 5 ft; il dado si somma solo se colpisci."],
  ["lunging_attack", "melee", "Azione Bonus: Scatto; ti serve un movimento di almeno 5 ft in linea retta verso il bersaglio e un colpo in mischia."],
  ["riposte", "melee", "Reazione quando una creatura ti manca in mischia: un attacco in mischia contro di lei."],
];

// Manovre che spendono il dado senza aggiungersi al danno di un attacco: [id, nome, testo, bonus]
const ACTIONS: [string, string, string, string?][] = [
  ["ambush", "Imboscata", "Aggiungi il dado a una prova di Furtività o all'Iniziativa (non Incapacitato).", undefined],
  ["bait_and_switch", "Scambio di posto", "Nel tuo turno scambi posto con un alleato entro 5 ft (ti muovi di 5 ft); tu o lui aggiungete il dado alla CA fino al tuo prossimo turno.", undefined],
  ["commanders_strike", "Colpo del comandante", "Rinunci a un tuo attacco: un alleato usa la Reazione per attaccare e aggiunge il dado ai danni.", undefined],
  ["commanding_presence", "Presenza autoritaria", "Aggiungi il dado a una prova di Intimidire, Intrattenere o Persuasione.", undefined],
  ["evasive_footwork", "Passo evasivo", "Azione Bonus: Disimpegno; aggiungi il dado alla CA fino all'inizio del tuo prossimo turno.", undefined],
  ["parry", "Parata", "Reazione quando subisci danni da un attacco in mischia: riduci il danno di questo totale (dado + Forza o Destrezza).", "max(mod:str, mod:dex)"],
  ["precision_attack", "Attacco di precisione", "Dopo aver mancato, aggiungi il dado al tiro per colpire.", undefined],
  ["rally", "Adunata", "Azione Bonus: un alleato che ti sente ottiene questi PF temporanei (dado + metà livello da Guerriero).", "floor(classLevel:fighter / 2)"],
  ["sweeping_attack", "Attacco ampio", `Colpendo in mischia: un'altra creatura entro 5 ft dal bersaglio e alla tua portata subisce il valore del dado, se il tiro la colpirebbe.`, undefined],
  ["tactical_assessment", "Valutazione tattica", "Aggiungi il dado a una prova di Storia, Indagare o Intuizione.", undefined],
];

export const MANEUVERS: Record<string, Patch> = {
  "battle_master/combat_superiority": (f, sub) => {
    f.effects.push({ op: "note", text: "Una sola manovra per attacco (i dadi si spendono dal tab Attacchi o dalle azioni).", when: lvl("fighter", 3, 20) });
    const choice = (sub.choices ?? []).find((c: Json) => c.id === "battle_master_maneuvers");
    if (!choice) throw new Error("Scelta delle manovre non trovata in battle_master");
    const byId = new Map<string, Json>((choice.options as Json[]).map((o) => [o.id, o]));
    const get = (id: string) => byId.get(id) ?? (() => { throw new Error(`Manovra ${id} non trovata`); })();
    for (const [from, to, v] of ranges(sub.table?.dado_superiorita ?? [])) {
      const die = Number(String(v).replace("d", "")), when = lvl("fighter", from, to);
      for (const [id, type, text] of RIDERS) {
        get(id).effects.push(rider({ riderId: id, label: get(id).name.it, count: 1, die, attackType: type, cost: RES, text, values: [CD], when }));
      }
      for (const [id, , text, bonus] of ACTIONS) {
        get(id).effects.push(action({ actionId: id, label: get(id).name.it, resource: RES, die, ...(bonus ? { bonus } : {}), text, when }));
      }
    }
    for (const [id] of [...RIDERS, ...ACTIONS]) get(id); // tutte e 20 devono esistere
  },
};
