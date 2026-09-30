// Sezioni della scheda giocabile: stanno nella barra in basso al posto delle tab principali
export const SHEET_SECTIONS = ["status", "features", "stats", "attacks", "conditions", "misc"] as const;
export type SheetSection = (typeof SHEET_SECTIONS)[number];
