// app.js — DICETIDICE Studio: interfaccia, stato, salvataggio immagini e brief per Claude.
import { FORMATI, readBrand, temi, loadFonts } from './render.js';
import { LAYOUTS, LAYOUT_BY_ID, renderSlide } from './layouts.js';
import { zipStore } from './zip.js';
import { fotoSalva, fotoLeggi, fotoElimina, fotoSvuota } from './idb.js';
import { BUILD } from './build.js';

const VERSIONE = '1.0.0';
const CHIAVE = 'dtd-stato-v1';

/* ---------- utilità ---------- */

const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10);

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return el;
}

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('visibile');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('visibile'), 2800);
}

/* ---------- stato ---------- */

function nuovaSlide(layout) {
  const L = LAYOUT_BY_ID[layout];
  return {
    id: uid(), layout, tema: L.tema, tag: '', titolo: '', testo: '', evidenzia: '', sottotitolo: '', freddura: '',
    autore: '', numero: '', piede: '', azione: '', fotoId: null, modo: L.modoDefault || 'riempi', fondi: false, nota: '',
  };
}

function statoIniziale() {
  return {
    formato: 'carosello', handle: '@dicetidice',
    slides: [nuovaSlide('cover'), nuovaSlide('testo_foto'), nuovaSlide('cta')],
    brief: { aggiungi: false, nome: '', descr: '' },
  };
}

function carica() {
  try {
    const s = JSON.parse(localStorage.getItem(CHIAVE));
    if (s && Array.isArray(s.slides) && s.slides.length && FORMATI[s.formato]) {
      s.slides = s.slides.filter((x) => LAYOUT_BY_ID[x.layout]);
      if (s.slides.length) return { ...statoIniziale(), ...s, brief: { ...statoIniziale().brief, ...(s.brief || {}) } };
    }
  } catch { /* stato assente o rovinato: si riparte */ }
  return statoIniziale();
}

let S = carica();
let salvaTimer;
function persisti() {
  clearTimeout(salvaTimer);
  salvaTimer = setTimeout(() => { try { localStorage.setItem(CHIAVE, JSON.stringify(S)); } catch { /* spazio finito o storage bloccato */ } }, 250);
}

/* ---------- risorse: logo, brand, foto ---------- */

const brand = readBrand();
const logo = new Image();
const fotos = new Map();      // id → immagine disegnabile
const fotoFiles = new Map();  // id → file originale (per “condividi foto numerate”)
const fotoUrls = new Map();   // id → url per le miniature
const canvases = new Map();   // id slide → canvas anteprima

let pronto = false;
const prontoP = (async () => {
  logo.src = 'assets/logo-dicetidice.png';
  await Promise.all([loadFonts(), logo.decode().catch(() => {})]);
  for (const s of S.slides) {
    if (!s.fotoId) continue;
    const blob = await fotoLeggi(s.fotoId);
    if (blob) await registraFoto(s.fotoId, blob); else s.fotoId = null;
  }
  pronto = true;
})();

async function aDisegnabile(blob) {
  let bmp;
  try { bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' }); }
  catch {
    bmp = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = URL.createObjectURL(blob); });
  }
  const max = 2200, m = Math.max(bmp.width, bmp.height);
  let img = bmp;
  if (m > max) {
    const k = max / m, c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    img = c;
  }
  return tagliaBordiNeri(img);
}

