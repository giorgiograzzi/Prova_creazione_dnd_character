import { useState } from "react";
import type { AttackOption } from "../engine/compute/types";
import it from "../i18n/it.json";
import { fmt } from "../ui/format";
import { DamageRoller, RollDialog } from "./dialogs";
import type { TabProps } from "./types";
import { sign } from "./util";

const t = it.play;

export function AttacksTab({ rs, d }: TabProps) {
  const [sel, setSel] = useState<AttackOption | null>(null);
  return (
    <>
      <p className="xp-muted">{fmt(t.perAction, { n: d.attacksPerAction })}</p>
      {d.attacks.length === 0 && <p className="xp-muted">{t.noAttacks}</p>}
      <ul className="pl-list">
        {d.attacks.map((a) => (
          <li key={`${a.id}-${a.offhand}-${a.thrown}-${a.hands}`}><button type="button" onClick={() => setSel(a)}>
            <span className="nm">{a.label}<br /><span className="pl-sub">{dmgText(a, rs)}{a.mastery ? ` · ${a.mastery.name}${a.mastery.active ? "" : " (non attiva)"}` : ""}</span></span>
            <span className="val">{sign(a.toHit.value)}</span>
          </button></li>
        ))}
      </ul>
      {sel && <AttackRollDialog a={sel} rs={rs} onClose={() => setSel(null)} />}
    </>
  );
}

// Tiro per colpire e per il danno di un attacco (usato dalla scheda e dalla tab Equip)
export function AttackRollDialog({ a, rs, onClose }: { a: AttackOption; rs: TabProps["rs"]; onClose: () => void }) {
  return (
    <RollDialog title={`${a.label} — ${t.attackRoll}`} bonus={a.toHit} mode={a.mode} modeSources={a.modeSources} hint={t.attackD20}
      note={[...a.notes, ...a.riders].join(" · ") || undefined} onClose={onClose} extra={<DamageSection a={a} rs={rs} />} />
  );
}

// Danno: se vuoi il critico, spunta la casella (dopo aver visto il d20 naturale)
function DamageSection({ a, rs }: { a: AttackOption; rs: TabProps["rs"] }) {
  const [crit, setCrit] = useState(false);
  return (
    <div style={{ marginTop: 12 }}>
      <h3>{t.damageTitle}</h3>
      <label className="xp-check"><input type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)} /><span>{t.crit} ({a.critRange < 20 ? `${a.critRange}–20` : "20"})</span></label>
      <DamageRoller dice={a.damage.dice} bonus={a.damage.bonus.value} type={rs.damageTypes.get(a.damage.type)?.name.it ?? a.damage.type} crit={crit} />
    </div>
  );
}

const dmgText = (a: AttackOption, rs: TabProps["rs"]) =>
  `${a.damage.dice} ${sign(a.damage.bonus.value)} ${rs.damageTypes.get(a.damage.type)?.name.it ?? a.damage.type}`;
