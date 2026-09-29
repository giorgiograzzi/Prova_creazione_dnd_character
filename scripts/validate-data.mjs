// Segnaposto di `npm run validate:data`. Dallo step 4 valida schema Zod e riferimenti
// incrociati. Tollera l'assenza di src/data/private (deve compilare con la sola parte SRD).
import { existsSync } from 'node:fs'

for (const dir of ['srd', 'private', 'homebrew']) {
  const p = new URL(`../src/data/${dir}`, import.meta.url)
  console.log(`${existsSync(p) ? 'trovata ' : 'assente '} src/data/${dir}`)
}
console.log('validate:data: nessun dato da validare ancora (schema dallo step 2).')