// Toglie le barre nere ai lati/sopra/sotto (tipiche degli screenshot di videogiochi)
function tagliaBordiNeri(src) {
  const W = src.width, H = src.height, sc = Math.min(1, 200 / Math.max(W, H));
  const w = Math.max(1, Math.round(W * sc)), h = Math.max(1, Math.round(H * sc));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  const buio = (i) => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 < 18;
  const colBuia = (cx) => { let n = 0; for (let y = 0; y < h; y++) if (buio((y * w + cx) * 4)) n++; return n / h > 0.985; };
  const rigaBuia = (ry) => { let n = 0; for (let xx = 0; xx < w; xx++) if (buio((ry * w + xx) * 4)) n++; return n / w > 0.985; };
  let l = 0, r = w - 1, t = 0, b = h - 1;
  while (l < r && colBuia(l)) l++;
  while (r > l && colBuia(r)) r--;
  while (t < b && rigaBuia(t)) t++;
  while (b > t && rigaBuia(b)) b--;
  const tolto = l > w * 0.02 || w - 1 - r > w * 0.02 || t > h * 0.02 || h - 1 - b > h * 0.02;
  if (!tolto) return src;
  const sx = Math.floor(l / sc), sy = Math.floor(t / sc);
  const sw = Math.min(W - sx, Math.ceil((r - l + 1) / sc)), sh = Math.min(H - sy, Math.ceil((b - t + 1) / sc));
  if (sw < W * 0.4 || sh < H * 0.4) return src; // immagine davvero scura: non tocco niente
  const o = document.createElement('canvas'); o.width = sw; o.height = sh;
  o.getContext('2d').drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
  return o;
}

async function registraFoto(id, blob) {
  fotoFiles.set(id, blob);
  fotoUrls.set(id, URL.createObjectURL(blob));
  fotos.set(id, await aDisegnabile(blob));
}

function dimenticaFoto(id) {
  if (!id) return;
  fotos.delete(id); fotoFiles.delete(id);
  if (fotoUrls.has(id)) URL.revokeObjectURL(fotoUrls.get(id));
  fotoUrls.delete(id); fotoElimina(id);
}

const env = (preview) => ({ formato: S.formato, brand, logo, handle: S.handle || '@dicetidice', fotos, preview });

/* ---------- anteprime ---------- */

const rafId = new Map();
function ridisegna(slide) {
  cancelAnimationFrame(rafId.get(slide.id));
  rafId.set(slide.id, requestAnimationFrame(async () => {
    await prontoP;
    const c = canvases.get(slide.id);
    if (c) renderSlide(c, slide, env(true));
  }));
}
const ridisegnaTutte = () => S.slides.forEach(ridisegna);

function modificata(slide) { persisti(); if (slide) ridisegna(slide); aggiornaBrief(); }

/* ---------- scheda Crea ---------- */

function disegnaFormati() {
  const box = $('#formati'); box.replaceChildren();
  for (const [id, F] of Object.entries(FORMATI)) {
    box.append(h('button', {
      class: 'chip', type: 'button', role: 'radio', 'aria-checked': String(S.formato === id),
      onclick: () => cambiaFormato(id),
    }, F.label));
  }
  const multi = FORMATI[S.formato].multi;
  $('#aggiungi').disabled = !multi; $('#nuovo-layout').disabled = !multi;
  $('#scarica-tutte').textContent = S.slides.length > 1 ? 'Scarica le immagini' : 'Scarica l’immagine';
  $('#condividi-tutte').textContent = S.slides.length > 1 ? 'Condividi le immagini' : 'Condividi l’immagine';
}

function cambiaFormato(id) {
  if (!FORMATI[id].multi && S.slides.length > 1) {
    if (!confirm('Questo formato ha una sola slide: tengo la prima e tolgo le altre?')) return;
    S.slides.slice(1).forEach((s) => dimenticaFoto(s.fotoId));
    S.slides = S.slides.slice(0, 1);
  }
  S.formato = id; persisti(); disegnaTutto();
}

function chipTema(s, id, nome) {
  const t = temi(brand)[id];
  return h('button', {
    class: 'chip tema' + (s.tema === id ? ' sel' : ''), type: 'button', 'data-tema': id,
    onclick: (ev) => {
      s.tema = id;
      ev.currentTarget.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.toggle('sel', c.dataset.tema === id));
      modificata(s);
    },
  }, h('i', { style: `background:${t.bg}` }), nome);
}

