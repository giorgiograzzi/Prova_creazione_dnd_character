# Personaggi D&D 5.5 (2024) — PWA

App per creare e gestire personaggi di D&D 5.5 (2024), in italiano, offline.

## Comandi
- `npm run dev` — sviluppo
- `npm run build` — build di produzione (typecheck + Vite + PWA)
- `npm test` — test (Vitest)
- `npm run validate:data` — validazione dati (attivo dallo step 4)

## Struttura
- `src/engine` — motore di regole, senza UI
- `src/store`, `src/db` — stato (Zustand) e persistenza (Dexie)
- `src/ui`, `src/pages` — interfaccia
- `src/i18n/it.json` — tutti i testi
- `data/srd`, `data/private`, `data/homebrew` — dati di gioco
- `docs/rules/` — PDF delle regole (non tracciati)

Vedi `PLAN.md` per gli step, `ARCHITECTURE.md` per le scelte tecniche.
