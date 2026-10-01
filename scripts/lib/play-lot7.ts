// Lotto 7 di PLAN2 — Specie: Mani guaritrici, Rivelazione celestiale, Arma del soffio, Ascendenza gigante, Forma grande, Fortuna,
// Scarica di adrenalina, Resistenza implacabile. Numeri dai riepiloghi in docs/rules (testo dei tratti in data/private/species.json).
import { action, active, rider, type Patch } from "./play-lot1";

type Json = Record<string, any>;
const CD_CON = "8 + mod:con + pb";
const GIANT = "giant_ancestry";
const choiceOption = (owner: Json, choiceId: string, optionId: string, ...effects: Json[]) => {
  const o = (owner.choices ?? []).find((c: Json) => c.id === choiceId)?.options?.find((x: Json) => x.id === optionId);
  if (!o) throw new Error(`Scelta ${choiceId}/${optionId} non trovata in ${owner.id}`);
  (o.effects ??= []).push(...effects);
};

export const LOT7: Record<string, Patch> = {
  // Mani guaritrici: tocchi una creatura, tiri d4 pari al bonus competenza e recupera quei PF
  "aasimar/healing_hands": (f) => {
    f.effects.push(action({ actionId: "healing_hands", label: "Mani guaritrici", resource: "healing_hands", die: 4, count: "pb", apply: "heal", text: "Azione Magia: i PF vanno alla creatura che tocchi (se sei tu, si applicano a te)." }));
  },
  // Rivelazione celestiale: mentre è attiva, 1 volta per turno danni extra pari al bonus competenza (necrotici o radiosi)
  "aasimar/celestial_revelation": (f) => {
    f.effects.push(rider({ riderId: "celestial_revelation", label: "Rivelazione celestiale", count: 0, bonus: "pb", limit: "turn", damageTypes: ["necrotic", "radiant"], text: "A un bersaglio colpito da attacco o incantesimo: scegli il tipo di danno ogni volta.", when: active("celestial_revelation") }));
  },
  // Arma del soffio: al posto di un attacco; dadi per livello del personaggio (1 + un dado ai livelli 5, 11 e 17), CD con la Costituzione.
  // Il tipo di danno è quello dell'ascendenza scelta: l'azione sta nell'opzione, così il testo dice il tipo.
  "dragonborn/breath_weapon": (f, sp) => {
    f.effects = f.effects.filter((e: Json) => !(e.op === "resourceAction" && e.actionId === "breath_weapon"));
    const choice = (sp.choices ?? []).find((c: Json) => c.id === "draconic_ancestry");
    if (!choice) throw new Error("Scelta draconic_ancestry non trovata");
    for (const o of choice.options as Json[]) {
      const type = (o.effects ?? []).find((e: Json) => e.op === "resistance")?.types?.[0];
      const name = String(o.description ?? "").split(": ").pop()!.toLowerCase();
      if (!type) throw new Error(`Ascendenza ${o.id} senza tipo di danno`);
      (o.effects ??= []).push(action({ actionId: "breath_weapon", label: `Arma del soffio (${name})`, resource: "breath_weapon", die: 10, count: "1 + floor((level + 1) / 6)", values: [CD_CON],
        text: `Al posto di un attacco: cono 15 ft o linea 30 ft (larga 5 ft), a scelta. TS Destrezza (CD {0}): danni da ${name}, metà se riesce.` }));
    }
  },
  // Percezione tellurica: stato attivabile con il suo uso (azione bonus, 10 minuti)
  "dwarf/stonecunning": (f) => {
    f.activation = { resource: "stonecunning", duration: "10 minuti" };
    f.effects.push({ op: "note", text: "Percezione tellurica 60 ft (su o a contatto di una superficie di pietra)", when: active("stonecunning") });
  },
  // Ascendenza gigante: gli usi (competenza per Riposo Lungo) si spendono con ogni beneficio
  "goliath/giant_ancestry": (_f, sp) => {
    choiceOption(sp, GIANT, "fire", rider({ riderId: "fires_burn", label: "Bruciatura del fuoco", count: 1, die: 10, damageType: "fire", cost: GIANT, text: "Quando colpisci e infliggi danni." }));
    choiceOption(sp, GIANT, "frost", rider({ riderId: "frosts_chill", label: "Gelo del ghiaccio", count: 1, die: 6, damageType: "cold", cost: GIANT, text: "Quando colpisci e infliggi danni; la Velocità del bersaglio scende di 10 ft fino all'inizio del tuo prossimo turno." }));
    choiceOption(sp, GIANT, "hill", rider({ riderId: "hills_tumble", label: "Capitombolo della collina", count: 0, cost: GIANT, text: "Quando colpisci una creatura Grande o inferiore: la fai cadere Prona." }));
    choiceOption(sp, GIANT, "cloud", action({ actionId: "clouds_jaunt", label: "Salto della nuvola", resource: GIANT, text: "Azione Bonus: ti teletrasporti fino a 30 ft in uno spazio libero che vedi." }));
    choiceOption(sp, GIANT, "stone", action({ actionId: "stones_endurance", label: "Resistenza della pietra", resource: GIANT, die: 12, bonus: "mod:con", text: "Reazione quando subisci danni: riduci il danno di questo totale." }));
    choiceOption(sp, GIANT, "storm", action({ actionId: "storms_thunder", label: "Tuono della tempesta", resource: GIANT, die: 8, text: "Reazione quando una creatura entro 60 ft ti infligge danni: subisce danni da tuono." }));
  },
  // Forma grande: Vantaggio alle prove di Forza (la Velocità +10 ft c'era già)
  "goliath/large_form": (f) => { f.effects.push({ op: "checkAdvantage", mode: "advantage", abilities: ["str"], when: active("large_form") }); },
  // Fortuna: se il d20 dà 1 lo ritiri e usi il nuovo risultato
  "halfling/luck": (f) => { f.effects.push({ op: "rerollOnes" }); },
  // Scarica di adrenalina: Scatto come azione bonus e PF temporanei pari alla competenza
  "orc/adrenaline_rush": (f) => {
    f.effects.push(action({ actionId: "adrenaline_rush", label: "Scarica di adrenalina", resource: "adrenaline_rush", bonus: "pb", apply: "tempHp", text: "Scatto come Azione Bonus: ottieni questi PF temporanei." }));
  },
  // Resistenza implacabile: a 0 PF (senza morire sul colpo) scendi a 1 PF
  "orc/relentless_endurance": (f) => {
    f.effects.push(action({ actionId: "relentless_endurance", label: "Resistenza implacabile", resource: "relentless_endurance", bonus: 1, apply: "heal", text: "Quando scendi a 0 PF senza morire sul colpo: resti a 1 PF." }));
  },
};
