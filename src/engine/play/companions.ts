import type { Character, Companion } from "../types";

// Compagni a mano (Signore delle bestie, Trova famiglio, Trova destriero, Forma selvatica...): il motore non calcola nulla,
// perché PF, CA e attacchi dipendono dalla creatura scelta; la scheda li tiene insieme al personaggio.
export const MAX_COMPANIONS = 6;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.floor(n)));
const list = (ch: Character): Companion[] => ch.companions ?? [];

export function addCompanion(ch: Character, name = ""): Character {
  if (list(ch).length >= MAX_COMPANIONS) return ch;
  let n = 1;
  while (list(ch).some((c) => c.id === `companion-${n}`)) n++;
  const c: Companion = { id: `companion-${n}`, name, kind: "", hp: 0, hpMax: 0, ac: 10, speed: "", attack: "", notes: "" };
  return { ...ch, companions: [...list(ch), c] };
}

// Modifica uno o più campi; i PF restano tra 0 e il massimo (se il massimo scende, i PF scendono con lui)
export function updateCompanion(ch: Character, id: string, patch: Partial<Omit<Companion, "id">>): Character {
  return { ...ch, companions: list(ch).map((c) => {
    if (c.id !== id) return c;
    const next = { ...c, ...patch };
    next.hpMax = Math.max(0, Math.floor(next.hpMax));
    next.hp = clamp(next.hp, 0, next.hpMax);
    next.ac = Math.max(0, Math.floor(next.ac));
    return next;
  }) };
}

// Danno (positivo) o cura (negativo) al compagno
export function hurtCompanion(ch: Character, id: string, amount: number): Character {
  const c = list(ch).find((x) => x.id === id);
  return c ? updateCompanion(ch, id, { hp: c.hp - Math.floor(amount) }) : ch;
}

export function removeCompanion(ch: Character, id: string): Character {
  return { ...ch, companions: list(ch).filter((c) => c.id !== id) };
}
