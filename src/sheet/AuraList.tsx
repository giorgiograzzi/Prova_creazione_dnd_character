import type { AuraInfo } from "../engine/compute/types";
import it from "../i18n/it.json";
import { fmt } from "../ui/format";

const t = it.play.auras;

// Aure che valgono anche per gli alleati: l'effetto su di te è già nei numeri; qui raggio e testo, da dire al tavolo
export function AuraList({ auras }: { auras: AuraInfo[] }) {
  return (
    <>
      <h3>{t.title}</h3>
      <p className="xp-muted">{t.help}</p>
      <ul className="pl-list">
        {auras.map((a) => (
          <li key={a.id}><div className="pl-cond" style={{ cursor: "default" }}>
            <span className="nm">{a.label}<br /><span className="pl-sub">{a.text}</span></span>
            <span className="val">{fmt(t.radius, { n: a.radius })}</span>
          </div></li>
        ))}
      </ul>
    </>
  );
}
