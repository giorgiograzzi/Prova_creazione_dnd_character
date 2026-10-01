import { useState } from "react";
import type { ResourceActionInfo } from "../engine/compute/types";
import { runAction, type SlotVia } from "../engine/play";
import it from "../i18n/it.json";
import { fmt } from "../ui/format";
import { Button } from "../ui/xp";
import type { TabProps } from "./types";

const t = it.play.features.actions;

// Slot con cui si può pagare un'azione a costo alternativo: di classe (livello minimo) e del Patto
function slotChoices(a: ResourceActionInfo, d: TabProps["d"]): { key: string; label: string; via: SlotVia }[] {
  if (!a.slot) return [];
  const out: { key: string; label: string; via: SlotVia }[] = [];
  if (!a.slot.pactOnly) d.spellSlots.remaining.forEach((r, i) => { if (r > 0 && i + 1 >= a.slot!.minLevel) out.push({ key: `s${i + 1}`, label: fmt(t.slotLevel, { n: i + 1, r }), via: { kind: "slot", level: i + 1 } }); });
  const p = d.spellSlots.pact;
  if (p && p.remaining > 0 && p.level >= a.slot.minLevel) out.push({ key: "pact", label: fmt(t.slotPact, { n: p.level, r: p.remaining }), via: { kind: "pact" } });
  return out;
}

// Azioni di un privilegio (Seconda ripresa, Imposizione delle mani...): spende gli usi, tira i dadi e applica cure e recuperi
export function ActionButtons({ actions, ch, d, update }: { actions: ResourceActionInfo[]; ch: TabProps["ch"]; d: TabProps["d"]; update: TabProps["update"] }) {
  const [n, setN] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [slotPick, setSlotPick] = useState<Record<string, string>>({});
  const go = (a: ResourceActionInfo) => {
    const opts = slotChoices(a, d);
    const via = a.slot ? (opts.find((o) => o.key === slotPick[a.id]) ?? opts[0])?.via : undefined;
    const r = runAction(ch, d, a.id, a.variable ? Number(n[a.id] || 1) : undefined, undefined, via);
    if (!r.ok) { setMsg(r.errors[0] ?? ""); return; }
    update(() => r.character);
    const dice = r.rolls?.length ? ` (${r.rolls.join(" + ")}${a.bonus ? ` + ${a.bonus}` : ""})` : "";
    setMsg(a.die || a.apply !== "none" || a.variable ? fmt(t.result, { n: r.total ?? 0, d: dice, a: a.apply === "heal" ? t.heal : a.apply === "tempHp" ? t.tempHp : "" }).trim() : t.done);
    if (r.text) setMsg((m) => `${m} — ${r.text}`);
  };
  return (
    <>
      {actions.map((a) => (
        <span key={a.id} className="pl-row" style={{ flexWrap: "wrap" }}>
          {a.variable && <input className="wz-num" type="number" inputMode="numeric" min={1} max={a.remaining} aria-label={`${t.amount} ${a.label}`} value={n[a.id] ?? "1"} onChange={(e) => setN({ ...n, [a.id]: e.target.value })} />}
          {a.slot && slotChoices(a, d).length > 0 && (
            <select className="xp-select" style={{ width: "auto" }} aria-label={`${t.slotFor} ${a.label}`} value={slotPick[a.id] ?? slotChoices(a, d)[0]!.key} onChange={(e) => setSlotPick({ ...slotPick, [a.id]: e.target.value })}>
              {slotChoices(a, d).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          )}
          <Button aria-label={`${a.label}`} disabled={a.slot ? slotChoices(a, d).length === 0 : a.remaining < (a.variable ? 1 : a.cost)} title={a.slot && slotChoices(a, d).length === 0 ? t.noSlot : undefined} onClick={() => go(a)}>{a.label}</Button>
        </span>
      ))}
      {msg && <span className="pl-sub" role="status" aria-live="polite">{msg}</span>}
    </>
  );
}
