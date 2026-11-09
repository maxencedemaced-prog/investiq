// tuto/app-store-shots.mjs — captures d'écran de la fiche App Store : l'appli en ligne, mode démo, données fictives.
// Formats : iPhone 6,7 pouces (1290 × 2796) et iPad 12,9 pouces (2048 × 2732). Aucune écriture : mode démo uniquement.
// Accueil : nouvelle présentation incluse depuis le 08/11.
// Les fichiers de cette branche remplacent ceux du site (les /api restent ceux du site) : on voit la version en préparation.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon' };

const OUT = 'shots';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SETUP = () => {
  const hide = document.createElement('style');
  hide.textContent = '#cookie-banner,#tab-hint,#kp-tour,#kp-news-modal,#kp-level-modal,#legal-accept,#dup-banner,#demo-banner,.push-ask,#install-banner,.kp-install,#kp-consent,#home-install-banner,.install-banner,#kp-help-btn,.kp-tuto-hint{display:none!important}';
  document.head.appendChild(hide);
  try { enterDemo(); } catch (e) {}
  // une crypto et de l'or, pour illustrer « tous tes placements »
  // une ligne un peu trop lourde, pour que la zone « À surveiller » ait quelque chose à montrer
  try { const lv = positions.find(p => p.name === 'LVMH'); if (lv) lv.qty = 4; } catch (e) {}
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
  window.isPremiumUser = () => true;   // le bilan (Premium) doit pouvoir s'ouvrir pendant le tournage
  window.kpOpenTuto = () => {};
  window.getSmartAdvice = async a => ({ verdict: a.kind === 'loss' ? 'garder' : 'alléger', raison: a.kind === 'loss' ? 'Cette ligne a beaucoup baissé, mais elle pèse peu : pas d’urgence, garde un œil sur son évolution.' : (a.name + ' pèse ' + Math.round(a.pct) + ' % de ton portefeuille, au-dessus du repère de 25 % : orienter tes prochains versements vers ton socle ETF rééquilibrerait l’ensemble.'), remplacement: a.kind === 'loss' ? null : { ticker: 'VWCE.DE', name: 'Vanguard FTSE All-World', raison: 'socle monde très diversifié' } });   // exemple pour le tournage   // pendant le tournage, le bouton « ▶ C'est quoi ? » ne lance pas une vidéo dans la vidéo
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
  // pub : grosse accroche en haut de l'écran pendant la 1re scène
  window.__tutoAdHook = txt => {
    document.getElementById('tt-hook')?.remove();
    if (!txt) return;
    const d = document.createElement('div');
    d.id = 'tt-hook';
    d.style.cssText = 'position:fixed;left:14px;right:14px;top:70px;z-index:2147483630;background:#0b1220;color:#fff;border-radius:20px;padding:18px 16px;text-align:center;font:900 30px/1.15 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:-.02em;box-shadow:0 14px 40px rgba(0,0,0,.35);transform:scale(.85);opacity:0;transition:all .35s cubic-bezier(.2,1.4,.4,1)';
    d.textContent = txt;
    document.body.appendChild(d); requestAnimationFrame(() => { d.style.transform = 'scale(1)'; d.style.opacity = '1'; });
  };
  // pub : carte de fin avec l'appel à l'action et la mention de risque
  window.__tutoAdEnd = () => {
    document.getElementById('tt-hook')?.remove();
    const cap = document.getElementById('tt-cap'); if (cap) cap.style.setProperty('display', 'none', 'important');   // la carte affiche déjà le message
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483640;background:linear-gradient(160deg,#0b1220,#0f1f17);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:0 24px;text-align:center;opacity:0;transition:opacity .5s';
    d.innerHTML = '<img src="icons/kapitaro-tile.svg" width="96" height="96" style="border-radius:22px"><div style="color:#fff;font:900 36px/1 system-ui;letter-spacing:-.03em">Kapitaro</div><div style="color:#cbd5e1;font:700 17px/1.35 system-ui">Kapitaro ne touche pas à ton argent :<br>tu gardes la main.</div><div style="margin-top:6px;background:#22c55e;color:#052e16;font:900 20px system-ui;padding:14px 26px;border-radius:999px">Essaie gratuitement</div><div style="color:#4ade80;font:800 22px system-ui">kapitaro.fr</div><div style="max-width:330px;margin-top:4px;color:#94a3b8;font:600 11px/1.4 system-ui">Outil pédagogique, pas un conseil en investissement. Investir comporte un risque de perte en capital.</div>';
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
    // premier élément VISIBLE (une même classe peut exister sur des pages cachées)
    let el = null;
    for (const s of sel.split(',')) { el = [...document.querySelectorAll(s.trim())].find(e => e.getBoundingClientRect().width > 0); if (el) break; }
    return el || null;
  };
  // le curseur reste accroché à sa cible : si la page bouge ensuite (contenu qui se charge, bouton décalé), il la suit
  let ttFollow = null;
  const ttPlace = el => { const r = el.getBoundingClientRect(); if (!r.width && !r.height) return; cur.style.left = (r.left + Math.min(r.width / 2, 60)) + 'px'; cur.style.top = (r.top + r.height / 2) + 'px'; };
  window.__ttMove = sel => { const el = window.__ttTarget(sel); if (!el) return false; ttFollow = el; ttPlace(el); return true; };
  setInterval(() => { if (ttFollow && ttFollow.isConnected) ttPlace(ttFollow); }, 120);
  window.__ttScroll = sel => { const el = window.__ttTarget(sel); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return !!el; };
  // « point » sur un élément hors écran (ou caché par la barre du bas) : on le fait d'abord venir au centre
  window.__ttReveal = sel => { const el = window.__ttTarget(sel); if (!el) return false; const r = el.getBoundingClientRect(); if (r.top < 0 || r.bottom > window.innerHeight - 70) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return true; };
  // attend la fin du défilement doux (élément immobile ~150 ms) : sinon le curseur visait l'endroit où l'élément se trouvait en cours de défilement
  window.__ttSettle = (sel, max) => new Promise(res => {
    const el = window.__ttTarget(sel); if (!el) return res(false);
    const t0 = performance.now(); let last = '', still = 0;
    const tick = () => { const r = el.getBoundingClientRect(), k = Math.round(r.top) + ',' + Math.round(r.left); if (k === last) still++; else { still = 0; last = k; } const dt = performance.now() - t0; if ((still >= 3 && dt > 200) || dt > (max || 1500)) { if (r.bottom < 0 || r.top > window.innerHeight) el.scrollIntoView({ block: 'center', behavior: 'instant' }); res(true); } else setTimeout(tick, 50); };   // défilement doux non fait : la cible est amenée à l'écran
    setTimeout(tick, 50);
  });
  window.__ttTap = sel => { const el = window.__ttTarget(sel); cur.classList.remove('tap'); void cur.offsetWidth; cur.classList.add('tap'); if (el) { try { el.click(); } catch (e) {} } };
};

const DEVICES = [
  { name: 'iphone', width: 430, height: 932, scale: 3 },
  { name: 'ipad', width: 1024, height: 1366, scale: 2 },
];
const SCREENS = [
  ['1-accueil', 'home'],
  ['2-portefeuille', 'portfolio'],
  ['3-sante', 'sante'],
  ['4-objectif', 'objectif'],
  ['5-decision', 'decision'],
  ['6-assistant', 'ai'],
  ['7-crise', 'crise'],
];

const browser = await chromium.launch();
for (const d of DEVICES) {
  const ctx = await browser.newContext({ viewport: { width: d.width, height: d.height }, deviceScaleFactor: d.scale, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  await ctx.route('https://kapitaro.fr/**', route => {
    const p = decodeURIComponent(new URL(route.request().url()).pathname);
    if (p.startsWith('/api/')) return route.continue();
    let f = path.join(ROOT, p === '/' ? 'index.html' : p);
    if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.continue();
    return route.fulfill({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.warn('[page]', d.name, e.message));
  await page.goto('https://kapitaro.fr/?android_app=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof enterDemo === 'function' && typeof nav === 'function', null, { timeout: 60000 });
  await sleep(1500);
  await page.evaluate(SETUP);
  await page.addStyleTag({ content: '#kp-help-btn,#kp-notif-panel,.notif-panel,#tt-cur,#tt-cap,#tt-hook,.kp-tuto-btn,.kp-tuto-row,.nav-dot,.bn-dot,.mn-dot,.menu-dot,.bell-dot{display:none!important}' });
  await page.evaluate(() => {
    ['tt-cur', 'tt-cap', 'tt-hook'].forEach(id => document.getElementById(id)?.remove());
    const email = document.getElementById('topbar-email'), avatar = document.getElementById('topbar-avatar');
    if (email) email.textContent = 'Marie'; if (avatar) avatar.textContent = 'M';
  });
  await sleep(2500);
  for (const [file, sec] of SCREENS) {
    await page.evaluate(s => { try { closeNotifPanel && closeNotifPanel(); } catch (e) {} nav(s, true); window.scrollTo(0, 0); }, sec);
    await sleep(4500);
    // Accueil : sans le bloc de démarrage réservé aux nouveaux comptes
    if (sec === 'home') await page.evaluate(() => {
      [...document.querySelectorAll('#home-score > div')].filter(e => /MISE EN ROUTE/i.test(e.textContent || '')).forEach(e => { e.style.display = 'none'; });
      window.scrollTo(0, 0);
    });
    // Objectif : le graphique et la mention, sans montant projeté mis en avant
    if (sec === 'objectif') await page.evaluate(() => {
      ['obj-chart-amount', 'obj-chart-label', 'obj-chart-kicker'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
      const root = document.getElementById('sec-objectif');
      [...root.querySelectorAll('*')].filter(e => /^(✓\s*)?Objectif atteignable|^Année \d+/.test((e.textContent || '').trim()) && e.textContent.length < 90)
        .forEach(e => {
          let n = e;
          while (n.parentElement && n.parentElement !== root && (n.parentElement.textContent || '').trim().length < 90) n = n.parentElement;
          if (/^Année/.test((e.textContent || '').trim())) n.style.visibility = 'hidden'; else n.style.display = 'none';
        });
      // Seule la carte du graphique reste affichée
      let card = document.getElementById('obj-chart-amount');
      while (card !== root && !/PROGRESSION RÉELLE/i.test(card.textContent || '')) card = card.parentElement;
      for (let c = card; c && c !== root; c = c.parentElement) {
        for (let n = c.nextElementSibling; n; n = n.nextElementSibling) n.style.display = 'none';
      }
    });
    if (sec === 'decision') await page.evaluate(() => { const i = document.getElementById('d-name'); if (i) i.value = 'Air Liquide'; });
    if (sec === 'ai') await page.evaluate(() => {
      const chat = document.getElementById('ai-chat');
      if (chat) chat.innerHTML += '<div class="bubble user">Mon portefeuille est-il bien diversifié ?</div><div class="bubble bot">Tes ETF monde répartissent déjà ton argent sur des milliers d’entreprises. Point d’attention : LVMH pèse lourd dans ton portefeuille. C’est une explication éducative, pas un conseil personnalisé.</div>';
    });
    // Assistant : seule la conversation reste affichée
    if (sec === 'ai') await page.evaluate(() => {
      const chat = document.getElementById('ai-chat'), input = document.getElementById('ai-in'), root = document.getElementById('sec-ai');
      if (!chat || !input || !root) return;
      let card = chat;
      while (!card.contains(input)) card = card.parentElement;
      for (let n = card; n && n !== root; n = n.parentElement) {
        [...n.parentElement.children].forEach(c => { if (c !== n) c.style.display = 'none'; });
        n.style.width = '100%'; n.style.maxWidth = 'none';
        n.parentElement.style.display = 'block';
      }
      chat.style.maxHeight = 'none';
      window.scrollTo(0, 0);
    });
    await sleep(500);
    await page.screenshot({ path: `${OUT}/${d.name}-${file}.png` });
    console.log('capture', d.name, file);
    await page.evaluate(() => { const r = document.getElementById('sec-ai'); if (r) r.style.display = ''; });
  }
  // Contrôles pleine page (non destinés à la fiche) : Santé et Scénario crise, clair, sombre, compte vide
  if (d.name === 'iphone') {
    const shot = async (name, sec, js) => {
      await page.evaluate(([s, code]) => { if (code) (0, eval)(code); nav(s, true); window.scrollTo(0, 0); }, [sec, js || '']);
      await sleep(1800);
      await page.screenshot({ path: `${OUT}/ctrl-${name}.png`, fullPage: true });
      console.log('contrôle', name);
    };
    await shot('sante-clair', 'sante');
    await shot('crise-clair', 'crise');
    await shot('crise-50', 'crise', 'setCriseDrop(50)');
    await shot('crise-10', 'crise', 'setCriseDrop(10)');
    await shot('sante-sombre', 'sante', "document.documentElement.setAttribute('data-theme','dark')");
    await shot('crise-sombre', 'crise', 'setCriseDrop(30)');
    await shot('sante-vide', 'sante', "document.documentElement.setAttribute('data-theme','light');window.__p=positions;positions=[]");
    await shot('crise-vide', 'crise');
    await shot('accueil-vide', 'home');
    await page.evaluate(() => {
      positions = window.__p; document.documentElement.setAttribute('data-theme', 'light');
      const rows = [
        { name: 'ATE.PA', fullName: 'Alten SA', qty: 3, pru: 87.85, price: 87.5, live: true, checked: true },
        { name: 'KER.PA', fullName: 'Kering', qty: 2, pru: 0, price: 187.2, live: true, checked: true },
        { name: 'AAPL', fullName: 'Apple', qty: 2, pru: 160.5, pruOrig: 180, price: 305.9, live: true, converted: true, cur: 'USD', checked: true },
        { name: 'Société XYZ', qty: 5, pru: 10, price: 10, notFound: true, checked: true },
      ];
      showCSVPreview(rows, 'mon-releve.csv');
      csvRowToggleSold(0); csvRowSet(0, 'pv', '30'); csvRowSign(0, -1);
    });
    await sleep(600);
    await page.screenshot({ path: `${OUT}/ctrl-import.png` });
    console.log('contrôle', 'import');
  }
  await ctx.close();
}
await browser.close();
