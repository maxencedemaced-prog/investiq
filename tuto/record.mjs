// tuto/record.mjs — enregistre une vidéo tutoriel : l'appli (branche courante, servie en local) en mode démo, format téléphone,
// un curseur qui clique et des sous-titres synchronisés sur la voix off ElevenLabs préparée par api/social.js (action « tuto-create »).
// Étapes : timing.json (stockage) → enregistrement Playwright → montage ffmpeg (image + voix) → envoi dans le stockage + manifest.json.
// Variables : TUTO_ID, SUPABASE_URL, SUPABASE_SERVICE_KEY, APP_URL (les appels /api/* de l'appli sont relayés vers ce site).
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { execFileSync } from 'child_process';

const ID = String(process.env.TUTO_ID || '').trim();
const LIVE = String(process.env.APP_URL || 'https://kapitaro.fr').trim().replace(/\/$/, '');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const ROOT = path.resolve('..');
const OUT = path.resolve('out');
const W = 390, H = 844;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function setStatus(state, extra) {
  let all = {};
  try { const { data } = await sb.storage.from('social').download('tuto/status.json'); if (data) all = JSON.parse(await data.text()); } catch (e) {}
  all[ID] = { state, at: new Date().toISOString(), ...(extra || {}) };
  await sb.storage.from('social').upload('tuto/status.json', Buffer.from(JSON.stringify(all)), { contentType: 'application/json', upsert: true });
}

// Petit serveur local pour la version de l'appli de cette branche
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
function serve(port) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p === '/') p = '/index.html';
      let f = path.join(ROOT, p);
      if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(port, () => resolve(srv));
  });
}

