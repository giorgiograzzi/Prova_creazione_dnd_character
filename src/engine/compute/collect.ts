import type { Choice, Effect } from "../schema";
import type { Character } from "../types";
import type { Ruleset } from "../ruleset";

// Un effetto con la sua provenienza ("da dove viene")
export interface Entry {
  effect: Effect;
  label: string;
  classId?: string; // per risorse a tabella: livello della classe proprietaria
}

export interface Collected {
  entries: Entry[];
  features: Set<string>;
  feats: Set<string>;
}

type Owner = { label: string; classId?: string };
type Holder = { name: { it: string }; effects: Effect[]; choices: Choice[] };

// Convenzione per le scelte "source": gli id scelti diventano effetti standard.
//   skills / expertise / tools:* / weapons:* / cantrips:* / spells:* / feats:*
// Le altre (languages, mastery...) non hanno effetti sul calcolo.
function sourceEffects(source: string, picked: string[]): Effect[] {
  const kind = source.split(":")[0];
  switch (kind) {
    case "skills": return [{ op: "grantSkillProficiency", skills: picked as never, expertise: false }];
    case "expertise": return [{ op: "grantSkillProficiency", skills: picked as never, expertise: true }];
    case "tools": return [{ op: "grantToolProficiency", tools: picked }];
    case "weapons": return [{ op: "grantWeaponProficiency", weapons: picked }];
    case "cantrips": return picked.map((s) => ({ op: "grantSpell", spell: s, mode: "cantrip" as const }));
    case "spells": return picked.map((s) => ({ op: "grantSpell", spell: s, mode: "known" as const }));
    case "feats": return picked.map((f) => ({ op: "grantFeat", feat: f }));
    default: return [];
  }
}

// Raccoglie TUTTI gli effetti del personaggio senza valutare le condizioni `when`
// (si filtrano dopo, con il contesto giusto: armatura, arma...). Livello dei privilegi
// di specie/talento = livello totale; di classe/sottoclasse = livello di quella classe.
export function collectEffects(ch: Character, rs: Ruleset): Collected {
  const totalLevel = ch.classes.reduce((n, c) => n + c.level, 0);
  const out: Collected = { entries: [], features: new Set(), feats: new Set() };
  const seenFeats = new Set<string>();

  const addHolder = (h: Holder, o: Owner) => {
    for (const e of h.effects) add(e, o);
    for (const c of h.choices) addChoice(c, o);
  };
  const add = (effect: Effect, o: Owner) => {
    out.entries.push(o.classId ? { effect, label: o.label, classId: o.classId } : { effect, label: o.label });
    if (effect.op === "grantFeature") out.features.add(effect.feature);
    if (effect.op === "grantFeat") addFeat(effect.feat);
  };
  const addChoice = (c: Choice, o: Owner) => {
    const picked = ch.decisions[c.id] ?? [];
    if (c.options) {
      for (const opt of c.options) if (picked.includes(opt.id)) opt.effects.forEach((e) => add(e, o));
    } else if (c.source) sourceEffects(c.source, picked).forEach((e) => add(e, o));
  };
  const addFeat = (id: string) => {
    if (seenFeats.has(id)) return;
    seenFeats.add(id);
    out.feats.add(id);
    const f = rs.feats.get(id);
    if (f) addHolder(f, { label: f.name.it });
  };
  const addLeveled = (list: { id: string; level: number; name: { it: string }; effects: Effect[]; choices: Choice[] }[],
    lvl: number, o: Owner) => {
    for (const f of list) {
      if (f.level > lvl) continue;
      out.features.add(f.id);
      addHolder(f, { ...o, label: `${o.label}: ${f.name.it}` });
    }
  };

  const sp = rs.species.get(ch.speciesId);
  if (sp) {
    addHolder(sp, { label: sp.name.it });
    addLeveled(sp.traits, totalLevel, { label: sp.name.it });
  }
  const bg = rs.backgrounds.get(ch.backgroundId);
  if (bg) {
    addHolder(bg, { label: bg.name.it });
    addFeat(bg.feat);
  }
  for (const cl of ch.classes) {
    const def = rs.classes.get(cl.classId);
    if (!def) continue;
    const o = { label: def.name.it, classId: cl.classId };
    addHolder(def, o);
    addLeveled(def.features, cl.level, o);
    const sub = cl.subclassId ? rs.subclasses.get(cl.subclassId) : undefined;
    if (sub && cl.level >= def.subclassLevel) {
      addHolder(sub, { label: sub.name.it, classId: cl.classId });
      addLeveled(sub.features, cl.level, { label: sub.name.it, classId: cl.classId });
    }
  }
  for (const f of ch.feats) addFeat(f.featId);
  return out;
}
