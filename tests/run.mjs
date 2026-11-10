// tests/run.mjs — filet de sécurité de Kapitaro. Lancé par .github/workflows/tests.yml à chaque envoi sur dev et main.
// 1) Vérifications statiques : chaque fichier JavaScript et chaque script des pages se lit sans erreur de syntaxe.
// 2) Parcours dans un vrai navigateur, sur les fichiers de la branche. Tout ce qui sort de la page est simulé :
//    serveur (/api), base de données, IA, cours. Aucune donnée réelle, aucun coût.
import { chromium } from 'playwright';
import fs from 'fs';
import os from 'os';
import path from 'path';
import vm from 'vm';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tests', 'out');
fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.argv[2] || '';   // node run.mjs "mot" : ne lance que les tests dont le nom contient ce mot

const results = [];
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function test(name, fn) {
  if (ONLY && !name.toLowerCase().includes(ONLY.toLowerCase())) return;
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name} (${Date.now() - t0} ms)`);
  } catch (e) {
    results.push({ name, ok: false, err: String(e && e.message || e) });
    console.log(`✗ ${name}\n    ${String(e && e.message || e).split('\n').join('\n    ')}`);
  }
}

// ───────────────────────── 1. Vérifications statiques ─────────────────────────
const rootFiles = fs.readdirSync(ROOT);

await test('Syntaxe : scripts du site', () => {
  const bad = [];
  for (const f of rootFiles.filter(f => f.endsWith('.js'))) {
    try { new vm.Script(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f }); }
    catch (e) { bad.push(`${f} : ${e.message}`); }
  }
  assert(!bad.length, bad.join('\n'));
});

await test('Syntaxe : scripts dans les pages', () => {
  const bad = [];
  for (const f of rootFiles.filter(f => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    let i = 0;
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      i++;
      const attrs = m[1], code = m[2];
      if (/\bsrc\s*=/.test(attrs) || !code.trim()) continue;
      const line = html.slice(0, m.index).split('\n').length;
      try {
        if (/type\s*=\s*["']application\/(ld\+)?json["']/i.test(attrs)) JSON.parse(code);
        else if (/type\s*=\s*["']module["']/i.test(attrs)) continue;
        else new vm.Script(code, { filename: `${f} (script ligne ${line})` });
      } catch (e) { bad.push(`${f}, script ligne ${line} : ${e.message}`); }
    }
  }
  assert(!bad.length, bad.join('\n'));
});

await test('Syntaxe : fonctions du serveur', () => {
  const bad = [];
  const dir = path.join(ROOT, 'api');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kp-api-'));
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const code = fs.readFileSync(path.join(dir, f), 'utf8');
    const esm = /^\s*(import\s[^(]|export\s)/m.test(code);
    const copy = path.join(tmp, f.replace(/\.js$/, esm ? '.mjs' : '.cjs'));
    fs.writeFileSync(copy, code);
    const r = spawnSync(process.execPath, ['--check', copy], { encoding: 'utf8' });
    if (r.status !== 0) bad.push(`api/${f} : ${(r.stderr || '').split('\n').filter(l => /Error/.test(l))[0] || r.stderr}`);
  }
  assert(!bad.length, bad.join('\n'));
});

await test('Fichiers de configuration lisibles', () => {
  for (const f of ['vercel.json', 'package.json', 'manifest.json'].filter(f => fs.existsSync(path.join(ROOT, f)))) {
    try { JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch (e) { throw new Error(`${f} : ${e.message}`); }
  }
});

await test('Versions de cache : chaque script de index.html existe', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const missing = [];
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+\.(?:js|css))(?:\?[^"]*)?"/g)) {
    if (/^https?:|^\/_vercel\//.test(m[1])) continue;
    if (!fs.existsSync(path.join(ROOT, m[1].replace(/^\//, '')))) missing.push(m[1]);
  }
  assert(!missing.length, 'Fichiers introuvables : ' + missing.join(', '));
});

// ───────────────────────── 2. Parcours dans le navigateur ─────────────────────────
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json' };
const ORIGIN = 'https://kapitaro.fr';

// Flux partagé simulé : « vide » = rien de calculé (l'appli doit reprendre son calcul habituel), « plein » = contenu prêt
const FEED = { mode: 'vide' };
// Bilan simulé de la fiabilité des signaux passés (api/feed?kind=signals_track) : null = pas encore calculé (réponse 503)
const TRACK = { data: null };
// Réponses de l'IA simulée, choisies d'après la demande envoyée par l'appli
function claudeText(body) {
  const p = String(body.prompt || '');
  let m;
  if ((m = p.match(/Donne un signal pédagogique pour ces actifs : (.+)\.\n/))) {
    return JSON.stringify(m[1].split(', ').map((t, i) => ({ ticker: t, name: 'Nom ' + t, signal: i === 0 ? 'vendre' : 'attendre', conviction: 'modérée', risque: 2, horizon: '2-4 semaines', raison: 'raison de test', type: 'Action', secteur: 'Test' })));
  }
  if (/Sélectionne 9 valeurs/.test(p)) {
    return JSON.stringify([...p.matchAll(/^([A-Z0-9.\-]+) \| /gm)].map(x => x[1]).slice(0, 9));
  }
  if (/Développe 10 thèmes/.test(p)) {
    return JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ titre: 'Thème de test ' + (i + 1), resume: 'Résumé de test.', categorie: ['macro', 'banque', 'marche', 'geo', 'secteur'][i % 5], impact: i ? 'moyen' : 'élevé', signal: 'neutre', reco_texte: 'Texte de test.', actifs_cibles: i % 2 ? ['VWCE.DE'] : [] })));
  }
  if ((m = p.match(/réponds avec une entrée : (.+)\.\n/))) {
    return JSON.stringify(m[1].split(', ').map(n => ({ ticker: n, entreprise: n, titre: 'Titre de test', resume: 'Résumé de test.', impact: 'neutre', categorie: 'Profil' })));
  }
  if (/À ANALYSER/.test(p)) return '**Ce qui se passe**\nTexte de test appuyé sur un titre [1].\n**Pourquoi ça compte**\nTexte de test.';
  return 'Réponse de test.';
}

function api(route, u, req, calls) {
  const name = u.pathname.replace('/api/', '');
  calls.push(name);
  const json = (o, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(o) });
  const syms = (u.searchParams.get('symbols') || '').split(',').filter(Boolean);
  if (name === 'prices') return json({ quotes: syms.map((s, i) => ({ symbol: s, price: 100 + i, changePct: s === 'BZ=F' ? -4.6 : 1.2, change: 1, source: 'test' })) });
  if (name === 'market-data') {
    const data = {}, news = {};
    syms.forEach((s, i) => { data[s] = { price: 100 + i, p1m: 1, p3m: 2, p6m: 3, p1y: (i % 40) - 5, dd: -(5 + i % 30), vol: 10 + i % 25, fromHigh: -3, cur: 'EUR' }; });
    (u.searchParams.get('names') || '').split(',').filter(Boolean).slice(0, 8).forEach(n => { const t = n.split(':')[0]; news[t] = [{ title: 'Titre de presse de test sur ' + t, source: 'Presse test', ts: Date.now() - 3600e3, url: 'https://news.google.com/rss/articles/test' }]; });
    return json({ data, market: [{ symbol: '^FCHI', label: 'CAC 40', price: 8000, p1m: 1, p3m: -2, p1y: 5, fromHigh: -3 }], news, asOf: new Date().toISOString() });
  }
  if (name === 'commodity-news') return json({ news: Array.from({ length: 5 }, (_, i) => ({ title: 'Actualité de test ' + (i + 1), link: 'https://fr.investing.com/news/test-' + i, ts: Date.now() - i * 3600e3, source: 'Investing.com' })) });
  if (name === 'chart') return json({ points: [] });
  if (name === 'play-verify') {   // vérification Google Play simulée : seul le jeton de test donne Premium
    let body = {};
    try { body = JSON.parse(req.postData() || '{}'); } catch {}
    if (body.purchaseToken !== 'jeton-play-test') return json({ error: 'Achat introuvable chez Google Play' }, 400);
    return json({ ok: true, premium: true, premium_until: new Date(Date.now() + 365 * 864e5).toISOString(), subscription_status: 'active', subscription_plan: body.productId === 'kapitaro_premium_annual' ? 'annual' : 'monthly' });
  }
  if (name === 'agenda') return json({ events: [], unavailable: true });
  if (name === 'search') return json({ results: [] });
  if (name === 'feed') {
    if (u.searchParams.get('kind') === 'signals_track') return TRACK.data ? json({ ...TRACK.data, generated_at: new Date().toISOString(), stale: false }) : json({ error: 'Contenu indisponible' }, 503);
    if (FEED.mode === 'vide') return json({ generated_at: '2000-01-01T00:00:00Z', stale: true });
    if (u.searchParams.get('refresh') === '1') return json({ ok: true, skipped: 'fresh' });
    if (u.searchParams.get('kind') === 'news') return json({ items: Array.from({ length: 10 }, (_, i) => ({ titre: 'Thème partagé ' + (i + 1), resume: 'Résumé partagé.', categorie: ['macro', 'banque', 'marche', 'geo', 'secteur'][i % 5], impact: 'moyen', signal: 'neutre', reco_texte: 'Texte partagé.', actifs_cibles: i === 7 ? ['VWCE.DE'] : [] })), generated_at: new Date().toISOString(), stale: false });
    return json({ items: ['MC.PA', 'OR.PA', 'SAN.PA', 'TTE.PA', 'SAP.DE', 'ASML.AS', 'MSFT', 'JNJ', 'KO', 'NESN.SW', 'VWCE.DE', 'IBE.MC'].map(t => ({ ticker: t, name: 'Nom ' + t, signal: 'attendre', conviction: 'modérée', risque: 2, horizon: '2-4 semaines', raison: 'raison partagée', type: 'Action', secteur: 'Test', p1y: 12.3, dd: -9.1 })), median: { value: 11.6, count: 360 }, generated_at: new Date().toISOString(), stale: false });
  }
  if (name === 'claude') {
    let body = {};
    try { body = JSON.parse(req.postData() || '{}'); } catch {}
    if (body.action === 'quota') return json({ premium: true, quota: null, agent: null, trial_end: new Date(Date.now() + 864e6).toISOString() });
    const text = claudeText(body);
    if (body.stream) return route.fulfill({ status: 200, contentType: 'text/event-stream; charset=utf-8', body: 'data: ' + JSON.stringify({ t: text }) + '\n\ndata: ' + JSON.stringify({ done: true, quota: null }) + '\n\n' });
    return json({ text, meta: { stop_reason: 'end_turn' }, quota: null });
  }
  return json({});
}

function handle(route, calls) {
  const req = route.request();
  let u;
  try { u = new URL(req.url()); } catch { return route.abort(); }
  if (u.hostname === 'kapitaro.fr' || u.hostname === 'www.kapitaro.fr') {
    if (u.pathname.startsWith('/api/')) return api(route, u, req, calls);
    const p = decodeURIComponent(u.pathname);
    let f = path.join(ROOT, p === '/' ? 'index.html' : p);
    if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
  }
  if (u.hostname.endsWith('supabase.co')) return route.fulfill({ status: 200, contentType: 'application/json', body: req.method() === 'GET' ? '[]' : '{}' });
  if (/(^|\.)jsdelivr\.net$|(^|\.)gstatic\.com$|(^|\.)googleapis\.com$|(^|\.)unpkg\.com$/.test(u.hostname)) return route.continue();
  return route.abort();   // logos, statistiques, publicité : inutiles ici
}

const browser = await chromium.launch();
let shot = 0;

// Ouvre le site (fichiers de la branche) et renvoie la page, les erreurs JavaScript et les appels au serveur
async function open({ query = '', mobile = false } = {}) {
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }, isMobile: mobile, hasTouch: mobile, locale: 'fr-FR', timezoneId: 'Europe/Paris', serviceWorkers: 'block' });
  const errors = [], calls = [];
  await ctx.route('**/*', route => handle(route, calls));
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(ORIGIN + '/' + query, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof nav === 'function' && typeof enterDemo === 'function', null, { timeout: 60000 });
  await page.addStyleTag({ content: '#cookie-banner,#tab-hint,#kp-tour,#kp-news-modal,#kp-level-modal,#legal-accept,#dup-banner,.push-ask,#install-banner{display:none!important}' });
  await sleep(600);
  return { ctx, page, errors, calls };
}
// Mode démo (positions fictives, aucune écriture)
async function demo(opts) {
  const s = await open(opts);
  await s.page.evaluate(() => { enterDemo(); const ob = document.getElementById('onboarding-modal'); if (ob) ob.style.display = 'none'; });
  await sleep(500);
  return s;
}
// Compte Premium simulé : les positions de la démo, une session factice, la base de données simulée
async function premium(opts) {
  const s = await demo(opts);
  await s.page.evaluate(() => {
    isDemo = false;
    currentUser = { id: '00000000-0000-4000-8000-000000000001', email: 'test@kapitaro.test', created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {} };
    Object.assign(profile, { is_premium: true, premium_until: null, subscription_status: 'active' });
    sb.auth.getSession = async () => ({ data: { session: { access_token: 'jeton-de-test', user: currentUser } } });
  });
  return s;
}
async function finish(s, name) {
  if (s.errors.length) {
    try { await s.page.screenshot({ path: path.join(OUT, `${++shot}-${name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.png`) }); } catch {}
  }
  const errs = [...s.errors];
  await s.ctx.close();
  assert(!errs.length, 'Erreurs JavaScript dans la page :\n' + [...new Set(errs)].join('\n'));
}
// Lance un parcours ; en cas d'échec, garde une capture de l'écran
async function run(name, maker, opts, fn) {
  await test(name, async () => {
    const s = await maker(opts);
    try { await fn(s.page, s); }
    catch (e) {
      try { await s.page.screenshot({ path: path.join(OUT, `${++shot}-${name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.png`) }); } catch {}
      const extra = s.errors.length ? '\nErreurs JavaScript : ' + [...new Set(s.errors)].join(' | ') : '';
      await s.ctx.close();
      throw new Error(e.message + extra);
    }
    await finish(s, name);
  });
}

await run('Page publique : se charge sans erreur', open, {}, async page => {
  const r = await page.evaluate(() => ({
    auth: getComputedStyle(document.getElementById('auth-screen')).display !== 'none',
    missing: ['nav', 'enterDemo', 'login', 'signup', 'parseCSVSmart', 'showCSVPreview', 'renderSignaux', 'callClaude', 'callClaudeStream', 'kpOpenAnalysis', 'renderForex', 'renderMatieres', 'kpStoreBuy', 'kpPlayBuy', 'kpPlayRestore', 'showPremiumWelcome', 'showPlansModal', 'kpTogglePass', 'sendAI', 'renderHome', 'renderPortfolio', 'renderSante', 'renderCrise'].filter(f => typeof window[f] !== 'function'),
  }));
  assert(r.auth, "L'écran de connexion n'est pas affiché");
  assert(!r.missing.length, 'Fonctions absentes : ' + r.missing.join(', '));
});

await run('Connexion : texte lisible et bouton œil', open, {}, async page => {
  const r = await page.evaluate(() => {
    switchAuth('login');
    const email = document.getElementById('login-email'), pass = document.getElementById('login-pass');
    email.value = 'essai@exemple.test'; pass.value = 'abc123';
    const out = {};
    for (const theme of ['light', 'dark']) {
      document.documentElement.setAttribute('data-theme', theme);
      for (const el of [email, pass]) { el.focus(); const c = getComputedStyle(el); out[theme + ':' + el.id] = c.color + ' sur ' + c.backgroundColor; }
    }
    document.documentElement.setAttribute('data-theme', 'light');
    const eye = pass.parentElement.querySelector('.kh-eye');
    out.eye = !!eye;
    if (eye) { eye.click(); out.shown = pass.type; eye.click(); out.hidden = pass.type; }
    switchAuth('signup');
    out.signupEyes = ['signup-pass', 'signup-pass2'].filter(id => document.getElementById(id).parentElement.querySelector('.kh-eye')).length;
    return out;
  });
  for (const k of ['light:login-email', 'light:login-pass', 'dark:login-email', 'dark:login-pass']) assert(r[k] === 'rgb(11, 18, 32) sur rgb(255, 255, 255)', `Texte peu lisible (${k}) : ${r[k]}`);
  assert(r.eye && r.shown === 'text' && r.hidden === 'password', 'Le bouton œil ne montre ou ne cache pas le mot de passe');
  assert(r.signupEyes === 2, "Bouton œil absent à l'inscription");
});

await run('Mode appli : le zoom de page est bloqué', open, { query: '?android_app=1', mobile: true }, async page => {
  const r = await page.evaluate(() => ({ app: document.documentElement.classList.contains('kp-app'), vp: document.querySelector('meta[name=viewport]').content, ta: getComputedStyle(document.body).touchAction }));
  assert(r.app, "Le mode appli n'est pas détecté");
  assert(/user-scalable=no/.test(r.vp) && /maximum-scale=1/.test(r.vp), 'Zoom non bloqué : ' + r.vp);
  assert(r.ta === 'pan-x pan-y', 'Double appui non neutralisé : ' + r.ta);
});

await run('Site dans un navigateur : le zoom reste possible', open, {}, async page => {
  const vp = await page.evaluate(() => document.querySelector('meta[name=viewport]').content);
  assert(!/user-scalable=no/.test(vp), 'Le zoom est bloqué sur le site : ' + vp);
});

const SECTIONS = ['home', 'portfolio', 'sante', 'objectif', 'crise', 'news', 'decision', 'dca', 'calc', 'depenses', 'ai', 'settings', 'ajouter'];
for (const [label, maker, opts] of [['démo, ordinateur', demo, {}], ['démo, téléphone', demo, { mobile: true }], ['compte Premium simulé', premium, {}]]) {
  await run(`Toutes les pages s'ouvrent (${label})`, maker, opts, async (page, s) => {
    const bad = [];
    for (const sec of SECTIONS) {
      const before = s.errors.length;
      await page.evaluate(x => { nav(x); window.scrollTo(0, 0); }, sec);
      await sleep(900);
      const r = await page.evaluate(x => { const el = document.getElementById('sec-' + x); return { active: el.classList.contains('active'), len: (el.innerText || '').trim().length }; }, sec);
      if (!r.active) bad.push(`${sec} : la page ne s'affiche pas`);
      else if (r.len < 30) bad.push(`${sec} : page vide`);
      if (s.errors.length > before) bad.push(`${sec} : ${s.errors.slice(before).join(' | ')}`);
    }
    s.errors.length = 0;
    assert(!bad.length, bad.join('\n'));
  });
}

