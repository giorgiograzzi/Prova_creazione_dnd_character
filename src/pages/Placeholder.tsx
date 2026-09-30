import it from "../i18n/it.json";
import { useApp } from "../ui/useApp";

export function Placeholder({ title, text }: { title: string; text: string }) {
  const current = useApp((s) => s.current);
  return (
    <>
      <h2>{title}</h2>
      {current && <p><strong>{current.name || it.characters.unnamed}</strong></p>}
      <p className="xp-muted">{text}</p>
    </>
  );
}
