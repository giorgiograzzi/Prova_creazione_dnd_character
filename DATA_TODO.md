# DATA_TODO

Cose ancora aperte sui dati. Tutto il resto è stato chiuso (elenco in fondo).
Fonte dei dati: i riepiloghi in `docs/rules/` (non il Manuale del giocatore): nessuna voce è stata confrontata con il manuale.
Le voci con `"needsReview": true` nei dati sono quelle da verificare.

## 1. Serve una fonte che non abbiamo
- Niente per ora. (Le condizioni sono arrivate con la spec `05_conditions.json`, vedi in fondo.)

## 2. Da fare in uno step già in piano
- **Step 16 (Magie)** — fatto: slot spesi/rimasti, slot del Patto (`state.pactUsed`), lancio con livello superiore, rituali, lanci gratuiti (un contatore per incantesimo), Concentrazione (una alla volta, CD dei danni), Recupero arcano/naturale, Astuzia magica, preparazione con le stesse regole della creazione. Restano:
  - Arcani firma del Mago (20°), Arcanum mistico (Warlock 11°+), Maestria degli incantesimi (Mago 18°: un 1° e un 2° a volontà), Memorizzare (Mago 5°): scelte con ricarica particolare, non codificate.
  - Punti stregoneria: conversione slot ↔ punti e Ripristino stregonesco; Rinascita selvatica (Druido 5°); Incantesimi potenti e Metamagia sui lanci.
  - La regola "un solo slot per turno" è solo un promemoria (non c'è il tracciamento dei turni); i componenti con costo (materiali) sono un promemoria, non si controlla l'inventario.
  - Restrizioni di componenti (V/S: Silenzio, mani occupate; Incantatore da guerra) e Svantaggio degli attacchi a distanza con incantesimo con un nemico entro 5 ft: solo testo.
- **Step 14b (attacchi in gioco)**
  - Bonus che dipendono da uno stato attivo: Danno ira (serve "Ira attiva"), Punizione divina, Colpo brutale, Furia, Sacro Simbolo ecc. Nelle schede degli attacchi ci sono solo gli extra sempre validi (Attacco furtivo, come promemoria).
  - Proprietà di maestria: il motore dice quale è attiva e la CD di Rovesciare; l'effetto (Spingere, Fiaccare...) è solo testo della regola.
  - Attacco a distanza con nemico entro 5 ft / a gittata lunga: promemoria di Svantaggio (dipende dalla situazione).
- **Step 17 (avanzamento di livello)**
  - Multiclasse: `classOptions` già controlla il 13 richiesto; restano le competenze parziali della nuova classe (solo quelle "multiclasse") e il Dado Vita/PF al nuovo livello.
  - Mente di ferro (Cacciatore delle tenebre): "se hai già la competenza Sag, Int o Car" (ora sempre Sag).
- **Privilegi ancora solo descritti** (step 14b ha messo l'elenco, i contatori e 7 stati attivabili; il resto si legge ma non modifica i numeri):
  - Contatori: 49 ricavati dal testo dei riepiloghi (`scripts/lib/feature-play.ts`, `deriveUsage`): solo formule esplicite ("Usi = mod Sag (min 1) per Riposo Lungo", "1 volta per Riposo Breve o Lungo"); il minimo 1 c'è solo dove il testo lo scrive.
    I costi alternativi ("o spendendo un dado / uno slot / 5 punti") restano nel testo: il contatore conta solo gli usi a riposo.
  - Stati attivabili curati (`ACTIVATIONS`): Ira, Forma selvatica, Rivelazione celestiale, Volo draconico, Forma grande, Ali del drago, Angelo vendicatore. Da aggiungere gli altri (Forma divina dello Zelota, Presenza intimidatoria...), il danno extra di Rivelazione celestiale (1 volta per turno), il Vantaggio alle prove di Forza dell'Ira e di Forma grande (non c'è un effetto per le prove).
  - Bonus che dipendono da uno stato attivo: fatto per l'Ira; restano Punizione divina, Colpo brutale, Furia, Sacro Simbolo ecc.
  - Talenti: quasi tutti i talenti generali (es. Maestro delle armi possenti, Sentinella, Attore), effetti di oggetti (acido, pozioni ecc.).
  - Specie: Trance, Retaggio fatato, Esperto della pietra, Agilità halfling, Fortunato, Furtivo per natura, Corporatura possente, benefici dell'Ascendenza gigante; Alto elfo: cambio del trucchetto a ogni Riposo Lungo.
  - Classi: quasi tutti i privilegi di combattimento (Attacco irruento, Colpo brutale...), Colpo divino / Incantesimi potenti, Presagio del Divinatore, Protezione arcana,
    compagni del Signore delle bestie (nella descrizione della sottoclasse), effetti delle invocazioni (es. Deflagrazione agonizzante), Aura di protezione sugli alleati.
  - **Immunità alle condizioni** dei privilegi (es. Protezione della natura, Aura di coraggio): il motore sa applicare l'immunità (Pietrificato → Avvelenato), ma i privilegi non hanno ancora un effetto `immunity`.
  - Condizioni con fonte e situazionali (linea di vista, distanza): il motore le mostra come testo, con la fonte se indicata (fatto nella scheda, step 14).

## Nota sugli incantesimi (step 8)
390 incantesimi dal riepilogo `04_Incantesimi`: i testi sono riassunti in parole nostre (non il testo del manuale). Per 10 incantesimi la risoluzione non entra nell'enum e resta in
`resolutionRaw` (Indagare, "TS Des / Cos", "TS vario/vari"). L'estrazione verifica ogni incantesimo contro le liste per classe del PDF (nome, livello, classe, ◆ Concentrazione, ® Rituale).

## Chiuso in questa revisione
- **Step 10**: aumenti di caratteristica di talenti e livelli (`Character.asi` con `key` e `cap`), scelte alternative (`Choice.group`), conteggi da `countFrom` / `countFormula`,
  competenze duplicate (abilità, strumenti, tiri salvezza; Maestria solo su abilità già competenti), linguaggi (Comune + 2, Druidico, Gergo dei ladri, scelte di Ladro e Ranger),
  Guerriero benedetto/druidico, Barbaro con maestrie solo da mischia, Incantatore rituale / Toccato dai folletti con i filtri applicati, talenti ripetibili con scelte separate per acquisizione.
- **Step 9**: Lancia da cavaliere (`twoHandedUnlessMounted` + `state.mounted`), competenze con filtro (`martial[light]`, `martial[finesse|light]`),
  Duellare (condizioni `twoHanded` / `otherWeapon`, non più `needsReview`), Arti marziali e Attacco furtivo negli attacchi, munizioni delle armi (`ammunition`).
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
- **Step 8**: incantesimi (390) e tabelle degli slot del multiclasse; trucchetto / 1° livello dei lignaggi ora dai livelli veri (niente più elenco fisso); i trucchetti negli elenchi
  delle sottoclassi sono `cantrip`; filtri delle scelte (`spellsMatching`, `spellChoiceCandidates`); slot per livello, multiclasse e slot del patto (`Derived.spellSlots`);
  ogni incantesimo concesso dai dati viene verificato (esistenza e modo coerente col livello).
- Recuperi parziali (Ira, Incanalare divinità, Forma selvatica, Recupero energie).
- **Condizioni** (15): dati veri dalla spec `docs/rules/05_conditions.json` (PHB 2024 App. C) con effetti tipizzati, condizioni incluse, immunità,
  Esaurimento a livelli (-2 × livello ai Tiri D20, -5 ft × livello, morte al 6°) e vincoli di fuga. Il motore le applica a velocità, TS, prove, iniziativa,
  tiri per colpire, resistenze e azioni (`Derived.conditions`). Le voci non sono più `needsReview`; il testo ufficiale fa fede il manuale (pagina in `bookPage`).
