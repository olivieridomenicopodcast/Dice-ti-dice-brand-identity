// render.js — primitive di disegno su canvas per le slide DICETIDICE.
// Nessuna dipendenza. I colori vengono letti da assets/brand.css (unica fonte della brand identity).

export const FORMATI = {
  carosello: { label: 'Carosello 4:5', w: 1080, h: 1350, multi: true, extra: 0 },
  post:      { label: 'Post 4:5',      w: 1080, h: 1350, multi: false, extra: 0 },
  quadrato:  { label: 'Post quadrato', w: 1080, h: 1080, multi: false, extra: 0 },
  // Cover reel 9:16: il contenuto sta nella fascia centrale 3:4, che resta visibile nella griglia del profilo
  reel:      { label: 'Cover reel 9:16', w: 1080, h: 1920, multi: false, extra: 240 },
};

export const FAMIGLIE = {
  titoli: '"Permanent Marker", cursive',
  fantasy: 'Cinzel, serif',
  testo: 'Nunito, sans-serif',
};

export const FONT_DA_CARICARE = [
  '400 40px "Permanent Marker"',
  '700 40px Cinzel', '900 40px Cinzel',
  '400 40px Nunito', '600 40px Nunito', '800 40px Nunito',
];

export function loadFonts() {
  const tutti = Promise.all(FONT_DA_CARICARE.map((f) => document.fonts.load(f, 'AaÈè0123')));
  const timeout = new Promise((r) => setTimeout(r, 5000));
  return Promise.race([tutti, timeout]);
}

export function readBrand() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n, d) => cs.getPropertyValue(n).trim() || d;
  return {
    giallo: g('--giallo', '#FED805'), nero: g('--nero', '#010101'), antracite: g('--antracite', '#1C1B1A'),
    bianco: g('--bianco', '#FEFCF3'), rosso: g('--rosso', '#FB4848'), pergamena: g('--pergamena', '#F1E4BD'),
    ombra: g('--ombra', '#B8B4AE'),
  };
}

// Temi (sfondi) disponibili per ogni slide
export function temi(b) {
  return {
    giallo:    { nome: 'Giallo',    bg: b.giallo,    fg: b.nero,      accent: b.nero,      evid: b.bianco,             line: b.nero },
    scuro:     { nome: 'Scuro',     bg: b.antracite, fg: b.bianco,    accent: b.giallo,    evid: 'rgba(254,216,5,.45)', line: b.bianco },
    bianco:    { nome: 'Bianco',    bg: b.bianco,    fg: b.nero,      accent: b.nero,      evid: b.giallo,             line: b.nero },
    pergamena: { nome: 'Pergamena', bg: b.pergamena, fg: b.antracite, accent: b.antracite, evid: b.giallo,             line: b.antracite },
  };
}

/* ---------- utilità testo ---------- */

export function font(ctx, fam, weight, size) {
  ctx.font = `${weight} ${size}px ${FAMIGLIE[fam]}`;
}

export function baseline(ctx, top, lineH, size) {
  const m = ctx.measureText('Hg');
  const asc = m.fontBoundingBoxAscent ?? size * 0.8;
  const desc = m.fontBoundingBoxDescent ?? size * 0.2;
  return top + (lineH - (asc + desc)) / 2 + asc;
}

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text || '').split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(''); continue; }
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (!line || ctx.measureText(t).width <= maxW) line = t; else { out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}

// Riduce il corpo del testo finché sta nel numero massimo di righe e nella larghezza
export function fitText(ctx, { text, fam, weight, max, min, maxW, maxLines, lh }) {
  if (!String(text || '').trim()) return { size: max, lines: [], lineH: max * lh, h: 0 };
  let size = max, lines;
  for (;;) {
    font(ctx, fam, weight, size);
    lines = wrapLines(ctx, text, maxW);
    const troppoLarga = lines.some((l) => ctx.measureText(l).width > maxW + 0.5);
    if ((lines.length <= maxLines && !troppoLarga) || size <= min) break;
    size -= 2;
  }
  return { size, lines, lineH: size * lh, h: lines.length * size * lh };
}

function hasSpacing(ctx) { return 'letterSpacing' in ctx; }

