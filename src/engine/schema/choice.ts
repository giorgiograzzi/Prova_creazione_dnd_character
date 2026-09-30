import { z } from "zod";
import { condition, effectSchema } from "./effect";
import { id, text } from "./primitives";

export const optionSchema = z.object({
  id,
  name: text,
  description: z.string().optional(),
  requires: condition.optional(), // opzione visibile ma disattivata (con motivo) se non vale
  effects: z.array(effectSchema).default([]),
});
export type Option = z.infer<typeof optionSchema>;

// Una scelta del giocatore. Le opzioni sono elencate qui oppure prese da un
// insieme dei dati (source), es. "skills", "feats:origin", "spells:cleric:0".
export const choiceSchema = z.object({
  id,
  label: text,
  count: z.number().int().min(1).default(1),
  options: z.array(optionSchema).optional(),
  source: z.string().regex(/^[a-zA-Z_]+(:[a-z0-9_]+)*$/).optional(),
  group: id.optional(), // opzioni "una tra": scegliere una esclude le altre del gruppo
  distinct: z.boolean().default(true), // niente duplicati (es. abilità già competenti)
  when: condition.optional(),
}).refine((c) => (c.options ? !c.source : !!c.source), "serve options oppure source");
export type Choice = z.infer<typeof choiceSchema>;
