import { useState } from "react";
import { createSlot, SLOT_COST, slotToPoints, spendPoints, SORCERY_POINTS } from "../engine/play";
import it from "../i18n/it.json";
import { fmt } from "../ui/format";
import { Button } from "../ui/xp";
import type { TabProps } from "./types";

const t = it.magic.sorcery;

// Punti stregoneria: Metamagia a costo, punti → slot e slot → punti (le opzioni di Metamagia scelte compaiono qui)
export function SorceryPanel({ d, update }: Pick<TabProps, "d" | "update">) {
  const pts = d.resources[SORCERY_POINTS];
  const [msg, setMsg] = useState("");
  const [make, setMake] = useState("1");
  const [back, setBack] = useState("");
  if (!pts) return null;
  const run = (fn: (c: TabProps["ch"]) => { ok: boolean; errors: string[]; character: TabProps["ch"] }, ok: string) => {
    let res: { ok: boolean; errors: string[] } = { ok: true, errors: [] };
    update((c) => { const r = fn(c); res = r; return r.character; });
    setMsg(res.ok ? ok : res.errors[0] ?? "");
  };
  const owned = d.spellSlots.slots.map((n, i) => ({ level: i + 1, left: d.spellSlots.remaining[i] ?? 0, n })).filter((x) => x.left > 0);
  const backLevel = back || String(owned[0]?.level ?? "");
  return (
    <>
      <h3>{t.title}</h3>
      <p className="pl-sub">{fmt(t.points, { r: pts.remaining, m: pts.max.value })}</p>
      {d.chosenOptions.length > 0 && (
        <ul className="pl-list">
          {d.chosenOptions.map((o) => (
            <li key={o.id}><div className="pl-cond" style={{ cursor: "default" }}>
              <span className="nm">{o.name}{o.description && <><br /><span className="pl-sub">{o.description}</span></>}</span>
              <span className="val">{fmt(t.cost, { n: o.cost })}</span>
              <Button disabled={pts.remaining < o.cost} aria-label={`${t.use} ${o.name}`} onClick={() => run((c) => spendPoints(c, d, o.cost), fmt(t.used, { n: o.name, c: o.cost }))}>{t.use}</Button>
            </div></li>
          ))}
        </ul>
      )}
      <div className="pl-row" style={{ flexWrap: "wrap" }}>
        <select className="xp-select" style={{ width: "auto" }} aria-label={t.makeLevel} value={make} onChange={(e) => setMake(e.target.value)}>
          {Object.entries(SLOT_COST).map(([lv, cost]) => <option key={lv} value={lv}>{fmt(t.makeOption, { n: lv, c: cost })}</option>)}
        </select>
        <Button disabled={pts.remaining < (SLOT_COST[Number(make)] ?? 99)} onClick={() => run((c) => createSlot(c, d, Number(make)), fmt(t.made, { n: make }))}>{t.make}</Button>
      </div>
      <div className="pl-row" style={{ flexWrap: "wrap" }}>
        <select className="xp-select" style={{ width: "auto" }} aria-label={t.backLevel} value={backLevel} onChange={(e) => setBack(e.target.value)}>
          {owned.length === 0 && <option value="">{t.noSlots}</option>}
          {owned.map((x) => <option key={x.level} value={x.level}>{fmt(t.backOption, { n: x.level, r: x.left })}</option>)}
        </select>
        <Button disabled={!owned.length || pts.used <= 0} onClick={() => run((c) => slotToPoints(c, d, Number(backLevel)), fmt(t.converted, { n: backLevel }))}>{t.back}</Button>
      </div>
      {msg && <p className="pl-sub" role="status" aria-live="polite">{msg}</p>}
    </>
  );
}
