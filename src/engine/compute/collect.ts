import { SKILLS, type Choice, type Effect } from "../schema";
import type { Character } from "../types";
import type { Ruleset } from "../ruleset";

// Un effetto con la sua provenienza ("da dove viene")
export interface Entry {
  effect: Effect;
  label: string;
  classId?: string; // per risorse a tabella e caratteristica da incantatore: classe proprietaria
}

export interface Collected {
  entries: Entry[];
  features: Set<string>;
  feats: Set<string>;
  languages: Set<string>; // linguaggi (Comune + scelte + Druidico, Gergo dei ladri)
  masteries: Set<string>; // armi di cui si usa la proprietà di maestria (scelte `weaponMastery`)
}

const SKILL_IDS = new Set<string>(SKILLS);

type Picks = (choiceId: string) => string[] | undefined;
// prefix: chiave delle scelte interne di un talento concesso da una scelta ("asi_fighter_4/"): due acquisizioni non si mescolano
type Owner = { label: string; classId?: string; picks: Picks; prefix: string };
type Holder = { name: { it: string }; effects: Effect[]; choices: Choice[] };

const withAbility = (c: Choice, spell: Effect & { op: "grantSpell" }): Effect =>
  ({ ...spell, ...(c.ability ? { ability: c.ability } : {}), ...(c.abilityFrom ? { abilityFrom: c.abilityFrom } : {}) });

// Convenzione per le scelte "source": gli id scelti diventano effetti standard.
//   skills / expertise / skillsTools / tools:* / weapons:* / cantrips:* / spells:* / freespells / alwaysspells / resistance / feats:*
// Le altre (languages, weaponMastery...) non hanno effetti sul calcolo.
function sourceEffects(c: Choice, picked: string[], key: string): Effect[] {
  const kind = c.source!.split(":")[0];
  const spell = (s: string, mode: "cantrip" | "known" | "alwaysPrepared", free?: boolean) =>
    withAbility(c, { op: "grantSpell", spell: s, mode, ...(free ? { freeCast: { uses: 1, recharge: "long_rest" as const } } : {}) });
  switch (kind) {
    case "skills": return [{ op: "grantSkillProficiency", skills: picked as never, expertise: false, upgradeToExpertise: false }];
    case "expertise": return [{ op: "grantSkillProficiency", skills: picked as never, expertise: true, upgradeToExpertise: false }];
    case "tools": return [{ op: "grantToolProficiency", tools: picked }];
    case "weapons": return [{ op: "grantWeaponProficiency", weapons: picked }];
    case "cantrips": return picked.map((s) => spell(s, "cantrip"));
    case "spells": return picked.map((s) => spell(s, "known"));
    case "feats": return picked.map((f) => ({ op: "grantFeat", feat: f, via: key }));
    // abilità e strumenti in qualsiasi combinazione (talento Esperto)
    case "skillsTools": {
      const skills = picked.filter((p) => SKILL_IDS.has(p)), tools = picked.filter((p) => !SKILL_IDS.has(p));
      return [
        ...(skills.length ? [{ op: "grantSkillProficiency", skills: skills as never, expertise: false, upgradeToExpertise: false } as Effect] : []),
        ...(tools.length ? [{ op: "grantToolProficiency", tools } as Effect] : []),
      ];
    }
    // incantesimo sempre preparato, lanciabile 1 volta per Riposo Lungo senza slot
    case "freespells": return picked.map((s) => spell(s, "alwaysPrepared", true));
    // incantesimo sempre preparato (senza lancio gratuito)
    case "alwaysspells": return picked.map((s) => spell(s, "alwaysPrepared"));
    case "resistance": return [{ op: "resistance", types: picked }];
    default: return [];
  }
}

