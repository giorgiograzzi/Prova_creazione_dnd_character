# Personaggi D&D 5.5 (2024) — PWA

App per creare e gestire personaggi di D&D 5.5 (2024), in italiano, offline.

## Requisiti
Node 22 o più recente consigliato (i test con Vitest 5 lo richiedono). `extract:data` e `validate:data` funzionano anche su Node 20.

## Comandi
- `npm run dev` — sviluppo
- `npm run build` — build di produzione (typecheck + Vite + PWA)
- `npm test` — test (Vitest)
- `npm run extract:data` — estrae i dati dai PDF in `docs/rules/` (PDF 01-05 e `05_conditions.json`) verso `data/private/` (entrambi non tracciati)
- `npm run validate:data` — valida i JSON in `data/` (schema + riferimenti incrociati)

## Struttura
- `src/engine` — motore di regole, senza UI
- `src/store`, `src/db` — stato (Zustand) e persistenza (Dexie)
- `src/ui`, `src/pages` — interfaccia
- `src/i18n/it.json` — tutti i testi
- `data/srd`, `data/private` — dati di gioco
- `data/homebrew` — pacchetti di esempio e modello per l'homebrew (non sono dati di gioco: si importano dall'app)
- `docs/rules/` — PDF delle regole (non tracciati)

## Docker (consigliato sul server)
Un container nginx serve i file dell'app (porta predefinita **8097**, cambiabile in `.env`).

```
cd ~/Prova_creazione_dnd_character
git pull origin claude/loving-fermi-icioo5     # oppure main, dopo il merge
ls data/private                                # i dati di gioco (non sono in git): devono esserci PRIMA del build
cp .env.example .env                           # solo la prima volta; dentro c'è PORT=8097
docker compose up -d --build
sudo ufw allow 8097/tcp                        # se il firewall blocca la porta
```
- I dati di gioco finiscono **dentro** l'app al momento del build: se cambi i PDF o gli estrattori, rigenerali (`npm run extract:data`) e rifai `docker compose up -d --build`.
  Se `data/private` manca l'app parte lo stesso, ma senza classi, specie e incantesimi (il build lo segnala).
- Aggiornare: `git pull` e di nuovo `docker compose up -d --build`. Chi ha l'app installata vede l'avviso «nuova versione», tocca **Aggiorna**.
- Controllo: `docker compose ps` (deve dire *healthy*) e `docker compose logs -f`.
- I personaggi e l'homebrew stanno **nel browser di ogni dispositivo**, non sul server: per spostarli o salvarli usa Esporta backup (l'app ricorda di farlo ogni 30 giorni).

### PWA: serve HTTPS
Installazione e uso offline funzionano **solo** da un indirizzo HTTPS (o da `localhost`): da `http://192.168.1.13:8097` la pagina si apre, ma il browser non installa l'app e non la tiene in cache.
Per il telefono usa un sottodominio del tunnel Cloudflare, per esempio `dnd.grazzi.me` → `http://localhost:8097`:
1. in `/etc/cloudflared/config.yml` (e nella copia in `~/.cloudflared/`), prima del catch-all `http_status:404`: `- hostname: dnd.grazzi.me` / `service: http://localhost:8097`
2. `cloudflared tunnel ingress validate && sudo systemctl restart cloudflared`
3. nel dashboard Cloudflare crea il CNAME `dnd` → `e20da28d-9d36-4e51-b2b6-eeca60bbdb41.cfargotunnel.com`
4. apri `https://dnd.grazzi.me` dal telefono, poi Installa (Android/desktop) oppure Condividi → Aggiungi alla schermata Home (iPhone).
Dopo il primo caricamento l'app funziona senza rete (compresa la stampa della scheda PDF).

## Sviluppo e prova veloce (senza Docker)
`npm run build && npx vite preview --host --port 4173`. Per lasciarlo acceso a terminale chiuso:
`nohup npx vite preview --host --port 4173 > ~/preview.log 2>&1 &` (si ferma con `pkill -f "[v]ite preview"`).
Con la PWA in Home, dopo un aggiornamento importante chiudi e riapri l'app (se resta bianca: rimuovi l'icona e riaggiungila).

## Homebrew
Tab **Homebrew**: armi, armature, oggetti, talenti (con catalogo di effetti) e incantesimi tuoi; attiva/disattiva, duplica, modifica, elimina; "Dai al personaggio"; negozio con filtro Homebrew;
export/import di pacchetti `.json` versionati. Esempi e modello commentato in `data/homebrew/`. Le voci stanno nel browser: per spostarle usa Esporta pacchetto.

Vedi `PLAN.md` per gli step, `ARCHITECTURE.md` per le scelte tecniche.

## Dati di gioco (non tracciati)
`data/private/` e `docs/rules/*.pdf` sono ignorati da git. Per rigenerare i dati serve avere i PDF in
`docs/rules/` (o `RULES_DIR=...`), poi `npm run extract:data && npm run validate:data`.
Senza dati l'app parte comunque, con un ruleset vuoto.