await run('Téléphone : pas de défilement horizontal', demo, { mobile: true }, async page => {
  const bad = [];
  for (const sec of ['home', 'portfolio', 'sante', 'crise', 'news', 'decision', 'settings']) {
    await page.evaluate(x => { nav(x); window.scrollTo(0, 0); }, sec);
    await sleep(800);
    const w = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
    if (w.doc > w.win + 2) bad.push(`${sec} : contenu large de ${w.doc} px pour un écran de ${w.win} px`);
  }
  assert(!bad.length, bad.join('\n'));
});

await run('Import : les 12 fichiers types sont bien lus', demo, {}, async page => {
  const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'imports.json'), 'utf8'));
  const out = await page.evaluate(T => {
    const bad = [];
    for (const [n, v] of Object.entries(T)) {
      let rows;
      try { rows = parseCSVSmart(v.text); } catch (e) { bad.push(`${n} : erreur ${e.message}`); continue; }
      if (rows.length !== v.expected.length) bad.push(`${n} : ${rows.length} lignes lues, ${v.expected.length} attendues`);
      for (const [k, q, p] of v.expected) {
        const r = rows.find(x => (x.name + ' ' + (x.isin || '') + ' ' + (x.fullName || '')).toUpperCase().includes(k.toUpperCase()));
        if (!r) bad.push(`${n} : ${k} manquant`);
        else if (Math.abs(r.qty - q) > 1e-6 || Math.abs(r.pru - p) > 1e-6) bad.push(`${n} : ${k} lu ${r.qty} parts à ${r.pru}, attendu ${q} à ${p}`);
      }
    }
    return bad;
  }, cases);
  assert(!out.length, out.join('\n'));
});

