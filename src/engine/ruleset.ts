import type { z } from "zod";
import {
  armorSchema, backgroundSchema, classSchema, featSchema, itemSchema, speciesSchema,
  spellSchema, subclassSchema, weaponSchema,
} from "./schema";
import type {
  Armor, Background, ClassDef, Feat, Item, Species, Spell, Subclass, Weapon,
} from "./types";

export interface Ruleset {
  species: Map<string, Species>;
  backgrounds: Map<string, Background>;
  classes: Map<string, ClassDef>;
  subclasses: Map<string, Subclass>;
  feats: Map<string, Feat>;
  weapons: Map<string, Weapon>;
  armors: Map<string, Armor>;
  items: Map<string, Item>;
  spells: Map<string, Spell>;
  errors: string[]; // voci scartate perché non valide: l'app parte lo stesso
}

const KINDS = {
  species: speciesSchema, backgrounds: backgroundSchema, classes: classSchema,
  subclasses: subclassSchema, feats: featSchema, weapons: weaponSchema,
  armors: armorSchema, items: itemSchema, spells: spellSchema,
} as const;

export type Kind = keyof typeof KINDS;
// Un file di dati: { "kind": "weapons", "entries": [...] }
export interface DataFile { kind: Kind; entries: unknown[] }

export function emptyRuleset(): Ruleset {
  return {
    species: new Map(), backgrounds: new Map(), classes: new Map(), subclasses: new Map(),
    feats: new Map(), weapons: new Map(), armors: new Map(), items: new Map(),
    spells: new Map(), errors: [],
  };
}

// Costruisce il ruleset da file già letti. Tollerante: se private/ manca (nessun file)
// o una voce è invalida, l'errore finisce in `errors` e il resto funziona.
export function buildRuleset(files: unknown[]): Ruleset {
  const rs = emptyRuleset();
  for (const f of files) {
    const file = f as Partial<DataFile>;
    const schema = file.kind ? (KINDS[file.kind] as z.ZodType | undefined) : undefined;
    if (!schema || !Array.isArray(file.entries)) {
      rs.errors.push(`File dati non riconosciuto (kind=${String(file.kind)})`);
      continue;
    }
    const map = rs[file.kind!] as Map<string, unknown>;
    for (const entry of file.entries) {
      const r = schema.safeParse(entry);
      const eid = (entry as { id?: string })?.id ?? "?";
      if (!r.success) rs.errors.push(`${file.kind}/${eid}: ${r.error.issues[0]?.message}`);
      else if (map.has(eid)) rs.errors.push(`${file.kind}/${eid}: id duplicato`);
      else map.set(eid, r.data);
    }
  }
  return rs;
}
