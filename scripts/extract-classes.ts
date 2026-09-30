// Step 7: classi e sottoclassi dal PDF "01_Dati_Gioco" → data/private/{classes,subclasses}.json
// Uso: tsx scripts/extract-classes.ts [id,id,...]   (default: le classi con regole in class-rules.ts)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { CLASS_RULES, type FeatureRule } from "./lib/class-rules";
import { equipment, itemNames, readKind } from "./lib/equipment";
import { bodyLines, pdfPages } from "./lib/pdf-text";

const SRC = process.env.RULES_DIR ?? "docs/rules";
const OUT = "data/private";
const only = process.argv[2]?.split(",") ?? Object.keys(CLASS_RULES);
const lines = bodyLines(await pdfPages(`${SRC}/01_Dati_Gioco_DnD2024.pdf`));

type Json = Record<string, any>;
const ABIL: Record<string, string> = { Forza: "str", Destrezza: "dex", Costituzione: "con", Intelligenza: "int", Saggezza: "wis", Carisma: "cha" };
const ARMOR: Record<string, string> = { leggere: "light", medie: "medium", pesanti: "heavy", scudi: "shield" };
const WEAPON: Record<string, string> = { semplici: "simple", marziali: "martial" };
const skillId = new Map<string, string>(readKind("skills").map((s) => [s.name.it as string, s.id as string]));
const toolId = new Map<string, string>(readKind("tools").map((t) => [t.name.it as string, t.id as string]));
const items = itemNames();
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const abil = (s: string) => s.split(/, | o | e /).map((a) => ABIL[a.trim()] ?? (() => { throw new Error(`Caratteristica sconosciuta: "${a}"`); })());

// ---------- individuazione dei blocchi ----------
const CLASS_HEAD = /^(.+?) \((.+?)\)\s+\[(\w+)\]\s*$/;
const from = lines.findIndex((l) => l.trim() === "4. Classi");
const heads = lines.flatMap((l, i) => (i > from && CLASS_HEAD.test(l.trim()) && lines[i + 1]?.startsWith("Voce   Valore") ? [{ i, m: CLASS_HEAD.exec(l.trim())! }] : []));
const endOfClasses = lines.findIndex((l, i) => i > from && l.trim() === "5. Talenti");
if (heads.length !== 12) throw new Error(`Classi trovate: ${heads.length} (attese 12)`);

// ---------- privilegi (classe e sottoclasse) ----------
const ALWAYS = / ?Sempre preparati: ([a-z_]+(?:, [a-z_]+)*)/g; // "Sempre preparati: speak_with_animals"
const USI = / ?Usi: (\S+(?: \S+)*?) \/ Riposo (Lungo|Breve o Lungo|Breve)/g;

// Testo continuo "N Nome [id] descrizione N Nome [id] ..." → privilegi
function features(text: string, ctx: string): Json[] {
  const marks = [...text.matchAll(/\[([a-z_0-9 ]+?)\]/g)];
  if (!marks.length) throw new Error(`${ctx}: nessun privilegio`);
  const out: Json[] = [];
  let head = norm(text.slice(0, marks[0]!.index));
  marks.forEach((m, i) => {
    const gapEnd = i + 1 < marks.length ? marks[i + 1]!.index! : text.length;
    const gap = text.slice(m.index! + m[0].length, gapEnd);
    const usi = [...gap.matchAll(USI)][0];
    const always = [...gap.matchAll(ALWAYS)][0];
    const clean = norm(gap.replace(USI, "").replace(ALWAYS, ""));
    let desc = clean, next = "";
    if (i + 1 < marks.length) {
      const k = clean.lastIndexOf(". ");
      if (k < 0) throw new Error(`${ctx}/${m[1]}: confine col privilegio successivo non trovato`);
      desc = clean.slice(0, k + 1); next = clean.slice(k + 2);
    }
    const h = /^(\d{1,2}) (.+)$/.exec(head);
    if (!h) throw new Error(`${ctx}/${m[1]}: livello/nome non riconosciuti in "${head}"`);
    out.push({ id: m[1]!.replace(/ /g, ""), name: { it: h[2] }, level: Number(h[1]), description: desc, effects: always ? always[1]!.split(", ").map((spell) => ({ op: "grantSpell", spell, mode: "alwaysPrepared" })) : [], choices: [], _usi: usi ? [usi[1], usi[2]] : undefined });
    head = next;
  });
  return out;
}

