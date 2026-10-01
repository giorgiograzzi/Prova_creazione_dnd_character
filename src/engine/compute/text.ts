import { evalValue, type FormulaCtx } from "./formula-eval";

// Testo con numeri calcolati: "CD {0}" + values ["8 + mod:wis + pb"] → "CD 14" (promemoria, extra d'attacco, azioni)
export function fillText(text: string, values: string[] | undefined, c: FormulaCtx): string {
  if (!values?.length) return text;
  return text.replace(/\{(\d+)\}/g, (m, i) => (values[Number(i)] === undefined ? m : String(evalValue(values[Number(i)]!, c))));
}
