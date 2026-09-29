# Schede D&D 5.5

PWA mobile-first, per uso personale (una persona, nessun account, nessun server) per creare e giocare personaggi di D&D 5.5 (regole 2024). Stato del lavoro: vedi `PLAN.md`.

## Sviluppo

```bash
npm install
npm run dev            # server di sviluppo Vite
npm test               # test del motore (Vitest)
npm run typecheck      # TypeScript strict
npm run validate:data  # schema e riferimenti dei dati (dallo step 4)
npm run build          # build di produzione in dist/
```

## Regole e dati

- Le regole si leggono da `docs/rules/` (PDF, **non tracciati da git**; vedi `.gitignore`).
- `src/data/srd/`: contenuti SRD 5.2 (CC-BY 4.0), pubblicabili. Attribuzione in `ATTRIBUTION.md`.
- `src/data/private/`: meccaniche estratte dal manuale italiano. **Gitignorata**; l'app funziona anche senza.
- `src/data/homebrew/`: esempi e template.

## Deploy Docker e installazione PWA sul telefono

Da scrivere agli step 19-20.
