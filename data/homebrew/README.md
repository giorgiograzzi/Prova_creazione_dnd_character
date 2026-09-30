# Homebrew: esempi e modello

- `esempio-*.json`: pacchetti pronti. Si importano dall'app (Homebrew → Importa pacchetto → Esempi).
  Fanno riferimento a id di maestrie, tipi di danno e proprietà delle armi dei dati di gioco.
- `esempio-specie.json`, `esempio-background.json`, `esempio-classe.json`: una specie con scelta, un background con il suo talento di Origine, una classe mezzo incantatrice con sottoclasse e incantesimo sulla sua lista. Si importano anche insieme: una sottoclasse può riferirsi alla classe dello stesso pacchetto.
- `template.jsonc`: modello commentato da copiare (senza commenti) in un `.json` e compilare.

Questi file **non** sono dati di gioco: l'app non li carica da sola, li importi tu.
Le voci che crei dall'app stanno nell'archivio del browser; per portarle altrove: Homebrew → Esporta pacchetto.

## Cosa si può creare

Ogni tipo ha lo stesso formato dei dati di gioco, quindi una voce attiva compare dove serve, senza codice speciale:

| Tipo | Dove compare |
|---|---|
| Specie, background, classi, sottoclassi | passi della **creazione** (e del level-up), con la dicitura *Homebrew* |
| Talenti | scelte dei talenti e passo Homebrew della creazione |
| Armi, armature, oggetti | negozio, zaino e passo Homebrew della creazione |
| Incantesimi | libro degli incantesimi; nella lista di una classe se la includi in `classes` |
| Linguaggi, tipi di danno, condizioni | scelte dei linguaggi, effetti (resistenze) e condizioni della scheda |

Abilità personalizzate non sono possibili: le 18 abilità sono fisse nel motore.

## Pacchetti

Ogni voce può avere un **pacchetto** (un nome a scelta). Dalla schermata Homebrew puoi filtrare per pacchetto, attivarlo o spegnerlo tutto insieme ed esportarne uno solo. Le voci importate prendono il nome del file come pacchetto.

I personaggi salvati ricordano quali voci homebrew usano: spegnere o eliminare una voce usata chiede conferma con l'elenco dei personaggi coinvolti, e un personaggio che usa contenuti mancanti mostra un avviso con la lista. Il backup dei personaggi porta con sé le voci homebrew che usano.
