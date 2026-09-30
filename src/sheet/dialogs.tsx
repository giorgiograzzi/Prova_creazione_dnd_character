import { useState } from "react";
import type { RollMode } from "../engine/compute/types";
import { rollD20, rollExpr, type D20Roll } from "../engine/play";
import type { Sourced } from "../engine/types";
import it from "../i18n/it.json";
import { Button, Dialog, Segmented } from "../ui/xp";
import { sign } from "./util";

const t = it.play;

export function SourceList({ s }: { s: Sourced }) {
  return (
    <ul className="pl-src">
      {s.sources.map((x, i) => <li key={`${x.label}-${i}`}><span>{x.label}</span><b>{typeof x.value === "number" ? sign(x.value) : x.value}</b></li>)}
    </ul>
  );
}

// Tiro di d20: mostra formula, vantaggio/svantaggio (con il motivo), risultato e da dove viene il bonus
export function RollDialog({ title, bonus, mode, modeSources, note, extra, hint, onClose }: {
  title: string; bonus: Sourced; mode: RollMode; modeSources: string[]; note?: string; extra?: React.ReactNode; hint?: string; onClose: () => void;
}) {
  const [m, setM] = useState<RollMode>(mode);
  const [res, setRes] = useState<D20Roll | null>(null);
  return (
    <Dialog title={title} onClose={onClose}>
      <p className="pl-formula">d20 {sign(bonus.value)}</p>
      {hint && <p className="xp-muted">{hint}</p>}
      <Segmented<RollMode> label="Modalità" value={m} onChange={setM}
        options={(["disadvantage", "normal", "advantage"] as const).map((v) => ({ value: v, label: t.mode[v] }))} />
      {modeSources.length > 0 && <p className="xp-muted">{modeSources.join(" · ")}</p>}
      {note && <p className="xp-muted">{note}</p>}
      <div className="xp-actions"><Button variant="primary" onClick={() => setRes(rollD20(bonus.value, m))}>{res ? t.rollAgain : t.roll}</Button></div>
      {res && (
        <div className="pl-result" role="status" aria-live="polite">
          <b>{res.total}</b>
          <span>{t.natural} {res.natural}{res.dice.length > 1 ? ` (${res.dice.join(", ")})` : ""}{res.crit ? " · 20!" : res.fumble ? " · 1" : ""}</span>
        </div>
      )}
      {extra}
      <h3>{t.sources}</h3>
      <SourceList s={bonus} />
      <div className="xp-actions footer"><Button onClick={onClose}>{t.close}</Button></div>
    </Dialog>
  );
}

// Tiro del danno di un attacco: dadi + bonus, con i dadi raddoppiati sul critico
export function DamageRoller({ dice, bonus, type, crit }: { dice: string; bonus: number; type: string; crit: boolean }) {
  const [res, setRes] = useState<{ total: number; rolls: number[]; crit: boolean } | null>(null);
  const roll = () => {
    const r = rollExpr(dice, Math.random, { crit });
    if (r) setRes({ total: Math.max(0, r.total + bonus), rolls: r.rolls, crit });
  };
  return (
    <div>
      <div className="xp-actions"><Button onClick={roll}>{t.damageRoll}: {dice}{bonus ? ` ${sign(bonus)}` : ""} {type}</Button></div>
      {res && <div className="pl-result" role="status"><b>{res.total}</b><span>{res.rolls.join(" + ")}{bonus ? ` ${sign(bonus)}` : ""}{res.crit ? ` · ${t.critHit}` : ""}</span></div>}
    </div>
  );
}

// Numero con le sue fonti; se ammette un valore forzato a mano, lo si imposta o toglie da qui
export function SourcesDialog({ title, value, forced, onForce, onClose, onRoll }: {
  title: string; value: Sourced; forced?: boolean; onForce?: (v: number | undefined) => void; onClose: () => void; onRoll?: () => void;
}) {
  const [draft, setDraft] = useState(String(value.value));
  return (
    <Dialog title={title} onClose={onClose}>
      <p className="pl-formula">{value.value}</p>
      <SourceList s={value} />
      {onRoll && <div className="xp-actions"><Button variant="primary" onClick={onRoll}>{t.roll}</Button></div>}
      {onForce && (
        <>
          <h3>{t.force}</h3>
          <div className="xp-actions" style={{ justifyContent: "flex-start" }}>
            <input className="wz-num" type="number" inputMode="numeric" aria-label={t.force} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <Button onClick={() => onForce(Number(draft))}>{t.force}</Button>
            {forced && <Button variant="danger" onClick={() => onForce(undefined)}>{t.remove}</Button>}
          </div>
        </>
      )}
      <div className="xp-actions footer"><Button onClick={onClose}>{t.close}</Button></div>
    </Dialog>
  );
}
