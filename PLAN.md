# PLAN.md — PWA Personaggi D&D 5.5 (2024)

Stato: **Step 1-18 completati** (12 classi, 48 sottoclassi, 390 incantesimi); `DATA_TODO.md` ripulito; condizioni complete (15, con motore). Step 10 completato (motore di creazione). Step 11 completato (store e salvataggio). Step 12 completato (tema XP, tab bar, Impostazioni). Step 13 completato (wizard di creazione). Step 14 completato (scheda giocabile). Step 14b completato (privilegi giocabili). Step 15 completato (tab Equip). Step 16 completato (magie). Step 17 completato (avanzamento di livello). Step 18 (Homebrew) completato: specie, background, classi e sottoclassi, talenti, equipaggiamento, incantesimi, linguaggi, tipi di danno e condizioni, con pacchetti, copia da voce ufficiale e integrazione nella creazione. Step 19 (PWA e Docker) completato. Prossimo: step 20 (rifinitura, documentazione, test finali). Da sistemare prima: vedi "Aperti" in fondo a questo file. Passo 0 (livello di partenza) aggiunto al wizard. Aggiunto step 14b (privilegi giocabili). Tutti i dati vanno in `data/private/` (non tracciati, scelta di Giorgio).

## 0. Cosa ho trovato nei documenti delle regole

Cartella `data/rules/` (NON `docs/rules/` come da brief):

| File | Pag. | Contenuto |
|---|---|---|
| `01_Dati_Gioco_DnD2024.pdf` | 64 | Abilità, linguaggi, PX/competenza, 9 specie, 16 background, 12 classi con tabelle 1-20 e sottoclassi, talenti (origine/generali/stili/doni epici), armi + maestrie, armature, strumenti, equipaggiamento, dotazioni, monete. Descrizioni già riassunte, ogni voce ha l'id inglese. |
| `02_Regole_Creazione_Personaggio.pdf` | 5 | Ordine di creazione, generazione punteggi, formule (PF, CA, attacco, CD...), equipaggiamento iniziale, livello iniziale > 1, multiclasse. |
| `04_Incantesimi_DnD2024.pdf` | 42 | 390 incantesimi (livello, scuola, classi, tempo, gittata, componenti, durata, effetto riassunto, livelli superiori), liste per classe, tabelle slot, regole di lancio. |
| `03_Modificatori_Scelte_e_Tiri.pdf` | 6 | Grafo delle dipendenze, scelte → effetti, formule CA, attacco/danno, vincoli ed esclusioni, elenco delle `op` degli effetti. **Base diretta per lo schema effetti.** |

Note sul metodo: i PDF sono generati con testo incorporato; li estraggo con uno script mio (nessun lettore PDF installato). Le regole le leggo da lì.

### Cosa manca o non torna (da decidere, una cosa alla volta)

1. **SRD 5.2 (`IT_SRD_CC_v5.2.1.pdf`) non c'è più** (resta aperto solo per la dicitura CC-BY di `ATTRIBUTION.md`): è stato cancellato dalla repo (commit `b9aa9a3`). Senza non posso né leggere la dicitura di attribuzione CC-BY per `ATTRIBUTION.md` né estrarre gli **incantesimi**.
2. ~~Incantesimi: non ci sono i dati.~~ **Risolto: aggiunto `04_Incantesimi_DnD2024.pdf` (step 8 sbloccato).** Restano fuori solo i testi completi. Il file 01 li esclude ("solo nomi dove servono"). Mancano: descrizioni, scuola, livello, gittata, componenti, durata, liste per classe. Serve una fonte (SRD o manuale).
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

