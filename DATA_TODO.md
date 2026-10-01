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
  - Bonus che dipendono da uno stato attivo: Danno ira, Colpo brutale, Frenesia, Furia divina, Colpo psionico (Lotto 1) e Attacco furtivo, Assassinare, Mano del dolore (Lotto 2), Punizione divina, Marchio del cacciatore, Colpo del terrore (Lotto 3), Maestro delle armi possenti, Caricatore e simili (Lotto 4) fatti con «Extra al colpo»; restano Sacro Simbolo e gli incantesimi nel Lotto 5.
  - Proprietà di maestria: il motore dice quale è attiva e la CD di Rovesciare; l'effetto (Spingere, Fiaccare...) è solo testo della regola.
  - Attacco a distanza con nemico entro 5 ft / a gittata lunga: promemoria di Svantaggio (dipende dalla situazione).
- **Privilegi, sottoclassi, talenti e specie giocabili** — piano e censimento in `PLAN2.md` (8 lotti, funzioni del motore M1-M13). Qui resta solo ciò che non è pianificato:
  - Contatori: 49 ricavati dal testo dei riepiloghi (`scripts/lib/feature-play.ts`, `deriveUsage`): solo formule esplicite; il minimo 1 c'è solo dove il testo lo scrive. I costi alternativi ("o spendendo un dado / uno slot / 5 punti") restano nel testo, tranne quelli già curati nei lotti.
  - Talenti: effetti di oggetti (acido, pozioni ecc.), non in nessun lotto.
  - Specie: cambio del trucchetto dell'Alto elfo a ogni Riposo Lungo (scelta a decisione, solo testo).
  - Condizioni con fonte e situazionali (linea di vista, distanza): il motore le mostra come testo, con la fonte se indicata (fatto nella scheda, step 14).
  - **Aperto dal Lotto 1**: le **manovre** del Maestro di battaglia non sono nei dati (serve un'estrazione a parte); l'azione «Usa una manovra» spende il dado giusto ma la manovra resta testo.
  - **Rimasti solo testo nel Lotto 1** (non cambiano numeri): Balzo istintivo (movimento a inizio Ira), Ira implacabile (reazione a 0 PF con CD crescente), Conoscenza primordiale (Forza al posto di un'altra caratteristica nelle prove, solo con Ira: la competenza è già gestita), Rappresaglia (reazione), Concentrazione fanatica (rilancio 1 volta per Ira), Parlare con le bestie e con la natura (rituali), Rami dell'albero (reazione), Radici devastanti (proprietà di maestria), Viaggio lungo l'albero (teletrasporto), Spostamento tattico (movimento), Attacchi studiati (Vantaggio sul bersaglio mancato), Maestro tattico (cambio di maestria), Guerriero eroico (Ispirazione a inizio turno), Sopravvissuto (PF a inizio turno e TS sulla morte), i privilegi del Cavaliere mistico oltre agli incantesimi (Legame con l'arma, Magia da guerra, Colpo mistico, Carica arcana, Magia da guerra migliorata), Adepto telecinetico e Baluardo di forza (effetti su altre creature o scelta a decisione), Implacabile del Maestro di battaglia (1 volta per turno).
  - **Rimasti solo testo nel Lotto 2** (non cambiano numeri): Azione scaltra, Schivata prodigiosa, Elusione (esito del TS), Inafferrabile (nessun Vantaggio contro di te), Colpo astuto, Colpo astuto migliorato e Colpi subdoli (effetti sull'avversario: veleno, sbilanciare, ritirata, stordire, tramortire, accecare; la CD è nel testo dell'Attacco furtivo), Colpo di fortuna (contatore, effetto a parole), Mano magica ingannevole, Imboscata magica, Imbroglione versatile e Ladro di incantesimi del Mistificatore arcano, Mani veloci, Furtività suprema, Usare oggetti magici, Riflessi del ladro, Lame psichiche (arma evocata, non è nell'inventario), Esperto di infiltrazione e Armi avvelenate dell'Assassino; del Monaco: Colpi potenziati, Movimento acrobatico, Autoguarigione, Deviare energia, Disciplina perfetta (recupero all'Iniziativa), Arti dell'ombra e Passo d'ombra (teletrasporto e oscurità), Tecnica della mano aperta (effetti sull'avversario), Passo lesto, Tocco del medico, Raffica di guarigione e dolore, Manipolare gli elementi, Epitome elementale.
  - **Aperto dal Lotto 2**: i Colpi astuti con dadi rinunciati non sono modellati (si sottraggono i dadi a mano); gli strumenti non entrano nel Talento affidabile (che vale sulle abilità); il Palmo tremante e la Stretta stordente applicano il costo ma gli effetti sul bersaglio restano testo.
  - **Rimasti solo testo nel Lotto 3** (non cambiano numeri): Difesa gloriosa (reazione), Punizione protettiva (mezza copertura agli alleati), Vendicatore implacabile e Anima della vendetta (reazioni), Sentinella immortale (a 0 PF, contatore e testo), Tocco ristoratore oltre alla spesa dei punti (effetti su altre creature), Cacciatore implacabile (la Concentrazione non si interrompe), Svolta ammaliante, Rinforzi fatati e Viandante nebbioso del Vagabondo fatato (incantesimi e reazioni), Raffica del predatore e Schivata oscura del Vagabondo oscuro (scelte sul momento e reazioni); i compagni del Signore delle bestie sono nel Lotto 8.
  - **Aperto dal Lotto 3**: il Marchio del cacciatore lanciato gratis tramite Nemico prescelto non è legato al suo contatore (il lancio gratuito dell'incantesimo ha un solo uso a Riposo Lungo nei dati; il contatore Nemico prescelto resta a parte); il Vantaggio di Cacciatore preciso e di Voto di inimicizia vale solo contro la creatura marcata, ma l'app non conosce il bersaglio (promemoria nelle note); le aure non sono calcolate sui compagni di gruppo: Stato ne mostra raggio e valore da dire al tavolo.
  - **Rimasti solo testo nel Lotto 4** (non cambiano numeri): quasi tutti i talenti con reazioni o regole di manovra (Duellante difensivo, Combattente con due armi, Esperto di balestre, Maestro delle armi ad asta, Sentinella, Combattente in sella, Incantatore da guerra, Cecchino magico, Tiratore scelto, Uccisore di maghi, Tenace, Attore, Rissaiolo, Furtivo oltre alla vista cieca, Allerta oltre al bonus), Guaritore e Leader ispiratore (oggetti e caratteristica scelta con l'aumento), Chef, Musicista, Artigiano esperto, Avvelenatore (dosi), Protezione, e dei Doni epici: Viaggio dimensionale, Fato, Offensiva irresistibile, Richiamo degli incantesimi, Spirito notturno, Tempra (PF extra), Resistenza all'energia (la scelta dei tipi c'è, la reazione è testo).
  - **Aperto dal Lotto 4**: i promemoria di Frantumatore, Perforatore e Squartatore compaiono su ogni attacco del tipo giusto ma il loro effetto (spingere, ritirare, rallentare) resta a parole; il minimo dei dadi vale per tutti i dadi del tiro, anche degli extra, come da regola; l'Adepto elementale (1 conta 2 sugli incantesimi) non è ancora applicato al tiro degli incantesimi.
  - Dati con `needsReview` nei lotti: nessuno per ora (i numeri vengono dai riepiloghi italiani).

## 3. Homebrew (step 18): cosa non c'è ancora
- **Effetti degli oggetti**: armi, armature e oggetti homebrew hanno lo stesso catalogo di effetti dei talenti (17 predefiniti). Valgono con l'arma impugnata, l'armatura indossata, l'oggetto nello zaino (non a terra); se richiedono sintonia, solo se sintonizzati. Attacco, danno e critico di un'arma valgono solo per i suoi attacchi (condizione `usingWeapon:<id>`). **Cariche**: armi, armature e oggetti homebrew possono avere un massimo di cariche (risorsa `item:<id>`), con ricarica all'alba, a riposo breve/lungo o mai; se tornano solo alcune cariche ("1d6+1") la ricarica è manuale: pulsante «Recupera» nella scheda, che tira e rimette le cariche (mai oltre il massimo). Restano fuori: attivazioni dell'oggetto che spendono cariche da sole, la regola «con l'ultima carica può distruggersi» (si annota nella descrizione).
- **Incantesimi homebrew**: le classi scelte nel modulo mettono l'incantesimo nella loro lista (creazione, passaggio di livello, preparazione). Senza classi si aggiunge a mano al personaggio (`extraSpells`).
- **Backup**: contiene tutta la libreria homebrew (anche le voci non usate e quelle spente); all'importazione le voci già presenti restano com'erano.
- Nessun effetto "a scelta" o con condizioni (`when`) nel catalogo: per quelli serve scrivere il `.json` a mano (vedi `data/homebrew/template.jsonc`).

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

## Chiuso: Lotto 1 di PLAN2 (Barbaro e Guerriero), 25 voci
- **Motore**: Vantaggio/Svantaggio da effetti (attacchi, prove per abilità o caratteristica, Iniziativa), immunità alle condizioni dei privilegi, promemoria (`note`), extra d'attacco con costo e limite «1 volta per turno / per Ira» (+ «Nuovo turno»), azioni di risorsa (dadi, cure, PF temporanei, recuperi), minimo del tiro (sul dado o sul totale), variabile di formula `speed`.
- **Barbaro**: Ira (Vantaggio alle prove di Forza), Attacco irruento (stato senza risorsa), Istinto ferino, Colpo brutale (1d10, 2d10 dal 17°), Ira persistente, Potenza indomabile; Berserker (Frenesia = d6 per bonus Danno ira, Ira incontenibile, Presenza intimidatoria); Cuore selvaggio (Ira, Aspetto e Potere delle terre selvagge, con scelte); Albero del mondo (Vitalità dell'albero: PF temporanei); Zelota (Furia divina, Guerriero degli dei con la riserva di d12, Presenza zelante, Ira degli dei).
- **Guerriero**: Recupero energie (cura 1d10 + livello), Mente tattica; Campione (Atleta straordinario: Vantaggio a Iniziativa e Atletica); Maestro di battaglia (dado per livello, Conosci il nemico); Guerriero psionico (Potere psionico: Colpo psionico e Campo protettivo; Mente protetta).
- Totale sul censimento: 412 voci di classe e sottoclasse → ✔ 25 · già fatte 139 · contatore o testo 44 · da fare con il motore 92 · solo testo 112.

## Chiuso: Lotto 2 di PLAN2 (Ladro e Monaco), 22 voci
- **Motore**: testi con numeri calcolati (`values`: «CD {0}»), extra d'attacco senza dadi o con costo multiplo (Stretta stordente, Palmo tremante), dadi per uso nelle azioni (`count`), costo variabile nelle attivazioni (Difesa superiore: 3 PD), condizione `unarmed`.
- **Ladro**: Attacco furtivo (dadi per livello, Accurata o a distanza, una volta per turno, CD del Colpo astuto), Mira stabile (stato senza risorsa), Talento affidabile (minimo 10 sul dado nelle abilità competenti); Assassino (Assassinare, Colpo mortale); Lama dell'anima (Potere psionico con i dadi, Lame dell'anima, Velo psichico, Squarciare la mente, recuperi spendendo dadi); Ladro (Scalatore: scalata = Velocità).
- **Monaco**: Disciplina del Monaco (azioni di spesa con CD), Disciplina superiore, Metabolismo straordinario (cura + ridà i PD), Deviare attacchi (riduzione e rimando), Caduta lenta, Colpo stordente, Sopravvissuto disciplinato, Difesa superiore; Misericordia (Mano del dolore, Mano della guarigione, Mano della misericordia suprema); Ombra (Passo d'ombra migliorato, Manto d'ombre); Elementi (Sintonia elementale, Esplosione elementale, Andatura degli elementi); Mano aperta (Integrità del corpo, Palmo vibrante).
- Totale sul censimento: 412 voci di classe e sottoclasse → ✔ 47 (Lotti 1-2) · già fatte 138 · contatore o testo 44 · da fare con il motore 73 · solo testo 110.

## Chiuso: Lotto 3 di PLAN2 (Paladino e Ranger), 30 voci
- **Motore**: aure sugli alleati (raggio e testo in Stato, con le immunità su di te), condizione `concentrating:<incantesimo>`, costo in slot degli extra d'attacco (nel tiro del danno scegli lancio gratuito, slot o slot del Patto e il livello decide i dadi), azioni dell'Incanalare divinità.
- **Paladino**: Imposizione delle mani (su di te, su altri, Avvelenato), Punizione del Paladino (Punizione divina con slot: 2d8, +1d8 per livello), Incanalare divinità (Senso divino), Aura di protezione e Espansione dell'aura (10 → 30 ft), Abiurare nemici, Aura di coraggio, Colpi radiosi, Tocco ristoratore; Devozione (Arma sacra, Aura di devozione, Aureola sacra); Gloria (Punizione ispiratrice, Atleta impareggiabile, Aura di alacrità, Leggenda vivente); Vendetta (Voto di inimicizia); Antichi (Ira della natura, Aura di protezione magica, Campione antico).
- **Ranger**: Nemico prescelto (Marchio del cacciatore: +1d6 di forza a ogni colpo mentre ti concentri, d10 al 20°), Cacciatore preciso, Vagabondo (scalata e nuoto), Instancabile (PF temporanei); Cacciatore (Sapere del cacciatore, Preda del cacciatore e Tattiche difensive con scelta, Preda superiore); Vagabondo oscuro (Terribile predatore: Colpo del terrore); Vagabondo fatato (Colpi terrificanti).
- Totale sul censimento: 412 voci di classe e sottoclasse → ✔ 77 (Lotti 1-3) · già fatte 133 · contatore o testo 38 · da fare con il motore 58 · solo testo 106.

## Chiuso: Lotto 4 di PLAN2 (talenti, stili di combattimento, Doni epici), 14 voci
- **Motore**: minimo dei dadi di danno (`damageDieFloor`, applicato dal tiro), condizione `damageType:<tipo>`, talenti letti come privilegi con extra d'attacco e promemoria con numeri.
- **Talenti**: Attaccante selvaggio, Caricatore, Frantumatore, Perforatore, Squartatore, Maestro delle armi possenti (competenza ai danni con armi Pesanti), Maestro degli scudi (Colpo di scudo con la CD), Lottatore, Atleta (scalata), Maestro delle armature pesanti (riduzione nelle note); **stili**: Combattere con armi possenti (1 e 2 contano 3), Intercettare; **Doni epici**: Prodezza in combattimento, Ripresa (riserva di 10 dadi che curano).
- Totale sul censimento dei talenti (75): ✔ 14 · già fatti 41 · da fare con il motore 0 · solo testo 20.