// Raccoglie TUTTI gli effetti del personaggio senza valutare le condizioni `when`
// (si filtrano dopo, con il contesto giusto: armatura, arma...). Livello dei privilegi
// di specie/talento = livello totale; di classe/sottoclasse = livello di quella classe.
// Le scelte di un talento acquisito (Character.feats[i].choices) hanno la precedenza sulle
// decisioni generali: così un talento ripetibile (Resiliente, Iniziato alla magia) ha scelte per ogni acquisizione.
export function collectEffects(ch: Character, rs: Ruleset): Collected {
  const out: Collected = { entries: [], features: new Set(), feats: new Set(), masteries: new Set(), languages: new Set(["common"]) };
  const seenFeats = new Set<string>();
  const general: Picks = (id) => ch.decisions[id];

  const add = (effect: Effect, o: Owner) => {
    // caratteristica da incantatore fissata da una scelta (es. spell_ability, magic_initiate_ability)
    if (effect.op === "grantSpell" && effect.abilityFrom && !effect.ability) {
      const a = o.picks(o.prefix + effect.abilityFrom)?.[0];
      if (a) effect = { ...effect, ability: a as never };
    }
    out.entries.push(o.classId ? { effect, label: o.label, classId: o.classId } : { effect, label: o.label });
    if (effect.op === "grantFeature") out.features.add(effect.feature);
    if (effect.op === "grantFeat") addFeat(effect.feat, undefined, general, effect.via ? `${effect.via}/` : "");
  };
  const addHolder = (h: Holder, o: Owner) => {
    for (const e of h.effects) add(e, o);
    for (const c of h.choices) addChoice(c, o);
  };
  const addChoice = (c: Choice, o: Owner) => {
    const key = o.prefix + c.id;
    const picked = o.picks(key) ?? [];
    if (c.options) {
      for (const opt of c.options) {
        if (!picked.includes(opt.id)) continue;
        out.features.add(opt.id); // l'opzione scelta conta come posseduta (prerequisiti: hasFeature:pact_of_the_blade)
        opt.effects.forEach((e) => add(e, o));
      }
    } else if (c.source) {
      if (c.source === "weaponMastery") picked.forEach((w) => out.masteries.add(w));
      if (c.source.startsWith("languages")) picked.forEach((l) => out.languages.add(l));
      sourceEffects(c, picked, key).forEach((e) => add(e, o));
    }
  };
  const addFeat = (id: string, instance: Record<string, string[]> | undefined, base: Picks, prefix = "") => {
    const f = rs.feats.get(id);
    // un talento non ripetibile non si somma a se stesso (background + talento scelto)
    if (!f?.repeatable) { if (seenFeats.has(id)) return; seenFeats.add(id); }
    out.feats.add(id);
    if (f) addHolder(f, { label: f.name.it, prefix, picks: instance ? (cid) => instance[cid] ?? base(cid) : base });
  };
  const addLeveled = (list: { id: string; level: number; name: { it: string }; effects: Effect[]; choices: Choice[] }[],
    lvl: number, o: Owner) => {
    for (const f of list) {
      if (f.level > lvl) continue;
      out.features.add(f.id);
      addHolder(f, { ...o, label: `${o.label}: ${f.name.it}` });
    }
  };

  const totalLevel = ch.classes.reduce((n, c) => n + c.level, 0);
  const sp = rs.species.get(ch.speciesId);
  if (sp) {
    const o = { label: sp.name.it, picks: general, prefix: "" };
    addHolder(sp, o);
    addLeveled(sp.traits, totalLevel, o);
  }
  const bg = rs.backgrounds.get(ch.backgroundId);
  if (bg) {
    addHolder(bg, { label: bg.name.it, picks: general, prefix: "" });
    addFeat(bg.feat, undefined, general);
  }
  for (const cl of ch.classes) {
    const def = rs.classes.get(cl.classId);
    if (!def) continue;
    const o = { label: def.name.it, classId: cl.classId, picks: general, prefix: "" };
    addHolder(def, o);
    addLeveled(def.features, cl.level, o);
    const sub = cl.subclassId ? rs.subclasses.get(cl.subclassId) : undefined;
    if (sub && cl.level >= def.subclassLevel) {
      const so = { label: sub.name.it, classId: cl.classId, picks: general, prefix: "" };
      addHolder(sub, so);
      addLeveled(sub.features, cl.level, so);
    }
  }
  for (const f of ch.feats) addFeat(f.featId, f.choices ?? {}, general);
  // linguaggi: Comune + scelta di creazione + Druidico e Gergo dei ladri dai privilegi
  (ch.decisions.languages ?? []).forEach((l) => out.languages.add(l));
  if (out.features.has("druidic")) out.languages.add("druidic");
  if (out.features.has("thieves_cant")) out.languages.add("thieves_cant");
  return out;
}