function campoFoto(s) {
  const input = h('input', { type: 'file', accept: 'image/*', hidden: true });
  const miniatura = h('img', { class: 'mini', alt: '' });
  const riga = h('div', { class: 'foto-riga' });
  const opz = h('div', { class: 'opz' });

  const aggiorna = () => {
    riga.replaceChildren();
    opz.replaceChildren();
    if (s.fotoId && fotoUrls.has(s.fotoId)) {
      miniatura.src = fotoUrls.get(s.fotoId);
      riga.append(miniatura,
        h('button', { class: 'btn sec piccolo', type: 'button', onclick: () => input.click() }, 'Cambia foto'),
        h('button', { class: 'btn sec piccolo', type: 'button', onclick: () => { dimenticaFoto(s.fotoId); s.fotoId = null; aggiorna(); modificata(s); } }, 'Rimuovi'));
      opz.append(
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: s.modo === 'intera', onchange: (e) => { s.modo = e.target.checked ? 'intera' : 'riempi'; modificata(s); } }), h('span', {}, 'Mostra la foto intera, senza ritagliarla')),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: s.fondi, onchange: (e) => { s.fondi = e.target.checked; modificata(s); } }), h('span', {}, 'Sfondo chiaro che si fonde con la slide (foto di oggetti)')),
      );
    } else {
      riga.append(h('button', { class: 'btn sec piccolo', type: 'button', onclick: () => input.click() }, 'Scegli una foto'));
    }
  };

  input.addEventListener('change', async () => {
    const file = input.files?.[0]; if (!file) return;
    try {
      const vecchia = s.fotoId; const id = uid();
      await fotoSalva(id, file);
      await registraFoto(id, file);
      s.fotoId = id; dimenticaFoto(vecchia);
      aggiorna(); modificata(s);
    } catch { toast('Non riesco a leggere questa immagine'); }
    input.value = '';
  });
  aggiorna();
  return h('div', {}, input, riga, opz);
}

function scheda(s, i) {
  const L = LAYOUT_BY_ID[s.layout];
  const canvas = h('canvas'); canvases.set(s.id, canvas);
  const multi = FORMATI[S.formato].multi;

  const selLayout = h('select', { 'aria-label': 'Tipo di slide', onchange: (e) => {
    const nuovo = LAYOUT_BY_ID[e.target.value];
    if (s.tema === L.tema) s.tema = nuovo.tema;
    s.modo = nuovo.modoDefault || 'riempi';
    s.layout = nuovo.id; persisti(); disegnaTutto();
  } }, LAYOUTS.map((l) => h('option', { value: l.id }, l.nome)));
  selLayout.value = s.layout;

  const strumenti = multi ? h('div', { class: 'strumenti' },
    h('button', { class: 'btn sec piccolo', type: 'button', 'aria-label': 'Sposta su', disabled: i === 0, onclick: () => sposta(i, -1) }, '↑'),
    h('button', { class: 'btn sec piccolo', type: 'button', 'aria-label': 'Sposta giù', disabled: i === S.slides.length - 1, onclick: () => sposta(i, 1) }, '↓'),
    h('button', { class: 'btn sec piccolo', type: 'button', 'aria-label': 'Duplica', onclick: () => duplica(i) }, '⧉'),
    h('button', { class: 'btn sec piccolo', type: 'button', 'aria-label': 'Elimina', disabled: S.slides.length === 1, onclick: () => elimina(i) }, '✕'),
  ) : null;

  const campi = L.campi.map((c) => {
    if (c.t === 'foto') return h('div', {}, h('div', { class: 'etichetta' }, c.l), campoFoto(s));
    const attr = { value: s[c.k] || '', placeholder: L.segnaposto?.[c.k] || '',
      oninput: (e) => { s[c.k] = e.target.value; modificata(s); } };
    const campo = c.t === 'area' ? h('textarea', { ...attr, rows: c.rows || 2 }) : h('input', { ...attr, type: 'text' });
    return h('div', {}, h('label', { class: 'etichetta' }, c.l), campo);
  });

  return h('div', { class: 'card slide-card', id: 'sl-' + s.id },
    h('div', { class: 'testa' }, h('strong', {}, `Slide ${i + 1}`), strumenti),
    h('label', { class: 'etichetta' }, 'Tipo di slide'), selLayout,
    h('p', { class: 'descr' }, L.descrizione),
    campi,
    h('div', { class: 'etichetta' }, 'Sfondo'),
    h('div', { class: 'chips' }, Object.entries(temi(brand)).map(([id, t]) => chipTema(s, id, t.nome))),
    h('div', { class: 'anteprima' }, canvas,
      h('button', { class: 'btn', type: 'button', onclick: () => scaricaSlide(s, i) }, 'Scarica questa slide'),
      h('button', { class: 'btn sec', type: 'button', onclick: () => condividiSlide(s, i) }, 'Condividi questa slide')),
  );
}

