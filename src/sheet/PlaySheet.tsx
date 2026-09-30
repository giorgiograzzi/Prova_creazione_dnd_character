import { useMemo, useState } from "react";
import { computeCharacter } from "../engine/compute";
import type { Ruleset } from "../engine/ruleset";
import type { Character } from "../engine/types";
import it from "../i18n/it.json";
import { AttacksTab } from "./AttacksTab";
import { ConditionsTab } from "./ConditionsTab";
import { MiscTab } from "./MiscTab";
import { StatsTab } from "./StatsTab";
import { StatusTab } from "./StatusTab";

const t = it.play;
const TABS = ["status", "stats", "attacks", "conditions", "misc"] as const;
type Tab = (typeof TABS)[number];

// Scheda giocabile: ogni numero viene dal motore (computeCharacter); qui si cambia solo lo stato di gioco
export function PlaySheet({ ch, rs, update, onReopen }: { ch: Character; rs: Ruleset; update: (fn: (c: Character) => Character) => void; onReopen: () => void }) {
  const [tab, setTab] = useState<Tab>("status");
  const d = useMemo(() => computeCharacter(ch, rs), [ch, rs]);
  const cls = ch.classes.map((c) => `${rs.classes.get(c.classId)?.name.it ?? c.classId} ${c.level}`).join(" / ");
  const props = { ch, rs, d, update };
  return (
    <>
      <p className="xp-muted" style={{ margin: "0 0 8px" }}>{[cls, rs.species.get(ch.speciesId)?.name.it, rs.backgrounds.get(ch.backgroundId)?.name.it].filter(Boolean).join(" · ")}</p>
      <div className="pl-tabs" role="tablist">
        {TABS.map((k) => <button key={k} type="button" role="tab" aria-selected={k === tab} onClick={() => setTab(k)}>{t.tabs[k]}</button>)}
      </div>
      {tab === "status" && <StatusTab {...props} />}
      {tab === "stats" && <StatsTab {...props} />}
      {tab === "attacks" && <AttacksTab {...props} />}
      {tab === "conditions" && <ConditionsTab {...props} />}
      {tab === "misc" && <MiscTab {...props} onReopen={onReopen} />}
    </>
  );
}
