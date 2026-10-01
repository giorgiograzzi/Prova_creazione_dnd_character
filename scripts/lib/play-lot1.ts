// Lotto 1 di PLAN2 — Barbaro e Guerriero: effetti, extra d'attacco e azioni dei privilegi con numeri dai riepiloghi in docs/rules.
// Ogni voce è una modifica del privilegio (`owner` = classe o sottoclasse che lo contiene, `parent` = la classe di una sottoclasse).
type Json = Record<string, any>;
export type Patch = (f: Json, owner: Json, parent?: Json) => void;

const T = (it: string) => ({ it });
const active = (id: string) => `active:${id}`;

// Intervalli di livello in cui una colonna della tabella ha lo stesso valore: [da, a, valore]; i valori vuoti/zero si saltano
export function ranges(col: (number | string)[]): [number, number, number | string][] {
  const out: [number, number, number | string][] = [];
  col.forEach((v, i) => {
    const last = out[out.length - 1];
    if (last && last[2] === v) last[1] = i + 1; else out.push([i + 1, i + 1, v]);
  });
  return out.filter(([, , v]) => v !== 0 && v !== "");
}
const lvl = (cls: string, from: number, to: number) => `classLevel:${cls}>=${from}${to < 20 ? ` && classLevel:${cls}<=${to}` : ""}`;

const rider = (o: Json) => ({ op: "attackRider", attackType: "any", limit: "none", auto: false, ...o });
const action = (o: Json) => ({ op: "resourceAction", cost: 1, variable: false, apply: "none", ...o });

