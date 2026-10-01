# Prompt per la prossima sessione di Claude Code

Copia tutto quello che sta sotto la riga e incollalo come primo messaggio di una nuova sessione sul repo `giorgiograzzi/Prova_creazione_dnd_character`.

---

# Compito: completare le lacune dei privilegi giocabili (dopo PLAN2)

## Chi sono e come lavorare
Sono Giorgio (Giorgio Grazzi Group, agenzia creativa a Carpi, faccio anche il DJ). Tono simpatico e caloroso, da collega, poche emoji. Risposte della giusta lunghezza, con elenchi puntati quando servono. Se qualcosa non è chiaro, fai **una domanda alla volta** e aspetta la risposta. Proponi idee e spunti anche non richiesti.

## Il progetto
PWA React + TypeScript strict (Zustand, Dexie, Zod, Vitest, Vite) per creare e giocare personaggi D&D 2024 in italiano. Leggi prima di tutto: `PLAN2.md`, `DATA_TODO.md` (sezione 0 «Prossimi passi»), `ARCHITECTURE.md`, `PLAN.md`.

**Stato**: PLAN2 è completo (lotti 1-8 in `main`): privilegi di 12 classi, 48 sottoclassi, talenti e specie hanno effetto reale su numeri, contatori, azioni e attivazioni. Il motore sta in `src/engine` (senza dipendenze UI), i dati curati in `scripts/lib/play-lot1.ts … play-lot8.ts`, applicati da `scripts/lib/feature-play.ts` durante `npm run extract:data`.

## Regole vincolanti
- **Non inventare numeri**: ricavali dai riepiloghi in `docs/rules/` e dai dati in `data/private/`. Dove manca il numero: `needsReview: true` e voce in `DATA_TODO.md`.
- Se mancano `docs/rules` e `data/private`, **fermati e dimmelo**.
- **Mai tracciare contenuti protetti**: niente PDF, niente `data/private/`, niente `private/raw/` in git. Testi in parole nostre.
- Commenti e testi in italiano, file sotto ~300 righe, testi dell'interfaccia in `src/i18n/it.json`.
- Quello che il motore non può modellare resta testo, ma va elencato in `DATA_TODO.md` con il motivo.
- Ogni lavoro si chiude con: test nuovi, `npx tsc --noEmit` pulito, `npm test` verde (i `*.private.test.ts` falliscono senza `data/private`: dimmelo), `npm run validate:data` OK, prova nel browser quando tocca l'interfaccia, commit chiaro.
- Sviluppa sul branch della sessione. **Non aprire PR se non te lo chiedo**; unisci solo se lo dico, e con squash solo se lo dico.
- Attribuzione nei commit e nelle PR: usa le righe che il sistema ti indica.

## Cosa fare (in ordine, un punto alla volta, chiedimi l'ok prima di passare al successivo)
1. ~~**Manovre del Maestro di battaglia**~~ fatto (punto 1). Servivano nei dati (oggi «Usa una manovra» spende il dado ma la manovra è testo). Ti darò un JSON estratto dal manuale come per Metamagie e invocazioni (`private/raw/`, ignorata da git): chiedimelo e dimmi il formato che ti serve. Poi: scelta delle manovre, effetto del dado, CD, test con i dati veri.
2. ~~**Limiti della magia del Warlock e del Mago**~~ fatto (punto 2): (`DATA_TODO.md`, «Aperto dal Lotto 6»): invocazioni ripetibili con più scelte, prerequisiti sui trucchetti e sul Patto, Distintivi e Maestria limitati al libro, effetto delle Metamagie, costo alternativo a slot di altre classi.
3. **Piccole lacune**: tipo di danno scelto all'uso (Arma del soffio, Rivelazione celestiale), Adepto elementale sui tiri degli incantesimi, Colpi astuti con dadi rinunciati, bersaglio del Marchio del cacciatore.
4. **Nomi italiani**: elenca Metamagie e invocazioni che ho tradotto io (in `scripts/lib/play-lot6.ts`) così li confronto con il manuale.

## Come lavorare con il motore (promemoria tecnico)
- Effetti dichiarativi con `op` e condizione `when` senza parentesi (`A || B && C` = `A || (B && C)`). Op e condizioni elencate in `ARCHITECTURE.md`.
- Pattern dei dati: ogni `LOTn` è un `Record<string, Patch>` con chiave `<idOwner>/<idPrivilegio>`; helper `action`, `rider`, `active`, `lvl`, `ranges` in `play-lot1.ts`.
- Test: mini ruleset in `src/engine/compute/testkit.ts` (il helper `F()` non applica i default di zod: specifica i campi); test privati `lottoN.private.test.ts` e il controllo a tappeto `azioni.private.test.ts` con `buildRuleset` dai JSON.
- Prova nel browser: Playwright con chromium in `/opt/pw-browsers`, `npm run build` e `vite preview` sulla porta 4173 (chiudilo con `fuser -k 4173/tcp`, mai `pkill -f`), backup JSON di prova importato da Impostazioni.
- Deploy sul bunker (te lo preparo io): `git fetch origin main && git checkout main && git reset --hard origin/main`, poi `extract:data` in un container `node:22` e `docker compose up -d --build`, porta 8097.

## Consegna
Alla fine di ogni punto: riepilogo con cosa è diventato giocabile, cosa resta testo e perché, limiti noti, come hai provato (test e browser), aggiornamento di `PLAN2.md`/`DATA_TODO.md`/`ARCHITECTURE.md`. Poi chiedimi se passare al punto successivo.
