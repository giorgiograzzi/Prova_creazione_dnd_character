import type { Ability } from "../schema";
import type { Ctx } from "./context";

export interface Profs {
  saves: Set<Ability>;
  skills: Set<string>;
  expertise: Set<string>;
  tools: Set<string>;
  weapons: Set<string>;
  armor: Set<string>;
}

// Competenze da classe di partenza (solo la prima: il multiclasse non dà TS),
// background e da tutti gli effetti attivi.
export function computeProfs(x: Ctx): Profs {
  const p: Profs = { saves: new Set(), skills: new Set(), expertise: new Set(), tools: new Set(), weapons: new Set(), armor: new Set() };
  const first = x.ch.classes[0] && x.rs.classes.get(x.ch.classes[0].classId);
  if (first) {
    first.saves.forEach((a) => p.saves.add(a));
    first.armorTraining.forEach((a) => p.armor.add(a));
    first.weaponProficiency.forEach((w) => p.weapons.add(w));
  }
  const bg = x.rs.backgrounds.get(x.ch.backgroundId);
  if (bg) {
    bg.skills.forEach((s) => p.skills.add(s));
    p.tools.add(bg.tool);
  }
  for (const { effect: e } of x.active) {
    if (e.op === "grantSkillProficiency") e.skills.forEach((s) => (e.expertise ? p.expertise : p.skills).add(s));
    else if (e.op === "grantSaveProficiency") e.abilities.forEach((a) => p.saves.add(a));
    else if (e.op === "grantToolProficiency") e.tools.forEach((t) => p.tools.add(t));
    else if (e.op === "grantWeaponProficiency") e.weapons.forEach((w) => p.weapons.add(w));
    else if (e.op === "grantArmorTraining") e.training.forEach((t) => p.armor.add(t));
  }
  // La maestria (expertise) implica la competenza
  p.expertise.forEach((s) => p.skills.add(s));
  return p;
}
