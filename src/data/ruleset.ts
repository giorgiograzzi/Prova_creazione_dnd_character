import { useMemo } from "react";
import type { Ruleset } from "../engine/ruleset";
import { loadRuleset } from "./loadRuleset";

let cached: Ruleset | null = null;
export const getRuleset = (): Ruleset => (cached ??= loadRuleset());
export const useRuleset = (): Ruleset => useMemo(getRuleset, []);
