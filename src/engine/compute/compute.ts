import type { Character } from "../types";
import type { Ruleset } from "../ruleset";
import { computeScores } from "./abilities";
import { computeAc } from "./ac";
import { buildCtx } from "./context";
import { evalValue } from "./formula-eval";
import { computeHp } from "./hp";
import { computeProfs } from "./proficiencies";
import { computeResources } from "./resources";
import { computeRolls, untrainedArmor } from "./rolls";
import { sum, withOverride } from "./sourced";
import { computeResistances, computeSenses, computeSpeed } from "./speed";
import type { Derived } from "./types";

// Valori forzati a mano (Character.overrides): ac, hp.max, initiative, speed.walk, passivePerception
export function computeCharacter(ch: Character, rs: Ruleset): Derived {
  const x = buildCtx(ch, rs);
  const profs = computeProfs(x);
  const notes: string[] = [];
  const warnings: string[] = [];
  const { scores, mods } = computeScores(x);
  const { saves, skills } = computeRolls(x, profs, notes);

  const initiative = sum([
    { label: "Mod Des", value: x.mods.dex },
    ...x.active.flatMap(({ effect: e, label }) => (e.op === "initiativeBonus" ? [{ label, value: evalValue(e.value, x) }] : [])),
  ]);
  const perc = skills.perception;
  const percMode = perc.mode;
  const passive = sum([
    { label: "Base", value: 10 },
    { label: "Percezione", value: perc.bonus.value },
    { label: percMode === "advantage" ? "Vantaggio" : "Svantaggio", value: percMode === "advantage" ? 5 : percMode === "disadvantage" ? -5 : 0 },
  ]);

  const ac = computeAc(x, profs, warnings);
  const speed = computeSpeed(x);
  const hp = computeHp(x);
  const o = ch.overrides;
  const spellcasting = ch.classes.flatMap((c) => {
    const ability = rs.classes.get(c.classId)?.spellAbility;
    if (!ability) return [];
    const m = x.mods[ability];
    return [{
      classId: c.classId, ability,
      dc: sum([{ label: "Base", value: 8 }, { label: `Mod ${ability}`, value: m }, { label: "Competenza", value: x.pb }]),
      attack: sum([{ label: `Mod ${ability}`, value: m }, { label: "Competenza", value: x.pb }]),
    }];
  });

  return {
    level: x.level,
    proficiencyBonus: { value: x.pb, sources: [{ label: `Livello totale ${x.level}`, value: x.pb }] },
    scores, mods, saves, skills,
    initiative: withOverride(initiative, o.initiative),
    passivePerception: withOverride(passive, o.passivePerception),
    hp: { ...hp, max: withOverride(hp.max, o["hp.max"]) },
    ac: { ...withOverride(ac, o.ac), formula: ac.formula },
    speed: { ...speed, walk: withOverride(speed.walk, o["speed.walk"]) },
    senses: computeSenses(x),
    resistances: computeResistances(x),
    resources: computeResources(x),
    spellcasting,
    carryCapacity: x.scores.str * 15,
    proficiencies: { weapons: [...profs.weapons], tools: [...profs.tools], armor: [...profs.armor] },
    features: [...x.collected.features].sort(),
    feats: [...x.collected.feats].sort(),
    notes, warnings,
    spellcastingBlocked: untrainedArmor(x, profs),
  };
}
