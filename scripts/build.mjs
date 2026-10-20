// Generuje statyczny index.html z "Future Frisbee.dc.html".
// Uruchom: node scripts/build.mjs
//
// Plik .dc.html to źródło (edytowalne w narzędziu do projektowania, renderowane
// w przeglądarce przez support.js + React). index.html to wersja do publikacji:
// czysty HTML/CSS + ~1 KB JS, bez Reacta i bez zależności z CDN.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'Future Frisbee.dc.html');
const OUT = join(ROOT, 'index.html');

// Próg mobilny — musi zgadzać się z matchMedia w skrypcie .dc.html.
const MOBILE = '(max-width: 859px)';

// Wartości z renderVals() w .dc.html: [desktop, mobile].
// Jeśli w projekcie pojawi się nowe {{ pole }}, build przerwie się z błędem,
// dopóki nie dopiszesz go tutaj.
const VARS = {
  heroCols: ['1.05fr 1fr', '1fr'],
  aboutCols: ['1fr 1.1fr', '1fr'],
  heroImgMinH: ['0', '58vh'],
  heroOverlay: [
    'linear-gradient(90deg, #0b0b0d 0%, rgba(11,11,13,.25) 30%, transparent 60%), linear-gradient(rgba(11,11,13,.35), transparent 30%, transparent 70%, #0b0b0d)',
    'linear-gradient(#0b0b0d 0%, rgba(11,11,13,.15) 26%, transparent 55%, rgba(11,11,13,.55) 100%)',
  ],
};
const FLAGS = { showNavLinks: [true, false] };

// Szerokość, w jakiej zdjęcie jest wyświetlane — przeglądarka wybiera z tego
// wariant 720 px albo pełny. Domyślnie 100vw.
const SIZES = {
  'img_5952': `${MOBILE} 100vw, 50vw`,
  'img_5954': `${MOBILE} 100vw, 45vw`,
  'img_5955': `${MOBILE} 100vw, 33vw`,
  'img_5956': `${MOBILE} 100vw, 33vw`,
  'img_5957': `${MOBILE} 100vw, 33vw`,
  'img_5958': `${MOBILE} 100vw, 33vw`,
};

const META = {
  description:
    'Treningi dog frisbee dla każdego psa i opiekuna — od pierwszego chwytu po freestyle na zawodach. Treningi indywidualne, grupowe, praca behawioralna i pokazy z border collie Fofonem i Brewką.',
};

// ---------------------------------------------------------------------------

const src = readFileSync(SRC, 'utf8');

const between = (s, open, close) => {
  const a = s.indexOf(open);
  const b = s.lastIndexOf(close);
  if (a === -1 || b === -1) throw new Error(`Brak ${open}…${close} w pliku źródłowym`);
  return s.slice(a + open.length, b);
};

let body = between(src, '<x-dc>', '</x-dc>');
const helmet = between(body, '<helmet>', '</helmet>');
body = body.slice(body.indexOf('</helmet>') + '</helmet>'.length).trim();

const title = (helmet.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'Future Frisbee';
const designCss = (helmet.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
const fontLinks = [...helmet.matchAll(/<link [^>]*fonts\.googleapis\.com\/css2[^>]*>/g)].map(m => m[0]);

if (/<sc-(else|for)\b|<dc-import|<x-import/.test(body)) {
  throw new Error('Szablon używa sc-else/sc-for/importów — build.mjs tego nie obsługuje.');
}

// sc-if → div z klasą chowaną media query
const extraCss = [];
body = body.replace(/<sc-if value="\{\{\s*(\w+)\s*\}\}"[^>]*>/g, (_, name) => {
  const flag = FLAGS[name];
  if (!flag) throw new Error(`Nieznana flaga {{ ${name} }} w sc-if — dopisz ją do FLAGS`);
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
  if (!VARS[name]) throw new Error(`Nieznane pole {{ ${name} }} — dopisz je do VARS`);
  usedVars.add(name);
  return `var(--${name})`;
});

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
    const cls = hoverRules.get(hover);
    set('class', [get('class'), cls].filter(Boolean).join(' '));
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
      const [w, h] = webpSize(s);
      // width/height rezerwują miejsce (brak skakania układu); jeśli styl nie
      // ustala wysokości, musi być height:auto, inaczej atrybut rozciągnie zdjęcie.
      set('width', String(w));
      set('height', String(h));
      const style = get('style') || '';
      if (!/(^|;)\s*height\s*:/.test(style)) set('style', `${style.replace(/;?\s*$/, '')}; height: auto;`.replace(/^; /, ''));
      set('srcset', `photos/${m[1]}-720.webp 720w, ${s} ${w}w`);
      set('sizes', SIZES[m[1]] || '100vw');
    }
    if (firstImg) {
      del('loading');
      set('fetchpriority', 'high');
      firstImg = false;
    }
  }

  const out = attrs.map(([k, v]) => (v === undefined ? k : `${k}="${v}"`)).join(' ');
  return `<${name} ${out}${selfClose}>`;
});

