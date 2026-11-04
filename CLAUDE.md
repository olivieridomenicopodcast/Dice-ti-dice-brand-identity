# DICETIDICE — istruzioni per Claude Code

Repo della brand identity di **DICETIDICE** (progetto nerd su giochi da tavolo di Niky) e della PWA **DICETIDICE Studio** che genera caroselli e post. Rispondi sempre in italiano, tono diretto.

## Brand identity (fonte unica: `assets/brand.css`)
- **Colori:** giallo dado `#FED805` (guida), nero `#010101`, antracite `#1C1B1A`, bianco dado `#FEFCF3`, pergamena `#F1E4BD`, rosso lingua `#FB4848` (solo accenti), grigio ombra `#B8B4AE`.
- **Font** (in `fonts/`, OFL): Permanent Marker per titoli/numeri/freddure, Cinzel 700/900 per tag, citazioni e piè di pagina, Nunito per il testo.
- **Stile:** fantasy / tavolo da gioco, grafiche pulite e poche decorazioni, cornice sottile (richiamo carta da gioco), foto con angoli tondi e bordi sfumati, una parola evidenziata per slide.
- **Tono:** ironico e freddurista, la battuta arriva dopo il dato. Frasi corte.
- **Formati:** carosello/post 4:5 (1080×1350), post quadrato 1080×1080, cover reel 9:16 (1080×1920, contenuto nella fascia centrale 3:4).
- Dettagli e regole d'uso: `brand-guide.html`.

## Struttura del repo
- `index.html`, `app/`, `sw.js`, `manifest.webmanifest`, `icons/`: la PWA (si pubblica con GitHub Pages dalla radice del repo).
- `app/layouts.js`: **catalogo dei template** (tipi di slide). `app/render.js`: primitive di disegno su canvas.
- `assets/`: logo e `brand.css`. `templates/carosello.html`: versione HTML di riferimento del carosello. `export.js`: esporta i `.slide` di un HTML in PNG (Playwright).

## Quando Niky incolla un brief da DICETIDICE Studio
1. Usa i **testi esattamente come scritti**, senza riscriverli. Se vedi errori evidenti, segnalali ma non cambiarli da solo.
2. Le immagini allegate sono numerate (`immagine-1`, `immagine-2`…): abbinale alle slide come indicato nel brief.
3. Crea le slide con i template di `app/layouts.js` (stessa resa dell'app). Se serve, renderizzale con Playwright caricando l'app con lo stato nel `localStorage` (chiave `dtd-stato-v1`) oppure con `export.js`.
4. Mostra prima le anteprime in chat, correggi finché Niky non è soddisfatto, poi consegna i PNG con `SendUserFile` (anche in uno zip).
5. Non committare nel repo le foto che Niky allega (screenshot di giochi, copertine: hanno copyright). Nel repo restano solo template, brand e codice.
6. Controlla le fonti solo se Niky lo chiede o se il contenuto contiene fatti verificabili da rivedere: in quel caso cerca sul web e dichiara cosa è confermato e cosa no.

## Quando il brief chiede "NUOVO TEMPLATE"
Aggiungi un layout a `LAYOUTS` in `app/layouts.js` seguendo la struttura degli altri (`id`, `nome`, `descrizione`, `tema`, `campi`, `segnaposto`, `draw`):
- Non toccare i layout esistenti.
- Riusa le primitive di `app/render.js` e le misure del brand (margini 90 px, cornice a 38 px, piè di pagina da 84 px).
- Il layout deve adattarsi a tutti i formati (`e.top`, `e.bottom`, `e.cw`) e funzionare con testi vuoti o lunghi (titoli con `fitText`, blocchi con `centra`).
- Aggiungi un esempio in `templates/` se utile. Se crei **file nuovi**, aggiungili alla lista `FILE` di `sw.js`; se cambi file esistenti non serve altro (la cache si aggiorna da sola).
- Verifica con Playwright: nessun errore in console, anteprima corretta nei formati `carosello` e `reel`, export senza testi di esempio.

## Numero di build (in fondo all'app, in basso a sinistra)
L'app mostra "build N", dove N = numero di commit, così Niky capisce se ha la versione aggiornata (e l'app avvisa da sola se ne esiste una più nuova).
**Prima di OGNI commit** esegui: `sh scripts/aggiorna-build.sh && git add app/build.js`. Non servono hook di git: lo script lo lanci a mano.

## Regole di lavoro
- Sviluppa sul branch indicato dalla sessione, fai commit chiari e push. Non aprire pull request se non richiesto.
- Non cambiare i colori o i font fuori da `assets/brand.css`.
