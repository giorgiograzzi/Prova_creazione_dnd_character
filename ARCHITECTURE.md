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

## Incantesimi (step 8)
- `spells.json` (390) e `slotTables.json` (`full_caster` = tabella multiclasse, `half_caster`, `third_caster`) da `scripts/extract-spells.ts`, che si ferma se le liste per classe del PDF non coincidono.
  Scuole: `Evocazione`→`conjuration`, `Invocazione`→`evocation` (come nel PDF). Costi dei materiali in mo (`materialCost`), `materialConsumed`.
- `scripts/lib/spells.ts` `fixSpellModes`: i `grantSpell` dei dati devono riferirsi a incantesimi esistenti; trucchetto ⇔ livello 0. `extract:data` estrae gli incantesimi prima di specie, classi e talenti.
- `src/engine/spells.ts`: `spellsMatching(rs, filter, decisions, list)` e `spellChoiceCandidates(rs, choice, decisions)` per le scelte (`cantrips:<lista>`, `spells:<lista>`, `freespells`, `alwaysspells`, `filter`).
- `compute/slots.ts` → `Derived.spellSlots {casterLevel, slots, used, remaining, pact?}`: una sola classe incantatrice = la sua tabella; più classi = tabella dell'incantatore completo sul livello combinato
  (pieno + metà per eccesso + un terzo per difetto); Warlock a parte (`pactSlots`).

