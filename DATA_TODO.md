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
- **Recuperi parziali** ("1 uso con Riposo Breve, tutti con Riposo Lungo"): codificati con `partialShortRest: 1` per Ira, Incanalare divinità (Chierico, Paladino), Forma selvatica, Recupero energie.
- **Incantesimi delle sottoclassi**: gli elenchi includono anche trucchetti (es. `fire_bolt`, `ray_of_frost`); per ora tutti `alwaysPrepared`. Riallineare allo step 8.
- **Magia seducente (Bardo Fascino)**: gli incantesimi sempre preparati sono solo nel testo (Charme su persone, Immagine speculare, Comando): non codificati.
- **Terreno del Circolo della Terra**: la resistenza di "Protezione della natura" per terreno è solo testo.
- **Equipaggiamento**: "musical instrument a scelta" (inglese nel PDF) reso come `$instrument`.

## Step 7b — Guerriero, Monaco, Paladino, Ranger, Ladro, Stregone, Warlock, Mago
Fonte: `01_Dati_Gioco_DnD2024.pdf`. Con 7a: **12 classi e 48 sottoclassi**. Per ogni livello i privilegi elencati coincidono con la tabella
(l'estrazione si ferma altrimenti) e ogni regola scritta a mano deve trovare il suo privilegio (altrimenti l'estrazione si ferma).

- **Bug corretto del 7a**: la Maestria del Bardo al 9° livello (id `expertise_2`) non riceveva la sua scelta; ora sì (`bard_expertise_9`).
- **Codificato**: CA del Monaco e Movimento senza armatura a scaglioni (dal 2°, nessuna armatura né scudo), dado di Arti marziali per livello,
  competenza in tutti i TS (Monaco 14°), Corpo e mente (+4, max 25), Imposizione delle mani (5 × livello), Aura di protezione (su di sé),
  Campione (critico 19-20 e 18-20), dadi di superiorità e di energia psionica da tabelle di sottoclasse, terzi incantatori
  (Cavaliere mistico, Mistificatore arcano: slot e trucchetti propri), Vagabondo, Sensi ferini, Iniziativa del Cacciatore delle tenebre,
  Maestrie del Ladro (1° e 6°) e del Ranger, Mente sfuggente, slot del patto del Warlock (`pactSlots`), 28 invocazioni con livello minimo e
  prerequisiti come condizione (`hasFeature:<invocazione>`), 10 opzioni di Metamagia con costo, 20 manovre del Maestro di battaglia,
  Stregone draconico (CA e +1 PF/livello), resistenze (aura degli Antichi, Anima radiosa, Scudo mentale, Difese psichiche).
- **Scelte per numero da tabella**: `countFrom` può riferirsi a una colonna della classe (trucchetti, preparati, maestria_armi, invocazioni, metamagie_note)
  o della sottoclasse (`manovre_note`).
- **Armi con filtro**: `martial[light]` (Monaco), `martial[finesse|light]` (Ladro) → da interpretare allo step 9.
- **Stile di combattimento (Paladino/Ranger)**: solo i talenti Stile di combattimento; l'alternativa "Guerriero benedetto / druidico" (2 trucchetti) **non è modellata**.
- **Aura di protezione**: applicata solo a sé; l'effetto sugli alleati è testo.
- **Cacciatore delle tenebre**: "Scurovisione 60 (o +60)" e "Mente di ferro" (se già competente, Int o Car) codificati in forma semplice.
- **Libro degli incantesimi del Mago**: 6 incantesimi iniziali; il +2 per livello non è modellato (step 10/16).
- **Studente della guerra (Maestro di battaglia)**: l'abilità è a scelta libera (dovrebbe essere dalla lista del Guerriero).
- **Solo testo**: quasi tutti gli altri privilegi, i compagni del Signore delle bestie (nella descrizione della sottoclasse), Presagio del Divinatore,
  Protezione arcana, forme di Forma selvatica, Arcanum mistico, effetti delle invocazioni (es. Deflagrazione agonizzante).
- **Incantesimi sempre preparati dei privilegi**: `divine_smite` e `find_steed` con lancio gratuito 1/Riposo Lungo (dal testo), `hunters_mark` senza (usi in tabella).
