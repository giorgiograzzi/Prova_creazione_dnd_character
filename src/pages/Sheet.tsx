import { useState } from "react";
import { useRuleset } from "../data/ruleset";
import it from "../i18n/it.json";
import { Button, Dialog } from "../ui/xp";
import { useApp } from "../ui/useApp";
import { PlaySheet } from "../sheet/PlaySheet";
import { Wizard } from "../wizard/Wizard";
import { isFinalized, reopenCreation } from "../wizard/logic";

// Scheda: finché la creazione non è chiusa mostra il wizard; poi il riepilogo (la scheda giocabile arriva allo step 14)
export function Sheet() {
  const rs = useRuleset();
  const ch = useApp((s) => s.current);
  const update = useApp((s) => s.update);
  const flush = useApp((s) => s.flush);
  const allowReroll = useApp((s) => s.settings.allowReroll);
  const [reopen, setReopen] = useState(false);
  if (!ch) return null;
  if (rs.classes.size === 0) return <div className="xp-error" role="alert">{it.wizard.noData}</div>;

  if (!isFinalized(ch)) {
    return <Wizard ch={ch} rs={rs} allowReroll={allowReroll} onChange={(c) => update(() => c)} onDone={(c) => { update(() => c); void flush(); }} />;
  }
  return (
    <>
      <PlaySheet ch={ch} rs={rs} update={update} onReopen={() => setReopen(true)} />
      {reopen && (
        <Dialog title={it.wizard.sum.reopen} onClose={() => setReopen(false)}>
          <p>{it.wizard.sum.reopenConfirm}</p>
          <div className="xp-actions footer">
            <Button onClick={() => setReopen(false)}>{it.wizard.confirmNo}</Button>
            <Button variant="primary" onClick={() => { update(reopenCreation); setReopen(false); }}>{it.wizard.confirmYes}</Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
