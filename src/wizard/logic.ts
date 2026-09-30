import it from "../i18n/it.json";
import { computeCharacter } from "../engine/compute";
import {
  allQuestions, creationProgress, fillHpRolls, pointBuyCost, previewDecision, recommendedArray, rollAbilityScores, setAsi, setBaseScores,
  startingEquipment, type DecisionResult, type Question,
} from "../engine/creation";
import type { Ruleset } from "../engine/ruleset";
import { ABILITIES, type Ability } from "../engine/schema";
import type { Character } from "../engine/types";

// Logica del wizard di creazione, senza interfaccia (testabile). L'interfaccia mostra soltanto ciò che restituisce.
type Scores = Record<Ability, number>;
type Method = NonNullable<Character["creation"]>["method"];
export const METHODS: Method[] = ["array", "roll", "pointbuy", "manual"];

// Nuova selezione dopo un tocco su un'opzione: a scelta singola sostituisce; a scelta multipla aggiunge/toglie
// (oltre il massimo esce la scelta più vecchia, così il tocco funziona sempre)
export function togglePick(q: Pick<Question, "count" | "selected">, id: string): string[] {
  if (q.count === 1) return q.selected[0] === id ? [] : [id];
  if (q.selected.includes(id)) return q.selected.filter((x) => x !== id);
  const next = [...q.selected, id];
  return next.length > q.count ? next.slice(next.length - q.count) : next;
}

// Cambio di una scelta: l'interfaccia mostra `errors` oppure, se `removed` non è vuoto, chiede conferma prima di usare `character`
export const choose = (ch: Character, rs: Ruleset, key: string, picked: string[]): DecisionResult => previewDecision(ch, rs, key, picked);

// ---- punteggi ----
const assign = (pool: number[]): Scores => Object.fromEntries(ABILITIES.map((a, i) => [a, pool[i] ?? 10])) as Scores;

export function startScores(ch: Character, rs: Ruleset, method: Method, rolls?: number[]): Scores {
  const cid = ch.classes[0]?.classId;
  if (method === "array") return (cid && recommendedArray(rs, cid)) || assign(rs.creation.get("creation")?.standardArray ?? []);
  if (method === "roll") return assign(rolls ?? []);
  if (method === "pointbuy") return assign(Array(6).fill(rs.creation.get("creation")?.pointBuy.min ?? 8));
  return assign(Array(6).fill(10));
}

// Cambia metodo. Il tiro (4d6 scarta il più basso) si fa una volta sola, salvo l'impostazione "rifare i tiri".
export function chooseMethod(ch: Character, rs: Ruleset, method: Method, opts: { allowReroll: boolean; rng?: () => number }): ReturnType<typeof setBaseScores> {
  let rolls = ch.creation?.rolls;
  if (method === "roll" && (!rolls || rolls.length !== 6)) rolls = rollAbilityScores(opts.rng).rolls;
  const scores = method === "roll" && rolls && ch.creation?.method === "roll" ? ch.baseScores : startScores(ch, rs, method, rolls);
  return setBaseScores(ch, rs, method, scores, rolls);
}
export function rerollScores(ch: Character, rs: Ruleset, allowReroll: boolean, rng?: () => number): ReturnType<typeof setBaseScores> {
  if (!allowReroll) return { ok: false, errors: ["Rifare i tiri è disattivato nelle Impostazioni"], character: ch, removed: [] };
  const { rolls } = rollAbilityScores(rng);
  return setBaseScores(ch, rs, "roll", assign(rolls), rolls);
}

// Assegnazione di un valore a una caratteristica per array standard e tiri: scambia con la caratteristica che lo ha già,
// così l'insieme dei valori resta sempre quello di partenza
export function swapScore(scores: Scores, ability: Ability, value: number): Scores {
  if (scores[ability] === value) return scores;
  const other = ABILITIES.find((a) => a !== ability && scores[a] === value);
  return other ? { ...scores, [ability]: value, [other]: scores[ability] } : scores;
}
// Acquisto a punti: +1/-1 su una caratteristica se resta nei limiti e nel budget
export function stepPointBuy(rs: Ruleset, scores: Scores, ability: Ability, delta: 1 | -1): Scores {
  const pb = rs.creation.get("creation")?.pointBuy;
  const next = { ...scores, [ability]: scores[ability] + delta };
  if (!pb || next[ability] < pb.min || next[ability] > pb.max) return scores;
  return pointBuyCost(rs, next).errors.length ? scores : next;
}

