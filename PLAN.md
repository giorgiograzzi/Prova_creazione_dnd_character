# PLAN.md — PWA Personaggi D&D 5.5 (2024)

Stato: **BOZZA, in attesa di conferma di Giorgio.** Nessun codice scritto.

## 0. Cosa ho trovato nei documenti delle regole

Cartella `data/rules/` (NON `docs/rules/` come da brief):

| File | Pag. | Contenuto |
|---|---|---|
| `01_Dati_Gioco_DnD2024.pdf` | 64 | Abilità, linguaggi, PX/competenza, 9 specie, 16 background, 12 classi con tabelle 1-20 e sottoclassi, talenti (origine/generali/stili/doni epici), armi + maestrie, armature, strumenti, equipaggiamento, dotazioni, monete. Descrizioni già riassunte, ogni voce ha l'id inglese. |
| `02_Regole_Creazione_Personaggio.pdf` | 5 | Ordine di creazione, generazione punteggi, formule (PF, CA, attacco, CD...), equipaggiamento iniziale, livello iniziale > 1, multiclasse. |
| `03_Modificatori_Scelte_e_Tiri.pdf` | 6 | Grafo delle dipendenze, scelte → effetti, formule CA, attacco/danno, vincoli ed esclusioni, elenco delle `op` degli effetti. **Base diretta per lo schema effetti.** |

Note sul metodo: i PDF sono generati con testo incorporato; li estraggo con uno script mio (nessun lettore PDF installato). Le regole le leggo da lì.

### Cosa manca o non torna (da decidere, una cosa alla volta)

