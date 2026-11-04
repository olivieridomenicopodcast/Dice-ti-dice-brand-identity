// layouts.js — catalogo dei TIPI DI SLIDE (template) di DICETIDICE Studio.
//
// Ogni voce di LAYOUTS descrive un template:
//   id, nome, descrizione   → come appare nell'app
//   tema                    → sfondo predefinito: giallo | scuro | bianco | pergamena
//   campi                   → i campi che l'app mostra (k = chiave dei dati, l = etichetta, t = text | area | foto)
//   segnaposto              → testi di esempio mostrati SOLO nell'anteprima (non vengono esportati)
//   draw(ctx, d, e)         → disegna la slide su canvas (d = dati della slide, e = ambiente)
//
// PER AGGIUNGERE UN NUOVO TEMPLATE: copia un layout simile, cambia id/nome/campi/draw e aggiungilo a LAYOUTS.
// Regole di stile: vedi brand-guide.html e CLAUDE.md. Le misure derivano da templates/carosello.html.

import {
  FORMATI, temi, readBrand, titleBlock, drawBody, measureBody, drawTag, drawFooter, drawFrame,
  drawPhoto, drawPhotoPlaceholder, font, baseline, roundRect, fitText,
} from './render.js';

/* ---------- aiuti comuni ---------- */

// Centra verticalmente un blocco in [top, bottom]; se non ci sta riduce le dimensioni (fino al 60%).
function centra(top, bottom, build) {
  const avail = bottom - top;
  let s = 1, tot = build(s, false, 0);
  while (tot > avail && s > 0.6) { s -= 0.05; tot = build(s, false, 0); }
  build(s, true, top + Math.max(0, (avail - tot) / 2));
}

function slotFoto(ctx, d, e, box, { logoSeVuota = false } = {}) {
  if (e.img) drawPhoto(ctx, e.img, box, { modo: d.modo, fondi: d.fondi });
  else if (e.preview) drawPhotoPlaceholder(ctx, e, box);
  else if (logoSeVuota && e.logo) {
    const s = Math.min(box.w, box.h, 400);
    if (s > 60) ctx.drawImage(e.logo, box.x + box.w - s, box.y + box.h - s, s, s);
  }
}

const T = (ctx, e, o) => titleBlock(ctx, { maxW: e.cw, x: e.mx, color: e.t.accent, ...o });

/* ---------- i template ---------- */

