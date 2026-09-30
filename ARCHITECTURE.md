# Architettura

- Motore in `src/engine`, puro e testabile, senza dipendenze UI.
- Dati di gioco come JSON validati con Zod (`src/engine/schema/`).
- Stato: Zustand; persistenza locale: Dexie (IndexedDB). PWA con vite-plugin-pwa.
- Il personaggio salva solo scelte e stato; ogni numero è derivato dal motore con le sue fonti.

## Schema dati (step 2)

File in `src/engine/schema/`:

| File | Contenuto |
|---|---|
| `primitives.ts` | id snake_case inglese (uguale ai PDF), caratteristiche, abilità, testo `{it, en?}`, `SCHEMA_VERSION` |
| `formula.ts` | parser di formule: `pb`, `level`, `mod:wis`, `classLevel:fighter`, `+ - *`, `max/min/floor` |
| `condition.ts` | parser di condizioni (vedi sotto) |
| `effect.ts` | unione discriminata `Effect` (campo `op`) |
| `choice.ts` | `Choice` e `Option` |
| `content.ts` | specie, background, classe, sottoclasse, talento, arma, armatura, oggetto, incantesimo, pacchetto homebrew |

### Condizioni
Stringhe con `&&`, `||`, `!`. Atomi: `wearingArmor:none|light|medium|heavy|any`, `shield`,
`equipped:<id>`, `weaponProperty:<prop>`, `attackType:melee|ranged`, `hasFeature:<id>`, `hasFeat:<id>`,
`level>=N`, `classLevel:<classe>>=N`, `ability:<car>>=N` (operatori `>= <= == > <`).
Esempio: `wearingArmor:none && !shield`.

### Effetti (`op`)
Corrispondono alle operazioni del file "Modificatori" §6. Ogni effetto ha `when` opzionale.

- Difese e sensi: `resistance`, `sense`, `saveAdvantage`
- Movimento e PF: `setSpeed`, `speedBonus`, `hpMaxPerLevel`, `hpMaxBonus`
- CA e combattimento: `acFormula`, `acBonus`, `attackBonus`, `damageBonus`, `critRange`, `unarmedDie`
- Bonus: `initiativeBonus`, `saveBonus`, `checkBonus`
- Competenze: `grantSkillProficiency` (con `expertise`), `grantSaveProficiency`, `grantWeaponProficiency`, `grantToolProficiency`, `grantArmorTraining`
- Caratteristiche: `abilityScoreIncrease` (con `cap`: 20, 30 Doni epici, 25 capstone)
- Magia: `grantSpell` (`cantrip|alwaysPrepared|known`, lancio gratuito opzionale), `extraCantrips`
- Concessioni: `grantFeature`, `grantFeat`, `grantEquipment`
- Vincoli: `prerequisite`, `restriction`
- Risorse: `resource` (usi numero, formula o tabella 1-20; ricarica `short_rest|long_rest|dawn|none`; `partialShortRest`)

I valori sono numeri o formule. Un valore può essere fissato da una scelta del giocatore (`Choice`).

### Scelte
`Choice { id, label, count, options | source, group?, distinct, when? }`.
`group` = "una tra" (lignaggio, ascendenza, ordine...): sceglierne una esclude le altre.
`source` = insieme preso dai dati (es. `skills`). `Option.requires` = opzione visibile ma disattivata con motivo.

### Ruleset
`buildRuleset(files)` valida ogni voce; le voci non valide finiscono in `errors` e non fermano l'app.
Se `data/private/` manca il ruleset è semplicemente più piccolo. I file dati hanno forma
`{ "kind": "weapons", "entries": [...] }`. `src/data/loadRuleset.ts` legge `data/**/*.json` con Vite.

### Homebrew
`homebrewPackSchema`: `{ schemaVersion, name, weapons, armors, items, feats, spells }`.
