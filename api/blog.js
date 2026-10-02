// api/blog.js — Blog public (pages HTML rendues côté serveur pour Google) à partir des articles écrits pour chaque post du Studio.
//   /blog               → liste des articles
//   /blog/<slug>        → un article (JSON-LD Article + FAQPage + fil d'Ariane)
//   /blog-sitemap.xml   → plan des articles pour les moteurs de recherche
// Un article n'est visible qu'une fois son post validé et sa date de publication passée.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://soyyznyceqzimhoaffaw.supabase.co';
const sb = process.env.SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;
const SITE = 'https://kapitaro.fr';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Texte d'article : **gras** et liens internes [texte](/chemin) uniquement
const rich = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\((\/[a-z0-9\-/]*)\)/g, '<a href="$2">$1</a>');
const dateFr = iso => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });

const TOOLS = [
  ['/simulateur-interets-composes', "Simulateur d'intérêts composés", 'Ce que devient ton épargne avec le temps'],
  ['/calculateur-objectif-epargne', "Calculateur d'objectif d'épargne", 'Combien mettre de côté chaque mois'],
  ['/rendement-etf-msci-world', 'Combien rapporte un ETF MSCI World', "3 scénarios et l'effet des frais"],
  ['/epargne-de-precaution', "Calculateur d'épargne de précaution", "Combien garder de côté avant d'investir"],
  ['/simulateur-investissement-programme', "Simulateur d'investissement programmé", 'Investir la même somme chaque mois'],
  ['/calculateur-frais-placement', "Calculateur de l'impact des frais", 'Ce que les frais te coûtent dans le temps'],
  ['/calculateur-inflation', "Calculateur d'inflation", 'Ce que valent tes euros dans le temps'],
];

async function visibleArticles(limit = 500) {
  const { data, error } = await sb.from('social_posts').select('id, article, scheduled_at, published_at, status')
    .in('status', ['approved', 'publishing', 'published']).not('article', 'is', null)
    .order('scheduled_at', { ascending: false }).limit(limit);
  if (error) throw error;
  const now = Date.now();
  return (data || []).filter(p => p.article && p.article.slug && Date.parse(p.published_at || p.scheduled_at) <= now)
    .map(p => ({ ...p.article, date: p.published_at || p.scheduled_at }));
}

