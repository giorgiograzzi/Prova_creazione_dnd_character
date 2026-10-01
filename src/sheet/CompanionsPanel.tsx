import { useState } from "react";
import { addCompanion, hurtCompanion, MAX_COMPANIONS, removeCompanion, updateCompanion } from "../engine/play";
import type { Companion } from "../engine/types";
import it from "../i18n/it.json";
import { Button } from "../ui/xp";
import type { TabProps } from "./types";
import { num } from "./util";

const t = it.play.companions;

// Compagni a mano: PF con danno e cura rapidi, CA, velocità, attacco e note scritti dal giocatore
export function CompanionsPanel({ ch, update }: Pick<TabProps, "ch" | "update">) {
  const list = ch.companions ?? [];
  const [amount, setAmount] = useState<Record<string, string>>({});
  const set = (id: string, patch: Partial<Omit<Companion, "id">>) => update((c) => updateCompanion(c, id, patch));
  const text = (c: Companion, key: "name" | "kind" | "speed" | "attack") => (
    <label style={{ display: "grid", gap: 2 }}>{t[key]}
      <input className="xp-input" value={c[key]} onChange={(e) => set(c.id, { [key]: e.target.value })} />
    </label>
  );
  return (
    <>
      <h3>{t.title}</h3>
      <p className="xp-muted">{t.help}</p>
      {list.length === 0 && <p className="xp-muted">{t.none}</p>}
      {list.map((c) => {
        const q = Math.max(1, num(amount[c.id] ?? "1"));
        return (
          <section key={c.id} className="pl-comp" aria-label={c.name || t.title} style={{ display: "grid", gap: 8, margin: "8px 0 16px" }}>
            {text(c, "name")}
            {text(c, "kind")}
            <div className="pl-row">
              <label style={{ display: "grid", gap: 2 }}>{t.hp}
                <input className="wz-num" style={{ width: 72 }} type="number" inputMode="numeric" min={0} value={c.hp} onChange={(e) => set(c.id, { hp: num(e.target.value) })} />
              </label>
              <label style={{ display: "grid", gap: 2 }}>{t.hpMax}
                <input className="wz-num" style={{ width: 72 }} type="number" inputMode="numeric" min={0} value={c.hpMax} onChange={(e) => set(c.id, { hpMax: num(e.target.value) })} />
              </label>
              <label style={{ display: "grid", gap: 2 }}>{t.ac}
                <input className="wz-num" style={{ width: 72 }} type="number" inputMode="numeric" min={0} value={c.ac} onChange={(e) => set(c.id, { ac: num(e.target.value) })} />
              </label>
            </div>
            <div className="pl-row">
              <input className="wz-num" style={{ width: 72 }} type="number" inputMode="numeric" min={1} aria-label={`${t.amount} ${c.name}`} value={amount[c.id] ?? "1"} onChange={(e) => setAmount({ ...amount, [c.id]: e.target.value })} />
              <Button onClick={() => update((x) => hurtCompanion(x, c.id, q))}>{t.damage}</Button>
              <Button onClick={() => update((x) => hurtCompanion(x, c.id, -q))}>{t.heal}</Button>
            </div>
            {text(c, "speed")}
            {text(c, "attack")}
            <label style={{ display: "grid", gap: 2 }}>{t.notes}
              <textarea className="xp-input" style={{ minHeight: 64, padding: 8 }} value={c.notes} onChange={(e) => set(c.id, { notes: e.target.value })} />
            </label>
            <div><Button onClick={() => update((x) => removeCompanion(x, c.id))}>{`${t.remove} ${c.name}`.trim()}</Button></div>
          </section>
        );
      })}
      <div className="xp-actions"><Button disabled={list.length >= MAX_COMPANIONS} onClick={() => update((c) => addCompanion(c))}>{t.add}</Button></div>
      {list.length >= MAX_COMPANIONS && <p className="xp-muted">{t.max}</p>}
    </>
  );
}