export function spacedWidth(ctx, text, sp) {
  if (hasSpacing(ctx)) { ctx.letterSpacing = sp + 'px'; const w = ctx.measureText(text).width - sp; ctx.letterSpacing = '0px'; return w; }
  let w = 0; for (const ch of text) w += ctx.measureText(ch).width + sp; return w - sp;
}

// Testo con spaziatura tra le lettere; x = bordo sinistro (align left) o centro (align center)
export function drawSpaced(ctx, text, x, y, sp, align = 'left') {
  const w = spacedWidth(ctx, text, sp);
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.textAlign = 'left';
  if (hasSpacing(ctx)) { ctx.letterSpacing = sp + 'px'; ctx.fillText(text, cx, y); ctx.letterSpacing = '0px'; return; }
  for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + sp; }
}

function drawLines(ctx, lines, x, y, lineH, size, maxW, align, color) {
  ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  lines.forEach((l, i) => {
    const w = ctx.measureText(l).width;
    const cx = align === 'center' ? x + (maxW - w) / 2 : x;
    ctx.fillText(l, cx, baseline(ctx, y + i * lineH, lineH, size));
  });
}

// Titolo/sottotitolo a dimensione adattiva. draw=false: solo misura.
export function titleBlock(ctx, { text, fam, weight = 400, max, min, maxW, maxLines, lh, x, y, color, align = 'left', draw = true }) {
  const r = fitText(ctx, { text, fam, weight, max, min, maxW, maxLines, lh });
  if (draw && r.lines.length) drawLines(ctx, r.lines, x, y, r.lineH, r.size, maxW, align, color);
  return r;
}

/* ---------- testo corrente con parola evidenziata ---------- */

function wrapTokens(ctx, text, maxW) {
  const lines = []; let idx = 0;
  for (const para of String(text || '').split('\n')) {
    const words = para.split(/\s+/).filter(Boolean).map((t) => ({ t, i: idx++ }));
    if (!words.length) { lines.push([]); continue; }
    let cur = [];
    for (const w of words) {
      const test = [...cur, w].map((x) => x.t).join(' ');
      if (cur.length && ctx.measureText(test).width > maxW) { lines.push(cur); cur = [w]; } else cur.push(w);
    }
    lines.push(cur);
  }
  return lines;
}

function highlightSet(text, phrase) {
  const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  const words = String(text || '').split(/\s+/).filter(Boolean).map(norm);
  const ph = String(phrase || '').split(/\s+/).filter(Boolean).map(norm).filter(Boolean);
  const set = new Set();
  if (!ph.length) return set;
  for (let i = 0; i + ph.length <= words.length; i++) {
    if (ph.every((p, j) => words[i + j] === p)) ph.forEach((_, j) => set.add(i + j));
  }
  return set;
}

export function measureBody(ctx, text, size, maxW, lh = 1.38) {
  if (!String(text || '').trim()) return 0;
  font(ctx, 'testo', 600, size);
  return wrapTokens(ctx, text, maxW).length * size * lh;
}

export function drawBody(ctx, { text, hl, x, y, size, maxW, color, evid, lh = 1.38, align = 'left', draw = true }) {
  if (!String(text || '').trim()) return 0;
  font(ctx, 'testo', 600, size);
  const lines = wrapTokens(ctx, text, maxW);
  const lineH = size * lh;
  if (draw) {
    const set = highlightSet(text, hl);
    const space = ctx.measureText(' ').width;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    lines.forEach((ws, li) => {
      const top = y + li * lineH;
      const base = baseline(ctx, top, lineH, size);
      const wLine = ctx.measureText(ws.map((w) => w.t).join(' ')).width;
      let cx = align === 'center' ? x + (maxW - wLine) / 2 : x;
      const pos = ws.map((w) => { const p = cx; cx += ctx.measureText(w.t).width + space; return p; });
      ws.forEach((w, k) => {
        if (!set.has(w.i)) return;
        const ww = ctx.measureText(w.t).width;
        const prossimaEv = ws[k + 1] && set.has(ws[k + 1].i);
        ctx.fillStyle = evid;
        ctx.fillRect(pos[k], base - size * 0.17, ww + (prossimaEv ? space : 0), size * 0.42);
      });
      ctx.fillStyle = color;
      ws.forEach((w, k) => ctx.fillText(w.t, pos[k], base));
    });
  }
  return lines.length * lineH;
}

