import { buildRuleset } from "../engine/ruleset";

// Legge tutti i JSON in /data (srd, private, homebrew). Se una cartella è vuota o
// assente (es. private/ su un clone pubblico) la lista è semplicemente più corta.
const files = import.meta.glob("../../data/**/*.json", { eager: true, import: "default" });

export const loadRuleset = () => buildRuleset(Object.values(files));