await run('Import : fichiers incomplets et textes refusés', demo, {}, async page => {
  const r = await page.evaluate(() => {
    const t = s => parseCSVSmart(s).map(x => [x.name, x.qty, !!x.needsQty, !!x.checked].join('|'));
    return {
      noms: t('Nom\nKering\nDanone\nAir Liquide\n'),
      liste: t('LVMH\nTotalEnergies\nApple\n'),
      partiel: t('Titre;ISIN;Quantité;Prix de revient\nAir Liquide;FR0000120073;4;160,50\nLVMH;FR0000121014;;702,10\nOrange;;0;10,00\nTotal investi;;;\n'),
      bruit: t('Bonjour Marie, voici votre relevé de compte\n12 345,00\n'),
      inconnu: t('Foo;Bar\nabc;def\nghi;jkl\n'),
    };
  });
  assert(r.noms.join(',') === 'Kering|0|true|false,Danone|0|true|false,Air Liquide|0|true|false', 'Fichier de noms seuls : ' + r.noms.join(','));
  assert(r.liste.length === 3 && r.liste.every(x => x.endsWith('|0|true|false')), 'Liste sans en-tête : ' + r.liste.join(','));
  assert(r.partiel.length === 3 && r.partiel[0].endsWith('|4|false|true') && r.partiel[1].endsWith('|0|true|false') && r.partiel[2].endsWith('|0|true|false'), 'Fichier partiel : ' + r.partiel.join(','));
  assert(!r.bruit.length && !r.inconnu.length, 'Un texte sans rapport est accepté : ' + [...r.bruit, ...r.inconnu].join(','));
});