### 1. Setup progetto ✅ (completato)
- **Obiettivo**: scheletro Vite + React + TS strict, Zustand, Dexie, Zod, Vitest, vite-plugin-pwa (config base), struttura cartelle, `.gitignore` (private/, docs/rules/*.pdf), spostamento dei PDF, `README.md`/`ARCHITECTURE.md`/`DATA_TODO.md` scheletro, `ATTRIBUTION.md` provvisorio.
- **File**: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/**` (vuote), `.gitignore`, doc.
- **Fatto**: `npm run dev/build/test` funzionano; niente contenuto protetto tracciato.

### 2. Schema dati ed effetti (`types.ts`, `schema/`) ✅ (approvato)
- **Obiettivo**: tipi `Character`, `Effect`, `Condition`, `Choice`, `Option`; schemi Zod per specie, background, classe, sottoclasse, talento, arma, armatura, oggetto, incantesimo, homebrew (con `schemaVersion`); parser delle condizioni (`equipped:`, `wearingArmor:`, `weaponProperty:`, `hasFeature:`, `level>=N`...); effetti minimi del brief (le `op` del file 03: modifier, grantProficiency, grantFeature/Feat/Spell/Equipment, setSpeed, grantSense, grantResistance, acFormula, abilityScoreIncrease, prerequisite/restriction, risorse con ricarica). Loader del ruleset tollerante se `private/` manca.
- **Fatto**: schema documentato in `ARCHITECTURE.md`; test di validazione su esempi minimi; **schema effetti da te approvato prima di andare avanti.**

### 3. Motore di calcolo base (`compute/`) ✅
- **Obiettivo**: `computeCharacter(char, ruleset) → Derived` con `sources`: modificatori, bonus competenza, TS, abilità (competenza/maestria/Factotum), iniziativa, percezione passiva, PF max, dadi vita, velocità, sensi, CA (tutte le formule, miglior formula), risorse (usi = pb ecc.), vantaggio/svantaggio che si annullano.
- **File**: `compute/*.ts` piccoli (`abilities`, `proficiency`, `hp`, `ac`, `speed`, `resources`, `effects`), test.
- **Fatto**: test unitari verdi su tutte le formule del file 02 §5 e 03 §4; ogni numero ha le fonti.

### 4. Dati cap. A — Fondamenti, armi, armature, strumenti, equipaggiamento ✅
- **Obiettivo**: abilità, linguaggi, taglie, danni, condizioni (nomi), 37 armi con proprietà e maestrie (8 proprietà di maestria + regole proprietà), armature e scudo, strumenti, oggetti, dotazioni, monete. Tutto in `data/private/` (non tracciato), generato da `scripts/extract-data.ts`.
- **Fatto**: `validate:data` (schema + riferimenti incrociati), 10 voci verificate, esito riportato.

### 5. Dati cap. B — Talenti e background ✅
- 16 background (3 caratteristiche, talento, abilità, strumento, kit A/B), talenti origine/generali/stili/doni epici con prerequisiti e ripetibilità.
- **Fatto**: come step 4.

### 6. Dati cap. C — Specie ✅
- 10 specie con scelte interne (ascendenza, lignaggio, retaggio, taglia, caratteristica incantatore) e tratti sbloccati a livello 3/5.
- **Fatto**: come step 4.

### 7. Dati cap. D — Classi (in due batch: 7a Barbaro→Druido ✅, 7b Guerriero→Mago ✅)
- Tabelle 1-20 (PF, privilegi, colonne, slot), scelte al 1° livello, equipaggiamento A/B(/C), sottoclassi, multiclasse (solo annotato).
- **Fatto**: come step 4 per ciascun batch.

### 8. Dati cap. E — Incantesimi (fonte: file 04) ✅
- Elenco, livello, scuola, lista di classe, testo breve. **Serve la fonte**; fino ad allora solo gli id citati nei dati (validati come "riferimento noto").
- **Fatto**: come step 4, oppure rinviato a tua decisione.

### 9. Motore equipaggiamento e attacchi (`equipment/`) ✅
- Stati `stowed|wielded|worn|dropped`, slot mani, due mani/versatile/scudo, armatura + scudo unici, Forza minima, svantaggio Furtività, addestramento, munizioni, attacco e danno per arma (Accurata, Pesante, Leggera, Da lancio, gittata, stili di combattimento, maestrie attive), sintonia (max 3), regole cambio equipaggiamento configurabili (ufficiale / casa: 1 azione).
- **Fatto**: test su CA (es. "18 = Cotta di maglia 16 + Scudo 2"), attacchi per arma, tempi indossa/togli.

### 10. Motore creazione (`creation/`) ✅
- `availableOptions(stepId, character)` con `enabled` e `disabledReason`; `validateDecisions()` con reset + avviso + annulla; punteggi (tiro 4d6, array, point buy 27) con +2/+1 o +1/+1/+1 solo sui 3 ammessi, tetto 20; competenze duplicate; incantatori (trucchetti/preparati).
- **Fatto**: test dei percorsi di esclusione/invalidazione.

### 11. Store e salvataggio
- Zustand + Dexie, bozza automatica, `schemaVersion` + migrazioni, backup/export/import con anteprima.
- **Fatto**: test su migrazioni e round-trip export/import.

### 12. Tema Windows XP, tab bar, Impostazioni
- Componenti `ui/xp/` solo CSS/SVG originali, Tahoma, AA, testo ≥16px, target ≥48px, niente glow/brightness, `prefers-reduced-motion`; tab bar in basso (Personaggi, Scheda, Equip, Magie, Homebrew); Impostazioni dal menu barra titolo (Mano dx/sx/centro, regole cambio arma, rifare tiri, promemoria backup); safe area.
- **Fatto**: contrasti verificati con test (WCAG AA 4.5), layout controllato su viewport telefono (390×844 e 844×390) nei 3 orientamenti "mano", screenshot, nessun bersaglio <48px né scroll orizzontale. Nota: la tab "Personaggi" si chiama "Eroi" (la label lunga non entrava in 390px).

### 13. Wizard di creazione (UI)
- 7 passi in ordine ufficiale, barra avanzamento, opzioni escluse visibili e disattivate con motivo, bozza salvata, riepilogo con anteprima.
- **Fatto**: test con i dati veri: personaggio completo e chiuso per Guerriero, Mago, Chierico e Ladro (avanzamento completo, PF, CA, equipaggiamento, nessun avviso); prova nel browser (Guerriero e Mago) dal primo passo a "Termina creazione" senza errori. Si parte dal livello 1: i livelli successivi arrivano con lo step 17.

### 14. Scheda giocabile
- PF (danno/cura rapidi, temporanei, salvezze contro morte, dadi vita), riposo breve/lungo, stat con lancio d20 (vant./svant.), attacchi, condizioni ed Esaurimento 2024, ispirazione, monete, note, "da dove viene" (sources) su ogni numero, override visibili e rimovibili.
- **Fatto**: 19 test del motore di gioco (PF, PF temporanei, morte istantanea, salvezze contro morte, Dadi Vita, riposi, condizioni, valori forzati, dadi) + prova nel browser (Guerriero e Mago): danno/cura, a terra, salvezze, riposi, CA forzata, attacchi, condizioni. Restano fuori: slot e incantesimi (step 16), privilegi (14b).

### 14b. Privilegi giocabili (nuovo)
- **Perché**: molti privilegi, tratti e talenti hanno effetti solo a parole (Attacco irruento, Colpo brutale, Bagliore protettivo...): devono essere descritti, contabili e attivabili dall'app, non da ricordare a mente.
- **Obiettivo**:
  1. **Elenco privilegi** nella scheda: descrizione completa, filtri per fonte (specie, classe, sottoclasse, talento) e livello.
  2. **Contatori generici** per ogni privilegio a usi limitati, anche solo testo ("1 volta per Riposo Lungo", "usi = mod Sag"), con reset al riposo breve/lungo.
  3. **Stati attivabili** (Ira, Forma selvatica, Rivelazione celestiale, Concentrazione...): campo `activatable` + condizione `active:<id>`; accesi applicano i loro effetti (bonus Danno ira, resistenze, velocità di volo) e consumano un uso.
  4. **Scelte per attivazione** (Orso/Aquila/Lupo dell'Ira, elemento, forma) salvate nello stato di gioco e mostrate sulla scheda.
  5. Dati: marcare nei dati quali privilegi sono attivabili / a usi, con `needsReview` dove il testo è ambiguo.
- **File**: schema (`activatable`, `active:`), `compute/` (stati attivi), `store` (stato di gioco), UI Scheda.
- **Fatto**: Ira attivabile con bonus danno (+2/+3/+4 dalla colonna Danno ira, solo attacchi con la Forza), resistenze, Vantaggio ai TS di Forza e niente incantesimi; 49 contatori su privilegi solo testo (Usi = mod Sag…); scelta per attivazione salvata (Rivelazione celestiale); Forma selvatica, Volo draconico, Forma grande, Ali del drago, Angelo vendicatore attivabili; 20 test del motore (mini ruleset + dati veri) e prova nel browser. Attivabili curati: 7; altri privilegi restano solo descritti (DATA_TODO).

### 15. Tab Equip (UI)
- Inventario, quantità/peso/valore, Estrai/Riponi/Indossa/Togli, selettore arma impugnata, negozio interno, sintonia.
- **Navigazione**: Equip e Magie sono sezioni della scheda (non più tab principali); Condizioni si apre da Stato.
- **Fatto**: 10 test su monete, negozio, quantità e sintonia; prova nel browser (Guerriero): impugnare lo Spadone aggiunge l'attacco (2d6 +2, +4), indossare/togliere l'armatura cambia la CA, mani/peso/sintonia in tempo reale, costo dell'azione mostrato (regola della casa o ufficiale), acquisto dal negozio con le monete detratte. Niente vendita: non c'è una regola nei dati.

### 16. Magie (motore + UI)
- Slot usati/rimanenti, conosciuti/preparati, CD/attacco, filtri, concentrazione, lancio con livello superiore. (Dipende dallo step 8.)
- **Fatto**: 20 test (mini ruleset e dati veri): registro delle fonti, lancio con slot/livello superiore/Patto/gratuito/rituale, Concentrazione (CD e interruzioni), Recupero arcano, Astuzia magica, riposi, preparazione, terzo incantatore; UI provata nel browser (Mago: CD/attacco, slot, elenco per livello, lancio con esito, preparazione, recuperi). Le regole di lancio vengono dal file 04 dell'utente (§1).

### 17. Level-up 1→20
- `levelUp` su `classes[]` (PF media/tiro, sottoclasse al 3, ASI/talento ai livelli previsti, Dono epico, slot, maestrie...), anteprima differenze; commenti dove servirà il multiclasse (slot combinati, prerequisiti).
- **Cambio di impostazione (scelta di Giorgio)**: niente pulsanti "Sali di livello" in gioco; il livello si sceglie al **Passo 0** della creazione (e si cambia in modifica). Il multiclasse resta nel motore ma senza interfaccia.
- **Fatto**: **test golden** con i dati veri: un personaggio per ognuna delle 12 classi a liv. 1, 5, 11, 20 (48 casi), portato al livello con `levelUp` e le scelte di ogni livello: bonus di competenza (+2/+3/+4/+6), PF (dado massimo al 1° + valore fisso + Cos per livello), Dadi Vita, privilegi sbloccati, slot dei tre tipi di incantatore (completo, mezzo, terzo) e del Patto secondo le tabelle del file 04, sottoclasse al livello previsto, nessun avviso. Più: multiclasse con competenze parziali (Guerriero↔Mago), Mente di ferro, Attacchi per azione e Ira. Le tabelle sono quelle del tuo file 04/02, non il manuale.

### 18. Homebrew ✅ (completo)
- Editor guidato (armi/oggetti, talenti, incantesimi semplici) con anteprima e Zod, catalogo effetti predefiniti, badge, attiva/disattiva/duplica/modifica/elimina, export/import `.json` versionato, 3-4 esempi + template commentato in `data/homebrew/`.
- **Fatto**: tab Homebrew con modulo guidato per armi, armature, oggetti, talenti (con catalogo di 17 effetti predefiniti) e incantesimi; anteprima e controllo con lo schema del motore (errori in italiano, id `hb_…` sempre liberi); badge "Homebrew", attiva/disattiva, duplica, modifica, elimina; "Dai al personaggio" (oggetti nell'inventario, talenti in `feats`, incantesimi in `extraSpells` come "concessi"); export/import `.json` versionato con scarto delle voci invalide e aggiornamento per id; 4 pacchetti di esempio + `template.jsonc` commentato in `data/homebrew/` (validati da `validate:data`). Le voci stanno nell'archivio del browser (chiave `homebrew`) e il ruleset si ricostruisce da solo quando cambiano. 24 test nuovi (validazione, pacchetti, ruleset, scheda, catalogo effetti, store) e prova nel browser: talento +1 CA (16→17), arma nell'inventario, incantesimo nel libro, persistenza dopo ricarica, export.
- **Completamento**: l'Homebrew crea ora **ogni contenuto giocabile** con lo stesso schema dei dati ufficiali: specie (con tratti per livello, scelte e usi), background (caratteristiche, abilità, strumento, talento di Origine, kit A/B), classi complete a passi (dado vita, competenze, incantatore con slot copiati da una classe esistente e lista incantesimi propria o ufficiale, tabella dei livelli a colonne libere, privilegi con effetti/usi/attivazione/scelte, equipaggiamento A/B), sottoclassi (di classi ufficiali o homebrew), linguaggi, tipi di danno e condizioni. Tutto compare nella creazione del PG (specie, background, classe e sottoclasse negli stessi elenchi con la dicitura *Homebrew*; passo ⚗ Homebrew per talenti, incantesimi, armi, armature e oggetti, anche in modifica), nel negozio e nel libro degli incantesimi. Pacchetti (nome, filtro, attiva/spegni tutto, esporta uno solo), copia di una voce ufficiale come punto di partenza, bozza non salvata ripristinabile, avviso con l'elenco dei personaggi prima di spegnere/eliminare una voce usata, avviso sul personaggio con contenuti mancanti, backup che porta con sé le voci usate. 3 nuovi pacchetti di esempio (specie, background, classe+sottoclasse+incantesimo) e modello aggiornato. Limite noto: le abilità personalizzate non si possono creare (enum fisso nel motore); le sottoclassi incantatrici (un terzo) e le scelte a sorgente speciale (`source`/`requires`) si scrivono nel `.json`, ma se copiate da una voce ufficiale si conservano intatte.


- **Rifiniture dopo la prova sul telefono**: le finestre (`Dialog`) stanno in un portale sul `body` sopra intestazione e barra in basso, con altezza massima dello schermo e corpo scorrevole (la × è sempre raggiungibile); il negozio ha il filtro **Homebrew** diviso per tipo (anche oggetti a costo 0, "Gratis") e scorre per intero; nello zaino eliminare un oggetto (✕, o − sull'ultimo) chiede conferma.

### 18b. Stampa scheda (PDF) ✅
- Pulsante **Stampa scheda (PDF)** nel passo ★ Riepilogo del wizard (creazione e modifica): scrive il personaggio sulla scheda ufficiale 2024 in italiano (`public/forms/scheda-2024-it.pdf`) e la scarica. Dati dal motore (`src/export/sheetData.ts`), posizioni fisse (`sheetPdf.ts`), caricamento a richiesta e cache per l'offline. Test: dati, scrittura sul modello, caratteri fuori dal set e testi lunghissimi.

### 19. PWA e Docker ✅
- Installabilità e offline completo, promemoria backup; `Dockerfile` multi-stage + nginx (fallback SPA, cache del service worker), `docker-compose.yml`, `.env.example`. Porta scelta da Giorgio: **8097**.
- **Fatto**: manifest con icone (192, 512, maschera) e icona iOS; precache di tutto (dati, PDF compresi) con limite alzato a 30 MB; avviso di aggiornamento in stile XP e pulsante «Installa» in Impostazioni; promemoria backup anche nella lista dei personaggi; Docker con nginx (configurazione provata con un nginx vero: fallback, intestazioni di cache, 404) e compose valido. Provato nel browser: service worker attivo, **rete staccata → l'app si apre** (anche su rotte inesistenti) e la scheda PDF si scarica dalla cache. **Non provato qui**: `docker build` e l'avvio del container (nella sandbox non c'è il demone Docker): va verificato sul bunker. La PWA richiede HTTPS (sottodominio del tunnel, vedi README).

### 20. Rifinitura, documentazione, test finali
- `README.md`, `ARCHITECTURE.md`, `docs/EXTENDING.md` (arma, talento, specie, classe, regola nuova), controllo accessibilità, `npm test` e `validate:data` verdi, verifica che nessun file protetto sia tracciato.
- **Fatto**: tutti i criteri di accettazione della sezione 13 del brief.

## Rischi

- **Incantesimi e SRD** (punti 1-2): blocca step 8 e 16.
- **Volume dati** (12 classi × 20 livelli): lo spezzo in batch, con validazione a ogni pezzo.
- **Regole non coperte dai file** (condizioni, morte, riposi, oggetti magici): marcate `needsReview`, da confermare con te sul manuale.
- **Copyright**: i 3 PDF sono ora tracciati in git; dopo lo spostamento restano nella cronologia. Se la repo è o diventa pubblica va valutato se riscriverla.

## Aperti (da sistemare prima dello step 19)
- **Dadi del danno delle armi (segnalato da Giorgio)**: "il tiro di dadi non tiene conto del numero di dadi impostato per il danno". Nel motore e nei test il danno è giusto (3d8 a una mano, 4d10 a due; `rollExpr` tira il numero di dadi richiesto), quindi serve riprodurlo nel browser con la sua arma ("La Porca Paletta", 2d20): controllare il tiro per colpire (sempre 1d20) contro il tiro per il danno, il Colpo critico (raddoppia i dadi) e cosa compare nel risultato.
- Server di anteprima non persistente (vedi step 19).

