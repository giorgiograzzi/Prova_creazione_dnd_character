// Sezioni della scheda del personaggio: stanno nella barra in basso al posto delle tab principali.
// "sheet" è un'unica colonna scorrevole (Stato, Privilegi, Statistiche, Attacchi); Equip, Magie e Note hanno una schermata ciascuna.
// "conditions" è una schermata raggiungibile da Stato (non ha un'icona nella barra).
export const SHEET_SECTIONS = ["sheet", "equip", "magic", "misc"] as const;
export type SheetSection = (typeof SHEET_SECTIONS)[number];
export type SheetView = SheetSection | "conditions";
export const isSheetView = (v: unknown): v is SheetView => v === "conditions" || (SHEET_SECTIONS as readonly unknown[]).includes(v);
