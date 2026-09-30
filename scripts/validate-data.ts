// npm run validate:data — valida tutti i JSON in data/ (schema Zod + riferimenti incrociati)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildRuleset } from "../src/engine/ruleset";
import { checkReferences } from "../src/engine/validate";

function walk(dir: string): string[] {
  try {
    return readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith(".json") ? [p] : [];
    });
  } catch { return []; }
}

const files = walk("data");
if (!files.length) { console.log("validate:data: nessun file in data/ (private/ assente?) — niente da validare"); process.exit(0); }
const rs = buildRuleset(files.map((f) => JSON.parse(readFileSync(f, "utf8"))));
const errors = [...rs.errors, ...checkReferences(rs)];
const counts = Object.entries(rs).filter(([, v]) => v instanceof Map && v.size).map(([k, v]) => `${k}: ${(v as Map<unknown, unknown>).size}`);
console.log(`File: ${files.length} — ${counts.join(", ")}`);
if (errors.length) { console.error(`\n${errors.length} errori:\n- ${errors.join("\n- ")}`); process.exit(1); }
console.log("validate:data: OK");