// Aumenti di caratteristica da una bozza {caratteristica: 0|1|2}
export function applyAsiDraft(ch: Character, rs: Ruleset, key: string, draft: Partial<Record<Ability, number>>) {
  const picks = ABILITIES.filter((a) => (draft[a] ?? 0) > 0).map((ability) => ({ ability, amount: draft[ability]! }));
  return setAsi(ch, rs, key, picks);
}

// ---- fine della creazione ----
export const isFinalized = (ch: Character) => (ch.classes[0]?.hpRolls.length ?? 0) > 0;

export function gamingSetsNeeded(ch: Character, rs: Ruleset): boolean {
  return startingEquipment(ch, rs).pending.includes("$gaming_set");
}

export interface Finalized { ok: boolean; errors: string[]; character: Character }
// Chiude la creazione: PF a media (primo livello al massimo), equipaggiamento e monete iniziali, PF attuali al massimo
export function finalizeCharacter(ch: Character, rs: Ruleset, opts: { gaming_set?: string } = {}): Finalized {
  const prog = creationProgress(ch, rs);
  if (!prog.complete) return { ok: false, errors: prog.steps.flatMap((s) => [...s.problems, ...(s.missing.length ? [it.wizard.stepMissing.replace("{s}", it.wizard.steps[s.step])] : [])]), character: ch };
  const eq = startingEquipment(ch, rs, opts);
  const still = eq.pending.filter((p) => p !== "$gaming_set" || !opts.gaming_set);
  if (still.length) return { ok: false, errors: [`Manca una scelta per l'equipaggiamento: ${still.join(", ")}`], character: ch };
  const base = fillHpRolls({ ...ch, inventory: eq.inventory, coins: { ...ch.coins, gp: eq.gp } }, rs, "avg");
  const hp = computeCharacter(base, rs).hp.max.value;
  return { ok: true, errors: [], character: { ...base, state: { ...base.state, hp, tempHp: 0, hitDiceUsed: 0 } } };
}
// Riapre la creazione per modificare le scelte (le PF si rifanno alla chiusura)
export const reopenCreation = (ch: Character): Character => ({ ...ch, classes: ch.classes.map((c) => ({ ...c, hpRolls: [] })) });

// Solo per i test: sceglie la prima opzione attiva di ogni domanda incompleta, finché non resta niente
export function autoComplete(ch: Character, rs: Ruleset, opts: { scores?: Scores } = {}): Character {
  let cur = ch;
  if (!cur.creation) { const s = setBaseScores(cur, rs, "array", opts.scores ?? startScores(cur, rs, "array")); if (s.ok) cur = s.character; }
  for (let guard = 0; guard < 300; guard++) {
    const q = allQuestions(cur, rs).find((x) => !x.complete && !x.disabled);
    if (!q) break;
    if (q.kind === "abilityIncrease") {
      const allowed = q.asi!.allowed;
      const draft: Partial<Record<Ability, number>> = q.asi!.mode === "background" ? { [allowed[0]!]: 2, [allowed[1]!]: 1 } : q.asi!.mode === "asi" ? { [allowed[0]!]: 2 } : { [allowed[0]!]: 1 };
      const r = applyAsiDraft(cur, rs, q.key, draft);
      if (!r.ok) throw new Error(`autoComplete: ${q.key}: ${r.errors.join("; ")}`);
      cur = r.character; continue;
    }
    const ids = q.options.filter((o) => o.enabled).map((o) => o.id).slice(0, q.count);
    const r = previewDecision(cur, rs, q.key, ids);
    if (!r.ok) throw new Error(`autoComplete: ${q.key}: ${r.errors.join("; ")}`);
    cur = r.character;
    if (!cur.decisions[q.key]?.length && !q.key.startsWith("pick:") && !q.key.startsWith("subclass:")) throw new Error(`autoComplete: nessuna opzione per ${q.key}`);
  }
  return cur;
}
