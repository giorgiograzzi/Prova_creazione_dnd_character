import { ABILITIES, SKILLS, type Ability, type Effect } from "../schema";
import type { Ctx } from "./context";
import { SKILL_ABILITY } from "./constants";
import { evalValue } from "./formula-eval";
import type { Profs } from "./proficiencies";
import { sum, type Part } from "./sourced";
import type { ConditionState, Derived, Proficiency, RollFloor, RollMode, Skill } from "./types";

// Vantaggio e svantaggio non si cumulano: se ci sono entrambi si annullano (file 02 §9)
export function combineMode(adv: string[], dis: string[]): { mode: RollMode; modeSources: string[] } {
  if (adv.length && dis.length) return { mode: "normal", modeSources: [...adv.map((s) => `+ ${s}`), ...dis.map((s) => `- ${s}`)] };
  if (adv.length) return { mode: "advantage", modeSources: adv };
  if (dis.length) return { mode: "disadvantage", modeSources: dis };
  return { mode: "normal", modeSources: [] };
}

// Armatura indossata senza addestramento: svantaggio alle prove d20 di For e Des
export function untrainedArmor(x: Ctx, profs: Profs) {
  const a = x.bodyArmor;
  return !!a && !profs.armor.has(a.category);
}

// Il minimo più alto tra gli effetti `rollFloor` che si applicano a questo tiro
// (uno per tipo: sul dado e sul totale, che possono valere insieme)
function floorFor(x: Ctx, match: (e: Extract<Effect, { op: "rollFloor" }>) => boolean): RollFloor[] | undefined {
  const best: Partial<Record<"die" | "total", RollFloor>> = {};
  for (const { effect: e, label } of x.active) {
    if (e.op !== "rollFloor" || !match(e)) continue;
    const min = evalValue(e.min, x);
    if (!best[e.on] || min > best[e.on]!.min) best[e.on] = { min, on: e.on, label };
  }
  const list = Object.values(best);
  return list.length ? list : undefined;
}

export function computeRolls(x: Ctx, profs: Profs, notes: string[], cs: ConditionState) {
  const untrained = untrainedArmor(x, profs);
  const armorDis = "Armatura senza addestramento";
  const saves = {} as Derived["saves"];
  for (const a of ABILITIES) {
    const proficient = profs.saves.has(a);
    const parts: Part[] = [{ label: `Mod ${a}`, value: x.mods[a] }];
    if (proficient) parts.push({ label: "Competenza", value: x.pb });
    const adv: string[] = [...cs.rolls.saves[a].adv], dis: string[] = [...cs.rolls.saves[a].dis];
    if (cs.d20Penalty) parts.push({ label: "Esaurimento", value: cs.d20Penalty });
    for (const { effect: e, label } of x.active) {
      if (e.op === "saveBonus" && (!e.ability || e.ability === a)) parts.push({ label, value: evalValue(e.value, x) });
      if (e.op === "saveAdvantage" && (!e.abilities || e.abilities.includes(a))) {
        if (e.against) continue;
        adv.push(label);
      }
    }
    if (untrained && (a === "str" || a === "dex")) dis.push(armorDis);
    const floor = floorFor(x, (e) => e.saves && (!e.abilities || e.abilities.includes(a)) && (!e.proficientOnly || proficient));
    saves[a] = { bonus: sum(parts), proficient, autoFail: cs.autoFailSaves[a] ?? [], ...combineMode(adv, dis), ...(floor ? { floor } : {}) };
  }
  for (const { effect: e, label } of x.active) {
    if (e.op === "saveAdvantage" && e.against) notes.push(`Vantaggio ai TS${e.abilities ? ` (${e.abilities.join("/")})` : ""} contro ${e.against} — ${label}`);
  }
  const jack = x.collected.features.has("jack_of_all_trades"); // Factotum del Bardo
  const halfFor = (ab: Ability) => x.active.find(({ effect: e }) => e.op === "halfProficiency" && (!e.abilities || e.abilities.includes(ab)));
  const skills = {} as Derived["skills"];
  for (const s of SKILLS as readonly Skill[]) {
    const ab: Ability = SKILL_ABILITY[s];
    const half = halfFor(ab);
    let prof: Proficiency = profs.expertise.has(s) ? "expertise" : profs.skills.has(s) ? "proficient" : jack || half ? "half" : "none";
    const parts: Part[] = [{ label: `Mod ${ab}`, value: x.mods[ab] }];
    if (prof === "proficient") parts.push({ label: "Competenza", value: x.pb });
    if (prof === "expertise") parts.push({ label: "Maestria", value: x.pb * 2 });
    if (prof === "half") parts.push({ label: jack ? "Factotum (metà competenza)" : `${half?.label ?? "Metà competenza"} (metà competenza)`, value: Math.floor(x.pb / 2) });
    const adv: string[] = [...cs.rolls.checks.adv], dis: string[] = [...cs.rolls.checks.dis];
    for (const { effect: e, label } of x.active) {
      if (e.op === "checkBonus" && (!e.skills || e.skills.includes(s))) parts.push({ label, value: evalValue(e.value, x) });
      if (e.op === "checkAdvantage" && (!e.skills || e.skills.includes(s)) && (!e.abilities || e.abilities.includes(ab))) (e.mode === "advantage" ? adv : dis).push(label);
    }
    if (cs.d20Penalty) parts.push({ label: "Esaurimento", value: cs.d20Penalty });
    if (untrained && (ab === "str" || ab === "dex")) dis.push(armorDis);
    if (s === "stealth" && x.bodyArmor?.stealthDisadvantage) dis.push(x.bodyArmor.name.it);
    const floor = floorFor(x, (e) => (!e.skills || e.skills.includes(s)) && (!e.abilities || e.abilities.includes(ab)) && (!e.proficientOnly || prof === "proficient" || prof === "expertise"));
    skills[s] = { bonus: sum(parts), ability: ab, proficiency: prof, ...combineMode(adv, dis), ...(floor ? { floor } : {}) };
  }
  // prove di caratteristica pure (senza abilità): condizioni, Vantaggio per caratteristica e minimo dei tiri (Possanza indomita)
  const checks = {} as Derived["checks"];
  for (const a of ABILITIES) {
    const adv: string[] = [...cs.rolls.checks.adv], dis: string[] = [...cs.rolls.checks.dis];
    for (const { effect: e, label } of x.active) {
      if (e.op === "checkAdvantage" && !e.skills && (!e.abilities || e.abilities.includes(a))) (e.mode === "advantage" ? adv : dis).push(label);
    }
    if (untrained && (a === "str" || a === "dex")) dis.push(armorDis);
    const floor = floorFor(x, (e) => e.rawChecks && !e.skills && !e.proficientOnly && (!e.abilities || e.abilities.includes(a)));
    checks[a] = { ...combineMode(adv, dis), ...(floor ? { floor } : {}) };
  }
  return { saves, skills, checks };
}
