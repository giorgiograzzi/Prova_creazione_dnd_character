# PLAN2.md — Privilegi giocabili (classi, sottoclassi, talenti, specie)

Stato: **piano approvato; Lotto 1 (Barbaro e Guerriero) chiuso**, Lotto 2 in attesa di ok. Continua lo step 14b di `PLAN.md`: oggi molti privilegi si leggono ma non cambiano i numeri; qui si decide cosa far diventare giocabile, in che ordine e con quali funzioni nuove del motore.

## 0. Fonti e limiti (leggere prima)

- Il censimento nasce da due estrazioni fatte sul **Manuale del giocatore 2024 in inglese** (OCR), tenute in `data/private/raw/` (non tracciato): 412 privilegi di classe/sottoclasse, 55 tratti di specie (più 10 varianti di colore del Dragonide), 75 talenti. Il riepilogo italiano `01_Dati_Gioco` non c'era ancora quando ho scritto il censimento: è arrivato dopo, e **dal Lotto 1 i numeri vengono dai tuoi riepiloghi italiani** (via `data/private/`), non dal manuale inglese.
- Conseguenze: i nomi nel censimento sono quelli inglesi (gli id veri, come `barbarian/rage`, si agganciano lotto per lotto con `extract:data`); l'OCR ha errori sui dadi. **Ogni numero citato nelle note è un promemoria e va riletto sul `01`** prima di finire nei dati (regola 1): dove il testo non lo dà, `needsReview: true` e voce in `DATA_TODO.md`.
- In questo file non c'è testo del manuale: solo nomi, livelli e classificazione.
- I campi delle estrazioni (`effetto_meccanico`, `dipende_da`…) sono dedotti da parole chiave: le etichette sotto sono state riviste a mano, ma restano un punto di partenza.
- **Dati che non sono nelle estrazioni e vanno estratti a parte** (senza, i lotti relativi non partono): invocazioni del Warlock, opzioni di Metamagia, manovre del Maestro di battaglia, opzioni di Preda del cacciatore e Stili di combattimento (questi ultimi sono già talenti), elenchi dei compagni (Signore delle bestie, Forma selvatica).

## 1. Etichette