await run('Import : une ligne sans nombre de parts reste à compléter', demo, {}, async page => {
  const r = await page.evaluate(async () => {
    await handleCSVImport(new File(['Nom\nKering\nDanone\nAir Liquide\n'], 'noms.csv', { type: 'text/csv' }));
    await new Promise(x => setTimeout(x, 400));
    const out = { modal: !!document.getElementById('csv-preview-modal'), rows: (window._csvRows || []).length };
    if (!out.modal) return out;
    out.allOff = window._csvRows.every((x, i) => !x.checked && document.getElementById('csv-check-' + i).disabled);
    out.msg = document.querySelector('#csv-preview-modal .kpi-summary').innerText;
    const before = positions.length;
    await confirmCSVImport();
    out.blocked = !!document.getElementById('csv-preview-modal') && positions.length === before;
    const fill = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
    fill('csv-qty-0', '2'); fill('csv-pru-0', '300');
    out.row0 = { qty: window._csvRows[0].qty, pru: window._csvRows[0].pru, checked: window._csvRows[0].checked, box: document.getElementById('csv-check-0').checked };
    await confirmCSVImport();
    await new Promise(x => setTimeout(x, 500));
    out.added = positions.length - before;
    out.closed = !document.getElementById('csv-preview-modal');
    return out;
  });
  assert(r.modal && r.rows === 3, "La fenêtre de vérification ne s'ouvre pas avec 3 lignes");
  assert(r.allOff, 'Les lignes sans parts devraient être décochées');
  assert(/3 lignes à compléter/.test(r.msg), 'Message « lignes à compléter » absent : ' + r.msg);
  assert(r.blocked, 'Un import sans ligne prête ne doit rien ajouter');
  assert(r.row0.qty === 2 && r.row0.pru === 150 && r.row0.checked && r.row0.box, 'Ligne complétée mal calculée : ' + JSON.stringify(r.row0));
  assert(r.added === 1 && r.closed, `Une seule ligne devait être importée (${r.added})`);
});

await run('Portefeuille : le tri des lignes', demo, {}, async page => {
  const r = await page.evaluate(async () => {
    try { localStorage.removeItem('kp_port_sort'); } catch (e) {}
    nav('portfolio');
    await new Promise(x => setTimeout(x, 700));
    const names = () => [...document.querySelectorAll('#sec-portfolio .pos-row')].map(e => e.id.replace('row-', ''));
    const byId = Object.fromEntries(positions.map(p => [String(p.id), p]));
    const metric = { valeur: p => p.qty * p.price, investi: p => p.qty * p.pru, perf_haut: p => (p.price - p.pru) / p.pru, perf_bas: p => -(p.price - p.pru) / p.pru, gain_haut: p => p.qty * (p.price - p.pru), gain_bas: p => -p.qty * (p.price - p.pru) };
    const out = { select: !!document.getElementById('port-sort'), rows: names().length, bad: [] };
    for (const [k, f] of Object.entries(metric)) {
      kpSetPortSort(k);
      await new Promise(x => setTimeout(x, 300));
      const v = names().map(id => f(byId[id]));
      if (v.some((x, i) => i && x > v[i - 1] + 1e-9)) out.bad.push(k + ' : ' + names().join(','));
      if (document.getElementById('port-sort').value !== k) out.bad.push(k + ' : le menu ne garde pas le choix');
    }
    kpSetPortSort('valeur');
    return out;
  });
  assert(r.select && r.rows >= 4, 'Le menu de tri ou les lignes sont absents');
  assert(!r.bad.length, 'Tri incorrect : ' + r.bad.join(' | '));
});