/* ---------- elementi comuni ---------- */

export function drawTag(ctx, e, text, x, y) {
  if (!text) return 0;
  const size = 28, sp = size * 0.14, h = 60;
  font(ctx, 'fantasy', 700, size);
  const t = text.toUpperCase();
  const w = spacedWidth(ctx, t, sp) + 44 + 6;
  ctx.lineWidth = 3; ctx.strokeStyle = e.t.accent;
  roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, (h - 3) / 2); ctx.stroke();
  ctx.fillStyle = e.t.accent; ctx.textBaseline = 'alphabetic';
  drawSpaced(ctx, t, x + 25, baseline(ctx, y, h, size), sp);
  return h;
}

// Piè di pagina: handle a sinistra, logo piccolo a destra. Ritorna la y in cui inizia.
export function drawFooter(ctx, e, { left, logo = true, center = false }) {
  const size = 84, y = e.bottom - size;
  font(ctx, 'fantasy', 700, 26);
  ctx.fillStyle = e.t.fg; ctx.textBaseline = 'alphabetic';
  const base = baseline(ctx, y, size, 26);
  if (center) drawSpaced(ctx, left || e.handle, e.W / 2, base, 26 * 0.12, 'center');
  else {
    drawSpaced(ctx, left || e.handle, e.mx, base, 26 * 0.12);
    if (logo && e.logo) ctx.drawImage(e.logo, e.W - e.mx - size, y, size, size);
  }
  return y;
}

export function drawFrame(ctx, e) {
  ctx.lineWidth = 4; ctx.strokeStyle = e.t.fg; ctx.globalAlpha = 0.9;
  roundRect(ctx, 38, 38 + e.extra, e.W - 76, e.H - 76 - 2 * e.extra, 26); ctx.stroke();
  ctx.globalAlpha = 1;
}

/* ---------- foto con bordi sfumati e angoli tondi ---------- */

export function drawPhoto(ctx, img, box, { modo = 'riempi', fondi = false, radius = 44 } = {}) {
  if (!img || box.w < 20 || box.h < 20) return;
  let { x, y, w, h } = box;
  const ar = img.width / img.height;
  if (modo === 'intera') {
    let tw = w, th = w / ar;
    if (th > h) { th = h; tw = h * ar; }
    x += (w - tw) / 2; y += (h - th) / 2; w = tw; h = th;
  }
  const off = document.createElement('canvas');
  off.width = Math.round(w); off.height = Math.round(h);
  const o = off.getContext('2d');
  roundRect(o, 0, 0, off.width, off.height, radius); o.save(); o.clip();
  const r = Math.max(off.width / img.width, off.height / img.height);
  const dw = img.width * r, dh = img.height * r;
  if (fondi && 'filter' in o) o.filter = 'brightness(1.07) contrast(1.03)';
  o.drawImage(img, (off.width - dw) / 2, (off.height - dh) / 2, dw, dh);
  o.restore(); o.filter = 'none';
  o.globalCompositeOperation = 'destination-in';
  let g = o.createLinearGradient(0, 0, off.width, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.07, '#000'); g.addColorStop(0.93, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
  o.fillStyle = g; o.fillRect(0, 0, off.width, off.height);
  g = o.createLinearGradient(0, 0, 0, off.height);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.09, '#000'); g.addColorStop(0.91, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
  o.fillStyle = g; o.fillRect(0, 0, off.width, off.height);
  ctx.save();
  if (fondi) ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(off, x, y);
  ctx.restore();
}

// Segnaposto della foto (solo anteprima, non viene esportato)
export function drawPhotoPlaceholder(ctx, e, box) {
  if (box.w < 20 || box.h < 20) return;
  ctx.save();
  ctx.globalAlpha = 0.5; ctx.strokeStyle = e.t.fg; ctx.lineWidth = 4; ctx.setLineDash([22, 16]);
  roundRect(ctx, box.x + 2, box.y + 2, box.w - 4, box.h - 4, 44); ctx.stroke();
  ctx.setLineDash([]);
  font(ctx, 'testo', 800, 38); ctx.fillStyle = e.t.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('Aggiungi una foto', box.x + box.w / 2, box.y + box.h / 2 + 12);
  ctx.restore(); ctx.textAlign = 'left';
}
