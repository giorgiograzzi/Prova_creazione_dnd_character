import { useState } from "react";
import type { AttackOption } from "../engine/compute/types";
import it from "../i18n/it.json";
import { fmt } from "../ui/format";
import type { Character } from "../engine/types";
import { newTurn } from "../engine/play";
import { Button } from "../ui/xp";
import { ChargeControls, RollDialog, type ChargeRes } from "./dialogs";
import { DamageSection } from "./DamageSection";
import type { TabProps } from "./types";
import { sign } from "./util";

const t = it.play;

export function AttacksTab({ ch, rs, d, update }: TabProps) {
  const [sel, setSel] = useState<AttackOption | null>(null);
  const hasTurnExtras = d.attacks.some((a) => a.extras.some((x) => x.limit === "turn"));
  return (
    <>
      <p className="xp-muted">{fmt(t.perAction, { n: d.attacksPerAction })}</p>
      {(hasTurnExtras || Object.values(ch.state.once ?? {}).includes("turn")) && (
        <div className="pl-row"><Button onClick={() => update(newTurn)}>{t.newTurn}</Button><span className="pl-sub">{t.newTurnHelp}</span></div>
      )}
      {d.attacks.length === 0 && <p className="xp-muted">{t.noAttacks}</p>}
      <ul className="pl-list">
        {d.attacks.map((a) => (
          <li key={`${a.id}-${a.offhand}-${a.thrown}-${a.hands}`}><button type="button" onClick={() => setSel(a)}>
            <span className="nm">{a.label}<br /><span className="pl-sub">{dmgText(a, rs)}{d.resources[`item:${a.id}`] ? ` · ${t.charges} ${d.resources[`item:${a.id}`]!.remaining}/${d.resources[`item:${a.id}`]!.max.value}` : ""}{a.mastery ? ` · ${a.mastery.name}${a.mastery.active ? "" : " (non attiva)"}` : ""}</span></span>
            <span className="val">{sign(a.toHit.value)}</span>
          </button></li>
        ))}
      </ul>
      {sel && <AttackRollDialog a={d.attacks.find((x) => x.id === sel.id && x.offhand === sel.offhand && x.thrown === sel.thrown && x.hands === sel.hands) ?? sel} rs={rs} ch={ch} resources={d.resources} update={update} derived={d} onClose={() => setSel(null)} />}
    </>
  );
}

// Tiro per colpire e per il danno di un attacco (usato dalla scheda e dalla tab Equip)
export function AttackRollDialog({ a, rs, ch, resources, update, derived, onClose }: { a: AttackOption; rs: TabProps["rs"]; ch?: Character; resources?: Record<string, ChargeRes>; update?: (fn: (c: Character) => Character) => void; derived?: TabProps["d"]; onClose: () => void }) {
  const charges = resources?.[`item:${a.id}`];
  // creatura marcata (Marchio del cacciatore, Voto di inimicizia): il nome si scrive una volta; ogni attacco dice se è contro di lei
  const [marked, setMarked] = useState(false);
  const hasMark = !!a.markedMode || a.extras.some((x) => x.vsMarked);
  const target = ch?.state.markedTarget ?? "";
  const rollMode = marked && a.markedMode ? a.markedMode : a;
  return (
    <RollDialog title={`${a.label} — ${t.attackRoll}`} bonus={a.toHit} mode={rollMode.mode} modeSources={rollMode.modeSources} hint={t.attackD20} {...(derived?.d20Reroll.length ? { floor: derived.d20Reroll } : {})}
      note={[...a.notes, ...a.riders].join(" · ") || undefined} onClose={onClose}
      extra={<>{hasMark && (
        <fieldset className="xp-fieldset"><legend>{t.mark.title}</legend>
          {update && <input className="xp-input" aria-label={t.mark.name} placeholder={t.mark.name} maxLength={80} value={target}
            onChange={(e) => update((c) => ({ ...c, state: { ...c.state, ...(e.target.value ? { markedTarget: e.target.value } : { markedTarget: undefined }) } }))} />}
          <label className="xp-check"><input type="checkbox" checked={marked} onChange={(e) => setMarked(e.target.checked)} /><span>{fmt(t.mark.against, { n: target || t.mark.theMarked })}</span></label>
        </fieldset>
      )}{charges && update && <div style={{ marginTop: 12 }}><h3>{t.charges}</h3><ChargeControls id={`item:${a.id}`} name={a.label} r={charges} update={update} /></div>}<DamageSection a={a} rs={rs} ch={ch} update={update} derived={derived} marked={marked} /></>} />
  );
}

const dmgText = (a: AttackOption, rs: TabProps["rs"]) =>
  `${a.damage.dice} ${sign(a.damage.bonus.value)} ${rs.damageTypes.get(a.damage.type)?.name.it ?? a.damage.type}`;
