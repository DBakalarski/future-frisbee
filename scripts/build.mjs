// Generuje statyczne strony z plików *.dc.html.
// Uruchom: node scripts/build.mjs
//
// Pliki .dc.html to źródło (edytowalne w narzędziu do projektowania, renderowane
// w przeglądarce przez support.js + React). Pliki .html to wersja do publikacji:
// czysty HTML/CSS + mały skrypt, bez Reacta. Wspólne styles.css i site.js
// są wklejane do każdej strony (jedno zapytanie mniej, szybszy pierwszy ekran).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PAGES = [
  {
    src: 'Future Frisbee.dc.html',
    out: 'index.html',
    description:
      'Dog frisbee, przygotowanie motoryczne psa (dogfitness) i behawiorystyka. Zajęcia indywidualne i grupowe — na miejscu i online, warsztaty i seminaria. Psy pobudliwe, reaktywne i lękliwe mile widziane.',
  },
  {
    src: 'Oferta.dc.html',
    out: 'oferta.html',
    description:
      'Ceny i opis zajęć: indywidualne (150 zł, pakiet 6 spotkań 750 zł), grupowe (600 zł / 6 spotkań), programy treningowe dla zawodników, warsztaty, seminaria i pokazy.',
  },
  {
    src: 'O mnie.dc.html',
    out: 'o-mnie.html',
    description:
      'Trener dog frisbee i zawodnik freestyle z border collie Fofonem i Brewką. Podejście do pracy z psami pobudliwymi, reaktywnymi i lękliwymi oraz doświadczenie.',
  },
];

// Próg mobilny dla {{ pól }} i <sc-if> (gdyby wróciły do szablonu).
const MOBILE = '(max-width: 859px)';

// Wartości z renderVals(): [desktop, mobile]. Nieznane pole przerywa build.
const VARS = {};
const FLAGS = {};

// ---------------------------------------------------------------------------

const read = f => readFileSync(join(ROOT, f), 'utf8');
const isLocal = href => href && !/^(https?:)?\/\//.test(href) && !href.startsWith('data:');

const between = (s, open, close) => {
  const a = s.indexOf(open);
  const b = s.lastIndexOf(close);
  if (a === -1 || b === -1) throw new Error(`Brak ${open}…${close} w pliku źródłowym`);
  return s.slice(a + open.length, b);
};

