import { useState } from "react";
import { MAX_LEVEL, levelFromXp, totalLevel, xpForLevel } from "../engine/levelup";
import { setCoins, setOverride, OVERRIDE_KEYS } from "../engine/play";
import { fmt } from "../ui/format";
import { LevelUpDialog } from "./LevelUpDialog";
import it from "../i18n/it.json";
import { Button } from "../ui/xp";
import type { TabProps } from "./types";
import { num } from "./util";

const t = it.play;
const COINS = ["pp", "gp", "ep", "sp", "cp"] as const;
const NAMES: Record<string, string> = { ac: "Classe Armatura", "hp.max": "PF massimi", initiative: "Iniziativa", "speed.walk": "Velocità", passivePerception: "Percezione passiva" };

export function MiscTab({ ch, rs, d, update, onReopen }: TabProps & { onReopen: () => void }) {
  const [lvl, setLvl] = useState(false);
  const L = it.levelup;
  const total = totalLevel(ch);
  const xpLevel = ch.xp !== undefined ? levelFromXp(rs, ch.xp) : undefined;
  const forced = OVERRIDE_KEYS.filter((k) => ch.overrides[k] !== undefined);
  return (
    <>
      {d.warnings.length > 0 && <div className="xp-banner"><b>{t.warnings}:</b> {d.warnings.join(" ")}</div>}
      <h3>{L.progress}</h3>
      <p>{L.total}: <b>{total}</b></p>
      <div className="pl-row">
        <label style={{ display: "grid", gap: 2 }}>{L.xp}
          <input className="wz-num" style={{ width: 140 }} type="number" inputMode="numeric" min={0} value={ch.xp ?? ""} placeholder="—"
            onChange={(e) => update((c) => { const { xp: _x, ...rest } = c; void _x; return e.target.value === "" ? rest : { ...rest, xp: Math.max(0, num(e.target.value)) }; })} />
        </label>
      </div>
      {xpLevel !== undefined && <p className="xp-muted">{xpLevel >= MAX_LEVEL ? L.xpMax : fmt(L.xpHelp, { xp: ch.xp!, lv: xpLevel, next: xpForLevel(rs, xpLevel + 1) ?? "—" })}{xpLevel > total ? ` ${fmt(L.xpReady, { n: xpLevel })}` : ""}</p>}
      <div className="xp-actions" style={{ justifyContent: "flex-start" }}><Button variant="primary" disabled={total >= MAX_LEVEL} onClick={() => setLvl(true)}>{total >= MAX_LEVEL ? L.max : L.button}</Button></div>
      {lvl && <LevelUpDialog ch={ch} rs={rs} onApply={(c) => update(() => c)} onClose={() => setLvl(false)} />}
      <h3>{t.coins}</h3>
      <div className="pl-row">
        {COINS.map((k) => (
          <label key={k} style={{ display: "grid", gap: 2 }}>{k.toUpperCase()}
            <input className="wz-num" style={{ width: 84 }} type="number" inputMode="numeric" min={0} value={ch.coins[k]} onChange={(e) => update((c) => setCoins(c, { [k]: num(e.target.value) }))} />
          </label>
        ))}
      </div>
      <h3>{t.notes}</h3>
      <textarea className="xp-input" style={{ minHeight: 160, padding: 8 }} aria-label={t.notes} placeholder={t.notesHelp} value={ch.notes} onChange={(e) => update((c) => ({ ...c, notes: e.target.value }))} />
      <h3>{t.overrides}</h3>
      {forced.length === 0 ? <p className="xp-muted">{t.noOverrides}</p> : (
        <ul className="pl-list">
          {forced.map((k) => (
            <li key={k}><div className="pl-cond" style={{ cursor: "default" }}>
              <span className="nm">{NAMES[k]}: <b>{ch.overrides[k]}</b></span>
              <Button onClick={() => update((c) => setOverride(c, k, undefined))}>{t.remove}</Button>
            </div></li>
          ))}
        </ul>
      )}
      <div className="xp-actions footer"><Button onClick={onReopen}>{t.reopen}</Button></div>
    </>
  );
}
