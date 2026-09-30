import { useMemo, useState } from "react";
import { allQuestions } from "../engine/creation";
import { levelUp, levelUpOptions, rollHitDie, type HpChoice } from "../engine/levelup";
import type { Ruleset } from "../engine/ruleset";
import type { Ability } from "../engine/schema";
import type { Character } from "../engine/types";
import it from "../i18n/it.json";
import { fmt } from "../ui/format";
import { Button, Dialog } from "../ui/xp";
import { QuestionView } from "../wizard/QuestionView";
import { AsiBlock, draftOf } from "../wizard/Wizard";
import { choose } from "../wizard/logic";

const t = it.levelup;
type Step = "class" | "hp" | "choices";

// Salire di livello in tre passi: classe, Punti Ferita, novità (privilegi e scelte). Si lavora su una copia: si applica solo con "Conferma".
export function LevelUpDialog({ ch, rs, onApply, onClose }: { ch: Character; rs: Ruleset; onApply: (c: Character) => void; onClose: () => void }) {
  const [step, setStep] = useState<Step>("class");
  const [classId, setClassId] = useState("");
  const [mode, setMode] = useState<"avg" | "roll">("avg");
  const [rolled, setRolled] = useState<number | null>(null);
  const [work, setWork] = useState<Character | null>(null);
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<Ability, number>>>>({});
  const [msg, setMsg] = useState("");
  const options = useMemo(() => levelUpOptions(ch, rs), [ch, rs]);
  const def = classId ? rs.classes.get(classId) : undefined;
  const hp: HpChoice = mode === "roll" && rolled ? rolled : "avg";
  const preview = useMemo(() => (classId ? levelUp(ch, rs, classId, hp) : null), [ch, rs, classId, hp]);

  const goChoices = () => {
    if (!preview?.ok) return;
    setWork(preview.character); setPendingKeys(preview.pending.map((q) => q.key)); setDrafts({}); setMsg(""); setStep("choices");
  };
  const questions = work ? allQuestions(work, rs).filter((q) => pendingKeys.includes(q.key) || (!q.complete && !q.disabled)) : [];
  const allDone = !!work && questions.every((q) => q.complete || q.disabled);

  return (
    <Dialog title={t.title} onClose={onClose}>
      {options.length === 0 && <p>{t.max}</p>}

      {step === "class" && options.length > 0 && (
        <>
          <h3>{t.stepClass}</h3>
          <ul className="wz-opts" role="radiogroup" aria-label={t.stepClass}>
            {options.map((o) => (
              <li key={o.classId}>
                <button type="button" className="wz-opt" role="radio" aria-checked={classId === o.classId} aria-disabled={!o.enabled} onClick={() => { if (o.enabled) { setClassId(o.classId); setRolled(null); } }}>
                  <span className="mark radio" aria-hidden="true">{classId === o.classId ? "●" : ""}</span>
                  <span className="txt"><span className="nm">{o.name}</span>
                    <span className="desc" style={{ display: "block" }}>{o.isNew ? t.newClass : fmt(t.levelTo, { a: o.level - 1, b: o.level })}{!o.enabled && o.reason ? ` — ${o.reason}` : ""}</span></span>
                </button>
              </li>
            ))}
          </ul>
          <div className="xp-actions footer">
            <Button onClick={onClose}>{t.cancel}</Button>
            <Button variant="primary" disabled={!classId} onClick={() => setStep("hp")}>{t.next}</Button>
          </div>
        </>
      )}

      {step === "hp" && def && preview && (
        <>
          <h3>{t.stepHp}</h3>
          <p className="xp-muted">{fmt(t.hpDie, { d: def.hitDie })}</p>
          <div className="pl-row">
            <Button variant={mode === "avg" ? "primary" : undefined} onClick={() => setMode("avg")}>{fmt(t.fixed, { n: def.hitDie / 2 + 1 })}</Button>
            <Button variant={mode === "roll" ? "primary" : undefined} onClick={() => { setMode("roll"); setRolled(rollHitDie(def.hitDie)); }}>{fmt(t.roll, { d: def.hitDie })}</Button>
          </div>
          {mode === "roll" && rolled && <p role="status"><b>{fmt(t.rolled, { r: rolled })}</b></p>}
          {preview.ok && <p><b>{fmt(t.hpGain, { a: preview.hpMaxBefore, b: preview.hpMaxAfter, g: preview.hpGain })}</b></p>}
          {!preview.ok && <div className="xp-error" role="alert">{preview.errors.join(" ")}</div>}
          <div className="xp-actions footer">
            <Button onClick={() => setStep("class")}>{t.back}</Button>
            <Button variant="primary" disabled={!preview.ok || (mode === "roll" && !rolled)} onClick={goChoices}>{t.next}</Button>
          </div>
        </>
      )}

      {step === "choices" && work && preview?.ok && (
        <>
          <h3>{t.stepChoices}</h3>
          <p><b>{def?.name.it}</b> — {fmt(t.levelTo, { a: preview.classLevel - 1, b: preview.classLevel })} · {fmt(it.levelup.hpGain, { a: preview.hpMaxBefore, b: preview.hpMaxAfter, g: preview.hpGain })}</p>
          {preview.pbAfter !== preview.pbBefore && <p>{fmt(t.pb, { a: preview.pbBefore, b: preview.pbAfter })}</p>}
          {preview.isNew && <p className="xp-muted">{t.multiclassNote}</p>}
          <h3>{t.newFeatures}</h3>
          {preview.features.length === 0 ? <p className="xp-muted">{t.noFeatures}</p> : (
            <ul className="pl-src">{preview.features.map((f) => <li key={f.id} style={{ display: "block" }}><b>{f.name}</b><br /><span className="xp-muted">{f.description}</span></li>)}</ul>
          )}
          {preview.subclassNow && <p className="xp-muted">{t.subclass}</p>}
          <h3>{t.choices}</h3>
          {msg && <div className="xp-banner" role="status">{msg}</div>}
          {questions.length === 0 && <p className="xp-muted">{t.noChoices}</p>}
          {questions.map((q) => q.kind === "abilityIncrease"
            ? <AsiBlock key={q.key} q={q} ch={work} rs={rs} draft={drafts[q.key] ?? draftOf(q)} onDraft={(dr) => setDrafts({ ...drafts, [q.key]: dr })}
                onApply={(r) => { if (r.ok) { setWork(r.character); setDrafts({ ...drafts, [q.key]: {} }); setMsg(""); } else setMsg(r.errors.join(" ")); }} />
            : <QuestionView key={q.key} q={q} onPick={(key, picked) => {
                const r = choose(work, rs, key, picked);
                if (!r.ok) { setMsg(r.errors.join(" ")); return; }
                setWork(r.character); setMsg(r.removed.length ? `Annullate: ${r.removed.map((x) => x.key).join(", ")}` : "");
              }} />)}
          {!allDone && <p className="xp-muted">{t.missing}</p>}
          <div className="xp-actions footer">
            <Button onClick={() => setStep("hp")}>{t.back}</Button>
            <Button variant="primary" disabled={!allDone} onClick={() => { onApply(work); onClose(); }}>{t.confirm}</Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