// Wymiary WebP z nagłówka pliku (bez zależności).
function webpSize(file) {
  const b = readFileSync(join(ROOT, file));
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (chunk === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  throw new Error(`Nie umiem odczytać wymiarów ${file}`);
}

function build({ src: srcFile, out: outFile, description }) {
  const src = read(srcFile);
  let body = between(src, '<x-dc>', '</x-dc>');
  const helmet = between(body, '<helmet>', '</helmet>');
  body = body.slice(body.indexOf('</helmet>') + '</helmet>'.length).trim();

  const title = (helmet.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'Future Frisbee';
  const inlineCss = (helmet.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
  const fontLinks = [...helmet.matchAll(/<link [^>]*fonts\.googleapis\.com\/css2[^>]*>/g)].map(m => m[0]);
  const localCss = [...helmet.matchAll(/<link [^>]*rel="stylesheet"[^>]*>/g)]
    .map(m => m[0].match(/href="([^"]+)"/)?.[1])
    .filter(isLocal)
    .map(read);
  const localJs = [...helmet.matchAll(/<script [^>]*src="([^"]+)"[^>]*><\/script>/g)]
    .map(m => m[1])
    .filter(isLocal)
    .map(read);

  if (/<sc-(else|for)\b|<dc-import|<x-import/.test(body)) {
    throw new Error(`${srcFile}: szablon używa sc-else/sc-for/importów — build.mjs tego nie obsługuje.`);
  }

  // sc-if → div z klasą chowaną media query
  const extraCss = [];
  body = body.replace(/<sc-if value="\{\{\s*(\w+)\s*\}\}"[^>]*>/g, (_, name) => {
    const flag = FLAGS[name];
    if (!flag) throw new Error(`${srcFile}: nieznana flaga {{ ${name} }} w sc-if — dopisz ją do FLAGS`);
    const cls = `if-${name}`;
    extraCss.push(`.${cls}{display:${flag[0] ? 'contents' : 'none'}}`);
    extraCss.push(`@media ${MOBILE}{.${cls}{display:${flag[1] ? 'contents' : 'none'}}}`);
    return `<div class="${cls}">`;
  });
  body = body.replace(/<\/sc-if>/g, '</div>');

  // {{ pole }} → var(--pole)
  const usedVars = new Set();
  body = body.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, name) => {
    if (/Ref$/.test(name)) return m; // refy usuwamy niżej razem z atrybutem
    if (!VARS[name]) throw new Error(`${srcFile}: nieznane pole {{ ${name} }} — dopisz je do VARS`);
    usedVars.add(name);
    return `var(--${name})`;
  });

  // Przetwarzanie atrybutów każdego znacznika otwierającego.
  const hoverRules = new Map();
  let firstImg = true;
  body = body.replace(/<([a-z][\w-]*)(\s[^>]*?)?(\/?)>/g, (tag, name, rawAttrs = '', selfClose) => {
    if (!rawAttrs.trim()) return tag;
    const attrs = [...rawAttrs.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)].map(m => [m[1], m[2]]);
    const get = k => attrs.find(a => a[0] === k)?.[1];
    const set = (k, v) => {
      const a = attrs.find(x => x[0] === k);
      if (a) a[1] = v; else attrs.push([k, v]);
    };
    const del = k => { const i = attrs.findIndex(a => a[0] === k); if (i !== -1) attrs.splice(i, 1); };

    del('ref');
    del('hint-placeholder-val');
    del('data-screen-label');

    const hover = get('style-hover');
    if (hover !== undefined) {
      del('style-hover');
      if (!hoverRules.has(hover)) hoverRules.set(hover, `h${hoverRules.size}`);
      set('class', [get('class'), hoverRules.get(hover)].filter(Boolean).join(' '));
    }

    const delay = get('data-delay');
    if (delay !== undefined) {
      del('data-delay');
      if (Number(delay) > 0) set('style', `${get('style') || ''}; transition-delay: ${delay}ms`.replace(/^; /, ''));
    }

    if (name === 'img') {
      const s = get('src');
      const m = s && s.match(/^photos\/(img_\d+)\.webp$/);
      if (m) {
        // width/height rezerwują miejsce (brak skakania układu); wysokość
        // ustala CSS (img { height: auto } albo klasa komponentu).
        const [w, h] = webpSize(s);
        set('width', String(w));
        set('height', String(h));
        set('srcset', `photos/${m[1]}-720.webp 720w, ${s} ${w}w`);
        if (get('sizes') === undefined) set('sizes', '100vw');
      }
      if (firstImg && m) { // logo w menu nie przejmuje priorytetu zdjęcia
        del('loading');
        set('fetchpriority', 'high');
        firstImg = false;
      }
    }

    const out = attrs.map(([k, v]) => (v === undefined ? k : `${k}="${v}"`)).join(' ');
    return `<${name} ${out}${selfClose}>`;
  });

  const hero = body.match(/<img [^>]*fetchpriority="high"[^>]*>/)?.[0];
  const heroSrcset = hero?.match(/srcset="([^"]+)"/)?.[1];
  const heroSizes = hero?.match(/sizes="([^"]+)"/)?.[1];
  const preload = hero
    ? `<link rel="preload" as="image" href="${hero.match(/src="([^"]+)"/)[1]}"${heroSrcset ? ` imagesrcset="${heroSrcset}" imagesizes="${heroSizes}"` : ''} fetchpriority="high">`
    : '';

  const varsCss = usedVars.size
    ? `:root{${[...usedVars].map(n => `--${n}:${VARS[n][0]}`).join(';')}}\n` +
      `@media ${MOBILE}{:root{${[...usedVars].map(n => `--${n}:${VARS[n][1]}`).join(';')}}}`
    : '';

  const hoverCss = [...hoverRules]
    .map(([css, cls]) => `.${cls}:hover{${css.split(';').map(d => d.trim()).filter(Boolean).map(d => `${d} !important`).join(';')}}`)
    .join('\n');

  const css = [...localCss, inlineCss, varsCss, extraCss.join('\n'), hoverCss].map(s => s.trim()).filter(Boolean).join('\n');

  const html = `<!DOCTYPE html>
<!-- WYGENEROWANE przez scripts/build.mjs z "${srcFile}" — nie edytuj ręcznie. -->
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="theme-color" content="#0c1611">
<meta property="og:type" content="website">
<meta property="og:locale" content="pl_PL">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<link rel="icon" type="image/png" href="logo/favicon.png">
<link rel="apple-touch-icon" href="logo/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fontLinks.join('\n')}
${preload}
<script>document.documentElement.className='js static'</script>
<style>
${css}
</style>
</head>
<body>
${body}
${localJs.map(js => `<script>\n${js.trim()}\n</script>`).join('\n')}
</body>
</html>
`;

  writeFileSync(join(ROOT, outFile), html);
  console.log(`${outFile}: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
}

PAGES.forEach(build);
