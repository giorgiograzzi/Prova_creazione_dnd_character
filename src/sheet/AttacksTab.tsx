import { useState } from "react";
import type { AttackOption } from "../engine/compute/types";
import it from "../i18n/it.json";
import { fmt } from "../ui/format";
import type { Character } from "../engine/types";
import { applyExtra, newTurn } from "../engine/play";
import { Button } from "../ui/xp";
import { ChargeControls, DamageRoller, RollDialog, type ChargeRes } from "./dialogs";
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
      {sel && <AttackRollDialog a={d.attacks.find((x) => x.id === sel.id && x.offhand === sel.offhand && x.thrown === sel.thrown && x.hands === sel.hands) ?? sel} rs={rs} resources={d.resources} update={update} derived={d} onClose={() => setSel(null)} />}
    </>
  );
}

// Tiro per colpire e per il danno di un attacco (usato dalla scheda e dalla tab Equip)
export function AttackRollDialog({ a, rs, resources, update, derived, onClose }: { a: AttackOption; rs: TabProps["rs"]; resources?: Record<string, ChargeRes>; update?: (fn: (c: Character) => Character) => void; derived?: TabProps["d"]; onClose: () => void }) {
  const charges = resources?.[`item:${a.id}`];
  return (
    <RollDialog title={`${a.label} — ${t.attackRoll}`} bonus={a.toHit} mode={a.mode} modeSources={a.modeSources} hint={t.attackD20}
      note={[...a.notes, ...a.riders].join(" · ") || undefined} onClose={onClose}
      extra={<>{charges && update && <div style={{ marginTop: 12 }}><h3>{t.charges}</h3><ChargeControls id={`item:${a.id}`} name={a.label} r={charges} update={update} /></div>}<DamageSection a={a} rs={rs} update={update} derived={derived} /></>} />
  );
}

// Danno: se vuoi il critico, spunta la casella (dopo aver visto il d20 naturale). Gli extra (Colpo brutale...) si spuntano uno a uno:
// i loro dadi si sommano al danno e, al tiro, si segna l'uso (1 per turno, costo in risorsa).
function DamageSection({ a, rs, update, derived }: { a: AttackOption; rs: TabProps["rs"]; update?: (fn: (c: Character) => Character) => void; derived?: TabProps["d"] }) {
  const [crit, setCrit] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const chosen = a.extras.filter((x) => picked.includes(x.id) && !x.used);
  const dice = [a.damage.dice, ...chosen.map((x) => x.dice)].join("+");
  const bonus = a.damage.bonus.value + chosen.reduce((n, x) => n + x.bonus, 0);
  const spend = () => {
    if (!update || !derived || !chosen.length) return;
    let err = "";
    update((c) => chosen.reduce((cur, x) => { const r = applyExtra(cur, derived, x); if (!r.ok) err = r.errors[0] ?? ""; return r.character; }, c));
    setMsg(err); setPicked([]);
  };
  return (
    <div style={{ marginTop: 12 }}>
      <h3>{t.damageTitle}</h3>
      <label className="xp-check"><input type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)} /><span>{t.crit} ({a.critRange < 20 ? `${a.critRange}–20` : "20"})</span></label>
      {a.extras.length > 0 && (
        <fieldset className="xp-fieldset"><legend>{t.extrasTitle}</legend>
          {a.extras.map((x) => (
            <label key={x.id} className="xp-check"><input type="checkbox" disabled={x.used || !update} checked={picked.includes(x.id) && !x.used}
              onChange={(e) => setPicked(e.target.checked ? [...picked, x.id] : picked.filter((p) => p !== x.id))} />
              <span>{x.label}: +{x.dice}{x.bonus ? ` ${sign(x.bonus)}` : ""}{x.type ? ` ${rs.damageTypes.get(x.type)?.name.it ?? x.type}` : ""}
                {x.limit !== "none" ? ` · ${x.limit === "turn" ? t.extraLimit.turn : t.extraLimit.other}` : ""}{x.cost ? ` · ${fmt(t.extraCost, { r: x.cost })}` : ""}{x.used ? ` · ${t.extraUsed}` : ""}</span>
              {x.text && <span className="pl-sub" style={{ display: "block" }}>{x.text}</span>}
            </label>
          ))}
        </fieldset>
      )}
      <DamageRoller dice={dice} bonus={bonus} type={rs.damageTypes.get(a.damage.type)?.name.it ?? a.damage.type} crit={crit} onRoll={spend} />
      {msg && <div className="xp-error" role="alert">{msg}</div>}
    </div>
  );
}

const dmgText = (a: AttackOption, rs: TabProps["rs"]) =>
  `${a.damage.dice} ${sign(a.damage.bonus.value)} ${rs.damageTypes.get(a.damage.type)?.name.it ?? a.damage.type}`;