await run('Portefeuille : cases par catégorie et regroupement', demo, {}, async page => {
  const r = await page.evaluate(async () => {
    const wait = ms => new Promise(x => setTimeout(x, ms));
    try { localStorage.removeItem('kp_port_hide'); localStorage.removeItem('kp_port_group'); localStorage.removeItem('kp_port_sort'); } catch (e) {}
    // Portefeuille d'essai complété pour couvrir plusieurs familles
    const base = positions[0];
    positions.push({ ...base, id: 'tcat1', name: 'BTC-USD', type: 'Crypto', qty: 1, pru: 100, price: 150 }, { ...base, id: 'tcat2', name: 'XAU-G', type: 'Matière première', qty: 2, pru: 50, price: 60 }, { ...base, id: 'tcat3', name: 'CUR-USD', type: 'Devise', qty: 10, pru: 1, price: 1 });
    nav('portfolio'); renderPortfolio(true);
    await wait(600);
    const byId = Object.fromEntries(positions.map(p => [String(p.id), p]));
    const cats = () => [...document.querySelectorAll('#sec-portfolio .pos-row')].map(e => kpPortCat(byId[e.id.replace('row-', '')]));
    const out = { chips: document.querySelectorAll('#port-cats [id^="port-cat-"]').length, all: cats().length, bad: [] };
    kpTogglePortCat('crypto'); await wait(300);
    if (cats().includes('crypto')) out.bad.push('les cryptos restent affichées');
    if (cats().length !== out.all - 1) out.bad.push('mauvais nombre de lignes après masquage');
    if (document.getElementById('port-cat-crypto').getAttribute('aria-checked') !== 'false') out.bad.push('case crypto encore cochée');
    kpTogglePortCat('crypto'); kpTogglePortGroup(); await wait(300);
    const order = ['action', 'etf', 'crypto', 'matiere', 'devise'], seq = cats().map(k => order.indexOf(k));
    if (seq.length !== out.all || seq.some((x, i) => i && x < seq[i - 1])) out.bad.push('regroupement incorrect : ' + cats().join(','));
    if (document.querySelectorAll('#sec-portfolio .pos-group-head').length !== new Set(cats()).size) out.bad.push('bandeaux de famille absents');
    [...new Set(cats())].forEach(k => kpTogglePortCat(k)); await wait(300);
    if (cats().length || !document.getElementById('port-empty-filter')) out.bad.push('message « tout est masqué » absent');
    kpShowAllPortCats(); kpTogglePortGroup(); await wait(300);
    if (cats().length !== out.all) out.bad.push('« Tout afficher » ne rétablit pas la liste');
    positions.splice(positions.length - 3, 3); renderPortfolio(true);
    return out;
  });
  assert(r.chips >= 4, 'Cases de catégorie absentes (' + r.chips + ')');
  assert(!r.bad.length, r.bad.join(' | '));
});

await run('Accueil : « Mes outils » suit le niveau choisi', demo, {}, async page => {
  const r = await page.evaluate(async () => {
    const wait = ms => new Promise(x => setTimeout(x, ms));
    const tools = () => [...document.querySelectorAll('.kph-tools .kph-tool')].map(b => b.innerText.trim());
    const out = {};
    for (const l of [1, 2, 3]) {
      try { localStorage.setItem('kp_level', String(l)); localStorage.removeItem(kpUnlockKey()); } catch (e) {}
      nav('home'); renderHome(); await wait(400);
      out[l] = tools();
    }
    return out;
  });
  assert(r[1].includes('Calculateurs'), 'Les calculateurs doivent apparaître au niveau débutant : ' + r[1].join(', '));
  assert(!r[1].includes('Scénario crise') && !r[1].includes('Actualités'), 'Le niveau débutant montre des outils avancés : ' + r[1].join(', '));
  assert(r[2].includes('Actualités') && !r[2].includes('Scénario crise'), 'Niveau 2 incorrect : ' + r[2].join(', '));
  assert(r[3].length === 8, 'Le niveau 3 doit montrer les 8 outils : ' + r[3].join(', '));
});

await run('Première visite : appli floutée derrière le tutoriel, puis découverte', demo, {}, async page => {
  const r = await page.evaluate(async () => {
    const wait = ms => new Promise(x => setTimeout(x, ms));
    const ob = document.getElementById('onboarding-modal');
    ob.style.display = 'flex';
    kpFirstVeil();
    await wait(3200);
    const during = !!document.getElementById('kp-first-veil');
    const blur = getComputedStyle(document.getElementById('kp-first-veil')).backdropFilter || '';
    ob.style.display = 'none';
    await wait(2600);
    return { during, blur, after: !!document.getElementById('kp-first-veil') };
  });
  assert(r.during, 'Le voile flouté doit rester pendant le questionnaire');
  assert(/blur/.test(r.blur), 'Le voile doit flouter l’arrière-plan (' + r.blur + ')');
  assert(!r.after, 'Le voile doit disparaître une fois le tutoriel fini');
});

await run('Offres : les prix affichés sont 11,99 € et 94,99 €', demo, {}, async page => {
  const r = await page.evaluate(() => {
    plansBilling = 'monthly'; showPlansModal();
    const m = document.getElementById('plans-modal').innerText;
    setPlansBilling('annual');
    const a = document.getElementById('plans-modal').innerText;
    document.getElementById('plans-modal').remove();
    return { m: /11,99\s*€/.test(m), a: /94,99\s*€/.test(a), notif: /Notifications importantes/.test(a) };
  });
  assert(r.m, 'Prix mensuel 11,99 € absent');
  assert(r.a, 'Prix annuel 94,99 € absent');
  assert(r.notif, 'La ligne « Notifications importantes » est absente de la liste Premium');
});

