# DATA_TODO

Cose ancora aperte sui dati. Tutto il resto è stato chiuso (elenco in fondo).
Fonte dei dati: i riepiloghi in `docs/rules/` (non il Manuale del giocatore): nessuna voce è stata confrontata con il manuale.
Le voci con `"needsReview": true` nei dati sono quelle da verificare.

## 1. Serve una fonte che non abbiamo
- Niente per ora. (Le condizioni sono arrivate con la spec `05_conditions.json`, vedi in fondo.)

## 2. Da fare in uno step già in piano
- **Step 8 (incantesimi)**
  - `CANTRIPS` in `scripts/lib/species-rules.ts` (trucchetto o 1° livello nei lignaggi) → sostituire con i livelli veri.
  - Gli elenchi degli incantesimi sempre preparati delle sottoclassi includono trucchetti (es. `fire_bolt`, `ray_of_frost`, `acid_splash`):
    ora sono tutti `alwaysPrepared`, da separare per livello.
  - I filtri delle scelte (`Choice.filter`: livello, scuola, rituale, lista) sono già nei dati: servono i dati degli incantesimi per applicarli.
  - Arcani firma del Mago (20°), Arcanum mistico, Maestria degli incantesimi: scelte di incantesimi con ricarica particolare, non codificate.
- **Step 9 (armi e attacchi)**
  - Lancia da cavaliere: "A due mani solo se non in sella" (ora solo testo in `description`).
  - Competenze con filtro: `martial[light]` (Monaco), `martial[finesse|light]` (Ladro).
  - Duellare (`needsReview`): "senza altre armi impugnate".
  - Bonus/dadi di Arti marziali, Furtivo e simili applicati ai singoli attacchi.
- **Step 10 (creazione)**
  - Aumenti "+1 a una tra..." dei talenti e ASI: si registrano in `Character.asi` (con `cap` 20/30).
  - Scelte alternative (`Choice.group`): Stile di combattimento / Guerriero benedetto / Guerriero druidico; conteggi da `countFrom`
    (colonna della classe o della sottoclasse) e `countFormula` (es. libro del Mago `4 + 2 * classLevel:wizard`, Incantatore rituale `pb`).
  - Competenze duplicate (es. Sensi acuti dell'Elfo "se già competente, escludila").
  - Mente di ferro (Cacciatore delle tenebre): "se hai già la competenza Sag, Int o Car" (ora sempre Sag).
- **Step 14b (privilegi giocabili)** — sono le regole scritte solo a parole:
  - Talenti: quasi tutti i talenti generali (es. Maestro delle armi possenti, Sentinella, Attore), effetti di oggetti (acido, pozioni ecc.).
  - Specie: Trance, Retaggio fatato, Esperto della pietra, Agilità halfling, Fortunato, Furtivo per natura, Corporatura possente,
    benefici dell'Ascendenza gigante, forme di Rivelazione celestiale, Volo draconico, Forma grande; Alto elfo: cambio del trucchetto a ogni Riposo Lungo.
  - Classi: quasi tutti i privilegi di combattimento (Attacco irruento, Colpo brutale, Furia, Forma selvatica...), Colpo divino / Incantesimi
    potenti, "usi = mod Sag" delle sottoclassi (Bagliore protettivo, Sacerdote di guerra), Presagio del Divinatore, Protezione arcana,
    compagni del Signore delle bestie (nella descrizione della sottoclasse), effetti delle invocazioni (es. Deflagrazione agonizzante),
    Aura di protezione sugli alleati.
  - **Immunità alle condizioni** dei privilegi (es. Protezione della natura, Aura di coraggio): il motore sa applicare l'immunità (Pietrificato → Avvelenato), ma i privilegi non hanno ancora un effetto `immunity`.
  - **Condizioni con fonte** (Affascinato, Spaventato, Afferrato) e situazionali (linea di vista, distanza): il motore le mostra come testo, con la fonte se indicata in `state.conditionSources`; il tracciamento delle fonti è della scheda (step 14).
  - Un Riposo Lungo toglie 1 livello di Esaurimento (`removal` nei dati): da applicare nella scheda (step 14).

## Chiuso in questa revisione
- Id dei privilegi nei prerequisiti dei talenti (`spellcasting`, `pact_magic`, `fighting_style`): ora `validate:data` controlla ogni `hasFeature:`/`hasFeat:` in tutte le condizioni.
- Caratteristica da incantatore delle specie: la scelta `spell_ability` arriva ai `grantSpell` (`abilityFrom`); `Derived.grantedSpells` dà caratteristica, CD e attacco
  (per gli incantesimi di classe e sottoclasse usa la caratteristica della classe).
- Talenti: Iniziato alla magia (caratteristica e liste da scelte), Resiliente e altri ripetibili (scelte per acquisizione in `Character.feats[i].choices`),
  Mente acuta e Osservatore (Maestria se già competente, `upgradeToExpertise`), Maestro d'armi, Adepto elementale, Incantatore rituale, Toccato dai folletti/ombre
  (caratteristica e filtro di scuola), Telecinetico, Telepatico. Un talento non ripetibile non si somma a se stesso.
- Guerriero benedetto / druidico (Paladino, Ranger): scelte alternative allo Stile di combattimento.
- Libro del Mago: 6 incantesimi al 1° + 2 per livello (`countFormula`).
- Studente della guerra: l'abilità è ora dalla lista del Guerriero.
- Incantesimi sempre preparati scritti solo a parole: Bardo del Fascino, Parola del potere (Bardo 20°), Antichi Grandi (Anatema), Abiurista, Illusionista,
  Circolo delle Stelle, Guerriero psionico; scelta di Scoperte magiche (Sapienza).
- Terreno del Circolo della Terra: resistenza di Protezione della natura dal 10°.
- Scurovisione "60 ft o +60" (Cacciatore delle tenebre, Ombra): effetto `sense` additivo.
- Recuperi parziali (Ira, Incanalare divinità, Forma selvatica, Recupero energie).
- **Condizioni** (15): dati veri dalla spec `docs/rules/05_conditions.json` (PHB 2024 App. C) con effetti tipizzati, condizioni incluse, immunità,
  Esaurimento a livelli (-2 × livello ai Tiri D20, -5 ft × livello, morte al 6°) e vincoli di fuga. Il motore le applica a velocità, TS, prove, iniziativa,
  tiri per colpire, resistenze e azioni (`Derived.conditions`). Le voci non sono più `needsReview`; il testo ufficiale fa fede il manuale (pagina in `bookPage`).
