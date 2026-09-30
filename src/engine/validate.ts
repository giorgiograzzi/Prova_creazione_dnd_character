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
  
  for (const s of rs.skills.values()) {
    const ab = String(s.extra.ability ?? "");
    if (!["str", "dex", "con", "int", "wis", "cha"].includes(ab)) errs.push(`skills/${s.id}: caratteristica "${ab}" non valida`);
  }
  return errs;
}
