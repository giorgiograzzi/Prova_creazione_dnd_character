# PLAN3.md — Dopo PLAN2: lacune dei privilegi giocabili

Stato: **in corso**. PLAN.md (step 1-20) e PLAN2.md (lotti 1-8) sono chiusi. Qui c'è l'elenco ordinato di ciò che resta; i dettagli (motivi, limiti noti) stanno in `DATA_TODO.md`, sezione 0 «Prossimi passi». Regole di lavoro invariate: niente numeri inventati (`needsReview: true` + voce in `DATA_TODO.md`), niente contenuti protetti in git, testi in italiano.

## Punti

1. ✅ **Manovre del Maestro di battaglia**: le 20 manovre sono giocabili (`scripts/lib/play-maneuvers.ts`); gli effetti sull'avversario restano a testo.
2. ⬜ **Nomi italiani di Metamagie e Invocazioni occulte**: sono traduzioni nostre, da confrontare col manuale italiano.
3. ⬜ **Limiti della magia di Warlock e Mago**: invocazioni ripetibili con più scelte, prerequisiti su trucchetti e Patto, Distintivi e Maestria limitati al libro, effetto delle Metamagie (oggi scala solo il costo), costo alternativo a slot di altre classi.
4. ⬜ **Piccole lacune degli altri lotti**: tipo di danno di Arma del soffio e Rivelazione celestiale; Adepto elementale sui tiri degli incantesimi; Colpi astuti con dadi rinunciati; bersaglio del Marchio del cacciatore (e Marchio gratuito di Nemico prescelto non legato al contatore).
5. ⬜ **Verifica a campione dei numeri col manuale**: nessuna voce è mai stata confrontata, i dati vengono dai riepiloghi italiani.
6. ⬜ **Bug dei dadi del danno delle armi** (vedi «Aperti» in `PLAN.md`): da riprodurre nel browser con «La Porca Paletta» (2d20).
7. ⬜ **`docs/EXTENDING.md`** (come aggiungere arma, talento, specie, classe, regola): previsto dallo step 20 ma non presente nel repo.
8. ⬜ **PDF tracciati in `data/`** (due file con nome-URL): valutare se toglierli dal repo (rischio copyright, vedi «Rischi» in `PLAN.md`).

## Fuori piano (restano come sono)
- 13 privilegi con contatore ma effetto a testo («A») e 114 solo testo («C»): reazioni, effetti sull'avversario, decisioni del Master. Il motore non può modellarli; elenco e motivi in `PLAN2.md` e `DATA_TODO.md`.