- **✔** — fatto in un lotto di questo piano (con i test).
- **F** — già modellato in `scripts/lib/*-rules.ts` (da riverificare con `extract:data`, non con l'occhio).
- **A** — basta un effetto, un contatore o un'attivazione con le funzioni che già ci sono (`resource`, `activation`, `when: active:<id>`, `grantSpell.freeCast`, `critRange`, `setSpeed`…).
- **B Mn** — serve prima la funzione nuova **Mn** del §3.
- **C** — resta solo testo, con il motivo: reazione, scelta del Master, effetto sull'avversario, dipende dalla situazione o dal movimento nel turno.

Totali (classi e sottoclassi, 412 voci) dopo il Lotto 1: ✔ 25 · F 139 · A 44 · B 92 · C 112.
Specie (55 voci): F 34 · A 4 · B 7 · C 10. Talenti (75): F 38 · A 4 · B 9 · C 24.
Voci B rimaste per funzione: M11 36 · M1 25 · M8 11 · M6 7 · M3 6 · M12 4 · M2 4 · M7 4 · M4 3 · M10 3 · M5 2 · M13 2 · M9 1 (le invocazioni e le manovre vere ne aggiungeranno molte).
Le «A» sono dove basta un contatore: molte hanno già il contatore da `deriveUsage` (49 in tutto), il resto è testo.

## 2. Censimento

Nomi inglesi come nei JSON; il numero tra parentesi è il livello.

### BARBARO

**Classe**

- **✔ fatto nel Lotto 1**: Rage (1°) — attivabile, Danno ira; Reckless Attack (2°) — Vantaggio agli attacchi con Forza; gli attacchi contro di te hanno Vantaggio (promemoria); Feral Instinct (7°) — Vantaggio all'Iniziativa; Brutal Strike (9°) — danno extra rinunciando al Vantaggio di Attacco irruento; effetto (Spingere ecc.) è testo; Improved Brutal Strike (13°) — due effetti a scelta, danno extra; Persistent Rage (15°) — recupero usi Ira tirando Iniziativa; Improved Brutal Strike (17°) — due effetti a scelta, danno extra; Indomitable Might (18°) — minimo alla prova di Forza = punteggio
- **F** già fatto: Unarmored Defense (1°), Weapon Mastery (1°), Danger Sense (2°), Barbarian Subclass (3°), Primal Knowledge (3°), Ability Score Improvement (4°), Extra Attack (5°), Fast Movement (5°), Epic Boon (19°), Primal Champion (20°)
- **C**: Instinctive Pounce (7°) — movimento mezza Velocità all'inizio dell'Ira: decisione di movimento; Relentless Rage (11°) — reazione a 0 PF con CD che sale: dipende dalla situazione (resta promemoria)

**Sottoclasse: Path of the Berserker**

- **✔ fatto nel Lotto 1**: Frenzy (3°) — danno extra 1 volta per turno con Ira e Attacco irruento; Mindless Rage (6°) — immunità Affascinato/Spaventato durante l'Ira; Intimidating Presence (14°) — 1 volta per Riposo Lungo o spendendo un uso di Ira
- **C**: Retaliation (10°) — reazione

**Sottoclasse: Path of the Wild Heart**

- **✔ fatto nel Lotto 1**: Rage of the Wilds (3°) — scelta all'attivazione (Orso: resistenze; Aquila e Lupo: testo); Aspect of the Wilds (6°) — scelta Gufo/Pantera/Salmone: senso o velocità
- **A**: Power of the Wilds (14°) — scelta Falco/Leone/Ariete; effetti condizionati dall'Ira
- **C**: Animal Speaker (3°) — incantesimi rituali: nessun numero; Nature Speaker (10°) — incantesimo: nessun numero

**Sottoclasse: Path of the World Tree**

- **✔ fatto nel Lotto 1**: Vitality of the Tree (3°) — PF temporanei all'attivazione e a inizio turno
- **C**: Branches of the Tree (6°) — reazione; Battering Roots (10°) — proprietà di maestria (Spingere/Abbattere): testo; Travel along the Tree (14°) — teletrasporto: decisione del Master/posizione

**Sottoclasse: Path of the Zealot**

- **✔ fatto nel Lotto 1**: Divine Fury (3°) — danno extra 1 volta per turno (1d6 + metà livello) con Ira; Warrior of the Gods (3°) — riserva di dadi da spendere in cure; Zealous Presence (10°) — 1 volta per Riposo Lungo o spendendo un uso di Ira; Rage of the Gods (14°) — attivabile (volo, resistenze); la rinascita a 0 PF è testo
- **B**: Fanatical Focus (6°) → **M2** (1 volta per Ira: rilancio del TS)

### GUERRIERO

**Classe**

- **✔ fatto nel Lotto 1**: Second Wind (1°) — 2 usi (scalano), cura 1d10 + livello: tiro e applicazione; Tactical Mind (2°) — spende un uso di Second Wind per aggiungere 1d10 alla prova
- **F** già fatto: Fighting Style (1°), Weapon Mastery (1°), Fighter Subclass (3°), Ability Score Improvement (4°), Extra Attack (5°), Two Extra Attacks (11°), Epic Boon (19°), Three Extra Attacks (20°)
- **A**: Action Surge (2°) — contatore; l'azione in più è testo; Indomitable (9°) — contatore; il bonus è il livello
- **C**: Tactical Shift (5°) — movimento con Second Wind, senza Attacchi di opportunità: decisione di movimento; Tactical Master (9°) — cambio proprietà di maestria: testo; Studied Attacks (13°) — Vantaggio sul bersaglio mancato: dipende dalla situazione

**Sottoclasse: Battle Master**

- **✔ fatto nel Lotto 1**: Combat Superiority (3°) — dadi per livello e azione «Usa una manovra»; le manovre vere sono da estrarre; Know Your Enemy (7°) — 1 volta per Riposo Lungo o spendendo un dado
- **F** già fatto: Student of War (3°)
- **B**: Improved Combat Superiority (10°) → **M11** (dado d8 → d10 → d12 per livello); Relentless (15°) → **M11** (1d8 al posto di un dado, 1 volta per turno); Ultimate Combat Superiority (18°) → **M11** (dado al livello superiore)

**Sottoclasse: Champion**

- **✔ fatto nel Lotto 1**: Remarkable Athlete (3°) — Vantaggio a Iniziativa e Atletica
- **F** già fatto: Improved Critical (3°), Superior Critical (15°)
- **A**: Additional Fighting Style (7°) — seconda scelta dello stesso gruppo
- **C**: Heroic Warrior (10°) — Ispirazione eroica a inizio turno: nessun tracciamento dei turni; Survivor (18°) — PF a inizio turno quando Sanguinante e Vantaggio ai TS sulla morte: dipende dalla situazione

**Sottoclasse: Eldritch Knight**

- **F** già fatto: Spellcasting (3°)
- **C**: War Bond (3°) — arma legata: richiamo e scelta dell'arma; War Magic (7°) — azione d'attacco dopo un trucchetto: decisione d'azione; Eldritch Strike (10°) — svantaggio al TS del bersaglio: effetto sull'avversario; Arcane Charge (15°) — teletrasporto: decisione di movimento; Improved War Magic (18°) — azione d'attacco dopo un incantesimo: decisione d'azione

**Sottoclasse: Psi Warrior**

- **✔ fatto nel Lotto 1**: Psionic Power (3°) — dadi, Colpo psionico e Campo protettivo (le altre azioni restano testo); Guarded Mind (10°) — resistenza psichica; la rimozione di condizioni è testo
- **F** già fatto: Telekinetic Master (18°)
- **B**: Telekinetic Adept (7°) → **M11** (salto / movimento con dado speso)
- **C**: Bulwark of Force (15°) — alleati con copertura: bersagli decisi sul momento

### LADRO

**Classe**

- **F** già fatto: Expertise (1°), Thieves' Cant (1°), Weapon Mastery (1°), Rogue Subclass (3°), Ability Score Improvement (4°), Slippery Mind (15°), Epic Boon (19°)
- **A**: Stroke of Luck (20°) — 1 volta per Riposo Breve o Lungo
- **B**: Sneak Attack (1°) → **M1** (danni extra (nei dati è un promemoria); 1 volta per turno, richiede Vantaggio/alleato); Steady Aim (3°) → **M3** (azione bonus: Vantaggio, Velocità 0); Cunning Strike (5°) → **M1** (rinuncia a dadi dell'Attacco furtivo per effetti: riduzione dadi + CD); Reliable Talent (7°) → **M12** (minimo 10 alle prove competenti); Improved Cunning Strike (11°) → **M1** (due effetti insieme); Devious Strikes (14°) → **M1** (nuovi effetti di Colpo astuto)
- **C**: Cunning Action (2°) — azioni bonus di Scatto/Disimpegno/Nascondersi: nessun numero; Uncanny Dodge (5°) — reazione; Evasion (7°) — esito del TS: dipende dall'effetto; Elusive (18°) — nessun Vantaggio contro di te: stato sul bersaglio

**Sottoclasse: Arcane Trickster**

- **F** già fatto: Spellcasting (3°)
- **C**: Mage Hand Legerdemain (3°) — uso di un incantesimo: decisione; Magical Ambush (9°) — svantaggio al TS del bersaglio; Versatile Trickster (13°) — azione bonus con Mano magica; Spell Thief (17°) — reazione

**Sottoclasse: Assassin**

- **F** già fatto: Assassin's Tools (3°)
- **B**: Assassinate (3°) → **M3** (Vantaggio all'Iniziativa e nel primo round; danno extra M1); Envenom Weapons (13°) → **M1** (+2d6 veleno con Colpo astuto); Death Strike (17°) → **M1** (danno doppio nel primo round, TS)
- **C**: Infiltration Expertise (9°) — identità: fuori dal motore

**Sottoclasse: Soulknife**

- **A**: Psionic Power (3°) — dadi d6 a tabella, recupero a riposo
- **B**: Soul Blades (9°) → **M11** (dado speso per Vantaggio o teletrasporto); Psychic Veil (13°) → **M11** (1 volta per Riposo Lungo o spendendo un dado); Rend Mind (17°) → **M11** (1 volta per Riposo Lungo o spendendo 3 dadi)
- **C**: Psychic Blades (3°) — arma evocata: non è un oggetto dell'inventario

**Sottoclasse: Thief**

- **C**: Fast Hands (3°) — azione bonus: Uso di un oggetto; Second-Story Work (3°) — velocità di scalata; Supreme Sneak (9°) — svantaggio alla Percezione dei nemici; Use Magic Device (13°) — uso di oggetti magici: regola; Thief's Reflexes (17°) — due turni nel primo round

### MONACO

**Classe**

- **F** già fatto: Martial Arts (1°), Unarmored Defense (1°), Monk's Focus (2°), Unarmored Movement (2°), Ability Score Improvement (4°), Extra Attack (5°), Empowered Strikes (6°), Disciplined Survivor (14°), Epic Boon (19°), Body and Mind (20°)
- **B**: Uncanny Metabolism (2°) → **M11** (1 volta per Riposo Lungo: cura dado + livello); Deflect Attacks (3°) → **M11** (reazione: riduzione 1d10 + Des + livello, poi spesa Focus); Stunning Strike (5°) → **M1** (spesa Focus per attacco, 1 volta per turno: CD); Heightened Focus (10°) → **M11** (Raffica ecc. con spesa Focus); Perfect Focus (15°) → **M11** (recupero Focus all'Iniziativa)
- **C**: Slow Fall (4°) — reazione: riduzione 5 × livello; Evasion (7°) — esito del TS (dimezza): dipende dall'effetto; Acrobatic Movement (9°) — correre su superfici: situazionale; Self-Restoration (10°) — rimuove condizioni a fine turno; Deflect Energy (13°) — come Deflect Attacks, tutti i tipi; Superior Defense (18°) — resistenze con Focus: spesa + durata

**Sottoclasse: Warrior of Mercy**

- **F** già fatto: Implements of Mercy (3°)
- **B**: Hand of Harm (3°) → **M1** (1 volta per turno, spesa Focus: danno extra); Hand of Healing (3°) → **M11** (spesa Focus: cura); Flurry of Healing and Harm (11°) → **M11** (usi = mod Sag); Hand of Ultimate Mercy (17°) → **M11** (1 volta per Riposo Lungo)
- **C**: Physician's Touch (6°) — rimozione condizioni

**Sottoclasse: Warrior of Shadow**

- **F** già fatto: Shadow Arts (3°)
- **B**: Improved Shadow Step (11°) → **M11** (attacco dopo il teletrasporto)
- **C**: Shadow Step (6°) — teletrasporto; Cloak of Shadows (17°) — invisibilità: decisione/stato

**Sottoclasse: Warrior of the Elements**

- **F** già fatto: Manipulate Elements (3°)
- **A**: Elemental Attunement (3°) — attivabile spendendo Focus; danno elementale nel testo
- **B**: Elemental Burst (6°) → **M11** (spesa Focus: emanazione e TS); Elemental Epitome (17°) → **M1** (resistenza + danno extra 1 volta per turno)
- **C**: Stride of the Elements (11°) — volo/nuoto con Focus

**Sottoclasse: Warrior of the Open Hand**

- **B**: Open Hand Technique (3°) → **M1** (effetti per Raffica (TS)); Wholeness of Body (6°) → **M11** (usi = mod Sag: cura); Quivering Palm (17°) → **M1** (spesa Focus, TS: danni)
- **C**: Fleet Step (11°) — azione bonus: situazionale

### PALADINO

**Classe**

- **F** già fatto: Spellcasting (1°), Weapon Mastery (1°), Fighting Style (2°), Channel Divinity (3°), Paladin Subclass (3°), Ability Score Improvement (4°), Extra Attack (5°), Aura of Protection (6°), Epic Boon (19°)
- **A**: Faithful Steed (5°) — lancio gratuito 1 volta per Riposo Lungo; il destriero è M10; Abjure Foes (9°) — spende Channel Divinity
- **B**: Lay On Hands (1°) → **M11** (riserva PF = 5 × livello, spesa libera); Paladin's Smite (2°) → **M1** (Punizione divina con slot (M1) + lancio gratuito 1 volta per Riposo Lungo (A)); Aura of Courage (10°) → **M4** (immunità Spaventato (M5) su di sé e alleati); Radiant Strikes (11°) → **M1** (+1d8 radioso ai colpi in mischia, sempre attivo); Aura Expansion (18°) → **M4** (raggio 30 ft: parametro dell'aura)
- **C**: Restoring Touch (14°) — cura, rimuove condizioni con Lay On Hands

**Sottoclasse: Oath of Devotion**

- **F** già fatto: Oath of Devotion Spells (3°)
- **A**: Sacred Weapon (3°) — attivabile: bonus al colpire = mod Car (effetto con active:); Holy Nimbus (20°) — attivabile 10 minuti; emanazione e Vantaggio ai TS
- **B**: Aura of Devotion (7°) → **M4** (immunità Affascinato)
- **C**: Smite of Protection (15°) — protezione mezza copertura agli alleati

**Sottoclasse: Oath of Glory**

- **F** già fatto: Oath of Glory Spells (3°), Aura of Alacrity (7°)
- **B**: Peerless Athlete (3°) → **M3** (Vantaggio ad Atletica/Acrobazia mentre attivo); Living Legend (20°) → **M3** (Vantaggio a prove di Car, rilancio mancato)
- **C**: Inspiring Smite (3°) — cure con Channel Divinity dopo una Punizione: decisione; Glorious Defense (15°) — reazione

**Sottoclasse: Oath of Vengeance**

- **F** già fatto: Oath of Vengeance Spells (3°), Avenging Angel (20°)
- **B**: Vow of Enmity (3°) → **M3** (Vantaggio agli attacchi contro un bersaglio mentre attivo)
- **C**: Relentless Avenger (7°) — reazione; Soul of Vengeance (15°) — reazione

**Sottoclasse: Oath of the Ancients**

- **F** già fatto: Oath of the Ancients Spells (3°), Aura of Warding (7°)
- **A**: Nature's Wrath (3°) — spende Channel Divinity; TS nel testo; Undying Sentinel (15°) — 1 volta per Riposo Lungo; la reazione è testo; Elder Champion (20°) — attivabile 1 minuto, 1 volta per Riposo Lungo

### RANGER

**Classe**

- **F** già fatto: Spellcasting (1°), Weapon Mastery (1°), Deft Explorer (2°), Fighting Style (2°), Ranger Subclass (3°), Ability Score Improvement (4°), Extra Attack (5°), Expertise (9°), Tireless (10°), Nature's Veil (14°), Feral Senses (18°), Epic Boon (19°)
- **A**: Favored Enemy (1°) — Marchio del cacciatore gratuito: lanci per Riposo Lungo
- **B**: Precise Hunter (17°) → **M3** (Vantaggio contro il bersaglio del Marchio); Foe Slayer (20°) → **M8** (dado del Marchio del cacciatore d6 → d10)
- **C**: Relentless Hunter (13°) — Concentrazione non si interrompe col danno: regola

**Sottoclasse: Beast Master**

- **B**: Primal Companion (3°) → **M10** (scheda del compagno); Exceptional Training (7°) → **M10** (il compagno infligge danni magici); Bestial Fury (11°) → **M10** (attacco extra del compagno)
- **C**: Share Spells (15°) — incantesimi condivisi con il compagno

**Sottoclasse: Fey Wanderer**

- **F** già fatto: Fey Wanderer Spells (3°), Otherworldly Glamour (3°)
- **A**: Misty Wanderer (15°) — usi = mod Sag; Passo velato gratuito
- **B**: Dreadful Strikes (3°) → **M1** (1 volta per turno, 1d4→1d6: danno psichico)
- **C**: Beguiling Twist (7°) — reazione; Fey Reinforcements (11°) — lancio gratuito Convocare fey

**Sottoclasse: Gloom Stalker**

- **F** già fatto: Gloom Stalker Spells (3°), Umbral Sight (3°), Iron Mind (7°)
- **B**: Dread Ambusher (3°) → **M1** (Iniziativa già fatta (F); l'attacco extra con 1d8 è M1); Stalker's Flurry (11°) → **M1** (attacco mancato: altro attacco, 1 volta per turno)
- **C**: Shadowy Dodge (15°) — reazione

**Sottoclasse: Hunter**

- **B**: Hunter's Prey (3°) → **M1** (scelta Uccisore di colossi (1d8 1/turno) / Pugnale... : M1 con scelta); Superior Hunter's Prey (11°) → **M1** (danno extra ad un altro bersaglio)
- **C**: Hunter's Lore (3°) — informazioni sul bersaglio del Marchio; Defensive Tactics (7°) — scelta di una difesa situazionale; Superior Hunter's Defense (15°) — reazione

### CHIERICO

**Classe**

- **F** già fatto: Spellcasting (1°), Divine Order (1°), Channel Divinity (2°), Cleric Subclass (3°), Ability Score Improvement (4°), Epic Boon (19°)
- **A**: Sear Undead (5°) — spende Channel Divinity; danno a dadi nel testo
- **B**: Blessed Strikes (7°) → **M1** (scelta già fatta; il danno 1d8 radioso una volta per turno è M1); Improved Blessed Strikes (14°) → **M8** (Incantesimo potente: + mod Sag ai trucchetti)
- **C**: Divine Intervention (10°) — incantesimo richiesto: decisione del Master; Greater Divine Intervention (20°) — come sopra

**Sottoclasse: Life Domain**

- **F** già fatto: Life Domain Spells (3°)
- **B**: Preserve Life (3°) → **M11** (riserva di PF = 5 × livello, distribuzione libera); Disciple of Life (3°) → **M8** (cure degli incantesimi + 2 + livello dell'incantesimo); Blessed Healer (6°) → **M8** (PF a te quando curi altri); Supreme Healing (17°) → **M8** (dadi di cura al massimo)

**Sottoclasse: Light Domain**

- **F** già fatto: Light Domain Spells (3°)
- **A**: Radiance of the Dawn (3°) — spende Channel Divinity; emanazione e danni nel testo; Warding Flare (3°) — usi = mod Sag; reazione; Corona of Light (17°) — attivabile 1 minuto, 1 volta per Riposo Lungo
- **C**: Improved Warding Flare (6°) — PF temporanei e recupero: a evento

**Sottoclasse: Trickery Domain**

- **F** già fatto: Trickery Domain Spells (3°)
- **A**: Invoke Duplicity (3°) — spende Channel Divinity; il duplicato è testo
- **C**: Blessing of the Trickster (3°) — Vantaggio a Furtività su un alleato; Trickster's Transposition (6°) — scambio di posto con il duplicato; Improved Duplicity (17°) — cure e Vantaggio legati al duplicato

**Sottoclasse: War Domain**

- **F** già fatto: War Domain Spells (3°), Avatar of Battle (17°)
- **A**: Guided Strike (3°) — spende Channel Divinity; reazione +10 nel testo; War Priest (3°) — usi = mod Sag; War God's Blessing (6°) — spende Channel Divinity; reazione

### DRUIDO

**Classe**

- **F** già fatto: Spellcasting (1°), Primal Order (1°), Druid Subclass (3°), Ability Score Improvement (4°), Elemental Fury (7°), Epic Boon (19°)
- **A**: Wild Shape (2°) — attivabile, usi per livello; le statistiche delle forme sono testo
- **B**: Improved Elemental Fury (15°) → **M8** (danno +1d8 o gittata: dipende dalla scelta)
- **C**: Druidic (1°) — linguaggio segreto; Wild Companion (2°) — spende Forma selvatica per un incantesimo: decisione d'uso; Wild Resurgence (5°) — recupero slot/usi con Forma selvatica: scambio a decisione; Beast Spells (18°) — lancio in Forma selvatica: regola d'uso; Archdruid (20°) — recuperi a Forma selvatica

**Sottoclasse: Circle of the Land**

- **F** già fatto: Circle of the Land Spells (3°)
- **B**: Land's Aid (3°) → **M11** (spende Forma selvatica: cura e danno in area); Nature's Ward (10°) → **M5** (immunità Avvelenato (resistenze già nel terreno))
- **C**: Natural Recovery (6°) — recupero slot a Riposo Breve: scelta a decisione; Nature's Sanctuary (14°) — reazione di altre creature

**Sottoclasse: Circle of the Moon**

- **F** già fatto: Circle of the Moon Spells (3°)
- **A**: Circle Forms (3°) — CA 13 + Sag in Forma selvatica (effetto con active:wild_shape); PF temp testo
- **B**: Improved Circle Forms (6°) → **M1** (danni radiosi ai colpi in Forma selvatica; bonus ai TS); Moonlight Step (10°) → **M11** (usi = mod Sag, recupero spendendo slot); Lunar Form (14°) → **M1** (danno extra 1 volta per turno in Forma selvatica)

**Sottoclasse: Circle of the Sea**

- **F** già fatto: Circle of the Sea Spells (3°)
- **A**: Wrath of the Sea (3°) — spende Forma selvatica; emanazione e danni nel testo; Aquatic Affinity (6°) — velocità di nuoto
- **C**: Stormborn (10°) — volo con aura: dipende dalla situazione; Oceanic Gift (14°) — emanazione condivisa

**Sottoclasse: Circle of the Stars**

- **A**: Star Map (3°) — usi = mod Sag, lanci gratuiti; Starry Form (3°) — attivabile con scelta di costellazione; dado nel testo; Cosmic Omen (6°) — usi = mod Sag; reazione; Full of Stars (14°) — resistenza B/P/T con Forma stellare attiva
- **C**: Twinkling Constellations (10°) — cambio costellazione a ogni turno

### BARDO

**Classe**

- **F** già fatto: Spellcasting (1°), Expertise (2°), Bard Subclass (3°), Ability Score Improvement (4°), Magical Secrets (10°), Epic Boon (19°), Words of Creation (20°)
- **B**: Bardic Inspiration (1°) → **M11** (usi = mod Car; dado per livello; concedere a un alleato); Jack of All Trades (2°) → **M12** (metà competenza alle prove non competenti); Font of Inspiration (5°) → **M11** (recupero a Riposo Breve e uso di slot); Superior Inspiration (18°) → **M11** (recupero all'Iniziativa)
- **C**: Countercharm (7°) — reazione

**Sottoclasse: College of Dance**

- **F** già fatto: Dazzling Footwork (3°)
- **A**: Tandem Footwork (6°) — Iniziativa: bonus = dado; testo + contatore
- **B**: Inspiring Movement (6°) → **M11** (reazione con dado speso)
- **C**: Leading Evasion (14°) — TS di Destrezza: Evasione di gruppo

**Sottoclasse: College of Glamour**

- **F** già fatto: Beguiling Magic (3°), Mantle of Majesty (6°)
- **B**: Mantle of Inspiration (3°) → **M11** (PF temporanei ad alleati)
- **C**: Unbreakable Majesty (14°) — reazione del bersaglio: dipende dalla situazione

**Sottoclasse: College of Lore**

- **F** già fatto: Bonus Proficiencies (3°), Magical Discoveries (6°)
- **B**: Cutting Words (3°) → **M11** (reazione con dado speso: riduce il tiro del nemico); Peerless Skill (14°) → **M11** (dado aggiunto a una prova, spesa di Ispirazione)

**Sottoclasse: College of Valor**

- **F** già fatto: Martial Training (3°), Extra Attack (6°)
- **B**: Combat Inspiration (3°) → **M11** (dado aggiunto a danno o CA di un alleato: spesa del dado, decisione a tiro)
- **C**: Battle Magic (14°) — attacco bonus dopo un incantesimo: decisione d'azione

### STREGONE

**Classe**

- **F** già fatto: Spellcasting (1°), Sorcerer Subclass (3°), Ability Score Improvement (4°), Epic Boon (19°)
- **B**: Innate Sorcery (1°) → **M6** (stato attivabile 1 minuto, usi 2 (Riposo Lungo): CD +1, Vantaggio agli attacchi con incantesimo); Font of Magic (2°) → **M6** (punti stregoneria = livello; conversione slot ↔ punti); Metamagic (2°) → **M6** (scelte da estrarre; spesa punti per lancio); Sorcerous Restoration (5°) → **M6** (recupera punti a Riposo Breve); Sorcery Incarnate (7°) → **M6** (Innate Sorcery attivabile: due Metamagie al lancio)
- **C**: Arcane Apotheosis (20°) — Metamagia gratuita una volta per turno

**Sottoclasse: Aberrant Sorcery**

- **F** già fatto: Psychic Defenses (6°)
- **B**: Psionic Sorcery (6°) → **M6** (lancio con punti al posto dello slot)
- **C**: Psionic Spells (3°) — incantesimi sempre preparati scritti solo a parole; Telepathic Speech (3°) — comunicazione telepatica; Revelation in Flesh (14°) — trasformazioni a scelta; Warping Implosion (18°) — teletrasporto area: 1 volta per Riposo Lungo

**Sottoclasse: Clockwork Sorcery**

- **F** già fatto: Clockwork Spells (3°)
- **A**: Restore Balance (3°) — usi = mod Car; reazione; Trance of Order (14°) — attivabile 1 minuto, 1 volta per Riposo Lungo
- **B**: Bastion of Law (6°) → **M6** (spesa punti stregoneria, dadi di protezione)
- **C**: Clockwork Cavalcade (18°) — area: effetti a scelta

**Sottoclasse: Draconic Sorcery**

- **F** già fatto: Draconic Resilience (3°), Draconic Spells (3°), Dragon Wings (14°)
- **B**: Elemental Affinity (6°) → **M8** (resistenza + danno extra = mod Car ai tipi legati all'ascendenza)
- **C**: Dragon Companion (18°) — lancio gratuito Evoca drago

**Sottoclasse: Wild Magic Sorcery**

- **A**: Tides of Chaos (3°) — 1 uso, si ricarica con un'Ondata; il Vantaggio è testo
- **C**: Wild Magic Surge (3°) — tabella casuale: tiro d100 (testo); Bend Luck (6°) — reazione con punti; Controlled Chaos (14°) — scelta tra due tiri sulla tabella; Tamed Surge (18°) — scelta dell'effetto sulla tabella

### WARLOCK

**Classe**

- **F** già fatto: Pact Magic (1°), Warlock Subclass (3°), Epic Boon (19°)
- **A**: Magical Cunning (2°) — 1 volta per Riposo Lungo: recupero metà slot
- **B**: Eldritch Invocations (1°) → **M9** (scelte e effetti (elenco da estrarre)); Mystic Arcanum (11°) → **M7** (un incantesimo per livello 6-9, 1 volta per Riposo Lungo)
- **C**: Contact Patron (9°) — lancio gratuito Contattare un altro piano; Eldritch Master (20°) — recupera tutti gli slot: decisione d'uso (1 minuto di preghiera)

**Sottoclasse: Archfey Patron**

- **F** già fatto: Archfey Spells (3°)
- **A**: Steps of the Fey (3°) — usi = mod Car; Passo velato
- **B**: Beguiling Defenses (10°) → **M5** (immunità Affascinato (reazione testo))
- **C**: Misty Escape (6°) — reazione; Bewitching Magic (14°) — Passo velato dopo un incantesimo

**Sottoclasse: Celestial Patron**

- **F** già fatto: Celestial Spells (3°), Healing Light (3°)
- **B**: Radiant Soul (6°) → **M8** (resistenza già fatta; + mod Car ai danni radiosi e da fuoco)
- **C**: Celestial Resilience (10°) — PF temporanei dopo un Riposo; Searing Vengeance (14°) — reazione

**Sottoclasse: Fiend Patron**

- **F** già fatto: Fiend Spells (3°)
- **A**: Dark One's Own Luck (6°) — usi = mod Car; Fiendish Resilience (10°) — scelta di resistenza dopo un Riposo; Hurl Through Hell (14°) — 1 volta per Riposo Lungo
- **C**: Dark One's Blessing (3°) — PF temporanei su evento (abbattere una creatura)

**Sottoclasse: Great Old One Patron**

- **F** già fatto: Great Old One Spells (3°), Eldritch Hex (10°), Thought Shield (10°)
- **A**: Clairvoyant Combatant (6°) — 1 volta per Riposo Breve o Lungo
- **C**: Awakened Mind (3°) — telepatia 30 ft; Psychic Spells (3°) — cambio del tipo di danno degli incantesimi; Create Thrall (14°) — cattura di una creatura: decisione del Master

### MAGO

**Classe**

- **F** già fatto: Spellcasting (1°), Arcane Recovery (1°), Scholar (2°), Wizard Subclass (3°), Ability Score Improvement (4°), Epic Boon (19°)
- **B**: Memorize Spell (5°) → **M7** (cambio di un incantesimo preparato a Riposo Breve); Spell Mastery (18°) → **M7** (un 1° e un 2° livello a volontà); Signature Spells (20°) → **M7** (due incantesimi 3° livello, 1 lancio gratuito per Riposo)
- **C**: Ritual Adept (1°) — rituali dal libro: regola già applicata nella Magie

**Sottoclasse: Abjurer**

- **F** già fatto: Spell Breaker (10°)
- **B**: Arcane Ward (3°) → **M11** (riserva di PF = 2 × livello + mod Int; si ricarica al lancio)
- **C**: Abjuration Savant (3°) — copia nel libro a costo ridotto; Projected Ward (6°) — reazione; Spell Resistance (14°) — Vantaggio ai TS contro incantesimi e resistenza

**Sottoclasse: Diviner**

- **A**: The Third Eye (10°) — 1 volta per Riposo Breve o Lungo; scelta del senso
- **B**: Portent (3°) → **M11** (2 dadi d20 (3 al 14°) da tirare a ogni Riposo Lungo e usare)
- **C**: Divination Savant (3°) — copia nel libro a costo ridotto; Expert Divination (6°) — recupero slot dopo divinazione; Greater Portent (14°) — un dado in più

**Sottoclasse: Evoker**

- **B**: Potent Cantrip (3°) → **M8** (danni dimezzati sul TS riuscito ai trucchetti); Empowered Evocation (10°) → **M8** (+ mod Int ai danni degli incantesimi di Evocazione); Overchannel (14°) → **M8** (danno massimo: modificatore del lancio)
- **C**: Evocation Savant (3°) — copia nel libro a costo ridotto; Sculpt Spells (6°) — alleati in area: scelta a tiro

**Sottoclasse: Illusionist**

- **F** già fatto: Phantasmal Creatures (6°)
- **A**: Illusory Self (10°) — 1 volta per Riposo Breve o Lungo; reazione
- **C**: Illusion Savant (3°) — copia nel libro a costo ridotto; Improved Illusions (3°) — trucchetto Illusione minore: scelta; Illusory Reality (14°) — oggetto reale 1 minuto: decisione del Master

### SPECIE

**Aasimar**
- **F** già fatto: Celestial Resistance, Darkvision, Light Bearer, Heavenly Wings, Inner Radiance, Necrotic Shroud
- **B**: Healing Hands → **M11** (1 volta per Riposo Lungo: cura a dadi (d4 per bonus competenza), tiro e applicazione); Celestial Revelation → **M1** (attivabile già fatto (F); manca il danno extra 1 volta per turno)

**Dragonide**
- **F** già fatto: Draconic Ancestry, Damage Resistance, Darkvision, Draconic Flight
- **B**: Breath Weapon → **M11** (contatore; tiro del danno a dadi e CD 8 + Cos + competenza)

**Nano**
- **F** già fatto: Darkvision, Dwarven Resilience, Dwarven Toughness
- **A**: Stonecunning — contatore; Percezione tellurica mentre attivo

**Elfo**
- **F** già fatto: Darkvision, Elven Lineage, Fey Ancestry, Keen Senses, Drow, High Elf, Wood Elf
- **C**: Trance — riposo lungo in 4 ore: regola del riposo

**Gnomo**
- **F** già fatto: Darkvision, Gnomish Cunning, Gnomish Lineage
- **A**: Forest Gnome — contatore per Parlare con gli animali
- **C**: Rock Gnome — Sapienza da artefice e Aggiustare: costruzioni, nessun numero sulla scheda

**Golia**
- **F** già fatto: Large Form
- **A**: Giant Ancestry — contatore = bonus competenza; scelta del dono (effetti sotto)
- **B**: Fire's Burn (Fire Giant) → **M1** (danno extra 1d10 all'attacco, usi della scelta); Frost's Chill (Frost Giant) → **M1** (danno extra 1d6 e Velocità ridotta, usi della scelta)
- **C**: Cloud's Jaunt (Cloud Giant) — teletrasporto: decisione di movimento; Hill's Tumble (Hill Giant) — Prono sul bersaglio: effetto sull'avversario; Stone's Endurance (Stone Giant) — reazione; Storm's Thunder (Storm Giant) — reazione; Powerful Build — capacità di carico e lotta: non nella scheda

**Halfling**
- **F** già fatto: Brave
- **B**: Luck → **M12** (ripetizione di un 1 sul d20)
- **C**: Halfling Nimbleness — movimento attraverso creature più grandi; Naturally Stealthy — Nascondersi dietro creature più grandi: situazione

**Umano**
- **F** già fatto: Skillful, Versatile
- **C**: Resourceful — Ispirazione eroica a ogni Riposo Lungo: promemoria

**Orco**
- **F** già fatto: Darkvision
- **A**: Relentless Endurance — 1 volta per Riposo Lungo; reazione a 0 PF nel testo
- **B**: Adrenaline Rush → **M11** (contatore; PF temporanei = bonus competenza all'attivazione)

**Tiefling**
- **F** già fatto: Darkvision, Fiendish Legacy, Otherworldly Presence, Abyssal, Chthonic, Infernal

### TALENTI

- **F** già fatto: Alert, Crafter, Lucky, Magic Initiate, Musician, Skilled, Tavern Brawler, Tough, Ability Score Improvement, Chef, Elemental Adept, Fey-Touched, Heavily Armored, Keen Mind, Lightly Armored, Martial Weapon Training, Moderately Armored, Observant, Poisoner, Resilient, Ritual Caster, Shadow-Touched, Skill Expert, Skulker, Speedy, Telekinetic, Telepathic, Weapon Master, Archery, Blind Fighting, Defense, Dueling, Thrown Weapon Fighting, Boon of Energy Resistance, Boon of Fortitude, Boon of Skill, Boon of Speed, Boon of Truesight
- **A**: Athlete — velocità di scalata = Velocità; alzarsi costa 5 ft; Two-Weapon Fighting — danno della mano secondaria con il modificatore (condizione otherWeapon); Unarmed Fighting — dado d6 a mani nude (unarmedDie); Boon of Recovery — 1 volta per Riposo Lungo (reazione): PF da dadi
- **B**: Healer → **M11** (dado di cura e ripetizione degli 1: tiro); Savage Attacker → **M2** (rilancio del danno 1 volta per turno); Great Weapon Master → **M1** (danno extra = bonus competenza con armi Pesanti, 1 volta per turno); Heavy Armor Master → **M13** (riduzione fissa del danno B/P/T = bonus competenza); Inspiring Leader → **M11** (PF temporanei alla fine di un riposo: tiro e distribuzione); Medium Armor Master → **M13** (limite +3 di Des alla CA con armatura media); Piercer → **M2** (rilancio del dado 1 volta per turno); Great Weapon Fighting → **M12** (i dadi di danno 1 e 2 contano come 3); Boon of Combat Prowess → **M2** (trasforma un mancato in colpito, 1 volta per turno)
- **C**: Actor — imitazione e Vantaggio in Inganno/Intrattenere: situazionale; Charger — dipende dallo spostamento fatto nel turno; Crossbow Expert — regole di attacco a distanza e ricarica; Crusher — spostamento 5 ft 1 volta per turno: effetto sul bersaglio; Defensive Duelist — reazione; Dual Wielder — regola delle armi; Durable — recupero con Dadi Vita: regola di Dado Vita; Grappler — Vantaggio su bersaglio in lotta: situazionale; Mage Slayer — reazione; Mounted Combatant — situazione; Polearm Master — reazione e attacco bonus; Sentinel — reazione; Sharpshooter — gittata e copertura: situazione; Shield Master — reazione e spinta; Slasher — effetto sull'avversario; Spell Sniper — gittata e copertura; War Caster — reazione e concentrazione; Interception — reazione; Protection — reazione; Boon of Dimensional Travel — teletrasporto; Boon of Fate — reazione sul tiro altrui; Boon of Irresistible Offense — ignora resistenze: effetto sull'avversario; Boon of Spell Recall — recupero slot a decisione; Boon of the Night Spirit — invisibilità a condizione

## 3. Funzioni nuove del motore

**Fatte nel Lotto 1**: M1 (extra d'attacco), M2 («Nuovo turno»), M3 (Vantaggio da effetti), M5 (immunità alle condizioni), M11 (azioni di risorsa), M12 (minimo del tiro; la metà competenza resta solo per il Factotum e simili) più due piccole aggiunte: `note` (promemoria che compare tra le note) e la variabile di formula `speed` (volare pari alla Velocità). Restano M4, M6, M7, M8, M9, M10, M13.

Ogni funzione arriva con i suoi test (mini ruleset in `compute/testkit.ts`) **prima** dei privilegi che la usano. Il motore resta in `src/engine`, senza UI; i testi in `src/i18n/it.json`.

- **M1 — Extra d'attacco (`attackRider`)**: danno o effetto in più legato al colpo, con costo (nessuno / uso di risorsa / slot / dado) e limite opzionale. Esempi: Punizione divina, Colpo brutale, Attacco furtivo e Colpo astuto, Colpi benedetti, Furia del Berserker, Preda del cacciatore, Stretta del Monaco. *Proposta*: nuova `op` con `dice`, `cost`, `limit: "turn" | "rage" | none`, `when` come le altre. Nella scheda degli Attacchi compare una riga "Extra disponibili" con un pulsante **Applica** che somma i dadi al tiro del danno e scala il costo; quelli senza costo e sempre attivi (Colpi radianti) si sommano da soli.
- **M2 — Turni e "1 volta per turno"**: oggi non si tracciano i turni. *Proposta*: `state.turn` con un pulsante **Nuovo turno** nello Stato; azzera i limiti `turn` (M1) e i promemoria "1 per turno" (Attaccante selvaggio, Perforante); il limite `rage` si azzera all'attivazione dell'Ira. Non parte nessun timer: è un segnaposto scelto dal giocatore.
- **M3 — Vantaggio e Svantaggio da effetti**: nuove `op` `attackAdvantage`, `checkAdvantage` (per abilità o per abilità di caratteristica), `initiativeAdvantage`, tutte con `when`. Usate con gli stati attivabili senza risorsa (l'attivazione già permette `resource` facoltativo): Attacco irruento, Mira costante, Voto di inimicizia, Istinto ferino. Il "Vantaggio contro di te" resta promemoria testuale.
- **M4 — Aure**: nuovo campo `aura { radius, appliesTo: "self" | "allies" }` sulla `op` (Aura di protezione, di coraggio, di devozione, di difesa). Sulla scheda l'effetto vale su di sé come oggi; in **Stato** un riquadro "Aure attive" mostra raggio e valore calcolato per gli alleati (es. bonus ai TS), così il giocatore lo dice al tavolo. Niente calcolo sui compagni di gruppo.
- **M5 — Immunità alle condizioni**: nuova `op` `conditionImmunity { conditions }`, collegata alla funzione che oggi applica già l'immunità (Pietrificato → Avvelenato, `compute/conditions.ts`). Serve a Coraggio, Ira senza mente, Protezione della natura, Difese ammalianti, Difese psichiche.
- **M6 — Punti stregoneria e Metamagia**: risorsa `sorcery_points` a tabella (livello), azioni **Converti** slot ↔ punti e **Ripristino stregonesco**, stato attivabile Stregoneria innata (più CD e Vantaggio agli attacchi con incantesimo), scelta delle Metamagie (opzioni da estrarre) con costo in punti, spesa dalla finestra di lancio (le Metamagie restano testo, si scala solo il costo).
- **M7 — Scelte di incantesimi con ricarica particolare**: Arcani firma (due incantesimi di 3° livello, un lancio gratuito ciascuno), Arcanum mistico (uno per livello 6-9, una volta per Riposo Lungo), Maestria degli incantesimi (un 1° e un 2° livello a volontà: `freeCast.uses: "unlimited"`), Memorizzare (cambio di un preparato a Riposo Breve). *Proposta*: `Choice` con filtro di livello/classe e sorgente speciale, `grantSpell` da `$choiceId`, `freeCast` illimitato.
- **M8 — Modificatori di incantesimo**: nuova `op` `spellModifier { filter, damageBonus, healBonus, dcBonus, dieStep }` con filtro (trucchetti, scuola, tipo di danno, id incantesimo). Colpi benedetti e Incantesimo potente del Chierico, Potente trucchetto e Evocazione potenziata del Mago, Affinità elementale, Anima radiosa; le **invocazioni** (Deflagrazione agonizzante) la riusano. La finestra di lancio mostra il bonus come riga e lo somma al tiro.
- **M9 — Invocazioni del Warlock**: sono opzioni di una `Choice` a più voci (elenco da estrarre), ciascuna con i suoi effetti (`spellModifier` M8, `sense`, `grantSpell` illimitato, `acFormula`…) e i prerequisiti (livello, Patto). Quelle senza numeri restano testo.
- **M10 — Compagni**: Signore delle bestie, Trova famiglio/destriero, Forma selvatica. *Proposta*: riquadro **Compagno** semplice (PF, CA, velocità, attacco con il bonus competenza del padrone) con dati scritti a mano dal giocatore; nessuna automazione. Ultimo lotto, priorità bassa.
- **M11 — Azioni di risorsa ed eventi di attivazione**: un contatore può avere un pulsante con costo variabile, dado da tirare, cura da applicare e recuperi speciali. Esempi: Seconda ripresa (tira 1d10 + livello e cura), Mani che curano, Imposizione delle mani (riserva di PF spesa a scelta), dadi di Superiorità/Energia psionica (dado per livello, tiro), Ispirazione bardica, Ira persistente (recupero all'Iniziativa), conversioni ("recupera spendendo un uso di un'altra risorsa"), PF temporanei all'attivazione (Vitalità dell'albero). *Proposta*: `resource.die` (stringa o tabella), `resource.actions[]` con `cost`, `roll`, `apply: "heal" | "tempHp" | "note"` e `regainOn: "initiative"`.
- **M12 — Modificatori al tiro del d20 e dei dadi**: `rollFloor` (minimo al tiro: Talento affidabile, Potenza indomabile), `halfProficiency` (Jolly, Atleta straordinario), `rerollOnes` (Fortunato dell'Halfling, Guaritore), `damageDieFloor` (Combattere con armi possenti). Nei tiri compaiono come nota "x ha effetto" e applicano il minimo.
- **M13 — CA e difese particolari**: limite di Des alla CA con l'armatura media (Maestro delle armature medie), riduzione fissa del danno (Maestro delle armature pesanti) come `damageReduction` mostrata in Stato.

## 4. Lotti (ordine di priorità)

Ogni lotto si chiude con: test nuovi (mini ruleset + `*.private.test.ts` dove servono i dati veri), `npx tsc --noEmit` pulito, `npm test` verde (i `*.private` falliscono se manca `data/private`: lo dico), `extract:data` e `validate:data` con report (usi, attivazioni, `missing`), prova in gioco (Privilegi/Attacchi/Stato), `DATA_TODO.md` aggiornato, commit chiaro.

### Lotto 1 — Barbaro e Guerriero ✅ chiuso
- **Entra**: Barbaro (Attacco irruento, Istinto ferino, Colpo brutale e migliorato, Furia persistente, Potenza indomabile) e sottoclassi Berserker, Cuore selvaggio (scelte), Albero del mondo, Zelota; Guerriero (Seconda ripresa, Azione impetuosa, Indomito, Mente tattica), Campione, Maestro di battaglia (dadi, manovre), Cavaliere mistico, Guerriero psionico.
- **Richiede il motore**: M3, M2, M1 (base), M5 (Furia senza mente), M11 (Seconda ripresa, dadi), M12 (Potenza indomabile, Atleta straordinario).
- **Come lo verifico**: test del mini ruleset (Attacco irruento dà Vantaggio solo con stato acceso; Colpo brutale somma 1d10 e scala il limite; Seconda ripresa scala gli usi); test privati sui dati veri; prova in gioco con un Barbaro di livello 9 e un Maestro di battaglia: i numeri cambiano solo con lo stato attivo, gli usi scalano, i riposi ricaricano.
- **Dati da estrarre prima**: manovre del Maestro di battaglia (non ancora: l'azione «Usa una manovra» spende il dado giusto per livello, la manovra resta testo).
- **Esito**: vedi `DATA_TODO.md` (voci fatte e voci rimaste solo testo con il motivo). Correzione sul censimento: Atleta straordinario del Campione nei tuoi riepiloghi dà Vantaggio a Iniziativa e Atletica (non la metà competenza): fatto così. Provato nel browser con un Berserker di 9° e un Maestro di battaglia di 5°.

### Lotto 2 — Ladro e Monaco
- **Entra**: Attacco furtivo (da promemoria a extra d'attacco), Colpo astuto e varianti, Talento affidabile, Mira costante, Fortuna; sottoclassi Ladro (Assassino, Lama psichica, Ladro, Mistificatore arcano); Focus del Monaco (Stretta stordente, Deviare attacchi, Metabolismo straordinario), quattro Tradizioni.
- **Richiede il motore**: M1, M2, M11, M12 (M3 per Mira costante).
- **Verifica**: come Lotto 1; Attacco furtivo una volta per turno e azzerato dal pulsante.

### Lotto 3 — Paladino e Ranger
- **Entra**: Imposizione delle mani, Punizione divina (M1 con slot) e lancio gratuito, Aure, Colpi radianti, giuramenti; Marchio del cacciatore, Nemico prescelto, sottoclassi del Ranger.
- **Richiede il motore**: M1 con costo in slot, M4, M5, M3, M8 (Colpo letale).
- **Verifica**: Aura di protezione mostra il valore per gli alleati; Coraggio toglie Spaventato dalle condizioni subibili.

### Lotto 4 — Talenti e Stili di combattimento
- **Entra**: talenti generali e di combattimento con effetto (Maestro delle armi possenti, Maestro delle armature, Combattere con armi possenti, Due armi, Senza armi, Fortunato già fatto); Doni epici.
- **Richiede il motore**: M1, M2, M12, M13, M11.
- **Verifica**: una scheda con Maestro di armi possenti e una con armatura media.

### Lotto 5 — Chierico, Druido, Bardo
- **Entra**: Incanalare divinità e sue opzioni, Colpi benedetti, domini; Forma selvatica (Forme del Circolo, Forma lunare), Forma stellare; Ispirazione bardica, Jolly, Collegi.
- **Richiede il motore**: M11, M8, M1, M12; M10 solo per i compagni.
- **Verifica**: lancio con bonus ai danni dei trucchetti, cure dei Chierici della Vita.

### Lotto 6 — Stregone, Mago, Warlock
- **Entra**: punti stregoneria, Metamagia, Stregoneria innata; Arcani firma, Memorizzare, Maestria degli incantesimi, Portento, Barriera arcana, Evocazione potenziata; invocazioni, Arcanum mistico, sottoclassi.
- **Richiede il motore**: M6, M7, M8, M9, M11.
- **Dati da estrarre prima**: Metamagie e invocazioni.
- **Verifica**: conversione slot ↔ punti, costo Metamagia in finestra di lancio, Arcanum una volta per Riposo Lungo.

### Lotto 7 — Specie
- **Entra**: Mani che curano, Arma del soffio, Fortuna, Adrenalina, Resistenza implacabile, doni dell'Ascendenza gigante, Percezione tellurica, benefici di Forma grande (Vantaggio alle prove di Forza), più le voci F da riverificare.
- **Richiede il motore**: M11, M1, M12, M3.

### Lotto 8 — Compagni e rifiniture
- **Entra**: M10, riverifica delle voci F, voci rimaste C da rivalutare, pulizia di `DATA_TODO.md`.

## 5. Criteri di accettazione

**Per lotto** (oltre alla chiusura sopra):
- ogni privilegio elencato nel lotto ha un'etichetta finale: giocabile (con un test o una prova) o C con motivo in `DATA_TODO.md`;
- gli id agganciati ai dati estratti: `missing` vuoto (o voci giustificate);
- nessun numero inventato; dove il testo non lo dà, `needsReview`;
- i numeri della scheda cambiano solo con lo stato attivo; gli usi scalano; i riposi ricaricano;
- file sotto ~300 righe, motore senza dipendenze UI, testi in `src/i18n/it.json`, niente contenuti protetti tracciati.

**Globali**:
- `npm test` e `npm run validate:data` verdi (se manca `data/private` lo dico e non lo nascondo);
- `DATA_TODO.md` con solo ciò che resta aperto e non pianificato, le voci fatte spostate in "chiuso" con il conteggio aggiornato;
- elenco finale delle voci rimaste solo testo, con il motivo.

## 6. Cosa serve per i prossimi lotti

1. Estrazioni a parte di **manovre** (Lotto 1, resta aperto), **Metamagie** e **invocazioni** (Lotto 6): stesso prompt, cambia la prima riga.
2. Il tuo ok per il Lotto 2 (Ladro e Monaco).
3. Gli altri file delle regole sono già in `docs/rules/` (non tracciati) e i dati si rigenerano con `npm run extract:data`.
