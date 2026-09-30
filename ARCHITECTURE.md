# Architettura (scheletro — si riempie dallo step 2)

- Motore in `src/engine`, puro e testabile, senza dipendenze UI.
- Dati di gioco come JSON validati con Zod.
- Stato: Zustand; persistenza locale: Dexie (IndexedDB).
- PWA con vite-plugin-pwa.