await run('Achat dans l’appli iOS (simulé)', premium, {}, async page => {
  const r = await page.evaluate(async () => {
    const calls = []; let cancel = false, offers = [{ product: { identifier: 'kapitaro_premium_monthly' } }, { product: { identifier: 'kapitaro_premium_annual' } }];
    window.Capacitor = { isNativePlatform: () => true, isPluginAvailable: () => true, Plugins: { Purchases: {
      configure: async () => { calls.push('configure'); }, logIn: async () => { calls.push('logIn'); },
      getOfferings: async () => { calls.push('offres'); return { current: { availablePackages: offers } }; },
      purchasePackage: async ({ aPackage }) => { calls.push('achat:' + aPackage.product.identifier); if (cancel) throw { userCancelled: true }; return { customerInfo: { entitlements: { active: { kapitaro_pro: {} } } } }; },
    } } };
    const out = {};
    profile.is_premium = false; kpStoreOffers = null;
    cancel = true; await kpStoreBuy(null, 'monthly');
    out.cancel = { welcome: !!document.getElementById('premium-welcome'), premium: profile.is_premium };
    cancel = false; const saved = offers; offers = []; kpStoreOffers = null; await kpStoreBuy(null, 'annual');
    out.noOffer = { welcome: !!document.getElementById('premium-welcome'), premium: profile.is_premium };
    offers = saved; kpStoreOffers = null;
    kpStoreBuy(null, 'annual');
    await new Promise(x => setTimeout(x, 400));
    const w = document.getElementById('premium-welcome');
    out.buy = { welcome: !!w, premium: profile.is_premium, text: w ? w.innerText : '', calls };
    return out;
  });
  assert(!r.cancel.welcome && !r.cancel.premium, 'Un achat annulé ne doit pas activer Premium');
  assert(!r.noOffer.welcome && !r.noOffer.premium, 'Une offre indisponible ne doit pas activer Premium');
  assert(r.buy.welcome && r.buy.premium, "Après l'achat, Premium doit s'activer et le message s'afficher");
  assert(r.buy.calls.includes('achat:kapitaro_premium_annual'), 'Mauvais produit acheté : ' + r.buy.calls.join(', '));
  assert(/Plan du mois/.test(r.buy.text) && /Notifications importantes/.test(r.buy.text), 'Le message de bienvenue ne détaille pas ce qui est débloqué');
});

await run('Achat dans l’appli Android : Google Play, jamais Stripe', premium, { query: '?android_app=1', mobile: true }, async (page, s) => {
  const r = await page.evaluate(async () => {
    const log = [];
    window.getDigitalGoodsService = async url => { log.push('service:' + url); return { listPurchases: async () => [], getDetails: async ids => ids.map(itemId => ({ itemId })) }; };
    window.PaymentRequest = class {
      constructor(methods) { log.push('paiement:' + methods[0].supportedMethods + ':' + (methods[0].data || {}).sku); }
      async show() { return { details: { purchaseToken: 'jeton-play-test' }, complete: async st => { log.push('fin:' + st); } }; }
    };
    Object.assign(profile, { is_premium: false, premium_until: null, subscription_status: null, premium_source: null });
    plansBilling = 'annual'; showPlansModal();
    const modal = document.getElementById('plans-modal');
    const btn = modal.querySelector('.plan-btn-main');
    const out = { isButton: !!btn && btn.tagName === 'BUTTON', foot: /Google Play/.test(modal.innerText) && /Restaurer mes achats/.test(modal.innerText) };
    btn.click();
    for (let i = 0; i < 50 && !document.getElementById('premium-welcome'); i++) await new Promise(x => setTimeout(x, 100));
    Object.assign(out, { welcome: !!document.getElementById('premium-welcome'), premium: profile.is_premium, source: profile.premium_source, plan: profile.subscription_plan, log });
    return out;
  });
  assert(r.isButton, 'Le bouton S’abonner est absent dans l’appli Android');
  assert(r.foot, 'Mention Google Play ou « Restaurer mes achats » absente');
  assert(r.log.includes('paiement:https://play.google.com/billing:kapitaro_premium_annual'), 'Le paiement ne passe pas par Google Play : ' + r.log.join(', '));
  assert(s.calls.includes('play-verify'), "L'achat n'est pas vérifié par le serveur (play-verify)");
  assert(!s.calls.includes('create-checkout'), 'Stripe a été appelé dans l’appli Android');
  assert(r.log.includes('fin:success'), 'La fenêtre Google Play n’est pas fermée sur un succès : ' + r.log.join(', '));
  assert(r.welcome && r.premium && r.source === 'play' && r.plan === 'annual', 'Premium non activé après l’achat Google Play');
});

