/**
 * generate-fiches.js
 * ─────────────────────────────────────────────────────────────
 * Génère un fichier HTML statique par fiche (SEO) à partir de
 * index.html, SANS dupliquer la logique de rendu : on charge la
 * vraie page dans un navigateur headless et on appelle les vraies
 * fonctions JS du site (card(), protCard()) pour obtenir le HTML
 * exact de chaque fiche.
 *
 * Usage :
 *   node generate-fiches.js
 *
 * Prérequis : npm install puppeteer
 * Sortie    : ./dist/fiche/<slug>.html  (un par fiche + protéine)
 *             ./dist/index.html         (copie de la page d'accueil)
 * ─────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const SRC_HTML   = path.join(__dirname, 'index.html');
const OUT_DIR    = path.join(__dirname, 'dist');
const OUT_FICHES = path.join(OUT_DIR, 'fiche');
const SITE_URL   = 'https://mydoseup.com';
const SITE_NAME  = 'MyDoseUp®';

// ─── Slug identique à celui déjà utilisé par le site (openFicheFromHash) ───
function nmToSlug(nm) {
  return nm.toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[éèêë]/g, 'e')
    .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u').replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildMetaDescription(fn) {
  const clean = String(fn || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= 155) return clean;
  return clean.slice(0, 152).replace(/\s+\S*$/, '') + '…';
}

async function main() {
  if (!fs.existsSync(SRC_HTML)) {
    console.error('❌ index.html introuvable à côté de ce script.');
    process.exit(1);
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_FICHES, { recursive: true });

  const originalHtml = fs.readFileSync(SRC_HTML, 'utf8');

  // Chrome fourni par puppeteer (npm install puppeteer le télécharge automatiquement)
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.warn('  ⚠ erreur JS page:', e.message));

  await page.goto('file://' + SRC_HTML, { waitUntil: 'networkidle0' });

  // Récupère toutes les fiches (DATA + PROTEINES) avec leur HTML déjà rendu
  const items = await page.evaluate(() => {
    const out = [];
    if (typeof DATA !== 'undefined') {
      DATA.forEach(d => out.push({
        nm: d.nm,
        fn: d.fn,
        tag: d.tag,
        html: card(d, null, true),
        kind: 'supplement',
      }));
    }
    if (typeof PROTEINES !== 'undefined') {
      PROTEINES.forEach(p => out.push({
        nm: p.nm,
        fn: p.fn || p.desc || '',
        tag: p.tag || 'Protéine',
        html: protCard(p),
        kind: 'proteine',
      }));
    }
    return out;
  });

  await browser.close();

  console.log(`→ ${items.length} fiches récupérées (DATA + PROTEINES)`);

  // Copie de la page d'accueil telle quelle
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), originalHtml);

  const sitemapUrls = [`${SITE_URL}/`];
  const usedSlugs = new Set();

  for (const item of items) {
    const slug = nmToSlug(item.nm);
    if (usedSlugs.has(slug)) {
      console.warn(`  ⚠ slug en double ignoré : ${slug} (${item.nm})`);
      continue;
    }
    usedSlugs.add(slug);

    const title = `${item.nm} : dosage, effets, précautions | ${SITE_NAME}`;
    const description = buildMetaDescription(item.fn);
    const canonical = `${SITE_URL}/fiche/${slug}.html`;

    let html = originalHtml;

    // 1) <title>
    html = html.replace(
      /<title>[\s\S]*?<\/title>/,
      `<title>${escapeHtml(title)}</title>`
    );

    // 2) <meta name="description">
    html = html.replace(
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${escapeHtml(description)}">`
    );

    // 3) <link rel="canonical">
    html = html.replace(
      /<link rel="canonical" href="[^"]*">/,
      `<link rel="canonical" href="${canonical}">`
    );

    // 4) Contenu pré-rendu juste après <body ...> (visible sans JS, lu par Google immédiatement)
    //    + script qui ouvre la fiche dans l'appli interactive et masque ce bloc dès qu'elle est prête.
    const bodyOpenRegex = /<body([^>]*)>/;
    const ssrBlock = `
<div id="ssr-fiche" style="max-width:720px;margin:0 auto;padding:16px">
  <style>#ssr-fiche .sc-body{display:block !important}</style>
  <nav aria-label="Fil d'Ariane" style="font-size:12px;margin-bottom:10px">
    <a href="${SITE_URL}/">${SITE_NAME}</a> › <span>${escapeHtml(item.nm)}</span>
  </nav>
  <h1 style="font-size:22px;margin:0 0 12px">${escapeHtml(item.nm)}</h1>
  ${item.html}
</div>
<script>
  (function(){ if(!location.hash){ location.hash = '#${slug}'; } })();
</script>`;

    const bottomScript = `
<script>
(function(){
  var ssr = document.getElementById('ssr-fiche');
  if(!ssr) return;
  var hidden = false;
  function hide(){ if(!hidden){ ssr.style.display='none'; hidden=true; } }
  var obs = new MutationObserver(function(){
    if(document.querySelector('.az-li-card.open')) hide();
  });
  obs.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});
  if(document.querySelector('.az-li-card.open')) hide(); // au cas où déjà ouvert avant l'attache de l'observer
  setTimeout(hide, 4000); // filet de sécurité si l'appli met du temps à s'initialiser
})();
</script>
</body>`;

    html = html.replace(bodyOpenRegex, (m, attrs) => `<body${attrs}>${ssrBlock}`);
    html = html.replace(/<\/body>/, bottomScript);

    fs.writeFileSync(path.join(OUT_FICHES, `${slug}.html`), html);
    sitemapUrls.push(canonical);
  }

  // sitemap.xml
  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    sitemapUrls.map(u => `  <url><loc>${u}</loc></url>`).join('\n') +
    `\n</urlset>\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), sitemap);

  console.log(`✅ ${usedSlugs.size} fichiers générés dans ./dist/fiche/`);
  console.log(`✅ sitemap.xml généré (${sitemapUrls.length} URLs)`);
}

main().catch(err => {
  console.error('❌ Erreur génération :', err);
  process.exit(1);
});
