import { useState } from "react";
import type { AttackExtra, AttackOption } from "../engine/compute/types";
import { castSpell, type CastVia } from "../engine/magic";
import { applyExtra, extraDice, forgoDice } from "../engine/play";
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
  const pact = d.spellSlots.pact;
  if (x.pactSlot) return pact && pact.remaining > 0 ? [{ key: "pact", label: fmt(t.slotPact, { n: pact.level }), level: pact.level, via: { kind: "pact" } }] : []; // solo lo slot del Patto
  const free = d.resources[`spell:${x.slotSpell}`];
  if (free && free.remaining > 0) out.push({ key: "free", label: t.slotFree, level: base, via: { kind: "free", resourceId: `spell:${x.slotSpell}` } });
  d.spellSlots.remaining.forEach((n, i) => { if (n > 0 && i + 1 >= base) out.push({ key: `slot${i + 1}`, label: fmt(t.slotLevel, { n: i + 1 }), level: i + 1, via: { kind: "slot", level: i + 1 } }); });
  const p = d.spellSlots.pact;
  if (p && p.remaining > 0 && p.level >= base) out.push({ key: "pact", label: fmt(t.slotPact, { n: p.level }), level: p.level, via: { kind: "pact" } });
  return out;
}
// Danno: se vuoi il critico, spunta la casella (dopo aver visto il d20 naturale). Gli extra (Colpo brutale, Punizione divina...) si
// spuntano uno a uno: i loro dadi si sommano al danno e, al tiro, si segna l'uso (1 per turno, costo in risorsa, slot).
export function DamageSection({ a, rs, ch, update, derived, marked = true }: { marked?: boolean; a: AttackOption; rs: TabProps["rs"]; ch?: Character; update?: (fn: (c: Character) => Character) => void; derived?: TabProps["d"] }) {
  const [crit, setCrit] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [slotKey, setSlotKey] = useState<Record<string, string>>({});
  const [typePick, setTypePick] = useState<Record<string, string>>({}); // tipo di danno scelto per gli extra a scelta (Rivelazione celestiale)
  const typeOf = (x: AttackExtra) => (x.types ? typePick[x.id] ?? x.types[0] : x.type);
  const [forgo, setForgo] = useState<Record<string, string[]>>({}); // effetti scelti rinunciando a dadi (Colpo astuto)
  const forgone = (x: AttackExtra) => (x.forgo ?? []).filter((o) => (forgo[x.id] ?? []).includes(o.id));
  const forgoCost = (x: AttackExtra) => forgone(x).reduce((n, o) => n + o.dice, 0);
  const typeName = (id?: string) => (id ? rs.damageTypes.get(id)?.name.it ?? id : "");
  const [msg, setMsg] = useState<string[]>([]);
  const canUse = !!update && !!derived && !!ch;
  const choiceOf = (x: AttackExtra): SlotChoice | undefined => {
    if (!(x.slotSpell || x.pactSlot) || !derived) return undefined;
    const all = slotChoices(x, derived);
    return all.find((c) => c.key === slotKey[x.id]) ?? all[0];
  };
  const extras = a.extras.filter((x) => !x.vsMarked || marked); // gli extra «solo contro la creatura marcata» compaiono se l'attacco è contro di lei
  const chosen = extras.filter((x) => picked.includes(x.id) && !x.used && (!(x.slotSpell || x.pactSlot) || choiceOf(x)));
  const diceOf = (x: AttackExtra) => forgoDice(x.slotSpell || x.pactSlot ? extraDice(x, choiceOf(x)?.level ?? x.baseLevel ?? 1) : x.dice, forgoCost(x));
  const dice = [a.damage.dice, ...chosen.map(diceOf)].filter(Boolean).join("+");
  const bonus = a.damage.bonus.value + chosen.reduce((n, x) => n + x.bonus, 0);
  const spend = () => {
    if (!canUse || !chosen.length) return;
    const errs: string[] = [];
    let notes: string[] = [];
    update!((c) => chosen.reduce((cur, x) => {
      let next = cur;
      const ch0 = choiceOf(x);
      if (x.pactSlot && ch0) {
        next = { ...next, state: { ...next.state, pactUsed: (next.state.pactUsed ?? 0) + 1 } }; // lo slot del Patto non lancia un incantesimo: si spende e basta
      } else if (x.slotSpell && ch0) {
        const r = castSpell(next, rs, derived!, x.slotSpell, ch0.via);
        if (!r.ok) { errs.push(...r.errors); return cur; }
        next = r.character; notes = [...notes, ...r.notes];
      }
      const r = applyExtra(next, derived!, x.slotSpell || x.pactSlot ? { ...x, cost: undefined } : x);
      if (!r.ok) errs.push(...r.errors);
      return r.character;
    }, c));
    setMsg([...errs, ...notes]); setPicked([]); setForgo({});
  };
  const costText = (x: AttackExtra) => x.cost ? ` · ${fmt((x.costAmount ?? 1) > 1 ? t.extraCostN : t.extraCost, { r: (derived?.resources[x.cost]?.max.sources[0]?.label ?? x.cost).split(": ").pop() ?? x.cost, n: x.costAmount ?? 1 })}` : "";
  return (
    <div style={{ marginTop: 12 }}>
      <h3>{t.damageTitle}</h3>
      <label className="xp-check"><input type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)} /><span>{t.crit} ({a.critRange < 20 ? `${a.critRange}–20` : "20"})</span></label>
      {extras.length > 0 && (
        <fieldset className="xp-fieldset"><legend>{t.extrasTitle}</legend>
          {extras.map((x) => {
            const slots = (x.slotSpell || x.pactSlot) && derived ? slotChoices(x, derived) : [];
            const noSlot = !!(x.slotSpell || x.pactSlot) && slots.length === 0;
            return (
              <div key={x.id}>
                <label className="xp-check"><input type="checkbox" disabled={x.used || !canUse || noSlot} checked={picked.includes(x.id) && !x.used}
                  onChange={(e) => setPicked(e.target.checked ? [...picked, x.id] : picked.filter((p) => p !== x.id))} />
                  <span>{x.label}{x.dice || x.bonus ? ":" : ""}{x.dice ? ` +${diceOf(x)}` : ""}{x.bonus ? ` ${sign(x.bonus)}` : ""}{x.type ? ` ${typeName(x.type)}` : ""}
                    {x.limit !== "none" ? ` · ${x.limit === "turn" ? t.extraLimit.turn : t.extraLimit.other}` : ""}{costText(x)}{noSlot ? ` · ${t.slotNone}` : ""}{x.used ? ` · ${t.extraUsed}` : ""}</span>
                  {x.text && <span className="pl-sub" style={{ display: "block" }}>{x.text}</span>}
                </label>
                {x.forgo && !x.used && picked.includes(x.id) && (
                  <div style={{ marginLeft: 28 }}>
                    <p className="pl-sub">{fmt(t.forgoTitle, { n: x.forgoMax ?? 1 })}</p>
                    {x.forgo.map((o) => {
                      const on = (forgo[x.id] ?? []).includes(o.id);
                      const total = Number(/^(\d+)d/.exec(x.dice)?.[1] ?? 0);
                      const blocked = !on && ((forgo[x.id] ?? []).length >= (x.forgoMax ?? 1) || forgoCost(x) + o.dice > total);
                      return (
                        <label key={o.id} className="xp-check"><input type="checkbox" disabled={blocked} checked={on}
                          onChange={(e) => setForgo({ ...forgo, [x.id]: e.target.checked ? [...(forgo[x.id] ?? []), o.id] : (forgo[x.id] ?? []).filter((z) => z !== o.id) })} />
                          <span>{o.label} ({fmt(t.forgoDice, { n: o.dice })}){o.text && <span className="pl-sub" style={{ display: "block" }}>{o.text}</span>}</span></label>
                      );
                    })}
                  </div>
                )}
                {x.types && !x.used && picked.includes(x.id) && (
                  <select className="xp-select" style={{ width: "auto", marginLeft: 28 }} aria-label={`${t.typeChoose} ${x.label}`} value={typeOf(x)} onChange={(e) => setTypePick({ ...typePick, [x.id]: e.target.value })}>
                    {x.types.map((ty) => <option key={ty} value={ty}>{typeName(ty)}</option>)}
                  </select>
                )}
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
      {chosen.some((x) => typeOf(x)) && <p className="pl-sub">{t.typesBreakdown}: {chosen.filter((x) => typeOf(x)).map((x) => `${x.label} ${typeName(typeOf(x))}`).join(" · ")}</p>}
      <DamageRoller dice={dice} bonus={bonus} type={rs.damageTypes.get(a.damage.type)?.name.it ?? a.damage.type} crit={crit} {...(a.dieFloor ? { floor: a.dieFloor } : {})} onRoll={spend} />
      {msg.length > 0 && <div className="xp-error" role="alert">{msg.join(" · ")}</div>}
    </div>
  );
}
