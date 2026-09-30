# DATA_TODO

Voci da verificare sul manuale (`"needsReview": true` nei dati).

## Step 4 — Fondamenti, armi, armature, strumenti, equipaggiamento
Fonte: `01_Dati_Gioco_DnD2024.pdf` (riepilogo). Il Manuale del giocatore non è disponibile: i dati
coincidono con il riepilogo, non sono stati confrontati con il manuale.

- **Condizioni** (15): il PDF dà solo i nomi. Effetti e regole (incl. Indebolimento/Esaurimento 2024)
  da inserire e verificare sul manuale (`needsReview` sulle 15 voci).
- **Costi**: in monete di rame (1 mo = 100 mr). L'Electrum vale 0,5 mo → 50 mr.
- **Lancia da cavaliere**: nota "A due mani solo se non in sella" tenuta come testo in `description`,
  non ancora come regola del motore (step 9).
- **Oggetti**: gli effetti di acido, fuoco dell'alchimista, acqua santa, pozione ecc. sono solo testo.
- Nessuna altra incongruenza trovata nell'estrazione.

## Step 5 — Background e talenti
Fonte: `01_Dati_Gioco_DnD2024.pdf`. 16 background; 75 talenti (10 origine, 43 generali, 10 stili, 12 Doni epici).

- **Effetti solo testo**: i talenti con `effects: []` e `choices: []` hanno le regole nella `description`
  (es. Maestro delle armi possenti, Sentinella, Attore...). Codificati solo gli effetti numerici del file 03 §3d-3e
  (`scripts/lib/feat-rules.ts`).
- **`needsReview`** (codifica parziale): Duellare ("senza altre armi", step 9), Mente acuta e Osservatore
  (se già competente dà Maestria), Resiliente (ripetibile: la scelta va duplicata), Iniziato alla magia
  (liste e ripetizione con lista diversa).
- **Non codificati**: Maestro d'armi (scelta della maestria), Adepto elementale (tipo di danno),
  Incantatore rituale, Toccato dai folletti/ombre (limitazione di scuola sugli incantesimi scelti).
- **Id di privilegi usati nei prerequisiti** (da usare negli step 7): `spellcasting`, `pact_magic`, `fighting_style`.
- **Viandante**: nel PDF l'equipaggiamento contiene "gaming set a scelta" (in inglese): reso come `$gaming_set`.
- **Talenti di origine e ASI**: gli aumenti "+1 a una tra..." si registrano in `Character.asi` (con `cap` 20/30) dallo step 10.

## Step 6 — Specie
Fonte: `01_Dati_Gioco_DnD2024.pdf`. Sono **10** specie (il piano ne indicava 9): Aasimar, Dragonide, Nano, Elfo, Gnomo, Goliath, Halfling, Umano, Orco, Tiefling.

- **Codificato**: sensi, resistenze, velocità (Goliath 35, Elfo dei boschi 35), Nano +1 PF/livello, vantaggi ai TS
  (Gnomo Int/Sag/Car; Nano/Elfo/Halfling contro condizioni → nota testuale), risorse dei tratti con "Usi" (soffio, Mani guaritrici,
  Rivelazione celestiale, ecc.), incantesimi dei lignaggi e retaggi per livello 1/3/5 (sempre preparati, 1 lancio gratuito),
  ascendenza draconica → resistenza, scelte (taglia, Sensi acuti, Abile, Versatile, caratteristica da incantatore).
- **Solo testo**: Trance, Retaggio fatato (oltre al vantaggio), Esperto della pietra, Agilità halfling, Fortunato, Furtivo per natura,
  Corporatura possente, benefici dell'Ascendenza gigante, Rivelazione celestiale (forme), Volo draconico, Forma grande.
- **Caratteristica da incantatore** (scelta `spell_ability`): registrata come decisione, non ancora legata agli incantesimi concessi
  dalla specie (`grantSpell.ability` resta vuoto): si risolve con gli incantesimi (step 16).
- **Trucchetti**: la distinzione trucchetto / incantesimo di 1° nei lignaggi usa un elenco fisso (`CANTRIPS` in `scripts/lib/species-rules.ts`);
  da riallineare ai livelli veri degli incantesimi allo step 8.
- **Alto elfo**: "trucchetto sostituibile a ogni Riposo Lungo" non modellato.

## Step 7a — Barbaro, Bardo, Chierico, Druido
Fonte: `01_Dati_Gioco_DnD2024.pdf`. Tabelle 1-20 e privilegi controllati in automatico: i nomi dei privilegi di ogni livello
coincidono con la colonna "Privilegi" della tabella (l'estrazione si ferma se non quadrano). 16 sottoclassi.

- **Codificato**: CA alternative (Difesa senza armatura, Bardo della Danza), Movimento veloce, Campione primordiale (+4, max 25),
  Percezione del pericolo (vantaggio TS Des), risorse a tabella (Ira, Incanalare divinità, Forma selvatica) e formula
  (Ispirazione bardica = mod Car, min 1), Ordine divino / primordiale (con competenze e trucchetto extra), Maestria del Bardo (liv. 2 e 9),
  Factotum (id `jack_of_all_trades`), competenze bonus (Sapienza), addestramento del Valore, incantesimi sempre preparati dei
  domini del Chierico e dei circoli del Druido (per livello di classe), terreni del Circolo della Terra (scelta).
- **Scelte per numero da tabella**: `countFrom` indica la colonna (trucchetti, preparati, maestria armi). Il conteggio effettivo lo risolve lo step 10.
- **Solo testo**: quasi tutti i privilegi di combattimento (Attacco irruento, Colpo brutale, Furia, Forma selvatica, ecc.),
  Colpo divino/Incantesimi potenti (scelta senza effetto numerico), risorse "usi = mod Sag" delle sottoclassi (Bagliore protettivo, Sacerdote di guerra).
- **Ira**: usi in tabella; il recupero "1 uso con Riposo Breve" è codificato come `partialShortRest: 1`. Incanalare divinità: stesso recupero parziale **non** codificato (verificare sul manuale).
- **Incantesimi delle sottoclassi**: gli elenchi includono anche trucchetti (es. `fire_bolt`, `ray_of_frost`); per ora tutti `alwaysPrepared`. Riallineare allo step 8.
- **Magia seducente (Bardo Fascino)**: gli incantesimi sempre preparati sono solo nel testo (Charme su persone, Immagine speculare, Comando): non codificati.
- **Terreno del Circolo della Terra**: la resistenza di "Protezione della natura" per terreno è solo testo.
- **Equipaggiamento**: "musical instrument a scelta" (inglese nel PDF) reso come `$instrument`.