await run('Appli Android sans paiement Google Play : message clair, jamais Stripe', premium, { query: '?android_app=1', mobile: true }, async (page, s) => {
  const r = await page.evaluate(async () => {
    try { delete window.getDigitalGoodsService; } catch (e) {}
    Object.assign(profile, { is_premium: false, premium_until: null, subscription_status: null });
    showPlansModal();
    const modal = document.getElementById('plans-modal');
    const out = { msg: /mets à jour l’appli Kapitaro/.test(modal.innerText), buttons: [...modal.querySelectorAll('button')].filter(b => /S'abonner|Reprendre/.test(b.textContent)).length };
    modal.remove();
    await startCheckout(null, 'monthly');
    return out;
  });
  assert(r.msg, 'Le message « mets à jour l’appli » est absent');
  assert(r.buttons === 0, 'Un bouton d’abonnement reste proposé sans Google Play');
  assert(!s.calls.includes('create-checkout') && !s.calls.includes('play-verify'), 'Un paiement a été lancé : ' + s.calls.filter(c => /checkout|play/.test(c)).join(', '));
});

await run('Actualités : 10 thèmes, puis analyse complète avec sources', premium, {}, async page => {
  await page.evaluate(() => nav('news'));
  await page.waitForFunction(() => !_newsStreaming && Array.isArray(newsData) && newsData.length === 10, null, { timeout: 20000 });
  const list = await page.evaluate(() => {
    const l = document.getElementById('news-list');
    return { cards: l.querySelectorAll('.news-item').length, btns: [...l.querySelectorAll('button')].filter(b => /Analyse complète/.test(b.textContent)).length, voir: /Voir →/.test(l.innerText) };
  });
  assert(list.cards === 10 && list.btns === 10, `10 actualités attendues avec leur bouton (${list.cards} cartes, ${list.btns} boutons)`);
  assert(!list.voir, "L'ancien bouton « Voir » est revenu");
  await page.evaluate(() => kpNewsAnalysis(1));
  await page.waitForFunction(() => document.querySelector('#kp-analysis [data-an="actions"]')?.style.display === 'flex', null, { timeout: 20000 });
  const an = await page.evaluate(() => {
    const d = document.getElementById('kp-analysis');
    return { body: d.querySelector('[data-an="body"]').innerText, cited: d.querySelectorAll('[data-an="body"] a').length, sources: d.querySelectorAll('[data-an="sources"] a').length, mention: /pas un conseil en investissement/.test(d.innerText) };
  });
  assert(/Ce qui se passe/.test(an.body), "Le texte de l'analyse est absent");
  assert(an.cited >= 1 && an.sources >= 1, `Sources cliquables absentes (${an.cited} dans le texte, ${an.sources} dans la liste)`);
  assert(an.mention, 'La mention « pas un conseil en investissement » est absente');
  await page.evaluate(() => kpAnalysisClose());
});

await run('Signaux : toutes les positions, repère du marché, alerte Prudence', premium, {}, async page => {
  await page.evaluate(() => { nav('news'); });
  await sleep(500);
  const t0 = Date.now();
  await page.evaluate(() => document.getElementById('news-fil-signaux').click());
  const immediate = await page.evaluate(() => ({ status: !!document.querySelector('#news-list [data-sig="status"]'), skel: document.querySelectorAll('#news-list .skeleton').length }));
  assert(immediate.status && immediate.skel > 0, "Le clic sur Signaux ne montre rien tout de suite");
  await page.waitForFunction(() => _sigRun && _sigRun.done, null, { timeout: 30000 });
  const r = await page.evaluate(() => {
    const root = _sigRun.root;
    return {
      expected: new Set(apos().map(p => p.name)).size,
      mine: root.querySelectorAll('[data-sig="mine"] [id^="sig-card-"]').length,
      oppo: root.querySelectorAll('[data-sig="oppo"] [id^="sig-card-"]').length,
      skel: root.querySelectorAll('.skeleton').length,
      text: root.innerText,
      notif: notifications.some(n => /Signal Prudence/.test(n.titre)),
      cached: isCacheValid('signaux'),
    };
  });
  assert(r.mine === r.expected && r.expected > 0, `Signaux sur mes positions : ${r.mine} sur ${r.expected}`);
  assert(r.oppo === 9, `Valeurs à découvrir : ${r.oppo} sur 9`);
  assert(r.skel === 0, 'Des emplacements de chargement restent affichés');
  assert(/médiane/.test(r.text), 'Le repère « médiane » est absent');
  assert(!/OBJECTIF|STOP/.test(r.text), 'Un objectif de cours ou un stop est affiché');
  assert(/pas des conseils financiers/.test(r.text), 'La mention éducative est absente');
  assert(r.notif, "Un signal Prudence sur une position n'apparaît pas dans les notifications");
  assert(r.cached, 'Les signaux ne sont pas gardés en mémoire');
  console.log(`    (signaux complets en ${Date.now() - t0} ms avec une IA simulée)`);
});

await run('Signaux : fiabilité des signaux passés, peu puis assez de recul', premium, {}, async page => {
  const trackText = async () => {
    await page.waitForFunction(() => _sigRun && _sigRun.done, null, { timeout: 30000 });
    return page.evaluate(() => { const b = _sigRun.root.querySelector('[data-sig-track]'); return b ? b.innerText : ''; });
  };
  TRACK.data = { min: 20, evaluated: 7, justes: 6, faux: 1, rate: 85.7, pending: 30, favorable: { n: 4, justes: 4, avgExcess: 3.1 }, prudence: { n: 3, justes: 2, avgExcess: -0.5 }, neutre: { n: 5 }, indispo: 0, from: '2026-09-01T10:00:00Z', to: '2026-11-06T10:00:00Z' };
  try {
    await page.evaluate(() => nav('news'));
    await sleep(500);
    await page.evaluate(() => document.getElementById('news-fil-signaux').click());
    const few = await trackText();
    assert(few, "L'encart « Fiabilité des signaux passés » est absent");
    assert(/Pas encore assez de recul \(7 signaux évalués\)/.test(few), 'Message « pas encore assez de recul » absent : ' + few);
    assert(!/\d\s*%/.test(few), 'Un pourcentage est affiché avec trop peu de signaux : ' + few);
    assert(/ne préjugent pas des performances futures/.test(few) && /pas un conseil/.test(few), 'Mentions obligatoires absentes : ' + few);

    // Assez de recul, et un résultat décevant : il doit être affiché tel quel
    TRACK.data = { min: 20, evaluated: 60, justes: 26, faux: 34, rate: 43.3, pending: 40, favorable: { n: 35, justes: 14, avgExcess: -1.2 }, prudence: { n: 25, justes: 12, avgExcess: 0.4 }, neutre: { n: 18 }, indispo: 2, from: '2026-09-01T10:00:00Z', to: '2026-11-06T10:00:00Z' };
    await page.evaluate(() => { newsTabCache.signaux.ts = 0; _sigRun = null; renderSignaux(); });
    const many = await trackText();
    assert(/43 %/.test(many) && /26 sur 60/.test(many) && /34 faux/.test(many), 'Taux, signaux justes ou faux absents : ' + many);
    assert(/Favorable : 14 justes sur 35/.test(many) && /−1,2 pt/.test(many), 'Le mauvais résultat des signaux Favorables est masqué : ' + many);
    assert(/Prudence et Risqué : 12 justes sur 25/.test(many), 'Détail Prudence absent : ' + many);
    assert(/01\/09\/2026/.test(many) && /06\/11\/2026/.test(many), 'Période absente : ' + many);
    assert(/50 %/.test(many), 'Le repère du hasard est absent : ' + many);
    assert(/ne préjugent pas des performances futures/.test(many) && /pas un conseil/.test(many), 'Mentions obligatoires absentes : ' + many);
    assert(!/Pas encore assez de recul/.test(many), 'Le message « pas assez de recul » reste affiché');
  } finally { TRACK.data = null; }
});

await run('Entreprises, matières premières et forex', premium, {}, async (page, s) => {
  await page.evaluate(() => nav('news'));
  await sleep(600);
  await page.evaluate(() => setNewsFilter('entreprises', document.getElementById('news-fil-entreprises')));
  await page.waitForFunction(() => document.querySelectorAll('#ent-news-list button[onclick^="openCompany"]').length >= 4 && !document.querySelector('#ent-news-list .skeleton'), null, { timeout: 20000 });
  const ent = await page.evaluate(() => /SOL-EUR|BTC-EUR/.test(document.getElementById('ent-news-list').innerText));
  assert(!ent, "Une crypto apparaît dans les actualités d'entreprises");

  await page.evaluate(() => setNewsFilter('matieres', document.getElementById('news-fil-matieres')));
  await page.waitForFunction(() => document.querySelectorAll('#news-list button[onclick^="kpCommodityAnalysis"]').length === 7, null, { timeout: 20000 });
  await page.evaluate(() => document.querySelector(`#news-list button[onclick="kpCommodityAnalysis('BZ=F')"]`).click());
  await page.waitForFunction(() => document.querySelector('#kp-analysis [data-an="actions"]')?.style.display === 'flex', null, { timeout: 20000 });
  const mat = await page.evaluate(() => { const d = document.getElementById('kp-analysis'); const r = { title: d.innerText.slice(0, 120), sources: d.querySelectorAll('[data-an="sources"] a').length }; kpAnalysisClose(); return r; });
  assert(/Pétrole Brent : baisse de 4,6 %/.test(mat.title), 'Titre de l’analyse inattendu : ' + mat.title);
  assert(mat.sources >= 1, "L'analyse d'une matière première n'affiche pas ses sources");

  await page.evaluate(() => setNewsFilter('forex', document.getElementById('news-fil-forex')));
  await page.waitForFunction(() => (document.getElementById('news-list').innerText.match(/1 € = /g) || []).length === 8, null, { timeout: 20000 });
  const fx = await page.evaluate(() => { const l = document.getElementById('news-list'); return { links: l.querySelectorAll('a[href*="investing.com"]').length, noAnalysis: !/Analyser|Comprendre/.test(l.innerText) }; });
  assert(fx.links >= 1, 'Les articles du forex sont absents');
  assert(fx.noAnalysis, 'Le forex doit rester en suivi seul, sans bouton d’analyse');
});

await run('Agent IA : répond, reçoit les matières premières, oublie les messages d’erreur', premium, {}, async (page, s) => {
  await page.evaluate(() => { nav('ai'); });
  await sleep(800);
  await page.waitForFunction(() => !aiBusy, null, { timeout: 20000 });
  s.calls.length = 0;
  await page.evaluate(() => {
    chatHistory.push({ role: 'user', content: 'Question ancienne' }, { role: 'assistant', content: '🔒 Limite du jour atteinte : message de test' });
    askAgentFrom('Pourquoi le pétrole Brent baisse aujourd’hui ?');
  });
  await page.waitForFunction(() => !aiBusy && [...document.querySelectorAll('#ai-chat .bubble.bot')].some(b => /Réponse de test/.test(b.innerText)), null, { timeout: 20000 });
  assert(s.calls.includes('commodity-news'), "L'agent ne reçoit pas les données des matières premières");
  const noise = await page.evaluate(() => [kpAgentNoise('🔒 Limite du jour atteinte : x'), kpAgentNoise('Erreur de connexion.'), kpAgentNoise('Ton portefeuille est bien réparti.')]);
  assert(noise[0] && noise[1] && !noise[2], 'Le tri des messages d’erreur est faux : ' + noise.join(','));
});

FEED.mode = 'plein';
await run('Flux partagé : actualités et valeurs à découvrir sans attendre l’IA', premium, {}, async (page, s) => {
  await page.evaluate(() => nav('news'));
  await page.waitForFunction(() => !_newsStreaming && Array.isArray(newsData) && newsData.length === 10, null, { timeout: 15000 });
  const news = await page.evaluate(() => ({ first: newsData[0].titre, cards: document.querySelectorAll('#news-list .news-item').length }));
  assert(news.cards === 10, `10 actualités partagées attendues (${news.cards})`);
  assert(news.first === 'Thème partagé 8', 'Le thème qui touche une ligne détenue devrait passer en premier : ' + news.first);
  assert(!s.calls.includes('claude'), "Les actualités partagées ne doivent pas relancer l'IA");
  await page.evaluate(() => document.getElementById('news-fil-signaux').click());
  await page.waitForFunction(() => _sigRun && _sigRun.done, null, { timeout: 30000 });
  const sig = await page.evaluate(() => { const r = _sigRun.root; return { oppo: [...r.querySelectorAll('[data-sig="oppo"] [id^="sig-card-"]')].map(c => c.id.slice(9)), text: r.innerText, mine: r.querySelectorAll('[data-sig="mine"] [id^="sig-card-"]').length, skel: r.querySelectorAll('.skeleton').length }; });
  assert(sig.oppo.length === 9, `9 valeurs à découvrir partagées attendues (${sig.oppo.length})`);
  assert(!sig.oppo.includes('VWCE.DE'), 'Une valeur déjà détenue apparaît dans les valeurs à découvrir');
  assert(sig.text.includes('raison partagée') && sig.text.includes('médiane +11,6 %'), 'Contenu ou médiane partagés absents');
  assert(sig.mine > 0 && sig.skel === 0, 'Les signaux sur mes positions doivent rester calculés');
});
FEED.mode = 'vide';

await run('Notification : le lien ouvre les signaux', premium, { query: '?open=signaux' }, async page => {
  await page.evaluate(() => kpOpenFromNotif());
  await page.waitForFunction(() => newsFilter === 'signaux' && document.getElementById('sec-news').classList.contains('active'), null, { timeout: 15000 });
  const url = await page.evaluate(() => location.search);
  assert(!/open=/.test(url), "L'adresse garde « open=signaux » après ouverture");
});

await browser.close();

// ───────────────────────── Bilan ─────────────────────────
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length} tests réussis sur ${results.length}`);
if (failed.length) {
  console.log('\nÉCHECS :');
  failed.forEach(f => console.log(`- ${f.name}\n    ${f.err.split('\n').join('\n    ')}`));
  try { fs.writeFileSync(path.join(OUT, 'echecs.txt'), failed.map(f => `${f.name}\n${f.err}\n`).join('\n')); } catch {}
  process.exit(1);
}