// ── Préparation de la page : mode démo propre, objectif et plans d'exemple, curseur et sous-titres ──
const SETUP = () => {
  const hide = document.createElement('style');
  hide.textContent = '#cookie-banner,#tab-hint,#kp-tour,#kp-news-modal,#kp-level-modal,#legal-accept,#dup-banner,#demo-banner,.push-ask,#install-banner,.kp-install,#kp-consent,#home-install-banner,.install-banner,#kp-help-btn{display:none!important}';
  document.head.appendChild(hide);
  try { enterDemo(); } catch (e) {}
  // une crypto et de l'or, pour illustrer « tous tes placements »
  try { positions.push({ id: 'd5', name: 'BTC-EUR', qty: 0.012, pru: 61000, price: 76800, type: 'Crypto', sector: 'Crypto', platform: 'Binance', alert_price: null }, { id: 'd6', name: 'XAU-G', qty: 8, pru: 104, price: 119.6, type: 'Matière première', sector: 'Or', platform: 'Portefeuille personnel', alert_price: null }); } catch (e) {}
  const ob = document.getElementById('onboarding-modal'); if (ob) ob.style.display = 'none';
  // objectif d'exemple
  objChartCapital = 5000; objChartMonthly = 300; objChartTarget = 50000; objChartYears = 10; objChartRate = 7; objRisk = 'equilibre'; objStockPct = 30; objGlide = false;
  allObjectives = [{ id: 'demo1', label: 'Objectif 1', color: '#16a34a', capital: 5000, monthly: 300, target: 50000, years: 10, rate: 7, risk: 'equilibre', stock_pct: 30, glide: false, validated_at: new Date(Date.now() - 40 * 864e5).toISOString() }];
  activeObjId = 'demo1';
  const m = (p1y, dd, vol) => ({ p1y, dd, vol });
  const ETFS = [
    { ticker: 'VWCE.DE', name: 'Vanguard FTSE All-World', desc: 'Actions du monde entier', pct_capital: 75, pct_mensuel: 75, role: 'socle', color: '#16a34a', pourquoi: 'Baisse max 1 an −6,5 %, volatilité 11,7 % : le socle le plus stable', m: m(21, -6.5, 11.7) },
    { ticker: 'AGGH.AS', name: 'iShares Core Global Aggregate Bond', desc: 'Obligations mondiales (euro couvert)', pct_capital: 25, pct_mensuel: 25, role: 'satellite', color: '#0ea5e9', pourquoi: 'Volatilité 3,2 % : amortit les secousses', m: m(-2.5, -4.1, 3.2) },
  ];
  const ACTIONS = [
    { ticker: 'AI.PA', name: 'Air Liquide', desc: 'Gaz industriels', secteur: 'Industrie', pct_capital: 50, pct_mensuel: 50, color: '#06b6d4', pourquoi: 'Baisse max 1 an −10,5 %, volatilité 17,8 %', m: m(12.1, -10.5, 17.8) },
    { ticker: 'ALV.DE', name: 'Allianz', desc: 'Assurance', secteur: 'Finance', pct_capital: 50, pct_mensuel: 50, color: '#6366f1', pourquoi: 'Baisse max 1 an −12,4 %, volatilité 19,2 %', m: m(15.2, -12.4, 19.2) },
  ];
  const PLAN = { month: currentMonthId(), objId: 'demo1', stockPct: 30, budget: 300, ts: Date.now(), analysis: { n: 41, news: 30, indices: 5 },
    data: { synthese: 'Un mois régulier : on renforce le socle et on complète doucement les actions.', note_marche: 'Le CAC 40 recule de 5,6 % sur un mois : investir la même somme chaque mois lisse ton prix d’entrée.',
      lignes: [
        { ticker: 'VWCE.DE', name: 'Vanguard FTSE All-World', montant: 150, pct: 50, role: 'socle', raison: 'socle monde, volatilité 11,7 %', m: m(21, -6.5, 11.7) },
        { ticker: 'AGGH.AS', name: 'iShares Core Global Aggregate Bond', montant: 60, pct: 20, role: 'satellite', raison: 'amortisseur, volatilité 3,2 %', m: m(-2.5, -4.1, 3.2) },
        { ticker: 'AI.PA', name: 'Air Liquide', montant: 45, pct: 15, role: 'croissance', raison: 'baisse max 1 an −10,5 %', m: m(12.1, -10.5, 17.8) },
        { ticker: 'ALV.DE', name: 'Allianz', montant: 45, pct: 15, role: 'croissance', raison: 'volatilité 19,2 %, finance', m: m(15.2, -12.4, 19.2) },
      ] } };
  window.generateETFPlan = async () => { const el = document.getElementById('obj-etf-plan'); if (el) renderETFCards(ETFS, el, ACTIONS); };
  window.generateMonthlyPlan = async () => { renderMonthlyPlan(PLAN, false); };
  window.showPlanTour = () => {}; window.showPortfolioTour = () => {}; window.kpTour = () => {}; window.kpMaybeWhatsNew = () => {}; window.maybeAskLevel = () => false;
  // réponse d'exemple de l'assistant
  window.__tutoAiDemo = async () => {
    const inp = document.getElementById('ai-in'), chat = document.getElementById('ai-chat');
    if (!inp || !chat) return;
    const q = 'Mon portefeuille est-il bien diversifié ?';
    for (let i = 1; i <= q.length; i++) { inp.value = q.slice(0, i); await new Promise(r => setTimeout(r, 38)); }
    await new Promise(r => setTimeout(r, 300));
    inp.value = '';
    chat.innerHTML += '<div class="bubble user">' + q + '</div>';
    await new Promise(r => setTimeout(r, 700));
    chat.innerHTML += '<div class="bubble bot">Ton portefeuille tient bien la route : tes ETF monde répartissent déjà ton argent sur des milliers d’entreprises. Point d’attention : LVMH pèse environ 30 % du total. Orienter tes prochains versements vers ton socle ETF rééquilibrerait l’ensemble, la décision t’appartient.</div>';
    chat.scrollTop = chat.scrollHeight;
  };
  // carte de fin
  window.__tutoEndCard = () => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483640;background:linear-gradient(160deg,#0b1220,#0f1f17);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;opacity:0;transition:opacity .6s';
    d.innerHTML = '<img src="icons/kapitaro-tile.svg" width="84" height="84" style="border-radius:20px"><div style="color:#fff;font:900 30px/1 system-ui;letter-spacing:-.03em">Kapitaro</div><div style="color:#4ade80;font:700 15px system-ui">kapitaro.fr</div>';
    document.body.appendChild(d); requestAnimationFrame(() => { d.style.opacity = '1'; });
    const cu = document.getElementById('tt-cur'); if (cu) cu.style.opacity = '0';
  };
  // bouton « lecture » de démonstration sur la page Portefeuille
  const hdr = document.querySelector('#sec-portfolio .page-header h1');
  if (hdr && !document.querySelector('.kp-tuto-btn')) hdr.insertAdjacentHTML('beforeend', ' <button type="button" class="kp-tuto-btn" style="vertical-align:middle;margin-left:6px;padding:4px 10px;border-radius:999px;border:1px solid #bbf7d0;background:#f0fdf4;color:#16a34a;font:800 12px system-ui">▶ C’est quoi ?</button>');
  // curseur + sous-titres
  const css = document.createElement('style');
  css.textContent = '#tt-cur{position:fixed;left:50%;top:45%;z-index:2147483646;pointer-events:none;transition:left .7s cubic-bezier(.45,0,.2,1),top .7s cubic-bezier(.45,0,.2,1);filter:drop-shadow(0 3px 6px rgba(0,0,0,.45))}'
    + '#tt-cur .rip{position:absolute;left:-16px;top:-16px;width:44px;height:44px;border-radius:50%;background:rgba(34,197,94,.55);opacity:0}'
    + '#tt-cur.tap .rip{animation:ttTap .55s ease-out}@keyframes ttTap{0%{transform:scale(.2);opacity:.9}100%{transform:scale(1.7);opacity:0}}'
    + '#tt-cap{position:fixed;left:10px;right:10px;bottom:84px;z-index:2147483645;pointer-events:none;display:flex;justify-content:center;transition:opacity .25s}'
    + '#tt-cap .box{background:rgba(9,9,11,.84);color:#fff;font:800 17px/1.38 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:10px 14px;border-radius:14px;text-align:center;max-width:370px}'
    + '#tt-cap i{font-style:normal;opacity:.45;transition:opacity .1s}#tt-cap i.on{opacity:1}';
  document.head.appendChild(css);
  const cur = document.createElement('div'); cur.id = 'tt-cur';
  cur.innerHTML = '<span class="rip"></span><svg width="30" height="30" viewBox="0 0 24 24" style="position:relative"><path d="M5 2 L5 20 L10 15 L13 22 L16 20.8 L13 14 L20 14 Z" fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  document.body.appendChild(cur);
  const cap = document.createElement('div'); cap.id = 'tt-cap'; cap.innerHTML = '<span class="box"></span>'; document.body.appendChild(cap);
  let raf = 0;
  window.__ttCaption = (words, text) => {
    const box = cap.querySelector('.box');
    cancelAnimationFrame(raf);
    if (!words || !words.length) { box.textContent = text || ''; return; }
    box.innerHTML = words.map(w => '<i>' + w.w.replace(/</g, '&lt;') + '</i>').join(' ');
    const els = [...box.querySelectorAll('i')], t0 = performance.now();
    const step = () => { const t = (performance.now() - t0) / 1000; els.forEach((e, k) => { if (words[k].t <= t + 0.05) e.classList.add('on'); }); if (els.some(e => !e.classList.contains('on'))) raf = requestAnimationFrame(step); };
    step();
  };
  window.__ttCaptionHide = () => { cap.style.opacity = '0'; };
  window.__ttTarget = sel => {
    const el = sel.split(',').map(s => document.querySelector(s.trim())).find(e => e && e.getBoundingClientRect().width > 0);
    return el || null;
  };
  window.__ttMove = sel => { const el = window.__ttTarget(sel); if (!el) return false; const r = el.getBoundingClientRect(); cur.style.left = (r.left + Math.min(r.width / 2, 60)) + 'px'; cur.style.top = (r.top + r.height / 2) + 'px'; return true; };
  window.__ttScroll = sel => { const el = window.__ttTarget(sel); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return !!el; };
  window.__ttTap = sel => { const el = window.__ttTarget(sel); cur.classList.remove('tap'); void cur.offsetWidth; cur.classList.add('tap'); if (el) { try { el.click(); } catch (e) {} } };
};