1. **SRD 5.2 (`IT_SRD_CC_v5.2.1.pdf`) non c'è più**: è stato cancellato dalla repo (commit `b9aa9a3`). Senza non posso né leggere la dicitura di attribuzione CC-BY per `ATTRIBUTION.md` né estrarre gli **incantesimi**.
2. **Incantesimi: non ci sono i dati.** Il file 01 li esclude ("solo nomi dove servono"). Mancano: descrizioni, scuola, livello, gittata, componenti, durata, liste per classe. Serve una fonte (SRD o manuale).
3. **Manuale del giocatore italiano**: non presente (solo i 3 riepiloghi). Per condizioni ed Esaurimento (effetti), Morte/salvezze, riposi, tempi di cambio arma, oggetti magici, Doni epici, invocazioni del Warlock: dove il file 01 non dà i numeri li marco `needsReview` in `DATA_TODO.md`, non li invento.
4. **Percorso**: brief dice `docs/rules/`, i file sono in `data/rules/`. Propongo di spostarli in `docs/rules/` e metterli in `.gitignore` (già tracciati: vanno tolti dall'indice; restano nella cronologia git).
5. Il file 03 dice che "cambiare arma costa 1 azione" è già la regola della casa scelta; il default ufficiale (estrarre/riporre come parte dell'attacco) resta in Impostazioni come da brief.
6. Porta Docker (`PORT`): chiedo prima di fissare il default (step 19).

## Convenzioni valide per tutti gli step

- Ogni step si chiude con: `npm test` verde, commit chiaro, riepilogo breve, `PLAN.md` aggiornato.
- Step dati: `npm run validate:data` verde + controllo a campione ≥10 voci col manuale + dubbi in `DATA_TODO.md` (`"needsReview": true`).
- File < ~300 righe, commenti in italiano con riferimento pagina dove serve.
- Motore in `src/engine` senza dipendenze UI. Testi in `src/i18n/it.json`.

## Step

### 1. Setup progetto
- **Obiettivo**: scheletro Vite + React + TS strict, Zustand, Dexie, Zod, Vitest, vite-plugin-pwa (config base), struttura cartelle, `.gitignore` (private/, docs/rules/*.pdf), spostamento dei PDF, `README.md`/`ARCHITECTURE.md`/`DATA_TODO.md` scheletro, `ATTRIBUTION.md` provvisorio.
- **File**: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/**` (vuote), `.gitignore`, doc.
- **Fatto**: `npm run dev/build/test` funzionano; niente contenuto protetto tracciato.

### 2. Schema dati ed effetti (`types.ts`, `schema/`)
- **Obiettivo**: tipi `Character`, `Effect`, `Condition`, `Choice`, `Option`; schemi Zod per specie, background, classe, sottoclasse, talento, arma, armatura, oggetto, incantesimo, homebrew (con `schemaVersion`); parser delle condizioni (`equipped:`, `wearingArmor:`, `weaponProperty:`, `hasFeature:`, `level>=N`...); effetti minimi del brief (le `op` del file 03: modifier, grantProficiency, grantFeature/Feat/Spell/Equipment, setSpeed, grantSense, grantResistance, acFormula, abilityScoreIncrease, prerequisite/restriction, risorse con ricarica). Loader del ruleset tollerante se `private/` manca.
- **Fatto**: schema documentato in `ARCHITECTURE.md`; test di validazione su esempi minimi; **schema effetti da te approvato prima di andare avanti.**

### 3. Motore di calcolo base (`compute/`)
- **Obiettivo**: `computeCharacter(char, ruleset) → Derived` con `sources`: modificatori, bonus competenza, TS, abilità (competenza/maestria/Factotum), iniziativa, percezione passiva, PF max, dadi vita, velocità, sensi, CA (tutte le formule, miglior formula), risorse (usi = pb ecc.), vantaggio/svantaggio che si annullano.
- **File**: `compute/*.ts` piccoli (`abilities`, `proficiency`, `hp`, `ac`, `speed`, `resources`, `effects`), test.
- **Fatto**: test unitari verdi su tutte le formule del file 02 §5 e 03 §4; ogni numero ha le fonti.

### 4. Dati cap. A — Fondamenti, armi, armature, strumenti, equipaggiamento
- **Obiettivo**: abilità, linguaggi, taglie, danni, condizioni (nomi), 37 armi con proprietà e maestrie (8 proprietà di maestria + regole proprietà), armature e scudo, strumenti, oggetti, dotazioni, monete. Parte SRD-compatibile in `data/srd/`, il resto in `data/private/`.
- **Fatto**: `validate:data` (schema + riferimenti incrociati), 10 voci verificate, esito riportato.

### 5. Dati cap. B — Talenti e background
- 16 background (3 caratteristiche, talento, abilità, strumento, kit A/B), talenti origine/generali/stili/doni epici con prerequisiti e ripetibilità.
- **Fatto**: come step 4.

### 6. Dati cap. C — Specie
- 9 specie con scelte interne (ascendenza, lignaggio, retaggio, taglia, caratteristica incantatore) e tratti sbloccati a livello 3/5.
- **Fatto**: come step 4.

### 7. Dati cap. D — Classi (in due batch: 7a Barbaro→Druido, 7b Guerriero→Mago)
- Tabelle 1-20 (PF, privilegi, colonne, slot), scelte al 1° livello, equipaggiamento A/B(/C), sottoclassi, multiclasse (solo annotato).
- **Fatto**: come step 4 per ciascun batch.

### 8. Dati cap. E — Incantesimi (BLOCCATO da punti 1-2)
- Elenco, livello, scuola, lista di classe, testo breve. **Serve la fonte**; fino ad allora solo gli id citati nei dati (validati come "riferimento noto").
- **Fatto**: come step 4, oppure rinviato a tua decisione.

### 9. Motore equipaggiamento e attacchi (`equipment/`)
- Stati `stowed|wielded|worn|dropped`, slot mani, due mani/versatile/scudo, armatura + scudo unici, Forza minima, svantaggio Furtività, addestramento, munizioni, attacco e danno per arma (Accurata, Pesante, Leggera, Da lancio, gittata, stili di combattimento, maestrie attive), sintonia (max 3), regole cambio equipaggiamento configurabili (ufficiale / casa: 1 azione).
- **Fatto**: test su CA (es. "18 = Cotta di maglia 16 + Scudo 2"), attacchi per arma, tempi indossa/togli.

### 10. Motore creazione (`creation/`)
- `availableOptions(stepId, character)` con `enabled` e `disabledReason`; `validateDecisions()` con reset + avviso + annulla; punteggi (tiro 4d6, array, point buy 27) con +2/+1 o +1/+1/+1 solo sui 3 ammessi, tetto 20; competenze duplicate; incantatori (trucchetti/preparati).
- **Fatto**: test dei percorsi di esclusione/invalidazione.

### 11. Store e salvataggio
- Zustand + Dexie, bozza automatica, `schemaVersion` + migrazioni, backup/export/import con anteprima.
- **Fatto**: test su migrazioni e round-trip export/import.

### 12. Tema Windows XP, tab bar, Impostazioni
- Componenti `ui/xp/` solo CSS/SVG originali, Tahoma, AA, testo ≥16px, target ≥48px, niente glow/brightness, `prefers-reduced-motion`; tab bar in basso (Personaggi, Scheda, Equip, Magie, Homebrew); Impostazioni dal menu barra titolo (Mano dx/sx/centro, regole cambio arma, rifare tiri, promemoria backup); safe area.
- **Fatto**: contrasti verificati, layout controllato su viewport telefono nei 3 orientamenti "mano", screenshot.

### 13. Wizard di creazione (UI)
- 7 passi in ordine ufficiale, barra avanzamento, opzioni escluse visibili e disattivate con motivo, bozza salvata, riepilogo con anteprima.
- **Fatto**: creo un personaggio completo per almeno 3 classi (una incantatrice).

### 14. Scheda giocabile
- PF (danno/cura rapidi, temporanei, salvezze contro morte, dadi vita), riposo breve/lungo, stat con lancio d20 (vant./svant.), attacchi, condizioni ed Esaurimento 2024, ispirazione, monete, note, "da dove viene" (sources) su ogni numero, override visibili e rimovibili.
- **Fatto**: test motore riposi/PF + prova manuale UI.

### 15. Tab Equip (UI)
- Inventario, quantità/peso/valore, Estrai/Riponi/Indossa/Togli, selettore arma impugnata, negozio interno, sintonia.
- **Fatto**: CA e attacchi si aggiornano subito e sono spiegabili.

### 16. Magie (motore + UI)
- Slot usati/rimanenti, conosciuti/preparati, CD/attacco, filtri, concentrazione, lancio con livello superiore. (Dipende dallo step 8.)
- **Fatto**: test slot e recuperi; UI provata.

### 17. Level-up 1→20
- `levelUp` su `classes[]` (PF media/tiro, sottoclasse al 3, ASI/talento ai livelli previsti, Dono epico, slot, maestrie...), anteprima differenze; commenti dove servirà il multiclasse (slot combinati, prerequisiti).
- **Fatto**: **test golden**: un personaggio per ognuna delle 12 classi a liv. 1, 5, 11, 20 con valori verificati a mano sul manuale.

### 18. Homebrew v1
- Editor guidato (armi/oggetti, talenti, incantesimi semplici) con anteprima e Zod, catalogo effetti predefiniti, badge, attiva/disattiva/duplica/modifica/elimina, export/import `.json` versionato, 3-4 esempi + template commentato in `data/homebrew/`.
- **Fatto**: creo arma, talento, incantesimo homebrew, li uso nel PG, li esporto e reimporto.

### 19. PWA e Docker
- Installabilità e offline completo, promemoria backup; `Dockerfile` multi-stage + nginx (fallback SPA, cache service worker), `docker-compose.yml`, `.env.example`. **Ti chiedo la porta prima di fissarla.**
- **Fatto**: build Docker parte e serve l'app; test offline.

### 20. Rifinitura, documentazione, test finali
- `README.md`, `ARCHITECTURE.md`, `docs/EXTENDING.md` (arma, talento, specie, classe, regola nuova), controllo accessibilità, `npm test` e `validate:data` verdi, verifica che nessun file protetto sia tracciato.
- **Fatto**: tutti i criteri di accettazione della sezione 13 del brief.

## Rischi

- **Incantesimi e SRD** (punti 1-2): blocca step 8 e 16.
- **Volume dati** (12 classi × 20 livelli): lo spezzo in batch, con validazione a ogni pezzo.
- **Regole non coperte dai file** (condizioni, morte, riposi, oggetti magici): marcate `needsReview`, da confermare con te sul manuale.
- **Copyright**: i 3 PDF sono ora tracciati in git; dopo lo spostamento restano nella cronologia. Se la repo è o diventa pubblica va valutato se riscriverla.
