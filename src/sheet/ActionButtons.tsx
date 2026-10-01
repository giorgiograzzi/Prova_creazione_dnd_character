import { useState } from "react";
import type { ResourceActionInfo } from "../engine/compute/types";
import { runAction } from "../engine/play";
import it from "../i18n/it.json";
import { fmt } from "../ui/format";
import { Button } from "../ui/xp";
import type { TabProps } from "./types";

const t = it.play.features.actions;

// Azioni di un privilegio (Seconda ripresa, Imposizione delle mani...): spende gli usi, tira i dadi e applica cure e recuperi
export function ActionButtons({ actions, ch, d, update }: { actions: ResourceActionInfo[]; ch: TabProps["ch"]; d: TabProps["d"]; update: TabProps["update"] }) {
  const [n, setN] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const go = (a: ResourceActionInfo) => {
    const r = runAction(ch, d, a.id, a.variable ? Number(n[a.id] || 1) : undefined);
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
          <Button aria-label={`${a.label}`} disabled={a.remaining < (a.variable ? 1 : a.cost)} onClick={() => go(a)}>{a.label}</Button>
        </span>
      ))}
      {msg && <span className="pl-sub" role="status" aria-live="polite">{msg}</span>}
    </>
  );
}
