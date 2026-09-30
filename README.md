# Personaggi D&D 5.5 (2024) — PWA

App per creare e gestire personaggi di D&D 5.5 (2024), in italiano, offline.

## Requisiti
Node 22 o più recente consigliato (i test con Vitest 5 lo richiedono). `extract:data` e `validate:data` funzionano anche su Node 20.

## Comandi
- `npm run dev` — sviluppo
- `npm run build` — build di produzione (typecheck + Vite + PWA)
- `npm test` — test (Vitest)
- `npm run extract:data` — estrae i dati dai PDF in `docs/rules/` verso `data/private/` (entrambi non tracciati)
- `npm run validate:data` — valida i JSON in `data/` (schema + riferimenti incrociati)

## Struttura
- `src/engine` — motore di regole, senza UI
- `src/store`, `src/db` — stato (Zustand) e persistenza (Dexie)
- `src/ui`, `src/pages` — interfaccia
- `src/i18n/it.json` — tutti i testi
- `data/srd`, `data/private`, `data/homebrew` — dati di gioco
- `docs/rules/` — PDF delle regole (non tracciati)

Vedi `PLAN.md` per gli step, `ARCHITECTURE.md` per le scelte tecniche.

## Dati di gioco (non tracciati)
`data/private/` e `docs/rules/*.pdf` sono ignorati da git. Per rigenerare i dati serve avere i PDF in
`docs/rules/` (o `RULES_DIR=...`), poi `npm run extract:data && npm run validate:data`.
Senza dati l'app parte comunque, con un ruleset vuoto.