function page({ title, description, canonical, jsonld, hero, body }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <script src="/ads.js?v=20261001200000" defer></script>
  <script src="/inapp.js?v=20261002170000" defer></script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${canonical}">
  <meta name="theme-color" content="#080e1e">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Kapitaro">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${SITE}/icons/og-image.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/svg+xml" href="/icons/favicon.svg">
  <link rel="icon" type="image/png" sizes="48x48" href="/icons/favicon-48.png">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="stylesheet" href="/outils.css?v=20260929b">
  <script defer src="/_vercel/insights/script.js"></script>
  <script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>
  <style>
    .post-list a{display:block;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 18px;margin-bottom:10px;text-decoration:none;color:var(--text)}
    .post-list h2{font-size:18px;margin:0 0 4px;letter-spacing:-.01em}
    .post-list p{margin:0;color:var(--muted);font-size:14.5px}
    .post-list small{color:var(--muted);font-size:12.5px}
    .crumbs{font-size:13px;color:rgba(255,255,255,.6);margin-bottom:8px}.crumbs a{color:rgba(255,255,255,.8)}
    .content ul{padding-left:20px}
  </style>
</head>
<body>
  <header class="top"><div class="top-in"><a class="brand" href="/"><img src="/icons/kapitaro-tile.svg" alt="">Kapitaro</a><a class="top-cta" href="/">Ouvrir Kapitaro</a></div></header>
  <section class="hero"><div class="hero-in">${hero}</div></section>
  <main>
    ${body}
    <section class="cta">
      <h2>Suis ton épargne avec Kapitaro</h2>
      <p>Suis tes placements, fixe-toi un objectif et pose tes questions à un assistant IA. Gratuit pour commencer.</p>
      <a href="/" data-cta="blog">Créer mon compte gratuit</a>
    </section>
    <section class="others">
      <h2>Outils gratuits</h2>
      ${TOOLS.map(t => `<a href="${t[0]}"><div>${esc(t[1])}<span>${esc(t[2])}</span></div>›</a>`).join('\n      ')}
    </section>
  </main>
  <footer>
    <p>Contenu éducatif et informatif. Il ne constitue pas un conseil en investissement. Investir comporte un risque de perte en capital ; les performances passées ne préjugent pas des performances futures.</p>
    <p>Kapitaro · Maxence De Macedo, entrepreneur individuel (Quorvia) · SIREN 902 642 016 · <a href="mailto:contact@kapitaro.fr">contact@kapitaro.fr</a> · <a href="/">kapitaro.fr</a><br><a href="/blog">Blog</a> · <a href="/faq">FAQ</a> · <a href="/mentions-legales">Mentions légales</a> · <a href="/cgu">CGU / CGV</a> · <a href="/confidentialite">Confidentialité</a> · <a href="/risques">Risques</a></p>
  </footer>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (!sb) return res.status(500).send('Configuration manquante');
  try {
    const slug = String(req.query.slug || '').toLowerCase();
    if (req.query.sitemap) {
      const list = await visibleArticles();
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/blog</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
${list.map(a => `  <url><loc>${SITE}/blog/${esc(a.slug)}</loc><lastmod>${String(a.date).slice(0, 10)}</lastmod><priority>0.6</priority></url>`).join('\n')}
</urlset>`);
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');

    if (!slug) {
      const list = await visibleArticles();
      const jsonld = { '@context': 'https://schema.org', '@type': 'Blog', name: 'Le blog Kapitaro', url: SITE + '/blog', inLanguage: 'fr',
        blogPost: list.slice(0, 30).map(a => ({ '@type': 'BlogPosting', headline: a.title, url: `${SITE}/blog/${a.slug}`, datePublished: a.date })) };
      const body = `<div class="card"><div class="post-list">${list.length ? list.map(a => `<a href="/blog/${esc(a.slug)}"><small>${esc(dateFr(a.date))}</small><h2>${esc(a.title)}</h2><p>${esc(a.description)}</p></a>`).join('') : '<p>Les premiers articles arrivent très bientôt.</p>'}</div></div>`;
      return res.status(200).send(page({ title: 'Blog Kapitaro : comprendre l\'épargne et l\'investissement simplement', description: "Guides simples pour comprendre l'épargne, les ETF, le PEA, les frais et l'investissement sur le long terme. Contenu éducatif, sans jargon.", canonical: SITE + '/blog', jsonld,
        hero: '<h1>Le blog Kapitaro</h1><p>Comprendre l\'épargne et l\'investissement, simplement et sans jargon.</p>', body }));
    }

    if (!/^[a-z0-9-]{3,90}$/.test(slug)) return res.status(404).send('Article introuvable');
    const a = (await visibleArticles()).find(x => x.slug === slug);
    if (!a) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(404).send(page({ title: 'Article introuvable — Kapitaro', description: 'Cet article n\'existe pas ou n\'est pas encore publié.', canonical: SITE + '/blog', jsonld: { '@context': 'https://schema.org', '@type': 'WebPage' },
        hero: '<h1>Article introuvable</h1><p>Il n\'existe pas ou n\'est pas encore publié.</p>', body: '<div class="card"><p><a href="/blog">Voir tous les articles</a></p></div>' }));
    }
    const url = `${SITE}/blog/${a.slug}`;
    const jsonld = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', headline: a.title, description: a.description, datePublished: a.date, dateModified: a.date, inLanguage: 'fr', mainEntityOfPage: url,
        author: { '@type': 'Organization', name: 'Kapitaro', url: SITE }, publisher: { '@type': 'Organization', name: 'Kapitaro', logo: { '@type': 'ImageObject', url: SITE + '/icons/favicon-48.png' } } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Kapitaro', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE + '/blog' }, { '@type': 'ListItem', position: 3, name: a.title, item: url }] },
      ...((a.faq || []).length ? [{ '@type': 'FAQPage', mainEntity: a.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []),
    ] };
    const sections = (a.sections || []).map(s => `<h2>${esc(s.h2)}</h2>\n${(s.paragraphs || []).map(p => `<p>${rich(p)}</p>`).join('\n')}${(s.bullets || []).length ? `<ul>${s.bullets.map(b => `<li>${rich(b)}</li>`).join('')}</ul>` : ''}`).join('\n');
    const faq = (a.faq || []).length ? `<section class="faq"><h2>Questions fréquentes</h2>${a.faq.map(f => `<h3>${esc(f.q)}</h3><p>${rich(f.a)}</p>`).join('')}</section>` : '';
    const body = `<div class="card"><article class="content" style="margin-top:0">${(a.intro || []).map(p => `<p>${rich(p)}</p>`).join('\n')}\n${sections}\n${faq}<p class="muted" style="margin-top:28px;font-size:13.5px">Contenu éducatif, il ne constitue pas un conseil en investissement. Les exemples chiffrés sont hypothétiques.</p></article></div>`;
    return res.status(200).send(page({ title: `${a.title} — Kapitaro`, description: a.description, canonical: url, jsonld,
      hero: `<div class="crumbs"><a href="/">Kapitaro</a> › <a href="/blog">Blog</a></div><h1>${esc(a.title)}</h1><p>${esc(a.description)} · ${esc(dateFr(a.date))}</p>`, body }));
  } catch (e) {
    console.error('[blog]', e.message);
    return res.status(500).send('Erreur temporaire, réessaie dans un instant.');
  }
}
