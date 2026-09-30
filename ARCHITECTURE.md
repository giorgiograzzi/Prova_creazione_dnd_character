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

## Motore di calcolo (step 3) — `src/engine/compute/`

`computeCharacter(character, ruleset) → Derived`. Ogni numero è un `Sourced` (`value` + `sources`: "da dove viene").

| File | Ruolo |
|---|---|
| `collect.ts` | raccoglie gli effetti di specie (tratti per livello TOTALE), background, classi/sottoclassi (per livello di classe), talenti e scelte del giocatore |
| `context.ts` | punteggi finali (base + `asi` + effetti, tetto 20/30/25), armatura/scudo indossati, effetti attivi (condizione `when` vera) |
| `condition-eval.ts`, `formula-eval.ts` | valutano condizioni e formule (arrotondamento per difetto) |
| `proficiencies.ts` | TS e armature/armi solo dalla PRIMA classe, background, effetti |
| `rolls.ts` | TS e abilità (competenza/maestria/Factotum), vantaggio e svantaggio che si annullano |
| `hp.ts`, `ac.ts`, `speed.ts`, `resources.ts` | PF, CA (una sola formula, la migliore), velocità/sensi/resistenze, risorse |
| `testkit.ts` | mini-ruleset in memoria per i test (i dati veri arrivano con gli step 4-7) |

Convenzioni:
- **Scelte con `source`**: gli id scelti diventano effetti (`skills`→competenza, `expertise`→maestria, `tools:*`, `weapons:*`, `cantrips:*`, `spells:*`, `feats:*`). Gli `id` delle scelte devono essere univoci (chiave di `Character.decisions`).
- **Id noti al motore**: privilegio `jack_of_all_trades` (Factotum), talento `medium_armor_master` (Des max 3 se Des ≥ 16).
- **PF**: `hpRolls[i]` = livello i+1 della classe (numero tirato o `"avg"`); per la prima classe l'indice 0 è ignorato (dado massimo).
- **Armatura**: `dexCap` null = nessun limite, 0 = nessun bonus Des. Senza addestramento: CA sì, svantaggio a For/Des, niente incantesimi, avviso; scudo senza addestramento: nessun bonus.
- **Valori forzati** (`Character.overrides`): `ac`, `hp.max`, `initiative`, `passivePerception`, `speed.walk`; restano visibili come prima fonte.
- Le condizioni sull'arma (`equipped`, `weaponProperty`, `attackType`) sono false qui: si valutano allo step 9 con `buildCtx(ch, rs, weapon)`.
- Fuori dallo step 3: attacchi per arma (9), slot degli incantesimi (16), multiclasse: competenze parziali (17).

## Dati (step 4)
- Tutto in `data/private/*.json` (non tracciato), forma `{ "kind", "entries" }`. Generato da `scripts/extract-data.ts`
  leggendo `docs/rules/01_Dati_Gioco_DnD2024.pdf`; `npm run validate:data` controlla schema e riferimenti
  (`src/engine/validate.ts`: maestrie, proprietà, tipi di danno, contenuto delle dotazioni).
- Kind: `weapons`, `armors`, `tools`, `items` (gear, munizioni, dotazioni con `contents`), e glossario con `termSchema`:
  `skills`, `languages`, `sizes`, `damageTypes`, `conditions`, `weaponProperties`, `masteries`, `coins`.
- `Ruleset` è derivato da `KINDS` in `ruleset.ts`: aggiungere un tipo di dato = una riga lì.
- I test su dati privati (`data.private.test.ts`) si saltano se `data/private` non esiste.