const rulesFor = (rs: Record<string, FeatureRule> | undefined, f: Json): FeatureRule | undefined => rs?.[`${f.id}@${f.level}`] ?? rs?.[f.id];

function applyRules(fs: Json[], rs: Record<string, FeatureRule> | undefined, columns: Record<string, (number | string)[]>) {
  for (const f of fs) {
    const r = rulesFor(rs, f);
    f.effects.push(...(r?.effects ?? []));
    f.choices.push(...(r?.choices ?? []));
    if (f._usi) {
      const [what, rech] = f._usi as [string, string];
      const uses = columns[what] ? { table: columns[what] } : what.startsWith("max(") ? what.replace(/max\(1,(\w+)\)/, "max(1, mod:$1)") : Number(what) || what;
      if (typeof uses === "object" && uses.table.some((v) => typeof v !== "number")) throw new Error(`${f.id}: colonna non numerica`);
      f.effects.push({ op: "resource", resourceId: f.id, uses, recharge: rech === "Lungo" ? "long_rest" : "short_rest", ...(r?.resource?.partialShortRest ? { partialShortRest: r.resource.partialShortRest } : {}) });
    }
    delete f._usi;
  }
}

// ---------- una classe ----------
const classes: Json[] = [], subclasses: Json[] = [];
heads.forEach((h, hi) => {
  const id = h.m[3]!;
  if (!only.includes(id)) return;
  const rule = CLASS_RULES[id];
  if (!rule) throw new Error(`Classe senza regole: ${id}`);
  const block = lines.slice(h.i + 1, hi + 1 < heads.length ? heads[hi + 1]!.i : endOfClasses).map((l) => l.replace(/\s+$/, ""));
  const idx = (t: string) => block.findIndex((l) => l.trim() === t);
  const iProg = idx("Progressione"), iFeat = idx("Privilegi di classe"), iSub = block.findIndex((l) => l.startsWith("Sottoclassi del"));

  // -- tabella Voce / Valore --
  const F: Record<string, string> = {}; let cur = "";
  for (const l of block.slice(1, iProg)) {
    const m = /^(Dado Vita|Caratteristica primaria|Tiri salvezza|Abilità|Armi|Armature|Strumenti|Equipaggiamento|Multiclasse|Incantesimi)\s{3}(.*)$/.exec(l);
    if (m) { cur = m[1]!; F[cur] = m[2]!; } else F[cur] += " " + l.trim();
  }
  for (const k of Object.keys(F)) F[k] = norm(F[k]!);
  const hitDie = Number(/^d(\d+)/.exec(F["Dado Vita"]!)![1]);
  const sk = /^(\d+) tra: (.+)$/.exec(F["Abilità"]!)!;
  const skillList = sk[2] === "qualsiasi" ? "any" : sk[2]!.split(", ").map((n) => skillId.get(n) ?? (() => { throw new Error(`Abilità sconosciuta: ${n}`); })());
  const eq: Json = {};
  for (const o of F["Equipaggiamento"]!.split(/(?:^| )(?=[ABC] : )/).filter(Boolean)) eq[o[0]!] = equipment(o.slice(4), items);
  const tools = F["Strumenti"] === "nessuno" ? [] : F["Strumenti"]!.split(", ");
  const fixedTools = tools.filter((t) => toolId.has(t)).map((t) => toolId.get(t)!);
  const toolPick = tools.map((t) => /^(\d+) Strumento musicale$/.exec(t)).find(Boolean);
  const unknownTool = tools.find((t) => !toolId.has(t) && !/^(\d+) Strumento musicale$/.test(t));
  if (unknownTool) throw new Error(`${id}: strumento sconosciuto "${unknownTool}"`);
  const mc = /^Requisito: (.+?)\. Ottieni: (.+)$/.exec(F["Multiclasse"]!)!;
  const req = mc[1]!.replace(/ oppure /g, " || ").replace(/ e /g, " && ").replace(/(\w+) 13/g, (_, a) => `ability:${ABIL[a]}>=13`);
  const spell = F["Incantesimi"] ? /^Tipo: (\w+); caratteristica (\w+); lista (\w+); (.*)$/.exec(F["Incantesimi"]!) : null;
  if (F["Incantesimi"] && !spell) throw new Error(`${id}: riga Incantesimi non riconosciuta: ${F["Incantesimi"]}`);
  const CASTER: Record<string, string> = { completo: "full", metà: "half", terzo: "third", patto: "pact" };

  // -- tabella di progressione --
  const hdr = norm(block.slice(iProg + 1, block.findIndex((l, i) => i > iProg && /^\d{1,2}\s{3}\+\d/.test(l))).join(" "));
  const wantHdr = "Liv Comp. Privilegi " + rule.columns.join(" ");
  if (slug(hdr).replace(/_/g, "") !== slug(wantHdr).replace(/_/g, "")) throw new Error(`${id}: intestazione tabella "${hdr}" ≠ "${wantHdr}"`);
  const rows: { lv: number; pb: number; names: string[]; vals: string[] }[] = [];
  let acc = "";
  const flush = () => {
    if (!acc) return;
    const m = /^(\d{1,2})\s{3}\+(\d)\s{3}(.*)$/.exec(acc)!;
    const toks = m[3]!.split(/\s{3,}/);
    if (toks.length !== rule.columns.length + 1) throw new Error(`${id}: riga livello ${m[1]}: ${toks.length} celle, attese ${rule.columns.length + 1} ("${acc}")`);
    rows.push({ lv: Number(m[1]), pb: Number(m[2]), names: toks[0] === "—" ? [] : toks[0]!.split(", "), vals: toks.slice(1) });
    acc = "";
  };
  for (const l of block.slice(iProg + 1, iFeat)) {
    if (/^\d{1,2}\s{3}\+\d/.test(l)) { flush(); acc = l.trim(); }
    else if (acc && !l.startsWith("Slot =") && !/^(Liv|Comp|p\.|Privilegi|Dado|ispirazione|divinita|Incanalare|Forma|selvatica|Trucchetti|Preparati|Slot)/.test(l)) {
      acc += (/^[\d+—dD/ ]+$/.test(l.trim().replace(/\s{3,}/g, " ")) && /\s{3}/.test(l) ? "   " : " ") + l.trim();
    }
  }
  flush();
  if (rows.length !== 20 || rows.some((r, i) => r.lv !== i + 1)) throw new Error(`${id}: righe della tabella: ${rows.length}`);
  const table: Record<string, (number | string)[]> = {}; let slots: number[][] | undefined;
  rule.columns.forEach((label, c) => {
    const col = rows.map((r) => r.vals[c]!);
    if (label === "Slot") { slots = col.map((v) => v.split("/").map(Number)); return; }
    table[slug(label)] = col.map((v) => (v === "—" ? 0 : /^\+?\d+$/.test(v) ? Number(v.replace("+", "")) : v));
  });

  // -- privilegi di classe --
  const featText = block.slice(iFeat + 1, iSub < 0 ? undefined : iSub).filter((l) => !/^Liv\s{3}Privilegio\s{3}Descrizione/.test(l)).join(" ");
  const fs = features(featText, id);
  applyRules(fs, rule.featureRules, table);
  // controllo incrociato: i nomi in tabella (senza "Privilegio di sottoclasse") = quelli elencati
  for (const r of rows) {
    const have = fs.filter((f) => f.level === r.lv).map((f) => f.name.it as string).sort().join("|");
    const want = r.names.filter((n) => n !== "Privilegio di sottoclasse").sort().join("|");
    if (have !== want) throw new Error(`${id} liv.${r.lv}: privilegi ${have} ≠ tabella ${want}`);
  }

  // -- scelte di classe (abilità, strumenti, maestrie, incantesimi) --
  const choices: Json[] = [];
  choices.push(skillList === "any"
    ? { id: `${id}_skills`, label: { it: "Abilità" }, count: Number(sk[1]), source: "skills" }
    : { id: `${id}_skills`, label: { it: "Abilità" }, count: Number(sk[1]), options: skillList.map((s) => ({ id: s, name: { it: s }, effects: [{ op: "grantSkillProficiency", skills: [s] }] })) });
  if (toolPick) choices.push({ id: `${id}_tools`, label: { it: "Strumenti musicali" }, count: Number(toolPick[1]), source: "tools:musical" });
  if (table["maestria_armi"]) choices.push({ id: `${id}_weapon_mastery`, label: { it: "Maestria nelle armi" }, count: 1, countFrom: "maestria_armi", source: "weaponMastery" });
  if (spell) {
    choices.push({ id: `${id}_cantrips`, label: { it: "Trucchetti" }, count: 1, countFrom: "trucchetti", source: `cantrips:${spell[3]}` });
    choices.push({ id: `${id}_prepared`, label: { it: "Incantesimi preparati" }, count: 1, countFrom: "preparati", source: `spells:${spell[3]}` });
  }

  // -- sottoclassi --
  const subs = iSub < 0 ? [] : block.slice(iSub + 1);
  const sh = subs.flatMap((l, i) => (CLASS_HEAD.test(l.trim()) ? [{ i, m: CLASS_HEAD.exec(l.trim())! }] : []));
  sh.forEach((s, si) => {
    const sid = s.m[3]!;
    const sb = subs.slice(s.i + 1, si + 1 < sh.length ? sh[si + 1]!.i : undefined);
    const iH = sb.findIndex((l) => /^Liv\s{3}Privilegio\s{3}Descrizione/.test(l));
    const pre = norm(sb.slice(0, iH).join(" "));
    const sf = features(sb.slice(iH + 1).filter((l) => !/^Liv\s{3}Privilegio\s{3}Descrizione/.test(l)).join(" "), `${id}/${sid}`);
    applyRules(sf, rule.subclassRules?.[sid], table);
    const effects: Json[] = [], subChoices: Json[] = [];
    const sp = /^Incantesimi sempre preparati — (.+)$/.exec(pre);
    const terr = /^Incantesimi per terreno — (.+)$/.exec(pre); // Circolo della Terra: un elenco per ogni terreno
    if (pre && !sp && !terr) throw new Error(`${id}/${sid}: testo prima della tabella non riconosciuto: "${pre}"`);
    const spellsAt = (list: string, sep: RegExp, fx: Json[]) => {
      for (const part of list.split(sep)) {
        const m = /^(?:liv\.\s*)?(\d+): (.+)$/.exec(part.trim())!;
        for (const spellId of m[2]!.split(", ")) fx.push({ op: "grantSpell", spell: spellId, mode: "alwaysPrepared", when: `classLevel:${id}>=${m[1]}` });
      }
    };
    if (sp) spellsAt(sp[1]!, /; /, effects);
    if (terr) {
      subChoices.push({ id: `${sid}_terrain`, label: { it: "Terreno" }, count: 1, options: terr[1]!.split(" | ").map((t) => {
        const [tid, rest] = t.split(/: (.*)/s) as [string, string];
        const fx: Json[] = []; spellsAt(rest, /; /, fx);
        return { id: tid, name: { it: tid }, effects: fx };
      }) });
    }
    subclasses.push({ id: sid, name: { it: s.m[1], en: s.m[2] }, classId: id, description: "", effects, choices: subChoices, features: sf });
  });

  classes.push({
    id, name: { it: h.m[1], en: h.m[2] }, hitDie, primaryAbility: abil(F["Caratteristica primaria"]!), saves: abil(F["Tiri salvezza"]!),
    skillChoices: { count: Number(sk[1]), from: skillList }, armorTraining: F["Armature"] === "nessuna" ? [] : F["Armature"]!.split(", ").map((a) => ARMOR[a] ?? (() => { throw new Error(`Armatura sconosciuta: ${a}`); })()),
    weaponProficiency: F["Armi"]!.split(", ").map((w) => WEAPON[w] ?? w), toolProficiency: fixedTools,
    ...(spell ? { caster: CASTER[spell[1]!], spellAbility: ABIL[spell[2]!], spellList: spell[3], description: spell[4] } : {}),
    ...(slots ? { spellSlots: slots } : {}), multiclassRequirement: req, equipment: eq,
    features: fs, table, subclassLevel: 3, choices,
  });
});

// unisce con quanto già estratto (7a poi 7b)
function merge(kind: string, fresh: Json[]) {
  const path = `${OUT}/${kind}.json`;
  const old: Json[] = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")).entries : [];
  const ids = new Set(fresh.map((e) => e.id));
  const all = [...old.filter((e) => !ids.has(e.id)), ...fresh];
  writeFileSync(path, JSON.stringify({ kind, entries: all }, null, 1) + "\n");
  console.log(`${kind.padEnd(17)} ${all.length} (${fresh.length} aggiornate)`);
}
merge("classes", classes);
merge("subclasses", subclasses);