function disegnaTutto() {
  canvases.clear();
  disegnaFormati();
  const box = $('#slides'); box.replaceChildren(...S.slides.map(scheda));
  ridisegnaTutte(); aggiornaBrief();
}

function sposta(i, d) { const j = i + d; if (j < 0 || j >= S.slides.length) return; [S.slides[i], S.slides[j]] = [S.slides[j], S.slides[i]]; persisti(); disegnaTutto(); }
function duplica(i) {
  const c = { ...S.slides[i], id: uid(), fotoId: null };
  const orig = S.slides[i];
  S.slides.splice(i + 1, 0, c);
  if (orig.fotoId && fotoFiles.has(orig.fotoId)) {
    const id = uid(), blob = fotoFiles.get(orig.fotoId);
    fotoSalva(id, blob); registraFoto(id, blob).then(() => { c.fotoId = id; persisti(); disegnaTutto(); });
  }
  persisti(); disegnaTutto();
}
function elimina(i) {
  if (S.slides.length === 1) return;
  if (!confirm(`Eliminare la slide ${i + 1}?`)) return;
  dimenticaFoto(S.slides[i].fotoId); S.slides.splice(i, 1); persisti(); disegnaTutto();
}

/* ---------- salvataggio immagini ---------- */

function slug(t) {
  return (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
}
const baseNome = () => 'dicetidice' + (slug(S.slides.find((s) => s.titolo)?.titolo) ? '-' + slug(S.slides.find((s) => s.titolo).titolo) : '');

async function fileSlide(s, i) {
  await prontoP;
  const c = document.createElement('canvas');
  renderSlide(c, s, env(false));
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
  return new File([blob], `${baseNome()}-${i + 1}.png`, { type: 'image/png' });
}

function scarica(blob, nome) {
  const a = h('a', { href: URL.createObjectURL(blob), download: nome });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

async function condividiOScarica(files) {
  if (navigator.canShare?.({ files })) {
    try { await navigator.share({ files, title: 'DICETIDICE' }); return true; }
    catch (e) { if (e.name === 'AbortError') return true; }
  }
  return false;
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// Download diretto: il file finisce nella cartella Download del telefono (e da lì in Galleria)
async function scaricaSlide(s, i) {
  const f = await fileSlide(s, i);
  scarica(f, f.name); toast('Immagine scaricata: la trovi nei Download');
}

async function scaricaTutte() {
  const files = await Promise.all(S.slides.map(fileSlide));
  for (const f of files) { scarica(f, f.name); await pausa(600); }
  toast(files.length > 1 ? `${files.length} immagini scaricate: le trovi nei Download` : 'Immagine scaricata: la trovi nei Download');
}

// Condivisione: menu del telefono (WhatsApp, Telegram, Quick Share…)
async function condividiSlide(s, i) {
  const f = await fileSlide(s, i);
  if (!(await condividiOScarica([f]))) toast('Condivisione non disponibile qui: usa “Scarica”');
}

async function condividiTutte() {
  const files = await Promise.all(S.slides.map(fileSlide));
  if (!(await condividiOScarica(files))) toast('Condivisione non disponibile qui: usa “Scarica le immagini”');
}

async function salvaZip(files) {
  files = files || await Promise.all(S.slides.map(fileSlide));
  const dati = await Promise.all(files.map(async (f) => ({ name: f.name, data: new Uint8Array(await f.arrayBuffer()) })));
  scarica(zipStore(dati), `${baseNome()}.zip`); toast('Zip scaricato');
}

/* ---------- scheda Brief per Claude ---------- */

const pulisci = (l) => l.replace(/\s*\(.*?\)/g, '');

function componiBrief() {
  const F = FORMATI[S.formato], T = temi(brand), r = [];
  r.push('Crea questi contenuti per DICETIDICE con la brand identity e i template di questo repo (assets/brand.css, brand-guide.html, templates/carosello.html e app/layouts.js).');
  r.push('');
  r.push(`FORMATO: ${F.label} (${F.w}x${F.h})${F.multi ? `, ${S.slides.length} slide` : ''}`);
  r.push(`HANDLE: ${S.handle || '@dicetidice'}`);
  r.push('');
  let n = 0; const ordine = [];
  S.slides.forEach((s, i) => {
    const L = LAYOUT_BY_ID[s.layout];
    r.push(`${F.multi ? 'SLIDE ' + (i + 1) : 'CONTENUTO'} — ${L.nome} (sfondo ${T[s.tema].nome.toLowerCase()})`);
    for (const c of L.campi) {
      if (c.t === 'foto') {
        if (s.fotoId) {
          n++; ordine.push(i + 1);
          r.push(`- Immagine: Immagine ${n} (${s.modo === 'intera' ? 'intera, senza ritaglio' : 'a riempimento'}${s.fondi ? ', sfondo chiaro che si fonde con la slide' : ''})`);
        } else r.push('- Immagine: nessuna');
        continue;
      }
      const val = (s[c.k] || '').trim();
      if (val) r.push(`- ${pulisci(c.l)}: ${val}`);
    }
    if ((s.nota || '').trim()) r.push(`- Nota: ${s.nota.trim()}`);
    r.push('');
  });
  if (n) {
    r.push(`IMMAGINI: ti allego ${n} immagini, in quest'ordine: ${ordine.map((sl, k) => `Immagine ${k + 1} → ${F.multi ? 'slide ' + sl : 'contenuto'}`).join(', ')}.`);
    r.push('');
  }
  r.push('ISTRUZIONI: usa i testi esattamente come li ho scritti, senza riscriverli. Mostrami le immagini qui in chat e, quando ti dico che vanno bene, ridammele come file PNG da scaricare.');
  if (S.brief.aggiungi) {
    r.push('');
    r.push(`NUOVO TEMPLATE: ${S.brief.nome.trim() || '(scegli tu un nome adatto)'}`);
    r.push('Dopo aver creato le immagini, salva questo design come nuovo template dell\'app: aggiungi un nuovo layout in app/layouts.js (stessa struttura degli altri: id, nome, descrizione, tema, campi, segnaposto, draw) così compare tra i tipi di slide, e aggiungi un esempio in templates/. Non modificare i layout esistenti.');
    r.push(`Come deve essere: ${S.brief.descr.trim().replace(/[.\s]+$/, '') || 'quello che hai appena creato per queste slide'}.`);
    r.push('Se aggiungi file nuovi, inseriscili nella lista FILE di sw.js. Poi fai commit e push.');
  }
  return r.join('\n');
}

function aggiornaBrief() {
  const t = $('#testo-brief'); if (t) t.value = componiBrief();
  const box = $('#note-slide'); if (!box) return;
  if (box.dataset.n !== String(S.slides.map((s) => s.id).join())) {
    box.dataset.n = S.slides.map((s) => s.id).join();
    box.replaceChildren(...S.slides.map((s, i) => h('div', {},
      h('label', { class: 'etichetta' }, `${FORMATI[S.formato].multi ? 'Slide ' + (i + 1) : 'Contenuto'} — ${LAYOUT_BY_ID[s.layout].nome}`),
      h('input', { type: 'text', value: s.nota || '', placeholder: 'Es. metti la foto più grande',
        oninput: (e) => { s.nota = e.target.value; persisti(); aggiornaBrief(); } }))));
  }
}

async function copia(testo) {
  try { await navigator.clipboard.writeText(testo); return true; }
  catch {
    const t = $('#testo-brief'); t.removeAttribute('readonly'); t.select(); const ok = document.execCommand('copy'); t.setAttribute('readonly', ''); return ok;
  }
}

async function condividiFoto() {
  const files = []; let n = 0;
  for (const s of S.slides) {
    const f = s.fotoId && fotoFiles.get(s.fotoId); if (!f) continue;
    n++; const ext = (f.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    files.push(new File([f], `immagine-${n}.${ext}`, { type: f.type }));
  }
  if (!files.length) return toast('Non hai ancora caricato nessuna foto');
  if (!(await condividiOScarica(files))) toast('Questo browser non può condividere le foto: allegale a mano, nell’ordine indicato');
}

/* ---------- impostazioni e avvio ---------- */

function vaiA(tab) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('attiva', t.id === 'tab-' + tab));
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('attiva', b.dataset.tab === tab));
  if (tab === 'brief') aggiornaBrief();
  scrollTo({ top: 0 });
}

// Chiede al server il numero di build più recente: se è più alto di quello caricato, propone di aggiornare.
async function controllaAggiornamento() {
  try {
    const r = await fetch(`app/build.js?check=${Date.now()}`, { cache: 'no-store' });
    const n = Number((/BUILD\s*=\s*(\d+)/.exec(await r.text()) || [])[1]);
    if (n > BUILD) {
      const b = $('#aggiorna');
      b.textContent = `Disponibile la build ${n}: tocca per aggiornare`; b.hidden = false;
      b.onclick = async () => {
        try { for (const k of await caches.keys()) await caches.delete(k); } catch { /* niente cache */ }
        location.reload();
      };
    }
  } catch { /* offline: nessun controllo */ }
}

function avvia() {
  $('#nuovo-layout').replaceChildren(...LAYOUTS.map((l) => h('option', { value: l.id }, l.nome)));
  $('#aggiungi').addEventListener('click', () => {
    if (!FORMATI[S.formato].multi) return;
    const s = nuovaSlide($('#nuovo-layout').value); S.slides.push(s); persisti(); disegnaTutto();
    $('#sl-' + s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#scarica-tutte').addEventListener('click', scaricaTutte);
  $('#condividi-tutte').addEventListener('click', condividiTutte);
  $('#salva-zip').addEventListener('click', () => salvaZip());

  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => vaiA(b.dataset.tab)));

  const ck = $('#aggiungi-template'), dati = $('#dati-template');
  ck.checked = S.brief.aggiungi; dati.hidden = !S.brief.aggiungi;
  ck.addEventListener('change', () => { S.brief.aggiungi = ck.checked; dati.hidden = !ck.checked; persisti(); aggiornaBrief(); });
  $('#nome-template').value = S.brief.nome; $('#descr-template').value = S.brief.descr;
  $('#nome-template').addEventListener('input', (e) => { S.brief.nome = e.target.value; persisti(); aggiornaBrief(); });
  $('#descr-template').addEventListener('input', (e) => { S.brief.descr = e.target.value; persisti(); aggiornaBrief(); });

  $('#copia-brief').addEventListener('click', async () => toast((await copia(componiBrief())) ? 'Brief copiato: incollalo in Claude Code' : 'Non sono riuscito a copiare'));
  $('#condividi-brief').addEventListener('click', async () => {
    try { await navigator.share({ text: componiBrief() }); } catch (e) { if (e.name !== 'AbortError') toast((await copia(componiBrief())) ? 'Brief copiato' : 'Condivisione non disponibile'); }
  });
  $('#condividi-foto').addEventListener('click', condividiFoto);

  const handle = $('#handle'); handle.value = S.handle;
  handle.addEventListener('input', () => { S.handle = handle.value.trim(); persisti(); ridisegnaTutte(); aggiornaBrief(); });
  $('#elenco-template').replaceChildren(...LAYOUTS.map((l) => h('li', {}, h('b', {}, l.nome), ' — ', l.descrizione)));
  $('#versione').textContent = `DICETIDICE Studio v${VERSIONE} · ${LAYOUTS.length} template · build ${BUILD}`;
  $('#build-num').textContent = `build ${BUILD}`;
  controllaAggiornamento();
  $('#azzera').addEventListener('click', async () => {
    if (!confirm('Cancellare testi e foto e ricominciare da zero?')) return;
    try { localStorage.removeItem(CHIAVE); } catch { /* niente */ }
    await fotoSvuota(); location.reload();
  });

  disegnaTutto();
  prontoP.then(disegnaTutto);
}

avvia();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* senza service worker l'app funziona, ma non offline */ });
}
