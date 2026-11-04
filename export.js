// Esporta ogni elemento .slide di un template HTML in PNG a 1080px.
// Uso: node export.js templates/carosello.html out/
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const [file, outDir = 'out'] = process.argv.slice(2);
  if (!file) { console.error('Uso: node export.js <file.html> [cartella-output]'); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(file));
  await page.evaluate(() => document.fonts.ready);
  const slides = await page.$$('.slide');
  for (let i = 0; i < slides.length; i++) {
    const name = path.join(outDir, `${path.basename(file, '.html')}-${i + 1}.png`);
    await slides[i].screenshot({ path: name });
    console.log('Creato', name);
  }
  await browser.close();
})();
