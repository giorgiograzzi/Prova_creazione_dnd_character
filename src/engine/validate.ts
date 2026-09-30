import type { Ruleset } from "./ruleset";

// Controllo dei riferimenti incrociati tra voci dei dati (oltre alla validazione Zod).
// Ogni controllo salta se la tabella di destinazione è vuota (dati non ancora caricati).
export function checkReferences(rs: Ruleset): string[] {
  const errs: string[] = [];
  const need = (from: string, what: string, id: string, target: Map<string, unknown>, tname: string) => {
    if (target.size > 0 && !target.has(id)) errs.push(`${from}: ${what} "${id}" non esiste in ${tname}`);
  };
  for (const w of rs.weapons.values()) {
    need(`weapons/${w.id}`, "maestria", w.mastery, rs.masteries, "masteries");
    need(`weapons/${w.id}`, "tipo di danno", w.damageType, rs.damageTypes, "damageTypes");
    for (const p of w.properties) need(`weapons/${w.id}`, "proprietà", p, rs.weaponProperties, "weaponProperties");
  }
  for (const it of rs.items.values())
    for (const c of it.contents ?? []) need(`items/${it.id}`, "contenuto", c.item, rs.items, "items");
  
  const known = (id: string) =>
    id.startsWith("$") || rs.items.has(id) || rs.weapons.has(id) || rs.armors.has(id) || rs.tools.has(id);
  for (const b of rs.backgrounds.values()) {
    need(`backgrounds/${b.id}`, "talento", b.feat, rs.feats, "feats");
    if (!["artisan", "gaming", "musical"].includes(b.tool)) need(`backgrounds/${b.id}`, "strumento", b.tool, rs.tools, "tools");
    for (const skill of b.skills) need(`backgrounds/${b.id}`, "abilità", skill, rs.skills, "skills");
    for (const [opt, set] of Object.entries(b.equipment))
      for (const it of set?.items ?? [])
        if (rs.items.size && !known(it.item)) errs.push(`backgrounds/${b.id}: equipaggiamento ${opt}: "${it.item}" non esiste`);
    if (b.tool === "gaming" || b.tool === "musical" || b.tool === "artisan") {
      const ch = b.choices.find((c) => c.id === `${b.id}_tool`);
      if (!ch) errs.push(`backgrounds/${b.id}: manca la scelta dello strumento`);
    }
  }
  for (const f of rs.feats.values())
    for (const e of f.effects)
      if (e.op === "grantFeat") need(`feats/${f.id}`, "talento concesso", e.feat, rs.feats, "feats");
  for (const s of rs.skills.values()) {
    const ab = String(s.extra.ability ?? "");
    if (!["str", "dex", "con", "int", "wis", "cha"].includes(ab)) errs.push(`skills/${s.id}: caratteristica "${ab}" non valida`);
  }
  return errs;
}
