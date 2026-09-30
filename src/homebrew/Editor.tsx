import { useMemo, useState } from "react";
import {
  EFFECT_PRESETS, buildEffect, defaultValues, newHbId, optionSet, presetFor, readEffect, takenIds, validEffect, validateEntry,
  type EffectPreset, type HbEntry, type HbKind, type ParamSpec, type ParamValues,
} from "../engine/homebrew";
import type { Ruleset } from "../engine/ruleset";
import type { Effect } from "../engine/types";
import it from "../i18n/it.json";
import { Button, Check, Field } from "../ui/xp";
import { FIELDS, dataToDraft, draftToData, emptyDraft, withDefaults, type Draft, type FieldSpec } from "./forms";
import { summarize } from "./summary";

const t = it.homebrew;
type EffectRow = { preset: EffectPreset; values: ParamValues };

function ParamInput({ spec, value, onChange, rs }: { spec: ParamSpec; value: ParamValues[string]; onChange: (v: ParamValues[string]) => void; rs: Ruleset }) {
  if (spec.type === "number") {
    return <Field label={spec.label}><input className="xp-input" type="number" inputMode="numeric" value={String(value)} min={spec.min} max={spec.max} onChange={(e) => onChange(Number(e.target.value))} /></Field>;
  }
  if (spec.type === "bool") return <Check checked={Boolean(value)} onChange={onChange}>{spec.label}</Check>;
  const opts = optionSet(spec.options, rs);
  if (spec.type === "select") {
    return (
      <Field label={spec.label}>
        <select className="xp-select" value={String(value)} onChange={(e) => onChange(e.target.value)}>
          {spec.optional && <option value="">—</option>}
          {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </Field>
    );
  }
  const list = value as string[];
  return (
    <Field label={spec.label}>
      <div className="hb-chips">
        {opts.map((o) => <button key={o.id} type="button" aria-pressed={list.includes(o.id)} onClick={() => onChange(list.includes(o.id) ? list.filter((x) => x !== o.id) : [...list, o.id])}>{o.label}</button>)}
      </div>
    </Field>
  );
}

function EffectsEditor({ rows, onChange, rs }: { rows: EffectRow[]; onChange: (r: EffectRow[]) => void; rs: Ruleset }) {
  const [add, setAdd] = useState("");
  return (
    <fieldset className="xp-group">
      <legend>{t.effects}</legend>
      <span className="xp-help">{t.effectsHelp}</span>
      {rows.length === 0 && <p className="xp-muted">{t.noEffects}</p>}
      {rows.map((r, i) => (
        <div key={i} className="hb-effect">
          <strong>{r.preset.label}</strong>
          {r.preset.help && <span className="xp-help">{r.preset.help}</span>}
          {r.preset.params.map((p) => (
            <ParamInput key={p.key} spec={p} rs={rs} value={r.values[p.key]!} onChange={(v) => onChange(rows.map((x, k) => (k === i ? { ...x, values: { ...x.values, [p.key]: v } } : x)))} />
          ))}
          {!validEffect(r.preset, r.values) && <div className="xp-error" role="alert">Completa i campi di questo effetto.</div>}
          <Button variant="danger" onClick={() => onChange(rows.filter((_, k) => k !== i))}>{t.removeEffect}</Button>
        </div>
      ))}
      <Field label={t.addEffect}>
        <select className="xp-select" value={add} onChange={(e) => { const p = presetFor(e.target.value); if (p) { onChange([...rows, { preset: p, values: defaultValues(p, rs) }]); } setAdd(""); }}>
          <option value="">{t.chooseEffect}</option>
          {EFFECT_PRESETS.map((p) => <option key={p.op} value={p.op}>{p.label}</option>)}
        </select>
      </Field>
    </fieldset>
  );
}

function FieldInput({ spec, draft, set, rs }: { spec: FieldSpec; draft: Draft; set: (k: string, v: Draft[string]) => void; rs: Ruleset }) {
  const v = draft[spec.key]!;
  const label = spec.label;
  if (spec.type === "bool") return <Check checked={Boolean(v)} onChange={(x) => set(spec.key, x)}>{label}</Check>;
  if (spec.type === "select") {
    return (
      <Field label={label} help={spec.help}>
        <select className="xp-select" value={String(v)} onChange={(e) => set(spec.key, e.target.value)}>
          {spec.options!(rs).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </Field>
    );
  }
  if (spec.type === "multi") {
    const list = v as string[];
    return (
      <Field label={label} help={spec.help}>
        <div className="hb-chips">
          {spec.options!(rs).map((o) => <button key={o.id} type="button" aria-pressed={list.includes(o.id)} onClick={() => set(spec.key, list.includes(o.id) ? list.filter((x) => x !== o.id) : [...list, o.id])}>{o.label}</button>)}
        </div>
      </Field>
    );
  }
  if (spec.type === "long") return <Field label={label} help={spec.help}><textarea className="xp-input" rows={4} style={{ padding: 8 }} value={String(v)} onChange={(e) => set(spec.key, e.target.value)} /></Field>;
  return <Field label={label} help={spec.help}><input className="xp-input" type="text" inputMode={spec.type === "number" ? "decimal" : undefined} value={String(v)} onChange={(e) => set(spec.key, e.target.value)} /></Field>;
}

// Modulo guidato per una voce: campi, effetti (talenti), anteprima e controllo con lo schema del motore
export function Editor({ kind, initial, rs, existing, onSave, onCancel }: {
  kind: HbKind; initial: HbEntry | null; rs: Ruleset; existing: HbEntry[]; onSave: (e: HbEntry) => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => (initial ? dataToDraft(kind, initial.data) : withDefaults(kind, emptyDraft(kind), rs)));
  const [rows, setRows] = useState<EffectRow[]>(() => ((initial?.data.effects as Effect[] | undefined) ?? []).flatMap((e) => { const r = readEffect(e); return r ? [r] : []; }));
  const [tried, setTried] = useState(false);
  const id = initial?.data.id ?? newHbId(String(draft.name), takenIds(rs, existing));
  const result = useMemo(() => {
    const effects = rows.map((r) => buildEffect(r.preset, r.values));
    return validateEntry(kind, draftToData(kind, draft, id, effects), rs);
  }, [kind, draft, rows, id, rs]);
  const set = (k: string, v: Draft[string]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <>
      <div className="xp-actions" style={{ justifyContent: "flex-start" }}><Button onClick={onCancel}>← {t.back}</Button></div>
      <h2>{initial ? t.edit : t.new}: {t.kinds[kind]}</h2>
      {FIELDS[kind].filter((s) => !s.show || s.show(draft)).map((s) => <FieldInput key={s.key} spec={s} draft={draft} set={set} rs={rs} />)}
      {kind === "feats" && <EffectsEditor rows={rows} onChange={setRows} rs={rs} />}

      <fieldset className="xp-group">
        <legend>{t.preview}</legend>
        {result.ok ? (
          <>
            <p><strong>{result.data.name.it}</strong> <span className="hb-badge">{t.badge}</span></p>
            {summarize(kind, result.data, rs).map((l, i) => <p key={i} className="xp-muted" style={{ margin: "2px 0" }}>{l}</p>)}
            {String(result.data.description ?? "") && <p>{String(result.data.description)}</p>}
          </>
        ) : <p className="xp-muted">{t.previewHelp}</p>}
      </fieldset>

      {!result.ok && tried && <div className="xp-error" role="alert"><strong>{t.errors}</strong><ul>{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}
      <div className="xp-actions">
        <Button onClick={onCancel}>{t.cancel}</Button>
        <Button variant="primary" onClick={() => { setTried(true); if (result.ok) onSave({ kind, enabled: initial?.enabled ?? true, data: result.data }); }}>{t.save}</Button>
      </div>
    </>
  );
}