export const LAYOUTS = [
  {
    id: 'cover', nome: 'Copertina', tema: 'giallo',
    descrizione: 'Titolone in alto, foto sfumata, “Scorri →” in basso.',
    campi: [
      { k: 'tag', l: 'Etichetta (opzionale)', t: 'text' },
      { k: 'titolo', l: 'Titolo', t: 'area' },
      { k: 'sottotitolo', l: 'Sottotitolo (opzionale)', t: 'text' },
      { k: 'foto', l: 'Foto', t: 'foto' },
      { k: 'piede', l: 'Testo in basso a sinistra (vuoto = “Scorri →”)', t: 'text' },
    ],
    segnaposto: { titolo: 'Il titolo del tuo carosello' },
    draw(ctx, d, e) {
      const v = e.v; let y = e.top;
      const th = drawTag(ctx, e, v('tag'), e.mx, y);
      if (th) y += th + 44;
      y += T(ctx, e, { text: v('titolo'), fam: 'titoli', max: 112, min: 56, maxLines: 4, lh: 1.02, y }).h;
      const sub = v('sottotitolo');
      if (sub) y += 30 + T(ctx, e, { text: sub, fam: 'fantasy', weight: 700, max: 44, min: 30, maxLines: 3, lh: 1.25, y: y + 30, color: e.t.fg }).h;
      const ft = drawFooter(ctx, e, { left: d.piede || 'Scorri →' });
      slotFoto(ctx, d, e, { x: e.mx, y: y + 34, w: e.cw, h: ft - 24 - (y + 34) }, { logoSeVuota: true });
    },
  },

  {
    id: 'testo_foto', nome: 'Testo + foto', tema: 'scuro',
    descrizione: 'Titolo, paragrafo con parola evidenziata e foto sotto.',
    campi: [
      { k: 'tag', l: 'Etichetta (opzionale)', t: 'text' },
      { k: 'titolo', l: 'Titolo', t: 'area' },
      { k: 'testo', l: 'Testo', t: 'area', rows: 5 },
      { k: 'evidenzia', l: 'Parola/frase da evidenziare (opzionale)', t: 'text' },
      { k: 'foto', l: 'Foto', t: 'foto' },
    ],
    segnaposto: { titolo: 'Titolo del punto', testo: 'Qui va il testo, frasi corte e dirette.' },
    draw(ctx, d, e) {
      const v = e.v; const ft = e.bottom - 84;
      const conFoto = !!e.img || e.preview;
      let y = e.top;
      const th = drawTag(ctx, e, v('tag'), e.mx, y);
      if (th) y += th + 40;
      const titolo = (draw, y0) => T(ctx, e, { text: v('titolo'), fam: 'titoli', max: 100, min: 56, maxLines: 3, lh: 1.02, y: y0, draw });
      if (!conFoto) {
        // senza foto: blocco centrato e testo più grande
        centra(y, ft - 20, (s, draw, y0) => {
          const t = titleBlock(ctx, { text: v('titolo'), fam: 'titoli', max: 100 * s, min: 40, maxW: e.cw, maxLines: 3, lh: 1.02, x: e.mx, y: y0, color: e.t.accent, draw });
          const gap = t.h ? 30 : 0;
          const bh = drawBody(ctx, { text: v('testo'), hl: v('evidenzia'), x: e.mx, y: y0 + t.h + gap, size: 56 * s, maxW: e.cw, color: e.t.fg, evid: e.t.evid, draw });
          return t.h + gap + bh;
        });
        drawFooter(ctx, e, {});
        return;
      }
      const t = titolo(true, y); y += t.h + (t.h ? 30 : 0);
      let size = 42;
      for (; size > 30; size -= 2) {
        if (ft - 30 - (y + measureBody(ctx, v('testo'), size, e.cw) + 34) >= 360) break;
      }
      const bh = drawBody(ctx, { text: v('testo'), hl: v('evidenzia'), x: e.mx, y, size, maxW: e.cw, color: e.t.fg, evid: e.t.evid });
      y += bh;
      slotFoto(ctx, d, e, { x: e.mx, y: y + 34, w: e.cw, h: ft - 30 - (y + 34) });
      drawFooter(ctx, e, {});
    },
  },

  {
    id: 'titolo_foto', nome: 'Titolo + foto grande', tema: 'giallo', modoDefault: 'intera',
    descrizione: 'Una domanda o una frase forte con una foto grande sotto.',
    campi: [
      { k: 'tag', l: 'Etichetta (opzionale)', t: 'text' },
      { k: 'titolo', l: 'Titolo / frase', t: 'area', rows: 3 },
      { k: 'foto', l: 'Foto', t: 'foto' },
    ],
    segnaposto: { titolo: 'Una frase forte o una domanda?' },
    draw(ctx, d, e) {
      const v = e.v; let y = e.top;
      const th = drawTag(ctx, e, v('tag'), e.mx, y);
      if (th) y += th + 40;
      const ft = drawFooter(ctx, e, {});
      // il titolo si riduce finché alla foto resta abbastanza spazio
      const conFoto = !!e.img || e.preview;
      let size = 98, h;
      for (; size > 44; size -= 2) {
        h = fitText(ctx, { text: v('titolo'), fam: 'titoli', weight: 400, max: size, min: size, maxW: e.cw, maxLines: 8, lh: 1.02 }).h;
        if (!conFoto || ft - 24 - (y + h + 30) >= 480) break;
      }
      y += T(ctx, e, { text: v('titolo'), fam: 'titoli', max: size, min: size, maxLines: 8, lh: 1.02, y }).h;
      slotFoto(ctx, d, e, { x: e.mx, y: y + 30, w: e.cw, h: ft - 24 - (y + 30) });
    },
  },

  {
    id: 'citazione', nome: 'Citazione', tema: 'pergamena',
    descrizione: 'Frase memorabile in stile manuale di gioco, con autore.',
    campi: [
      { k: 'tag', l: 'Etichetta (opzionale)', t: 'text' },
      { k: 'testo', l: 'Citazione', t: 'area', rows: 4 },
      { k: 'autore', l: 'Autore / fonte', t: 'text' },
    ],
    segnaposto: { testo: 'Una frase memorabile detta da un autore.', autore: 'Nome Cognome, autore di Nome Gioco' },
    draw(ctx, d, e) {
      const v = e.v; let y = e.top;
      const th = drawTag(ctx, e, v('tag'), e.mx, y);
      if (th) y += th + 30;
      const ft = drawFooter(ctx, e, {});
      let q = v('testo').trim();
      if (q && !/^[“"«]/.test(q)) q = `“${q}”`;
      centra(y, ft - 30, (s, draw, y0) => {
        const r = titleBlock(ctx, { text: q, fam: 'fantasy', weight: 700, max: 84 * s, min: 36, maxW: e.cw, maxLines: 9, lh: 1.2, x: e.mx, y: y0, color: e.t.fg, draw });
        let h = r.h;
        if (v('autore')) {
          h += 50;
          font(ctx, 'testo', 600, 44 * s);
          if (draw) { ctx.fillStyle = e.t.fg; ctx.textAlign = 'left'; ctx.fillText('— ' + v('autore'), e.mx, baseline(ctx, y0 + r.h + 50, 44 * s * 1.3, 44 * s)); }
          h += 44 * s * 1.3;
        }
        return h;
      });
    },
  },

  {
    id: 'dato_freddura', nome: 'Dato + freddura', tema: 'bianco',
    descrizione: 'Un dato curioso in grande e la freddura finale nel riquadro giallo.',
    campi: [
      { k: 'tag', l: 'Etichetta (opzionale)', t: 'text' },
      { k: 'titolo', l: 'Dato curioso (titolo)', t: 'area', rows: 3 },
      { k: 'testo', l: 'Spiegazione', t: 'area', rows: 3 },
      { k: 'freddura', l: 'Freddura finale', t: 'area', rows: 2 },
    ],
    segnaposto: { titolo: 'Un dato curioso, in grande', testo: 'Spiegazione breve del dato.', freddura: 'La freddura finale, sempre peggiore del dato.' },
    draw(ctx, d, e) {
      const v = e.v; let y = e.top;
      const th = drawTag(ctx, e, v('tag'), e.mx, y);
      if (th) y += th + 30;
      const ft = drawFooter(ctx, e, {});
      centra(y, ft - 30, (s, draw, y0) => {
        let yy = y0;
        const t = titleBlock(ctx, { text: v('titolo'), fam: 'titoli', max: 112 * s, min: 40, maxW: e.cw, maxLines: 4, lh: 1.02, x: e.mx, y: yy, color: e.t.accent, draw });
        yy += t.h + (t.h ? 40 : 0);
        yy += drawBody(ctx, { text: v('testo'), hl: '', x: e.mx, y: yy, size: 48 * s, maxW: e.cw, color: e.t.fg, evid: e.t.evid, draw });
        if (v('freddura')) {
          yy += 50;
          const f = fitText(ctx, { text: v('freddura'), fam: 'titoli', weight: 400, max: 62 * s, min: 30, maxW: e.cw - 80 - 8, maxLines: 4, lh: 1.02 });
          const bh = f.h + 72 + 8;
          if (draw) {
            ctx.fillStyle = e.brand.giallo; roundRect(ctx, e.mx, yy, e.cw, bh, 24); ctx.fill();
            ctx.lineWidth = 4; ctx.strokeStyle = e.brand.nero; roundRect(ctx, e.mx + 2, yy + 2, e.cw - 4, bh - 4, 22); ctx.stroke();
            titleBlock(ctx, { text: v('freddura'), fam: 'titoli', max: f.size, min: f.size, maxW: e.cw - 88, maxLines: 8, lh: 1.02, x: e.mx + 44, y: yy + 40, color: e.brand.nero });
          }
          yy += bh;
        }
        return yy - y0;
      });
    },
  },

  {
    id: 'numerato', nome: 'Punto numerato', tema: 'scuro',
    descrizione: 'Numero grande, titolo e testo: per elenchi e capitoli.',
    campi: [
      { k: 'tag', l: 'Etichetta (opzionale)', t: 'text' },
      { k: 'numero', l: 'Numero (es. 01)', t: 'text' },
      { k: 'titolo', l: 'Titolo', t: 'area' },
      { k: 'testo', l: 'Testo', t: 'area', rows: 4 },
      { k: 'evidenzia', l: 'Parola/frase da evidenziare (opzionale)', t: 'text' },
    ],
    segnaposto: { numero: '01', titolo: 'Titolo del punto', testo: 'Qui va il testo del punto.' },
    draw(ctx, d, e) {
      const v = e.v; let y = e.top;
      const th = drawTag(ctx, e, v('tag'), e.mx, y);
      if (th) y += th + 30;
      const ft = drawFooter(ctx, e, {});
      centra(y, ft - 30, (s, draw, y0) => {
        let yy = y0;
        if (v('numero')) {
          const size = 220 * s; font(ctx, 'fantasy', 900, size);
          if (draw) { ctx.fillStyle = e.t.accent; ctx.textAlign = 'left'; ctx.fillText(v('numero'), e.mx, baseline(ctx, yy, size * 0.9, size)); }
          yy += size * 0.9 + 20;
        }
        const t = titleBlock(ctx, { text: v('titolo'), fam: 'titoli', max: 110 * s, min: 40, maxW: e.cw, maxLines: 3, lh: 1.02, x: e.mx, y: yy, color: e.t.accent, draw });
        yy += t.h + (t.h ? 40 : 0);
        yy += drawBody(ctx, { text: v('testo'), hl: v('evidenzia'), x: e.mx, y: yy, size: 56 * s, maxW: e.cw, color: e.t.fg, evid: e.t.evid, draw });
        return yy - y0;
      });
    },
  },

  {
    id: 'cta', nome: 'Chiusura / invito', tema: 'giallo',
    descrizione: 'Logo grande, domanda e riquadro nero con l’invito all’azione.',
    campi: [
      { k: 'titolo', l: 'Domanda / messaggio', t: 'area', rows: 3 },
      { k: 'azione', l: 'Invito nel riquadro nero', t: 'text' },
    ],
    segnaposto: { titolo: 'Domanda rivolta a chi legge?', azione: 'Scrivilo nei commenti!' },
    draw(ctx, d, e) {
      const v = e.v;
      const ft = drawFooter(ctx, e, { center: true });
      centra(e.top, ft - 20, (s, draw, y0) => {
        let yy = y0;
        const L = 340 * s;
        if (draw && e.logo) ctx.drawImage(e.logo, (e.W - L) / 2, yy, L, L);
        yy += L + 40;
        const t = titleBlock(ctx, { text: v('titolo'), fam: 'titoli', max: 80 * s, min: 36, maxW: e.cw, maxLines: 4, lh: 1.1, x: e.mx, y: yy, color: e.t.accent, align: 'center', draw });
        yy += t.h + (t.h ? 40 : 0);
        if (v('azione')) {
          const f = fitText(ctx, { text: v('azione'), fam: 'titoli', weight: 400, max: 80 * s, min: 36, maxW: e.cw - 80, maxLines: 2, lh: 1.02 });
          const bh = f.h + 72;
          if (draw) {
            ctx.fillStyle = e.brand.nero; roundRect(ctx, e.mx, yy, e.cw, bh, 28); ctx.fill();
            titleBlock(ctx, { text: v('azione'), fam: 'titoli', max: f.size, min: f.size, maxW: e.cw - 80, maxLines: 4, lh: 1.02, x: e.mx + 40, y: yy + 36, color: e.brand.giallo, align: 'center' });
          }
          yy += bh;
        }
        return yy - y0;
      });
    },
  },
];

export const LAYOUT_BY_ID = Object.fromEntries(LAYOUTS.map((l) => [l.id, l]));

/* ---------- disegno di una slide completa ---------- */

// env: { formato, brand, logo, handle, fotos (Map id→immagine), preview }
export function renderSlide(canvas, d, env) {
  const F = FORMATI[env.formato] || FORMATI.carosello;
  canvas.width = F.w; canvas.height = F.h;
  const ctx = canvas.getContext('2d');
  const L = LAYOUT_BY_ID[d.layout] || LAYOUTS[0];
  const t = temi(env.brand)[d.tema || L.tema] || temi(env.brand)[L.tema];
  const extra = F.extra || 0;
  const e = {
    W: F.w, H: F.h, mx: 90, cw: F.w - 180, top: 90 + extra, bottom: F.h - 90 - extra, extra,
    t, brand: env.brand, logo: env.logo, handle: env.handle, preview: !!env.preview,
    img: env.fotos.get(d.fotoId) || null,
    v: (k) => d[k] || (env.preview ? (L.segnaposto?.[k] || '') : ''),
  };
  ctx.fillStyle = t.bg; ctx.fillRect(0, 0, F.w, F.h);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  L.draw(ctx, d, e);
  drawFrame(ctx, e);
}