## Equipaggiamento e attacchi (step 9)
- `src/engine/equipment/loadout.ts`: `analyzeLoadout(ch, rs)` → mani occupate (A due mani = 2; Versatile con `grip: "two"` = 2; Lancia da cavaliere in sella = 1; scudo = 1),
  una sola armatura e un solo scudo, stati validi (l'armatura si indossa `worn`, l'arma si impugna `wielded`), sintonia (max 3), peso (oggetti + monete/50) e `problems`.
  `equipItem(ch, rs, itemId, stato, settings, grip?)` cambia stato e dà il tempo: armatura = minuti dai dati (togliendo prima l'altra), scudo = 1 azione,
  arma = 1 azione con `weaponSwap: "house"` (default) oppure gratis con `"official"` (`src/engine/settings.ts`). Se il risultato non è valido il personaggio resta invariato.
- `compute/attacks.ts` → `Derived.attacks` (`AttackOption`): un attacco per ogni arma impugnata, la versione lanciata delle armi Da lancio, la mano secondaria con due armi Leggere e il colpo senz'armi.
  Caratteristica: For (mischia), Des (distanza), migliore tra le due con Accurata, Des con arma da Monaco senza armatura né scudo (Arti marziali), Car per l'arma del patto (`Character.pactWeapon`).
  Tiro per colpire = mod + competenza (`isProficient`: id, categoria o filtro) + `attackBonus` + Esaurimento; Svantaggio da Pesante (For/Des < 13), armatura non addestrata e condizioni.
  Danno = dado (Versatile a due mani) + mod (mano secondaria: no, salvo modificatore negativo o Combattere con due armi) + `damageBonus` (Duellare `!twoHanded && !otherWeapon`, Armi da lancio...) + `critRange`.
  Maestria attiva se l'arma è tra le scelte `weaponMastery` (CD di Rovesciare = 8 + mod + competenza), munizioni disponibili dall'inventario, promemoria, extra di Attacco furtivo.
- `Derived.attacksPerAction` (Attacco extra 2/3/4, colonna del Guerriero) e `Derived.loadout` (mani, armatura, scudo, sintonia, peso, capacità, problemi).
- Condizioni delle regole: `twoHanded`, `otherWeapon` (contesto dell'attacco: `buildCtx(ch, rs, weapon, {twoHanded, otherWeapon})`).

## Motore di creazione (step 10) — `src/engine/creation/`
- **Passi** (`STEPS`): `class`, `background`, `species`, `languages`, `scores`, `alignment`, `details` (l'ordine ufficiale del file 02).
- **Domande**: `allQuestions(ch, rs)` / `availableOptions(step, ch, rs)` → `Question` con chiave (`Character.decisions`), quante opzioni scegliere (`count`, `countFrom`, `countFormula`, extra trucchetti),
  opzioni con `enabled` / `disabledReason` e `selected`, scelte alternative (`group` → `disabled`). Chiavi speciali: `pick:class|species|background`, `subclass:<classe>`, `languages`, `alignment`,
  `equipment:class|background`; i talenti concessi da una scelta hanno le scelte interne sotto `<scelta>/<sotto-scelta>` (due Resiliente non si mescolano).
  Le opzioni di una domanda tengono conto solo di dati fissi e domande PRECEDENTI (due scelte in conflitto: vince la prima). Sorgenti: `skills`, `expertise`, `skillsTools`, `tools:*`, `weaponMastery`,
  `feats:*`, `cantrips:*`, `spells:*`, `freespells`, `alwaysspells`, `languages:standard`, `resistance`. Spiegazioni a parole dei prerequisiti in `describeCondition`.
- **Modifiche**: `previewDecision(ch, rs, chiave, scelte)` → `{ ok, errors, character, removed }`. Non valida = errore e personaggio invariato; valida = personaggio nuovo ripulito + `removed` (scelte annullate a cascata con il motivo).
  L'interfaccia mostra l'avviso e, se l'utente annulla, tiene il personaggio di partenza. `validateDecisions` ripulisce in ordine di passo (classe cambiata, punteggi scesi sotto un prerequisito, ecc.).
- **Punteggi**: `rollAbilityScores(rng)` (4d6 scarta il più basso), `pointBuyCost`, `scoreProblems`, `setBaseScores(ch, rs, metodo, punteggi, rolls?)`, `recommendedArray`. Aumenti: `setAsi(ch, rs, chiave, [{ability, amount}])` con le regole
  in `asiProblems` (background +2/+1 o +1/+1/+1 sulle 3 caratteristiche; Aumento dei punteggi +2 o +1/+1; altri talenti +1 tra quelle elencate; tetto 20, 30 per i Doni epici).
- **Altro**: `creationProgress` (stato dei 7 passi), `classOptions` (multiclasse: 13 richiesto sia dalla nuova classe sia da quelle che hai), `fillHpRolls`, `startingEquipment` (opzioni A/B/C + strumento scelto + monete),
  `startingWealth` (partenza a livello più alto). Dati: `creation.json` da `scripts/extract-creation.ts` (array standard, acquisto a punti, array consigliati, fasce di livello, allineamenti).
- Slot di talento a livello di classe: scelte `asi_<classe>_<livello>` (feats:general) ed `epic_boon_<classe>_<livello>` nei dati dei privilegi.

## Store e salvataggio (step 11) — `src/db/`, `src/store/`
- **Formato**: `characterSchema` (Zod) con `schemaVersion` (`CHARACTER_SCHEMA_VERSION`, oggi 1). `emptyCharacter(id)` crea il personaggio vuoto di partenza.
- **Migrazioni** (`db/migrations.ts`): `MIGRATIONS[n]` porta da n a n+1 su dati grezzi; `migrateCharacter` applica la catena, poi valida con Zod. Errori chiari (versione futura → "aggiorna l'app", passaggio mancante, dati non validi). Per cambiare il formato: alzare la versione e aggiungere il passaggio.
- **Persistenza** (`db/repo.ts`, Dexie/IndexedDB): tabelle `characters` (dati scritti così come sono, migrati in lettura) e `settings`. Un personaggio illeggibile dà errore solo su di lui, l'elenco resta intero.
- **Backup** (`db/backup.ts`): contenitore `{format, version, exportedAt, characters, settings?}`. `previewImport` classifica ogni personaggio: `new`, `same`, `conflict`, `invalid` (con motivo); accetta anche un personaggio singolo. `applyImport` con risoluzione per conflitto: `copy` (default, nuovo id), `replace`, `skip`. Non sovrascrive mai senza scelta esplicita.
- **Store** (`store/app.ts`, Zustand vanilla, iniettabili repo/scheduler/orologio): `update(fn)` → stato `pending` → salvataggio automatico dopo 800 ms di pausa (una sola scrittura per raffica); `flush()` salva subito (usato prima di cambiare/esportare); `saveStatus` = saved | pending | saving | error.
- **Impostazioni** (`store/settings.ts`): `AppSettings` = regole (`weaponSwap`) + `backupReminderDays` (30, 0 = spento) + `lastBackupAt`; `normalizeSettings` tollerante, `backupDue` per il promemoria.
- Test con `fake-indexeddb`: migrazioni, CRUD, round-trip export/import, conflitti, autosave, errore di scrittura.

## Interfaccia e tema (step 12) — `src/ui/`, `src/pages/`
- **Tema XP** (`ui/xp/xp.css`): colori come variabili CSS (`--xp-*`), Tahoma con fallback, testo ≥16px, bersagli ≥48px (`--tap`), safe area, `prefers-reduced-motion`, niente glow/brightness. `contrast.test.ts` legge il CSS e verifica i contrasti WCAG AA (4.5), il minimo 16px/48px e l'assenza di effetti vietati.
- **Componenti** (`ui/xp/index.tsx`): `Button` (primary/danger), `Field`, `Segmented`, `Check`, `TabBar`, `Dialog`; icone SVG originali in `icons.tsx`. Hook `useApp(selettore)` sullo store (selettori singoli, mai oggetti nuovi: con Zustand 5 causerebbero loop).
- **Struttura**: barra del titolo (nome personaggio, stato di salvataggio, menu ☰ → Impostazioni / Esporta / Importa), corpo, tab bar in basso (Eroi, Scheda, Equip, Magie, Homebrew; Scheda/Equip/Magie disattivate senza personaggio aperto).
- **Mano di gioco** (`AppSettings.hand`): la classe `hand-left|center|right` sulla radice sposta i comandi principali (`.xp-actions`).
- **Impostazioni**: mano, cambio arma, rifare i tiri (`allowReroll`, usato dal wizard), promemoria backup, Esporta ora / Importa con anteprima e scelta sui conflitti (`ImportDialog`).
- Il salvataggio parte anche su `visibilitychange`/`pagehide`. Testi in `i18n/it.json`.

## Wizard di creazione (step 13) — `src/wizard/`, `src/pages/Sheet.tsx`
- **Logica senza interfaccia** (`wizard/logic.ts`, testata): `togglePick` (scelta singola/multipla; oltre il massimo esce la più vecchia), `choose` (= `previewDecision`), punteggi (`startScores`, `chooseMethod`, `rerollScores`, `swapScore`, `stepPointBuy`, `applyAsiDraft`), chiusura (`finalizeCharacter`, `isFinalized`, `reopenCreation`), `autoComplete` (solo test).
- **Passi**: 7 passi ufficiali + Riepilogo; i pulsanti numerati in alto sono liberi di navigare e mostrano ✓ dei passi completi, sotto la barra di avanzamento. `creationProgress` dice cosa manca.
- **Domande** (`QuestionView`): opzioni toccabili (radio/checkbox ≥48px); quelle escluse restano visibili, barrate, con il motivo; ricerca se >12 opzioni. **Aumenti di caratteristica** (`AsiView`): bozza 0/+1/+2 per caratteristica, "Applica" attivo solo se le regole della fonte sono rispettate (l'errore è mostrato).
- **Cascata**: se una scelta annulla altre (`removed`), un dialogo elenca cosa verrebbe tolto e perché; "Annulla" mantiene il personaggio di partenza.
- **Punteggi** (`ScoresStep`): array standard (parte dal consigliato per la classe; scegliendo un valore già usato i due si scambiano), tiro 4d6 (una volta sola; rifare solo se attivo in Impostazioni), acquisto a punti (+/− nel budget), manuale. Mostra base, totale con i bonus e modificatore.
- **Chiusura**: `finalizeCharacter` richiede tutti i passi completi, applica PF a media (primo livello al massimo), equipaggiamento e monete iniziali (`startingEquipment`; set da gioco se richiesto), PF attuali al massimo. Creazione "chiusa" = la prima classe ha `hpRolls`. "Modifica la creazione" la riapre (equipaggiamento e PF si rifanno alla nuova chiusura).
- **Dati**: `data/ruleset.ts` costruisce una volta il `Ruleset` da `data/**` (senza `data/private` l'app mostra l'avviso e resta utilizzabile).

## Scheda giocabile (step 14) — `src/engine/play/`, `src/sheet/`
- **Motore di gioco** (`engine/play`, testato): `applyDamage` (PF temporanei per primi; a 0 PF privo di sensi; già a 0 PF ogni colpo è una salvezza fallita, 2 se critico; danno rimasto ≥ PF massimi = morte istantanea), `applyHealing` (torna sopra 0: azzera le salvezze e toglie il privo di sensi *messo dai 0 PF*, non quello messo a mano), `setTempHp` (non si sommano), `deathSave(natural)` (20 = 1 PF, 1 = 2 fallimenti, ≥10 successo), `stabilize`, `isDying/isStable/isDead`.
- **Riposi**: `spendHitDie` (tiro + mod Cos, min 0; il contatore `hitDiceUsed` è unico e si spende dal dado più grande), `shortRest` (risorse `short_rest` e slot del Patto), `longRest` (PF al massimo, PF temp a 0, metà dei Dadi Vita min 1, tutte le risorse e gli slot, −1 Esaurimento, salvezze azzerate).
- **Stato**: `setCondition` (l'Esaurimento a livelli con `setExhaustion`; le condizioni con fonte ricordano chi le causa), `useResource`, `toggleSlot`, `setCoins`, `setInspiration`, `setOverride` (solo `ac`, `hp.max`, `initiative`, `speed.walk`, `passivePerception`). **Dadi** (`rollD20` con vantaggio/svantaggio, `rollExpr` con dadi doppi sul critico) con `rng` iniettabile.
- **Interfaccia** (`sheet/`): 5 sezioni (Stato, Statistiche, Attacchi, Condizioni, Altro). Ogni numero toccabile mostra "da dove viene" (`SourcesDialog`, con valore forzato rimovibile); i tiri (`RollDialog`) partono con il vantaggio/svantaggio calcolato dal motore (e il motivo), modificabile a mano. Tutto lo stato si salva con l'autosalvataggio.
- **Limiti noti**: incantesimi e uso degli slot per lanciare arrivano allo step 16 (qui solo i contatori); privilegi con testo, attivabili e contatori generici allo step 14b; con più classi il Dado Vita speso è sempre quello più grande rimasto.

### Popup in stile MS-DOS / Windows 95
- Tutti i popup (`Dialog`) sono finestre "Prompt di MS-DOS" di Windows 95: cornice grigia in rilievo, barra del titolo blu con icona del prompt e pulsanti `_ □ ×` (solo × funziona; Esc chiude), corpo nero in monospazio, pulsanti `[ Testo ]` (primario in negativo, pericolo in rosso). Il menu ☰ resta in stile XP. I colori sono token `--dos-*` in `xp.css`, verificati da `contrast.test.ts` (AA 4.5). Il resto dell'app resta in stile XP.

## Privilegi giocabili (step 14b)
- **Schema**: ogni privilegio/tratto/talento può avere `usage` (`uses` numero, formula o tabella + `recharge`: diventa una risorsa con lo **stesso id del privilegio**) e `activation` (`resource` consumata, `requires` condizione per attivarlo, `label`/`options` per la scelta all'attivazione, `duration` solo testo). Stato salvato in `Character.state.active` (id → scelte).
- **Condizioni nuove**: `active:<id>` (privilegio attivo) e `attackAbility:<car>` (caratteristica usata dall'attacco: l'Ira dà il bonus solo con la Forza). Gli effetti di un privilegio attivabile si scrivono con `when: "active:<id>"`; quelli dell'opzione scelta all'attivazione valgono solo mentre è attivo. `restriction` con `forbids: "spellcasting"` blocca gli incantesimi (`Derived.spellcastingBlocked`).
- **Motore**: `Derived.featureList` (id, nome, descrizione, tipo, fonte, livello, `resourceId`, attivazione, stato). `setActive(ch, rs, d, id, on, picks)` controlla i requisiti, chiede la scelta, consuma l'uso e salva lo stato; spegnere non restituisce l'uso; un riposo (breve o lungo) spegne tutti gli stati attivi. Un modificatore negativo non dà usi negativi.
- **Dati** (`scripts/lib/feature-play.ts`, `scripts/extract-features.ts`, ultimo passo prima di `extract-creation`): `deriveUsage` ricava i contatori dal testo dei riepiloghi (solo formule esplicite) e `ACTIVATIONS` descrive gli stati attivabili curati. L'estrazione fallisce se un'attivazione dichiarata non trova il suo privilegio.
- **Interfaccia** (`sheet/FeaturesTab`): elenco con filtri per fonte (Specie, Classe, Sottoclasse, Talento), livello e ricerca; descrizione espandibile, contatore Usa/+ e Attiva/Termina; le scelte all'attivazione si fanno in un popup. Gli attivi stanno in cima.
- Corretto un errore dell'estrazione delle specie (step 6): il primo tratto aveva nel nome l'intestazione "Tratto Livello Effetto".
- **Navigazione della scheda**: con la scheda giocabile aperta, la barra in basso mostra le sue sezioni (Stato, Privilegi, Statistiche, Attacchi, Condizioni, Altro) al posto delle tab principali, solo icone su una riga (nome in `aria-label`, e nella riga sotto il titolo), con la freccia indietro che riporta al menu principale (tab Eroi). Lo stato della sezione sta in `App` (`section`); il wizard di creazione tiene invece la barra principale.

## Tab Equip (step 15) — `src/pages/Equip.tsx`, `src/engine/equipment/inventory.ts`
- **Motore** (testato): `payCoins` (paga con le monete più grandi che ci stanno; se serve spezza la più piccola che basta e dà il resto in oro/argento/rame; il totale scende sempre esattamente del costo), `buyItem`, `addItem`, `setQty` (a 0 l'oggetto esce), `setAttuned` (solo dove serve, max 3), `shopCatalog` (tutto ciò che ha un costo), `formatCost` (mo/ma/mr). Costi in monete di rame, come nei dati. **Niente vendita**: nei dati non c'è una regola.
- **Interfaccia**: riepilogo (CA spiegabile, mani, peso/capacità, sintonia) e avvisi di `analyzeLoadout`; attacchi con tiro (stesso popup della scheda, `AttackRollDialog`); zaino con Impugna/Riponi, Indossa/Togli, 1 o 2 mani per le armi Versatili, sintonia, quantità ± ed elimina; l'esito di `equipItem` mostra il costo (tempo o azione, secondo la regola di cambio arma scelta nelle Impostazioni) o il motivo del rifiuto. Il negozio è un popup con filtro per tipo, ricerca e "Compra" (attivo solo se hai le monete). CA e attacchi si ricalcolano subito perché derivano dallo stato dell'inventario.
- **Navigazione (aggiornata)**: Equip e Magie riguardano un personaggio, quindi sono **sezioni della scheda** (non tab principali, dove aprivano "un personaggio a caso"). Le tab principali sono solo Eroi e Homebrew; un personaggio si apre dalla lista Eroi. Barra della scheda: ← indietro, Stato, Privilegi, Statistiche, Attacchi, Equip, Magie, Altro (8 icone da ≥48px). **Condizioni** non ha icona: si apre dalla tessera "Condizioni" di Stato (con "← Stato" per tornare, e Stato resta evidenziato).

## Magie (step 16) — `src/engine/magic/`, `src/sheet/MagicTab.tsx`
- **Fonte delle regole**: file 04 §1 (regole di lancio, recuperi, preparazione, concentrazione), non il manuale.
- **Registro** (`spellbook`): unisce le scelte di classe e sottoclasse (trucchetti, preparati, libro del Mago) con `Derived.grantedSpells` (sempre preparati, a volontà, lanci gratuiti); ogni incantesimo ha le sue fonti (`cantrip | prepared | always | book | granted`) con caratteristica, CD e attacco. Gli incantesimi scelti in classe compaiono anche tra i `grantSpell` "known": si contano una volta sola. `castable` = non solo nel libro; `ritualOk` = preparato oppure nel libro del Mago.
- **Lancio** (`castSpell`, modo `slot | pact | free | ritual | cantrip`): slot di livello ≥ incantesimo (livello superiore: la voce "Livelli superiori" come nota), slot del Patto tutti dello stesso livello (`state.pactUsed`), lanci gratuiti (risorsa `spell:<id>` in `Derived.resources`, ricarica col riposo indicato), rituale (+10 minuti, nessuno slot, non potenziabile). Blocchi: armatura senza addestramento, Ira, azioni bloccate, morte. Una nuova Concentrazione termina la precedente (`state.concentration`).
- **Concentrazione**: `concentrationDc(danno)` = 10 o metà (il più alto), max 30; alla scheda Stato, dopo un danno, compare il promemoria del TS (con Vantaggio per Incantatore da guerra); a 0 PF o morto termina da sola (`concentrationBroken`: Incapacitato o morto).
- **Recuperi**: `recoverSlots` (Recupero arcano/naturale: totale livelli ≤ metà del livello di classe per eccesso, niente 6°+, un uso), `magicalCunning` (metà degli slot del Patto, tutti al 20°). Un riposo breve ridà gli slot del Patto; il lungo tutti gli slot; entrambi terminano la Concentrazione.
- **Preparazione**: le stesse domande della creazione (`<classe>_prepared`, `_cantrips`, `_spellbook`) con `choose`, quindi numero e livelli degli slot sono controllati dallo stesso motore; il popup mostra quando cambiano i preparati e il focus della classe (tabella del file 04). `spellcasting` ora include anche i terzi incantatori (Cavaliere mistico: Intelligenza).
- **Interfaccia**: sezione Magie della scheda: CD e attacco (con le fonti), slot e Patto, filtri (Preparati, Rituali, Concentrazione) e ricerca, elenco per livello, popup dell'incantesimo con i dettagli e i modi di lancio disponibili.

## Avanzamento di livello (step 17) — `src/engine/levelup/`, `src/sheet/LevelUpDialog.tsx`
- **Regole** (file 02 §7-§8): +1 Dado Vita e PF (tiro o valore fisso d6=4, d8=5, d10=6, d12=7 + mod Cos, minimo 1 per livello), privilegi del nuovo livello di classe, sottoclasse al livello indicato dalla classe, Aumento dei punteggi ai livelli previsti (4, 8, 12, 16; Guerriero anche 6 e 14; Ladro anche 10) e Dono epico al 19°, bonus di competenza dal **livello totale**, massimo 20. Multiclasse: 13 nella caratteristica primaria della classe attuale E della nuova; livelli in altre classi sempre tiro o valore fisso (mai il massimo).
- **Motore**: `levelUpOptions` (classi che hai e nuove, con il motivo se bloccate), `levelUp(ch, rs, classId, "avg" | tiro)` → anteprima (personaggio con il livello applicato, PF guadagnati, PB prima/dopo, nuovi privilegi, scelte da fare `pending`), `rollHitDie`, `levelFromXp`/`xpForLevel` (PX dalla tabella del file 02, in `creation.xpThresholds`). Il PF attuale sale dei PF guadagnati. `Character.xp` è opzionale.
- **Competenze multiclasse**: `ClassDef.multiclass` (dalla riga "Ottieni" del file 01: armi, armature, abilità e strumenti a scelta, strumenti fissi). `computeProfs` le applica alle classi dopo la prima (niente TS della nuova classe) e `collectSlots` chiede solo le abilità/strumenti previsti (spesso nessuno).
- **Mente di ferro** (Cacciatore delle tenebre): scelta Saggezza / Intelligenza / Carisma; la condizione `saveProficient:<car>` (TS già dato dalla classe di partenza) abilita Saggezza solo se non ce l'hai, le altre due solo se ce l'hai già.
- **Aumenti di caratteristica in ordine cronologico**: il background viene per primo, poi quelli di livello; il tetto (20) si controlla su base + aumenti scelti (`asiScores`), non sugli effetti dei privilegi (es. Campione primevo al 20°), quindi salire di livello non invalida più l'aumento del background.
- **Interfaccia** (Altro → Avanzamento): livello totale, PX (opzionale) con il livello raggiunto, e "Sali di livello": popup in 3 passi (classe con i requisiti del multiclasse spiegati; PF a valore fisso o tiro con l'anteprima; novità: nuovi privilegi, PB, scelte da fare con gli stessi componenti del wizard). Si lavora su una copia e si applica solo con "Conferma".
