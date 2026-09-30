# Personaggi D&D 5.5 (2024) — PWA

App per creare e gestire personaggi di D&D 5.5 (2024), in italiano, offline.

## Requisiti
Node 22 o più recente consigliato (i test con Vitest 5 lo richiedono). `extract:data` e `validate:data` funzionano anche su Node 20.

## Comandi
- `npm run dev` — sviluppo
- `npm run build` — build di produzione (typecheck + Vite + PWA)
- `npm test` — test (Vitest)
- `npm run extract:data` — estrae i dati dai PDF in `docs/rules/` (PDF 01-05 e `05_conditions.json`) verso `data/private/` (entrambi non tracciati)
- `npm run validate:data` — valida i JSON in `data/` (schema + riferimenti incrociati)

## Struttura
- `src/engine` — motore di regole, senza UI
- `src/store`, `src/db` — stato (Zustand) e persistenza (Dexie)
- `src/ui`, `src/pages` — interfaccia
- `src/i18n/it.json` — tutti i testi
- `data/srd`, `data/private` — dati di gioco
- `data/homebrew` — pacchetti di esempio e modello per l'homebrew (non sono dati di gioco: si importano dall'app)
- `docs/rules/` — PDF delle regole (non tracciati)

## Uso sul server
Dopo un aggiornamento: `git pull origin <branch> && npm run extract:data && npm run build && npx vite preview --host --port 4173`
(`extract:data` solo se cambiano i PDF/estrattori). Per lasciarlo acceso a terminale chiuso:
`nohup npx vite preview --host --port 4173 > ~/preview.log 2>&1 &` (si ferma con `pkill -f "[v]ite preview"`).
Apri `http://<ip-del-server>:4173` dal telefono **sulla stessa rete** (Wi-Fi) o via Tailscale; con il 4G l'indirizzo di casa non si raggiunge.
Con la PWA in Home, dopo un aggiornamento importante chiudi e riapri l'app (se resta bianca: rimuovi l'icona e riaggiungila da Safari).

## Homebrew
Tab **Homebrew**: armi, armature, oggetti, talenti (con catalogo di effetti) e incantesimi tuoi; attiva/disattiva, duplica, modifica, elimina; "Dai al personaggio"; negozio con filtro Homebrew;
export/import di pacchetti `.json` versionati. Esempi e modello commentato in `data/homebrew/`. Le voci stanno nel browser: per spostarle usa Esporta pacchetto.

Vedi `PLAN.md` per gli step, `ARCHITECTURE.md` per le scelte tecniche.

## Dati di gioco (non tracciati)
`data/private/` e `docs/rules/*.pdf` sono ignorati da git. Per rigenerare i dati serve avere i PDF in
`docs/rules/` (o `RULES_DIR=...`), poi `npm run extract:data && npm run validate:data`.
Senza dati l'app parte comunque, con un ruleset vuoto.
