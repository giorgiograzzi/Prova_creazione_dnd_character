import { useState } from "react";
import type { AttackExtra, AttackOption } from "../engine/compute/types";
import { castSpell, type CastVia } from "../engine/magic";
import { applyExtra, extraDice } from "../engine/play";
import type { Character } from "../engine/types";
import it from "../i18n/it.json";
import { fmt } from "../ui/format";
import { DamageRoller } from "./dialogs";
import type { TabProps } from "./types";
import { sign } from "./util";

const t = it.play;

// Costo in slot di un extra (Punizione divina): da dove si paga e quanti dadi dà
interface SlotChoice { key: string; label: string; level: number; via: CastVia }
function slotChoices(x: AttackExtra, d: TabProps["d"]): SlotChoice[] {
  const base = x.baseLevel ?? 1, out: SlotChoice[] = [];
  const free = d.resources[`spell:${x.slotSpell}`];
  if (free && free.remaining > 0) out.push({ key: "free", label: t.slotFree, level: base, via: { kind: "free", resourceId: `spell:${x.slotSpell}` } });
  d.spellSlots.remaining.forEach((n, i) => { if (n > 0 && i + 1 >= base) out.push({ key: `slot${i + 1}`, label: fmt(t.slotLevel, { n: i + 1 }), level: i + 1, via: { kind: "slot", level: i + 1 } }); });
  const p = d.spellSlots.pact;
  if (p && p.remaining > 0 && p.level >= base) out.push({ key: "pact", label: fmt(t.slotPact, { n: p.level }), level: p.level, via: { kind: "pact" } });
  return out;
}
// Danno: se vuoi il critico, spunta la casella (dopo aver visto il d20 naturale). Gli extra (Colpo brutale, Punizione divina...) si
// spuntano uno a uno: i loro dadi si sommano al danno e, al tiro, si segna l'uso (1 per turno, costo in risorsa, slot).
export function DamageSection({ a, rs, ch, update, derived }: { a: AttackOption; rs: TabProps["rs"]; ch?: Character; update?: (fn: (c: Character) => Character) => void; derived?: TabProps["d"] }) {
  const [crit, setCrit] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [slotKey, setSlotKey] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string[]>([]);
  const canUse = !!update && !!derived && !!ch;
  const choiceOf = (x: AttackExtra): SlotChoice | undefined => {
    if (!x.slotSpell || !derived) return undefined;
    const all = slotChoices(x, derived);
    return all.find((c) => c.key === slotKey[x.id]) ?? all[0];
  };
  const chosen = a.extras.filter((x) => picked.includes(x.id) && !x.used && (!x.slotSpell || choiceOf(x)));
  const diceOf = (x: AttackExtra) => (x.slotSpell ? extraDice(x, choiceOf(x)?.level ?? x.baseLevel ?? 1) : x.dice);
  const dice = [a.damage.dice, ...chosen.map(diceOf)].filter(Boolean).join("+");
  const bonus = a.damage.bonus.value + chosen.reduce((n, x) => n + x.bonus, 0);
  const spend = () => {
    if (!canUse || !chosen.length) return;
    const errs: string[] = [];
    let notes: string[] = [];
    update!((c) => chosen.reduce((cur, x) => {
      let next = cur;
      const ch0 = choiceOf(x);
      if (x.slotSpell && ch0) {
        const r = castSpell(next, rs, derived!, x.slotSpell, ch0.via);
        if (!r.ok) { errs.push(...r.errors); return cur; }
        next = r.character; notes = [...notes, ...r.notes];
      }
      const r = applyExtra(next, derived!, x.slotSpell ? { ...x, cost: undefined } : x);
      if (!r.ok) errs.push(...r.errors);
      return r.character;
    }, c));
    setMsg([...errs, ...notes]); setPicked([]);
  };
  const costText = (x: AttackExtra) => x.cost ? ` · ${fmt((x.costAmount ?? 1) > 1 ? t.extraCostN : t.extraCost, { r: (derived?.resources[x.cost]?.max.sources[0]?.label ?? x.cost).split(": ").pop() ?? x.cost, n: x.costAmount ?? 1 })}` : "";
  return (
    <div style={{ marginTop: 12 }}>
      <h3>{t.damageTitle}</h3>
      <label className="xp-check"><input type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)} /><span>{t.crit} ({a.critRange < 20 ? `${a.critRange}–20` : "20"})</span></label>
      {a.extras.length > 0 && (
        <fieldset className="xp-fieldset"><legend>{t.extrasTitle}</legend>
          {a.extras.map((x) => {
            const slots = x.slotSpell && derived ? slotChoices(x, derived) : [];
            const noSlot = !!x.slotSpell && slots.length === 0;
            return (
              <div key={x.id}>
                <label className="xp-check"><input type="checkbox" disabled={x.used || !canUse || noSlot} checked={picked.includes(x.id) && !x.used}
                  onChange={(e) => setPicked(e.target.checked ? [...picked, x.id] : picked.filter((p) => p !== x.id))} />
                  <span>{x.label}{x.dice || x.bonus ? ":" : ""}{x.dice ? ` +${diceOf(x)}` : ""}{x.bonus ? ` ${sign(x.bonus)}` : ""}{x.type ? ` ${rs.damageTypes.get(x.type)?.name.it ?? x.type}` : ""}
                    {x.limit !== "none" ? ` · ${x.limit === "turn" ? t.extraLimit.turn : t.extraLimit.other}` : ""}{costText(x)}{noSlot ? ` · ${t.slotNone}` : ""}{x.used ? ` · ${t.extraUsed}` : ""}</span>
                  {x.text && <span className="pl-sub" style={{ display: "block" }}>{x.text}</span>}
                </label>
                {slots.length > 0 && canUse && !x.used && (
                  <select className="xp-select" style={{ width: "auto", marginLeft: 28 }} aria-label={`${t.slotChoose} ${x.label}`} value={choiceOf(x)?.key ?? ""} onChange={(e) => setSlotKey({ ...slotKey, [x.id]: e.target.value })}>
                    {slots.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                )}
              </div>
            );
          })}
        </fieldset>
      )}
      <DamageRoller dice={dice} bonus={bonus} type={rs.damageTypes.get(a.damage.type)?.name.it ?? a.damage.type} crit={crit} onRoll={spend} />
      {msg.length > 0 && <div className="xp-error" role="alert">{msg.join(" · ")}</div>}
    </div>
  );
}
