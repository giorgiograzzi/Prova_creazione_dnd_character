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

## Talenti e background (step 5)
- `feats.json`, `backgrounds.json` da `scripts/extract-step5.ts` (dopo lo step 4). Effetti numerici in `scripts/lib/feat-rules.ts`.
- Prerequisiti dei talenti = lista di condizioni (tutte da soddisfare). Nuovo atomo `trained:<light|medium|heavy|shield>`
  (il contesto delle condizioni riceve `armorTraining`, lo fornirà il motore di creazione).
- Background: `equipment` = `{ A: { items:[{item, qty, note?}], gp }, B: { gp: 50 } }`; `$tool` = strumento scelto,
  `$gaming_set` = un set da gioco a scelta. Strumento a gruppo (`artisan|gaming|musical`) = scelta `<id>_tool` (`source: tools:<gruppo>`).
- Scelte `source` aggiuntive: `skillsTools` (talento Esperto), `freespells` (sempre preparato + 1 lancio gratuito per Riposo Lungo), `resistance`.
- `Character.asi[].cap`: 20 di default, 30 per i Doni epici.

## Specie (step 6)
- `species.json` da `scripts/extract-step6.ts`; effetti in `scripts/lib/species-rules.ts`.
- I tratti hanno `level` di sblocco (livello TOTALE del personaggio). Gli "Usi" del PDF diventano un effetto `resource` sul tratto
  (`pb` = bonus competenza; ricarica `long_rest`, o `short_rest` se "Riposo Breve o Lungo").
- Le opzioni dei lignaggi portano `grantSpell` con `when: level>=3|5`; gli incantesimi di 1° sono `alwaysPrepared` con `freeCast`.
- Scelta `size` generata per Aasimar, Umano, Tiefling. Le scelte "una tra" sono `Choice` con `options`.

## Classi (step 7)
- `classes.json`, `subclasses.json` da `scripts/extract-classes.ts [id,id...]` (unisce con quanto già estratto). Regole in `scripts/lib/class-rules.ts`
  (colonne della tabella, effetti e scelte per privilegio `id` o `id@livello`, regole per sottoclasse).
- Tabella di progressione → `table` (colonne con id = etichetta in snake_case: `ire`, `danno_ira`, `maestria_armi`, `trucchetti`, `preparati`...) e `spellSlots` (20 righe di slot per livello).
- Righe "Usi: <colonna|formula> / Riposo ..." del PDF → effetto `resource` sul privilegio (uso a tabella o formula).
- "Sempre preparati: <incantesimi>" nel privilegio → `grantSpell alwaysPrepared`; "Incantesimi sempre preparati — liv. N: ..." della sottoclasse → `grantSpell` con `when: classLevel:<classe>>=N`.
- Scelte automatiche di classe: `<classe>_skills` (options o `source: skills`), `<classe>_tools`, `<classe>_weapon_mastery`, `<classe>_cantrips`, `<classe>_prepared` con `countFrom`.
- `toolProficiency` (strumenti fissi) vale solo per la prima classe, come TS, armi e armature.

### Classi 7b — novità dello schema
- `pactSlots` (Warlock: `{count, level}` × 20). Sottoclassi: `table`, `caster: third`, `spellAbility`, `spellList`, `spellSlots` (tabelle proprie).
- Elenchi di opzioni: `OptionList` in `class-rules.ts` (Metamagia, Suppliche occulte, Manovre); `Option.cost`, `Option.requires` (livello e invocazione richiesta).
- Un'opzione scelta conta come posseduta per `hasFeature:` (es. `hasFeature:pact_of_the_blade`).
- Le regole possono derivare gli effetti dalla tabella (`effects: (table) => ...`): scaglioni di velocità e dado di Arti marziali del Monaco.
- Armi con filtro nelle competenze di classe: `martial[light]`, `martial[finesse|light]`.

## Correzioni al modello (revisione DATA_TODO)
- **Formato**: costi in monete di rame (1 mo = 100 mr); oggetti speciali nell'equipaggiamento `$tool`, `$gaming_set`, `$instrument`.
- `grantSpell.abilityFrom` = id di una scelta a opzioni di caratteristiche; il motore lo risolve in `ability` (`compute/collect.ts`). `Derived.grantedSpells`.
- `Choice`: `ability` / `abilityFrom` (per gli incantesimi generati dalla scelta), `countFormula`, `filter` ({livello, scuole, rituale, classi, `classFrom`}),
  `group` = scelte alternative (una attiva esclude le altre). Nuove sorgenti: `alwaysspells`.
- `sense.additive`: si somma al senso già posseduto. `grantSkillProficiency.upgradeToExpertise`: Maestria se già competente.
- Talenti: `Character.feats[i].choices` ha la precedenza su `decisions` per quell'acquisizione; un talento non ripetibile conta una volta sola.
- `validate:data` controlla `hasFeature:` / `hasFeat:` in prerequisiti, `requires` e `when`.

## Condizioni (spec 05_conditions.json)
- Dati: `docs/rules/05_conditions.json` → `scripts/extract-conditions.ts` → `data/private/conditions.json` (chiavi in camelCase, caratteristiche in minuscolo).
  Schema `conditionDefSchema`: `grantsConditions` (incluse), `stackable`/`levels`/`removal` (Esaurimento), `requiresSource`, `endConditions`, `escape`, `effects[]` con `type`.
- Tipi di effetto: `own_attack_rolls`, `own_ability_checks`, `initiative_mode`, `saving_throw_mode`, `auto_fail_saving_throw`, `auto_fail_ability_check`,
  `attack_rolls_against_self`, `auto_critical_hit_against_self`, `speed_zero`, `speed_modifier`, `d20_test_modifier`, `death_at_level`, `damage_resistance`,
  `condition_immunity`, `no_actions`, `break_concentration`, `cant_*`, e quelli legati a fonte/movimento/oggetti (restano testo).
- `compute/conditions.ts`: risolve `state.conditions` (+ `state.exhaustion` 0-6) ricorsivamente e senza duplicati, toglie le condizioni a cui si è immuni,
  combina Vantaggio/Svantaggio (si annullano) e restituisce `Derived.conditions`. Applicazioni: bonus d20 di TS, prove e iniziativa (Esaurimento; la Percezione passiva no),
  modi di TS e prove, `autoFail` dei TS, Velocità (0 o -5 ft × livello), resistenza a tutti i danni (`"all"`), azioni negate.
- Un effetto con `when`/`unless` (fonte in vista, attaccante entro 5 ft, ...) non è calcolabile: va in `conditions.situational` come testo, con la fonte da `state.conditionSources`.
