# Architettura

Documento da tenere aggiornato a ogni step.

## Struttura

- `src/engine/`: motore di regole in TypeScript puro (nessuna dipendenza da UI). Sottocartelle: `schema/` (Zod), `compute/` (derivati), `creation/` (wizard), `levelup/`, `equipment/`, `homebrew/`.
- `src/data/`: regole e contenuti come JSON, separati dal codice. Ufficiale e homebrew usano lo stesso formato e lo stesso schema.
- `src/store/`: Zustand + persistenza Dexie (IndexedDB) + migrazioni.
- `src/ui/`: componenti tema XP (`xp/`), schermate (`screens/`), wizard (`wizard/`).
- `src/i18n/it.json`: tutti i testi dell'interfaccia. Gli id dei dati sono in inglese.

## Principi

- Il personaggio salva solo le **decisioni**; ogni valore derivato è ricalcolato da `computeCharacter(character, ruleset)`, funzione pura che restituisce anche le `sources` di ogni numero.
- `classes[]` è già un array per permettere il multiclasse in v2.

## Da completare

Modello dati, sistema di effetti e pipeline di calcolo: step 2-3.
