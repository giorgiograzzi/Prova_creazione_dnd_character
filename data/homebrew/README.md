# Homebrew: esempi e modello

- `esempio-*.json`: pacchetti pronti. Si importano dall'app (Homebrew → Importa pacchetto → Esempi).
  Fanno riferimento a id di maestrie, tipi di danno e proprietà delle armi dei dati di gioco.
- `template.jsonc`: modello commentato da copiare (senza commenti) in un `.json` e compilare.

Questi file **non** sono dati di gioco: l'app non li carica da sola, li importi tu.
Le voci che crei dall'app stanno nell'archivio del browser; per portarle altrove: Homebrew → Esporta pacchetto.
