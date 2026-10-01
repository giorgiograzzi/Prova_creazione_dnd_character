// Lotto 4 di PLAN2 — Talenti, Stili di combattimento e Doni epici: extra d'attacco, minimo dei dadi, riserve. Numeri dai riepiloghi in docs/rules.
import { action, rider, type Patch } from "./play-lot1";

// Un talento è proprietario di sé stesso: la chiave è «<id>/<id>»
const feat = (id: string, p: Patch): [string, Patch] => [`${id}/${id}`, p];
const reminder = (riderId: string, label: string, text: string, when: string, limit = "turn", extra: Record<string, unknown> = {}) =>
  rider({ riderId, label, count: 0, limit, text, when, ...extra });

export const LOT4: Record<string, Patch> = Object.fromEntries([
  feat("savage_attacker", (f) => { f.effects.push(reminder("savage_attacker", "Attaccante selvaggio", "Colpendo con un'arma: tira due volte i dadi di danno dell'arma e usa uno dei due risultati.", "!unarmed")); }),
  feat("charger", (f) => {
    f.effects.push(rider({ riderId: "charger", label: "Caricatore", count: 1, die: 8, limit: "turn", when: "attackType:melee",
      text: "Se ti sei mosso di almeno 10 ft in linea retta verso il bersaglio: +1d8 danni oppure lo spingi di 10 ft." }));
  }),
  feat("crusher", (f) => { f.effects.push(reminder("crusher", "Frantumatore", "Danni contundenti: sposti il bersaglio di 5 ft; con un critico gli attacchi contro di lui hanno Vantaggio.", "damageType:bludgeoning")); }),
  feat("piercer", (f) => { f.effects.push(reminder("piercer", "Perforatore", "Danni perforanti: ritira un dado di danno; con un critico tiri un dado extra.", "damageType:piercing")); }),
  feat("slasher", (f) => { f.effects.push(reminder("slasher", "Squartatore", "Danni taglienti: Velocità del bersaglio -10 ft; con un critico ha Svantaggio ai tiri per colpire.", "damageType:slashing")); }),
  // Maestro delle armi possenti: danni extra pari alla competenza con un'arma Pesante nell'azione di Attacco (sempre sommati)
  feat("great_weapon_master", (f) => {
    f.effects.push(rider({ riderId: "great_weapon_master", label: "Maestro delle armi possenti", count: 0, bonus: "pb", limit: "none", auto: true, when: "weaponProperty:heavy" }),
      { op: "note", text: "Dopo un critico in mischia o dopo aver portato una creatura a 0 PF in mischia: un attacco con la stessa arma come Azione Bonus" });
  }),
  feat("shield_master", (f) => {
    f.effects.push(reminder("shield_master", "Colpo di scudo", "Colpendo in mischia nell'azione di Attacco: TS For (CD {0}) o il bersaglio è spinto di 5 ft o cade Prono.", "attackType:melee && shield", "none", { values: ["8 + mod:str + pb"] }));
  }),
  feat("grappler", (f) => { f.effects.push(reminder("grappler", "Lottatore", "Colpo senz'armi nell'azione di Attacco: oltre al danno puoi Afferrare il bersaglio.", "unarmed")); }),
  feat("athlete", (f) => { f.effects.push({ op: "setSpeed", mode: "climb", value: "speed" }); }),
  feat("heavy_armor_master", (f) => {
    f.effects.push({ op: "note", text: "Riduci di {0} i danni contundenti, perforanti e taglienti subiti da attacchi", values: ["pb"], when: "wearingArmor:heavy" });
  }),
  feat("great_weapon_fighting", (f) => { f.effects.push({ op: "damageDieFloor", min: 3, attackType: "melee", when: "attackType:melee && twoHanded" }); }),
  feat("interception", (f) => { f.effects.push({ op: "note", text: "Intercettare (Reazione): riduci di 1d10 + {0} il danno a un alleato entro 5 ft", values: ["pb"] }); }),
  feat("boon_of_combat_prowess", (f) => { f.effects.push(reminder("boon_of_combat_prowess", "Prodezza in combattimento", "Se manchi con un tiro per colpire, puoi colpire invece.", "attackType:melee || attackType:ranged")); }),
  feat("boon_of_recovery", (f) => {
    f.effects.push({ op: "resource", resourceId: "boon_of_recovery_dice", uses: 10, recharge: "long_rest" },
      action({ actionId: "boon_of_recovery_dice", label: "Spendi dadi e recupera PF", resource: "boon_of_recovery_dice", variable: true, die: 10, apply: "heal", text: "Azione Bonus: ogni dado speso è 1d10 PF." }));
  }),
]);
