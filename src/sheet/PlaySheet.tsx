import { useMemo } from "react";
import { computeCharacter } from "../engine/compute";
import type { Ruleset } from "../engine/ruleset";
import type { Character } from "../engine/types";
import { AttacksTab } from "./AttacksTab";
import { ConditionsTab } from "./ConditionsTab";
import { FeaturesTab } from "./FeaturesTab";
import { MagicTab } from "./MagicTab";
import { MiscTab } from "./MiscTab";
import { StatsTab } from "./StatsTab";
import { StatusTab } from "./StatusTab";
import type { SheetView } from "./sections";
import { Equip } from "../pages/Equip";
import it from "../i18n/it.json";

// Scheda giocabile: ogni numero viene dal motore (computeCharacter); qui si cambia solo lo stato di gioco
export function PlaySheet({ ch, rs, update, onReopen, tab, onSection }: { ch: Character; rs: Ruleset; update: (fn: (c: Character) => Character) => void; onReopen: () => void; tab: SheetView; onSection: (s: SheetView) => void }) {
  const d = useMemo(() => computeCharacter(ch, rs), [ch, rs]);
  const cls = ch.classes.map((c) => `${rs.classes.get(c.classId)?.name.it ?? c.classId} ${c.level}`).join(" / ");
  const props = { ch, rs, d, update };
  return (
    <div className={`pl-sheet pl-sheet-${tab}`}>
      <p className="xp-muted pl-crumb">{[it.play.tabs[tab], cls, rs.species.get(ch.speciesId)?.name.it, rs.backgrounds.get(ch.backgroundId)?.name.it].filter(Boolean).join(" · ")}</p>
      {tab === "sheet" && (
        <>
          <section className="pl-sec"><StatusTab {...props} onSection={onSection} /></section>
          <section className="pl-sec"><FeaturesTab {...props} /></section>
          <section className="pl-sec"><h2>{it.play.tabs.stats}</h2><StatsTab {...props} /></section>
          <section className="pl-sec"><h2>{it.play.tabs.attacks}</h2><AttacksTab {...props} /></section>
        </>
      )}
      {tab === "conditions" && <ConditionsTab {...props} onBack={() => onSection("sheet")} />}
      {tab === "equip" && <Equip />}
      {tab === "magic" && <MagicTab {...props} />}
      {tab === "misc" && <MiscTab {...props} onReopen={onReopen} />}
    </div>
  );
}