export const LOT1: Record<string, Patch> = {
  // ── Barbaro ─────────────────────────────────────────────────────────────
  // Ira: Vantaggio alle prove di Forza (si aggiunge a quello ai TS già presente)
  "barbarian/rage": (f) => { f.effects.push({ op: "checkAdvantage", mode: "advantage", abilities: ["str"], when: active("rage") }); },
  // Attacco irruento: stato senza risorsa; Vantaggio agli attacchi con la Forza, gli attacchi contro di te hanno Vantaggio
  "barbarian/reckless_attack": (f) => {
    f.activation = { label: T("Attacco irruento"), duration: "fino all'inizio del tuo prossimo turno" };
    f.effects.push(
      { op: "attackAdvantage", mode: "advantage", attackType: "any", when: `${active("reckless_attack")} && attackAbility:str` },
      { op: "note", text: "Gli attacchi contro di te hanno Vantaggio", when: active("reckless_attack") });
  },
  "barbarian/feral_instinct": (f) => { f.effects.push({ op: "initiativeAdvantage", mode: "advantage" }); },
  // Colpo brutale: rinunci al Vantaggio di Attacco irruento su un attacco con la Forza; dadi extra 1 volta per turno
  "barbarian/brutal_strike": (f) => {
    const base = { riderId: "brutal_strike", label: "Colpo brutale", limit: "turn", text: "Rinunci al Vantaggio di Attacco irruento su questo attacco; scegli l'effetto (vedi il privilegio)." };
    f.effects.push(
      rider({ ...base, count: 1, die: 10, when: `${active("reckless_attack")} && attackAbility:str && ${lvl("barbarian", 9, 16)}` }),
      rider({ ...base, count: 2, die: 10, when: `${active("reckless_attack")} && attackAbility:str && ${lvl("barbarian", 17, 20)}` }));
  },
  // Ira persistente: recuperi tutte le Ire tirando Iniziativa, 1 volta per Riposo Lungo
  "barbarian/persistent_rage": (f) => {
    f.usage = { uses: 1, recharge: "long_rest" };
    f.effects.push(action({ actionId: "persistent_rage", label: "Recupera le Ire", resource: "persistent_rage", restore: { resource: "rage", amount: "all" }, text: "Quando tiri l'Iniziativa" }));
  },
  // Possanza indomita: se il totale di una prova o TS di Forza è sotto il punteggio, usi il punteggio
  "barbarian/indomitable_might": (f) => {
    f.effects.push({ op: "rollFloor", min: "score:str", on: "total", abilities: ["str"], proficientOnly: false, saves: true, rawChecks: true });
  },
  // ── Berserker ───────────────────────────────────────────────────────────
  // Frenesia: tanti d6 quanto il bonus Danno ira, sul primo bersaglio colpito del turno (con Ira e Attacco irruento)
  "berserker/frenzy": (f, _s, cls) => {
    for (const [from, to, v] of ranges(cls?.table.danno_ira ?? [])) {
      f.effects.push(rider({ riderId: "frenzy", label: "Frenesia", count: v, die: 6, limit: "turn",
        when: `${active("rage")} && ${active("reckless_attack")} && attackAbility:str && ${lvl("barbarian", from, to)}` }));
    }
  },
  "berserker/mindless_rage": (f) => { f.effects.push({ op: "conditionImmunity", conditions: ["charmed", "frightened"], when: active("rage") }); },
  "berserker/intimidating_presence": (f) => {
    f.effects.push(action({ actionId: "intimidating_presence_rage", label: "Ripristina spendendo un'Ira", resource: "rage", restore: { resource: "intimidating_presence", amount: 1 } }));
  },
  // ── Cuore selvaggio ─────────────────────────────────────────────────────
  "wild_heart/rage_of_the_wilds": (f) => {
    const resist = ["acid", "bludgeoning", "cold", "fire", "lightning", "piercing", "poison", "slashing", "thunder"]; // tutti tranne forza, necrotico, psichico, radioso
    f.activation = { requires: active("rage"), label: T("Animale"), duration: "finché dura l'Ira", options: [
      { id: "bear", name: T("Orso"), description: "Resistenza a tutti i danni tranne forza, necrotico, psichico e radioso.", effects: [{ op: "resistance", types: resist, when: active("rage") }] },
      { id: "eagle", name: T("Aquila"), description: "Scatto e Disimpegno come parte dell'Azione Bonus d'ingresso e poi come Azione Bonus.", effects: [] },
      { id: "wolf", name: T("Lupo"), description: "Gli alleati hanno Vantaggio agli attacchi contro i nemici entro 5 ft da te.", effects: [] },
    ] };
  },
  "wild_heart/aspect_of_the_wilds": (f) => {
    f.choices.push({ id: "aspect_of_the_wilds", label: T("Aspetto (cambia a ogni Riposo Lungo)"), count: 1, distinct: true, options: [
      { id: "owl", name: T("Gufo"), description: "Scurovisione 60 ft, oppure +60 ft se l'hai già.", effects: [{ op: "sense", kind: "darkvision", range: 60, additive: true }] },
      { id: "panther", name: T("Pantera"), description: "Velocità di scalare pari alla Velocità.", effects: [{ op: "setSpeed", mode: "climb", value: "speed" }] },
      { id: "salmon", name: T("Salmone"), description: "Velocità di nuotare pari alla Velocità.", effects: [{ op: "setSpeed", mode: "swim", value: "speed" }] },
    ] });
  },
  "wild_heart/power_of_the_wilds": (f) => {
    f.activation = { requires: active("rage"), label: T("Animale"), duration: "finché dura l'Ira", options: [
      { id: "falcon", name: T("Falco"), description: "Velocità di volare pari alla Velocità se non indossi armatura.", effects: [{ op: "setSpeed", mode: "fly", value: "speed", when: `${active("rage")} && wearingArmor:none` }] },
      { id: "lion", name: T("Leone"), description: "I nemici entro 5 ft hanno Svantaggio ad attaccare altri che non siano te o altri Barbari con questa opzione.", effects: [] },
      { id: "ram", name: T("Ariete"), description: "Colpendo in mischia puoi far cadere Prona una creatura Grande o inferiore.", effects: [] },
    ] };
  },
  // ── Albero del mondo ────────────────────────────────────────────────────
  "world_tree/vitality_of_the_tree": (f) => {
    f.effects.push(action({ actionId: "vitality_of_the_tree", label: "PF temporanei all'ingresso in Ira", resource: "rage", cost: 0, bonus: "classLevel:barbarian", apply: "tempHp", when: active("rage") }));
  },
  // ── Zelota ──────────────────────────────────────────────────────────────
  "zealot/divine_fury": (f) => {
    f.effects.push(rider({ riderId: "divine_fury", label: "Furia divina", count: 1, die: 6, bonus: "floor(classLevel:barbarian / 2)", limit: "turn", when: active("rage"),
      text: "Necrotici o radiosi, a tua scelta: il primo bersaglio colpito nel turno." }));
  },
  "zealot/warrior_of_the_gods": (f) => {
    const table = [0, 0, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7, 7, 7, 7]; // 4; 5 al 6°; 6 al 12°; 7 al 17° (riepilogo)
    f.effects.push({ op: "resource", resourceId: "warrior_of_the_gods", uses: { table }, recharge: "long_rest" },
      action({ actionId: "warrior_of_the_gods", label: "Spendi dadi e recupera PF", resource: "warrior_of_the_gods", variable: true, die: 12, apply: "heal", text: "Azione Bonus" }));
  },
  "zealot/zealous_presence": (f) => {
    f.effects.push(action({ actionId: "zealous_presence_rage", label: "Ripristina spendendo un'Ira", resource: "rage", restore: { resource: "zealous_presence", amount: 1 } }));
  },
  "zealot/rage_of_the_gods": (f) => {
    f.activation = { resource: "rage_of_the_gods", requires: active("rage"), duration: "1 minuto" };
    f.effects.push({ op: "setSpeed", mode: "fly", value: "speed", when: active("rage_of_the_gods") },
      { op: "resistance", types: ["necrotic", "psychic", "radiant"], when: active("rage_of_the_gods") });
  },
  // ── Guerriero ───────────────────────────────────────────────────────────
  "fighter/second_wind": (f) => {
    f.effects.push(action({ actionId: "second_wind", label: "Recupera PF", resource: "second_wind", die: 10, bonus: "classLevel:fighter", apply: "heal", text: "Azione Bonus" }));
  },
  "fighter/tactical_mind": (f) => {
    f.effects.push(action({ actionId: "tactical_mind", label: "Aggiungi 1d10 a una prova", resource: "second_wind", die: 10, text: "Aggiungi il totale alla prova; se fallisci comunque, l'uso non si spende (rimettilo con +)." }));
  },
  // ── Campione ────────────────────────────────────────────────────────────
  "champion/remarkable_athlete": (f) => {
    f.effects.push({ op: "initiativeAdvantage", mode: "advantage" }, { op: "checkAdvantage", mode: "advantage", skills: ["athletics"] });
  },
  // ── Maestro di battaglia ────────────────────────────────────────────────
  // Dado di superiorità per livello (d8, d10 dal 10°, d12 dal 18°: colonna della tabella); le manovre restano da estrarre
  "battle_master/combat_superiority": (f, sub) => {
    for (const [from, to, v] of ranges(sub.table?.dado_superiorita ?? [])) {
      f.effects.push(action({ actionId: "maneuver", label: "Usa una manovra", resource: "superiority_dice", die: Number(String(v).replace("d", "")),
        text: "Aggiungi il dado secondo la manovra scelta", when: lvl("fighter", from, to) }));
    }
  },
  "battle_master/know_your_enemy": (f) => {
    f.effects.push(action({ actionId: "know_your_enemy_die", label: "Ripristina spendendo un dado", resource: "superiority_dice", restore: { resource: "know_your_enemy", amount: 1 } }));
  },
  // ── Guerriero psionico ──────────────────────────────────────────────────
  "psi_warrior/psionic_power": (f, sub) => {
    for (const [from, to, v] of ranges(sub.table?.dado_energia ?? [])) {
      const die = Number(String(v).replace("d", ""));
      f.effects.push(
        rider({ riderId: "psionic_strike", label: "Colpo psionico", count: 1, die, bonus: "mod:int", damageType: "force", limit: "turn", cost: "psionic_energy", when: lvl("fighter", from, to),
          text: "Dopo aver colpito una creatura entro 30 ft; spendi un dado di energia psionica." }),
        action({ actionId: "protective_field", label: "Campo protettivo (riduzione danno)", resource: "psionic_energy", die, bonus: "mod:int", text: "Reazione: riduci il danno di questo totale", when: lvl("fighter", from, to) }));
    }
  },
  "psi_warrior/guarded_mind": (f) => { f.effects.push({ op: "resistance", types: ["psychic"] }); },
};