async function run() {
  if (!ID) throw new Error('TUTO_ID manquant');
  await setStatus('recording');
  const { data: tf, error } = await sb.storage.from('social').download('tuto/' + ID + '/timing.json');
  if (error || !tf) throw new Error('timing.json introuvable : relance la fabrication depuis le Studio');
  const timing = JSON.parse(await tf.text());
  fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true });

  const srv = await serve(4173);
  const browser = await chromium.launch();
  const t0 = Date.now();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris', colorScheme: 'light', recordVideo: { dir: path.join(OUT, 'raw'), size: { width: W * 2, height: H * 2 } } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('kp_consent', JSON.stringify({ ads: false, v: 1, at: Date.now() }));
      ['kp_hint_tour_portfolio', 'kp_hint_tour_chart', 'kp_tour_plan', 'kp_level_asked_anon', 'kp_news_seen_anon'].forEach(k => localStorage.setItem(k, k === 'kp_news_seen_anon' ? '99' : '1'));
      localStorage.setItem('kp_level', '1');
    } catch (e) {}
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('[page]', e.message));
  await page.route(/connect\.facebook\.net|googletagmanager|google-analytics|vercel\.live/, r => r.abort());
  await page.route('**/api/**', async route => {
    const u = new URL(route.request().url());
    if (!/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) return route.continue();
    try { const resp = await route.fetch({ url: LIVE + u.pathname + u.search, headers: { ...route.request().headers(), origin: LIVE, referer: LIVE + '/' } }); await route.fulfill({ response: resp }); }
    catch (e) { await route.fulfill({ status: 503, body: '{}' }); }
  });
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await sleep(1500);
  await page.evaluate(SETUP);
  await sleep(2500);   // prix, logos et graphiques chargés

  const lead = (Date.now() - t0) / 1000;
  const start = Date.now();
  const at = s => start + s * 1000;
  for (const b of timing.beats) {
    const wait = at(b.start || 0) - Date.now();
    if (wait > 0) await sleep(wait);
    await page.evaluate(([w, s]) => window.__ttCaption(w, s), [b.words || [], b.say]);
    for (const a of b.do || []) {
      try {
        if (a.wait) await sleep(a.wait);
        else if (a.js) await page.evaluate(code => { try { (0, eval)(code); } catch (e) { console.log(e.message); } }, a.js);
        else if (a.scroll) { await page.evaluate(s => window.__ttScroll(s), a.scroll); await sleep(700); }
        else if (a.point) { await page.evaluate(s => window.__ttMove(s), a.point); await sleep(800); }
        else if (a.click) { const ok = await page.evaluate(s => { window.__ttScroll(s); return true; }, a.click); await sleep(350); await page.evaluate(s => window.__ttMove(s), a.click); await sleep(780); if (ok) await page.evaluate(s => window.__ttTap(s), a.click); await sleep(250); }
        else if (a.type) { await page.evaluate(([s, t]) => { const el = window.__ttTarget(s); if (el) el.value = t; }, a.type); }
      } catch (e) { console.log('geste ignoré', JSON.stringify(a), e.message); }
    }
  }
  const last = timing.beats[timing.beats.length - 1];
  const total = (last.end || 0) + 1.6;
  const remain = at(total) - Date.now();
  if (remain > 0) await sleep(remain);
  const video = page.video();
  await ctx.close();
  await browser.close();
  srv.close();
  const raw = await video.path();

  // voix
  const segs = [];
  for (let k = 0; k < timing.segments.length; k++) {
    const r = await fetch(timing.segments[k].url);
    if (!r.ok) throw new Error('Voix introuvable (' + r.status + ')');
    const f = path.join(OUT, 'seg-' + k + '.mp3');
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    segs.push({ f, start: timing.segments[k].start });
  }
  const mp4 = path.join(OUT, ID + '.mp4'), poster = path.join(OUT, ID + '.jpg');
  const args = ['-y', '-ss', lead.toFixed(2), '-i', raw];
  segs.forEach(s => args.push('-i', s.f));
  const delays = segs.map((s, k) => `[${k + 1}:a]adelay=${Math.round(s.start * 1000)}|${Math.round(s.start * 1000)}[a${k}]`);
  const mix = segs.length > 1 ? `;${segs.map((_, k) => `[a${k}]`).join('')}amix=inputs=${segs.length}:normalize=0[a]` : '';
  args.push('-filter_complex', delays.join(';') + mix, '-map', '0:v', '-map', segs.length > 1 ? '[a]' : '[a0]', '-t', total.toFixed(2),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-pix_fmt', 'yuv420p', '-r', '30', '-vf', 'scale=720:-2',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', mp4);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-y', '-ss', '1.2', '-i', mp4, '-frames:v', '1', '-q:v', '4', poster], { stdio: 'inherit' });

  // envoi + manifest
  for (const [f, type] of [[mp4, 'video/mp4'], [poster, 'image/jpeg']]) {
    const up = await sb.storage.from('social').upload('tuto/' + path.basename(f), fs.readFileSync(f), { contentType: type, upsert: true, cacheControl: '60' });
    if (up.error) throw up.error;
  }
  const pub = n => sb.storage.from('social').getPublicUrl('tuto/' + n).data.publicUrl;
  let manifest = {};
  try { const { data } = await sb.storage.from('social').download('tuto/manifest.json'); if (data) manifest = JSON.parse(await data.text()); } catch (e) {}
  const v = Date.now();
  manifest[ID] = { title: timing.title, page: timing.page || null, url: pub(ID + '.mp4') + '?v=' + v, poster: pub(ID + '.jpg') + '?v=' + v, duration: Math.round(total), voice: timing.voice, at: new Date().toISOString() };
  const up = await sb.storage.from('social').upload('tuto/manifest.json', Buffer.from(JSON.stringify(manifest)), { contentType: 'application/json', upsert: true, cacheControl: '60' });
  if (up.error) throw up.error;
  await setStatus('done', { url: manifest[ID].url, size: fs.statSync(mp4).size });
  console.log('Vidéo prête :', manifest[ID].url, Math.round(fs.statSync(mp4).size / 1024), 'Ko');
}

run().catch(async e => { console.error(e); try { await setStatus('error', { error: String(e.message || e).slice(0, 300) }); } catch (_) {} process.exit(1); });
