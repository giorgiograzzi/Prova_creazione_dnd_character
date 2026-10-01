import { evalValue } from "./formula-eval";
import type { Ctx } from "./context";
import type { AuraInfo } from "./types";
import { fillText } from "./text";

// Aure attive: una per `auraId`, con il raggio maggiore (Espansione dell'aura: 10 → 30 ft)
export function computeAuras(x: Ctx): AuraInfo[] {
  const best = new Map<string, AuraInfo>();
  for (const { effect: e } of x.active) {
    if (e.op !== "aura") continue;
    const radius = evalValue(e.radius, x);
    if (radius > (best.get(e.auraId)?.radius ?? -1)) best.set(e.auraId, { id: e.auraId, label: e.label, radius, text: fillText(e.text, e.values, x) });
  }
  return [...best.values()];
}