const hero = body.match(/<img [^>]*fetchpriority="high"[^>]*>/)[0];
const heroSrcset = hero.match(/srcset="([^"]+)"/)?.[1];
const heroSizes = hero.match(/sizes="([^"]+)"/)?.[1];

const varsCss =
  `:root{${[...usedVars].map(n => `--${n}:${VARS[n][0]}`).join(';')}}\n` +
  `@media ${MOBILE}{:root{${[...usedVars].map(n => `--${n}:${VARS[n][1]}`).join(';')}}}`;

const hoverCss = [...hoverRules]
  .map(([css, cls]) => `.${cls}:hover{${css.split(';').map(d => d.trim()).filter(Boolean).map(d => `${d} !important`).join(';')}}`)
  .join('\n');

// Odpowiednik _setupReveal() z .dc.html, ale stan początkowy w CSS
// (bez JS treść jest po prostu widoczna).
const revealCss = `
.js [data-reveal]{opacity:0;transition-property:opacity,transform !important;transition-duration:.9s !important;transition-timing-function:cubic-bezier(.2,.7,.2,1) !important}
.js [data-reveal="up"]{transform:translateY(34px)}
.js [data-reveal="left"]{transform:translateX(-40px)}
.js [data-reveal].in{opacity:1;transform:none}
html{scroll-padding-top:72px}
@media (prefers-reduced-motion: reduce){
  html{scroll-behavior:auto}
  *,*::before,*::after{animation:none !important;transition:none !important}
  .js [data-reveal]{opacity:1;transform:none}
}`;

const revealJs = `
(function(){
  var els = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) { els.forEach(function(el){ el.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (!e.isIntersecting) return;
      var el = e.target;
      el.classList.add('in');
      io.unobserve(el);
      // po wejściu zdejmij opóźnienie, żeby hover reagował od razu
      setTimeout(function(){ el.style.transitionDelay = ''; }, 1400);
    });
  }, { threshold: 0.12 });
  els.forEach(function(el){ io.observe(el); });
})();`;

const favicon =
  "data:image/svg+xml," +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><ellipse cx="16" cy="16" rx="14" ry="9" fill="#e8402c"/><ellipse cx="16" cy="14.5" rx="8" ry="4" fill="none" stroke="#0b0b0d" stroke-width="1.5" opacity=".35"/></svg>');

const html = `<!DOCTYPE html>
<!-- WYGENEROWANE przez scripts/build.mjs z "Future Frisbee.dc.html" — nie edytuj ręcznie. -->
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${META.description}">
<meta name="theme-color" content="#0b0b0d">
<meta property="og:type" content="website">
<meta property="og:locale" content="pl_PL">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${META.description}">
<link rel="icon" href="${favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fontLinks.join('\n')}
<link rel="preload" as="image" href="${hero.match(/src="([^"]+)"/)[1]}"${heroSrcset ? ` imagesrcset="${heroSrcset}" imagesizes="${heroSizes}"` : ''} fetchpriority="high">
<script>document.documentElement.className='js'</script>
<style>${designCss.trim()}
${varsCss}
${extraCss.join('\n')}
${hoverCss}
${revealCss.trim()}
</style>
</head>
<body>
${body}
<script>${revealJs.trim()}</script>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log(`index.html: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB, ${hoverRules.size} reguł hover, ${usedVars.size} zmiennych`);
