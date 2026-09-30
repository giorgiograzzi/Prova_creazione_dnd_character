import { describeEffect, type HbData, type HbKind } from "../engine/homebrew";
import type { Effect } from "../engine/types";
import type { Ruleset } from "../engine/ruleset";
import { formatCost } from "../engine/equipment";
import it from "../i18n/it.json";

const O = it.homebrew.opts;
const name = (m: Map<string, { name: { it: string } }>, id: unknown) => m.get(String(id))?.name.it ?? String(id);

// Righe di riepilogo di una voce (elenco e anteprima del modulo)
export function summarize(kind: HbKind, x: HbData, rs: Ruleset): string[] {
  const d = x as Record<string, any>;
  const cost = d.cost > 0 ? [formatCost(d.cost)] : [];
  switch (kind) {
    case "weapons": return [
      `${(O.weaponCategory as Record<string, string>)[d.category]} · ${(O.weaponKind as Record<string, string>)[d.kind]}`,
      `${d.damage} ${name(rs.damageTypes, d.damageType)}${d.versatileDamage ? ` (${d.versatileDamage} a due mani)` : ""}`,
      [...(d.properties as string[]).map((p) => name(rs.weaponProperties, p)), `Maestria: ${name(rs.masteries, d.mastery)}`].join(", "),
      [...cost, d.weight ? `${d.weight} lb` : ""].filter(Boolean).join(" · "),
    ].filter(Boolean);
    case "armors": return [
      `${(O.armorCategory as Record<string, string>)[d.category]} · CA ${d.category === "shield" ? "+" : ""}${d.baseAc}${d.dexCap === null ? "" : d.dexCap === 0 ? "" : ` + Des (max ${d.dexCap})`}`,
      [d.strRequired ? `Forza ${d.strRequired}` : "", d.stealthDisadvantage ? "Svantaggio a Furtività" : ""].filter(Boolean).join(" · "),
      [...cost, d.weight ? `${d.weight} lb` : ""].filter(Boolean).join(" · "),
    ].filter(Boolean);
    case "items": return [[d.category, d.attunement ? "sintonia" : "", ...cost, d.weight ? `${d.weight} lb` : ""].filter(Boolean).join(" · ")];
    case "feats": return [
      (O.featCategory as Record<string, string>)[d.category] ?? d.category,
      ...((d.prerequisites as string[]).length ? [`Richiede: ${(d.prerequisites as string[]).join(", ")}`] : []),
      ...((d.effects as Effect[]).map((e) => describeEffect(e, rs))),
    ];
    case "spells": return [
      `${d.level === 0 ? "Trucchetto" : `${d.level}°`} · ${(O.school as Record<string, string>)[d.school]} · ${(d.classes as string[]).map((c) => (O.classes as Record<string, string>)[c]).join(", ") || "nessuna classe"}`,
      `${(O.castUnit as Record<string, string>)[d.castingTime.unit]} · ${d.range} · ${d.duration}${d.concentration ? " (Concentrazione)" : ""}${d.ritual ? " · Rituale" : ""}`,
      d.summary,
    ].filter(Boolean);
  }
}
