// app-ecrans.js — Écrans : navigation, notifications, accueil, score, portefeuille, santé, assistant objectif.
// Partie de l'appli Kapitaro, découpée en 6 fichiers chargés dans cet ordre par index.html : app-objectif.js, app-positions.js, app-marches.js, app-coeur.js, app-ecrans.js, app.js.
// Les fonctions et variables sont partagées entre ces fichiers (app-objectif.js, app-positions.js, app-marches.js, app-coeur.js, app.js).

// ===== NAV =====
function nav(page, auto=false) {
  if (page !== 'ajouter') window._kpAddReturn = null;
  // Page inconnue (ancien nom mémorisé, lien périmé) : accueil plutôt qu'un écran vide
  if (!document.getElementById('sec-' + page)) page = 'home';
  // Mémorise la page pour la restaurer si Chrome recharge l'onglet (Memory Saver)
  try { sessionStorage.setItem('iq_last_page', page); } catch {}
  try { if (page === 'sante') localStorage.setItem('kp_seen_sante', '1'); } catch {}
  try { kpUnlockTool(page); } catch (e) {}
  try { if (page === 'ajouter') kpApplyMainPlatform(); } catch (e) {}
  if (!auto) { try { trackEvent('page_view', { page }); } catch(e) {} }
  document.querySelectorAll('.sec').forEach(s => { s.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('sec-'+page);
  const btn = document.getElementById('nav-'+page);
  if (sec) { animatePageIn('sec-'+page); }
  if (btn) btn.classList.add('active');
  // Sync bottom nav mobile
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
  const bnavBtn = document.getElementById('bnav-'+page);
  if (bnavBtn) bnavBtn.classList.add('active');
  closeSidebar();
  const renders = { home:renderHome, portfolio:()=>renderPortfolio(auto), sante:renderSante, objectif: async () => {
  // Essaie d'abord de recharger depuis Supabase
  if (!isDemo && currentUser && allObjectives.length === 0) {
    await loadObjective();
  }
  // Si on a des objectifs en base → affiche le graphique
  if (allObjectives.length > 0) {
    applyObjData(allObjectives.find(o => o.id === activeObjId) || allObjectives[0]);
    showValidatedChart();
    return;
  }
  // Sinon essaie le localStorage
  const hasValidated = await loadValidatedObjectif();
  if (hasValidated) {
    showValidatedChart();
  } else if (document.getElementById('obj-results')?.style.display === 'block') {
    setTimeout(() => buildObjChart(objChartCapital, objChartMonthly, objChartTarget, objChartYears, objChartRate), 100);
  }
}, calc:()=>{ try{ renderCalc(); }catch(e){ console.warn('calc:', e); } }, crise:renderCrise, dca:()=>{updateDCA();setTimeout(initDCAPresets,50);}, depenses:()=>{ try{renderDepenses();}catch(e){console.warn('depenses:',e);} }, decision:()=>{ try{initDecisionPage();}catch(e){console.warn('decision:',e);} }, settings:()=>{ try{renderSettingsAccount();}catch(e){console.warn('account:',e);} try{renderSubscriptionCard();}catch(e){console.warn('sub:',e);} try{renderReferralCard();}catch(e){} try{renderPushCard();}catch(e){} try{renderLockCard();}catch(e){} },
    ai:()=>{ try{loadChatHistory();}catch(e){console.warn('chat:',e);} initAgent(auto); }, news:()=>{ if(typeof renderNewsPage==='function'){loadWatchlist();renderNewsPage(auto);}else{if(loadNewsCache())renderNewsList();else if(!auto)loadNews(false);} } };
  if (renders[page]) renders[page]();
  try {
    if (page === 'objectif' && (typeof positions === 'undefined' || !positions.length)) setTimeout(() => showCursorHint('#plan-addall-btn', 'plan_addall'), 1300);
    if (page === 'portfolio') setTimeout(() => { try { showPortfolioTour(); } catch (e) {} }, 700);
    if (page === 'portfolio') setTimeout(() => kpRenderDupBanner(), 350);
    setTimeout(() => kpTutoForPage(page), 900);
  } catch (e) {}
}
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}
// Sur mobile, le panneau recouvre tout l'écran : sans ça, faire défiler son contenu pouvait
// aussi faire défiler la page derrière (elle réapparaissait en haut pendant qu'on scrollait).
// Sur desktop, le panneau reste ouvert en permanence à côté du contenu : on n'y touche jamais.
let _notifScrollY = 0;
function notifPanelBodyLock(lock) {
  if (window.innerWidth >= 768) return;
  if (lock) {
    _notifScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${_notifScrollY}px`;
    document.body.style.width = '100%';
  } else {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, _notifScrollY);
  }
}
function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  const willOpen = !panel.classList.contains('open');
  if (willOpen) { try { renderNotifications(); } catch(e) {} }
  panel.classList.toggle('open', willOpen);
  document.getElementById('notif-dot').classList.remove('show');
  notifPanelBodyLock(willOpen);
}
function closeNotifPanel() {
  document.getElementById('notif-panel').classList.remove('open');
  notifPanelBodyLock(false);
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('notif-panel')?.classList.contains('open')) closeNotifPanel();
});

// ===== FORMATTERS =====
// Prix pour un champ de saisie : 2 décimales au-dessus de 1 €, sinon 4 chiffres significatifs (0,8916 ; 0,000004043)
function kpPriceStr(p) {
  const v = Number(p);
  if (!(v > 0)) return '';
  return v >= 1 ? v.toFixed(2) : Number(v.toPrecision(4)).toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
}
// Petits prix (cryptos à quelques millièmes d’euro) : plus de décimales, sinon « 0,00 € »
function fmt(n) { const v = Number(n), x = Math.abs(v), d = x > 0 && x < 0.01 ? 8 : x > 0 && x < 1 ? 4 : 2; return v.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:d}); }
function fmtK(n) { return n>=1000?(n/1000).toFixed(1).replace('.', ',')+' k€':fmt(n)+' €'; }

// Prénom pour les salutations : fourni par Google à la connexion, sinon rien (jamais le début de l'e-mail)
function userFirstName() {
  if (isDemo) return '';
  const m = currentUser?.user_metadata || {};
  const raw = m.given_name || m.first_name || String(m.full_name || m.name || '').trim().split(/\s+/)[0] || '';
  return raw && !raw.includes('@') ? raw.charAt(0).toUpperCase() + raw.slice(1) : '';
}
function fmtI(n) { return Math.round(n).toLocaleString('fr-FR'); }

// ===== NOTIFICATIONS =====
async function checkAndGenerateNotifications() {
  if (!apos().length) return;
  const newNotifs = [];

  // ── 1. ALERTES PRIX — gérées exclusivement par checkPriceAlerts() ──
  // (pas de duplication ici)

  // ── 2. RÉÉQUILIBRAGE ──
  const tv = apos().reduce((a,p)=>a+p.qty*p.price,0);
  if (tv > 0) {
    const etfs = apos().filter(p=>p.type==='ETF');
    const etfVal = etfs.reduce((a,p)=>a+p.qty*p.price,0);
    const etfPct = etfVal/tv*100;
    // Si ETF > 80% ou < 50% d'un portefeuille mixte avec actions
    const hasActions = apos().some(p=>p.type==='Action'||p.type==='action');
    if (hasActions && etfPct > 80) {
      newNotifs.push({ titre:'⚖️ Répartition à regarder', texte:`Tes ETF représentent ${etfPct.toFixed(0)}% du portefeuille. Tu pourrais réduire légèrement pour garder un bon équilibre.`, action:'Voir Santé du portefeuille', impact:'medium', heure:'Analyse', type:'reequilibrage' });
    } else if (hasActions && etfPct < 40) {
      newNotifs.push({ titre:'⚖️ Trop concentré en actions', texte:`Tes ETF ne représentent que ${etfPct.toFixed(0)}% — tu prends plus de risque que nécessaire. Pense à renforcer tes ETF.`, action:'Aide à la décision', impact:'medium', heure:'Analyse', type:'reequilibrage' });
    }
    // Position trop dominante (>40% du portefeuille)
    apos().forEach(p => {
      const pct = p.qty*p.price/tv*100;
      if (pct > 40 && apos().length > 2 && p.type !== 'ETF') {
        newNotifs.push({ titre:`📊 ${p.name} trop dominant`, texte:`${p.name} représente ${pct.toFixed(0)}% de ton portefeuille. Une forte concentration augmente ton risque.`, action:`Analyser ${p.name}`, impact:'medium', heure:'Analyse', type:'concentration' });
      }
    });
  }

  // ── 3. MARCHÉ EN BAISSE — opportunité DCA ──
  const avgChange = apos().length ? apos().reduce((a,p)=>a+(p.change_pct||0),0)/apos().length : 0;   // même liste au numérateur et au dénominateur
  if (avgChange < -3) {
    newNotifs.push({ titre:'📉 Marché en baisse — opportunité !', texte:`Ton portefeuille baisse de ${Math.abs(avgChange).toFixed(1).replace(".", ",")} % aujourd'hui. Historiquement, c'est le bon moment pour renforcer en DCA, pas pour vendre.`, action:'Simulateur DCA', impact:'medium', heure:"Aujourd'hui", type:'marche' });
  } else if (avgChange < -1.5) {
    newNotifs.push({ titre:'📊 Légère baisse du marché', texte:`Baisse de ${Math.abs(avgChange).toFixed(1).replace(".", ",")} % aujourd'hui — reste calme, c'est normal. Ton horizon long terme est ton meilleur allié.`, action:'Voir Objectif', impact:'low', heure:"Aujourd'hui", type:'marche' });
  }

  // ── 4. OBJECTIF EN DANGER ──
  if (objChartTarget && objChartTarget > 0 && tv > 0) {
    const pct = tv / objChartTarget * 100;
    if (pct < 10 && objChartYears <= 5) {
      newNotifs.push({ titre:'🎯 Objectif en danger', texte:`Tu as atteint ${pct.toFixed(1).replace(".", ",")} % de ton objectif de ${fmtK(objChartTarget)} avec ${objChartYears} ans devant toi. Augmente tes versements mensuels.`, action:'Voir Objectif', impact:'high', heure:'Analyse', type:'objectif' });
    } else if (pct < 20 && objChartYears <= 3) {
      newNotifs.push({ titre:'⚡ Accélère vers ton objectif', texte:`${pct.toFixed(1).replace(".", ",")} % de l'objectif atteint. Il te reste ${objChartYears} ans — le moment d'intensifier les versements.`, action:'Simulateur DCA', impact:'medium', heure:'Analyse', type:'objectif' });
    }
  }

  // ── 5. ANNIVERSAIRE INVESTISSEUR ──
  if (apos().length > 0) {
    const oldest = apos().reduce((min, p) => {
      const d = new Date(p.created_at || Date.now());
      return d < min ? d : min;
    }, new Date());
    const daysSince = Math.floor((Date.now() - oldest) / 86400000);
    if (daysSince === 365 || daysSince === 730 || daysSince === 180) {
      const label = daysSince >= 365 ? `${Math.floor(daysSince/365)} an${daysSince>=730?'s':''}` : '6 mois';
      const gain = tv - apos().reduce((a,p)=>a+p.qty*p.pru,0);
      newNotifs.push({ titre:`🎉 ${label} d'investissement !`, texte:`Ça fait ${label} que tu investis ! Plus-value actuelle : ${gain>=0?'+':''}${fmtK(gain)}. Continue comme ça !`, action:'Voir Portefeuille', impact:'low', heure:'Anniversaire', type:'anniversaire' });
    }
  }

  // ── 6. INACTIVITÉ (pas de position récente) ──
  if (profile.bankroll > 0 && apos().length > 0) {
    const lastAdded = apos().reduce((max, p) => {
      const d = new Date(p.created_at || 0);
      return d > max ? d : max;
    }, new Date(0));
    const daysSinceLast = Math.floor((Date.now() - lastAdded) / 86400000);
    if (daysSinceLast > 60 && objChartMonthly > 0) {
      newNotifs.push({ titre:'📅 Rappel versement mensuel', texte:`Ça fait ${daysSinceLast} jours sans nouvel investissement. Pense à placer tes ${objChartMonthly}€/mois pour profiter des intérêts composés.`, action:'Ajouter une position', impact:'medium', heure:`Il y a ${daysSinceLast} jours`, type:'inactivite' });
    }
  }

  // Déduplique par type (garde seulement 1 par type)
  const seen = new Set();
  const deduped = newNotifs.filter(n => {
    if (seen.has(n.type)) return false;
    seen.add(n.type);
    return true;
  });

  // Remplace complètement les notifications générées — pas d'accumulation
  // On conserve uniquement les notifs "agenda" déjà présentes (car chargées séparément)
  const agendaNotifs = notifications.filter(n => n.type === 'agenda' || n.type === 'smart' || n.type === 'plan');
  const merged = [...deduped, ...agendaNotifs];
  // Déduplication finale par titre+texte
  const finalSeen = new Set();
  notifications = merged.filter(n => {
    const key = n.titre + '|' + n.texte;
    if (finalSeen.has(key)) return false;
    finalSeen.add(key);
    return true;
  }).slice(0, 10);
  renderNotifications();

  const hasHigh = notifications.find(n=>n.impact==='high');
  if (notifications.length > 0) document.getElementById('notif-dot').classList.add('show');
  if (hasHigh) showLocalNotification('Kapitaro — Alerte importante', hasHigh.texte);
}
const NOTIF_NAV = {
  'Voir Portefeuille': 'portfolio',
  'Voir Santé du portefeuille': 'sante',
  'Aide à la décision': 'decision',
  'Voir les signaux': 'signaux',
  'Voir Objectif': 'objectif',
  'Simulateur DCA': 'dca',
  'Ajouter une position': 'ajouter',
};

function renderNotifications() {
  renderNotificationList();
  // Invitation à activer les notifications push (uniquement si elles ne le sont pas encore)
  if (typeof pushBellPromptHTML === 'function') pushBellPromptHTML().then(html => {
    const list = document.getElementById('notif-list');
    if (html && list && !document.getElementById('push-bell-prompt')) list.insertAdjacentHTML('afterbegin', html);
  }).catch(() => {});
}
function renderNotificationList() {
  const list = document.getElementById('notif-list');
  if (!notifications.length) {
    list.innerHTML = '<div class="notif-empty" style="padding:20px;text-align:center;color:#8e8e93;font-size:13px">✅ Tout va bien — aucune alerte</div>';
    return;
  }
  const impactBg = { high:'#fff0f0', medium:'#fff9e6', low:'#f5f5f5' };
  const impactBorder = { high:'#cc2f26', medium:'#f59e0b', low:'#e5e5ea' };
  list.innerHTML = notifications.map((n,i) => {
    const page = Object.entries(NOTIF_NAV).find(([k])=>String(n.action||'').includes(k.split(' ').pop()));
    const navPage = page ? page[1] : null;
    return `
    <div class="notif-item ${n.impact}" style="background:${impactBg[n.impact]||'#f5f5f5'};border-left:3px solid ${impactBorder[n.impact]||'#e5e5ea'};border-radius:12px;padding:12px 14px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div style="font-size:13px;font-weight:800;color:#1c1c1e;line-height:1.3">${_escHtml(n.titre)}</div>
        <div style="font-size:11px;color:#8e8e93;white-space:nowrap;margin-left:8px">${_escHtml(n.heure || '')}</div>
      </div>
      <div style="font-size:12px;color:#3c3c43;line-height:1.5;margin-bottom:8px">${_escHtml(n.texte)}</div>
      <button onclick="closeNotifPanel();${navPage==='signaux'?'kpOpenSignaux()':navPage?`nav('${navPage}')`:''}" 
              style="background:#1c1c1e;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer">
        → ${_escHtml(n.action || 'Voir')}
      </button>
    </div>`;
  }).join('');
}

// ===== HOME =====
// Première prise en main : tant qu'aucun placement n'est ajouté, une carte en haut de l'Accueil propose 3 façons de démarrer
// ═══════════════════════════════════════════════════════════════════════════
// MISE EN ROUTE — barre de progression gamifiée + animation d'appel à l'action.
// But : rendre le démarrage ludique et montrer clairement la prochaine étape.
// ═══════════════════════════════════════════════════════════════════════════
(function kpInjectAnim() {
  try {
    if (document.getElementById('kp-anim')) return;
    const st = document.createElement('style'); st.id = 'kp-anim';
    st.textContent = '@keyframes kpPulseGlow{0%,100%{box-shadow:0 8px 24px rgba(22,163,74,0.35)}50%{box-shadow:0 10px 34px rgba(34,197,94,0.8)}}@keyframes kpFinger{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}.kp-pulse{animation:kpPulseGlow 1.6s ease-in-out infinite}.kp-finger{display:inline-block;animation:kpFinger 1s ease-in-out infinite;margin-left:6px}@keyframes kpScorePop{0%{transform:scale(0.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}.kp-scorepop{display:inline-block;animation:kpScorePop 0.7s cubic-bezier(0.16,1,0.3,1)}@keyframes kpTap{0%{transform:scale(.5);opacity:.7}100%{transform:scale(1.7);opacity:0}}@keyframes kpBob{0%,100%{transform:translate(0,0)}50%{transform:translate(-3px,-3px)}}';
    document.head.appendChild(st);
  } catch (e) {}
})();

// Les 3 étapes de démarrage et leur état (fait / à faire)
function kpSetupSteps() {
  const objectifDone = (typeof allObjectives !== 'undefined' && allObjectives.length > 0) || (typeof objChartTarget !== 'undefined' && objChartTarget > 1000);
  const placementsDone = positions.length > 0;
  let scoreDone = false;
  try { scoreDone = placementsDone && localStorage.getItem('kp_seen_sante') === '1'; } catch {}
  return [
    { label: 'Créer un objectif', icon: '🎯', done: objectifDone, action: "showOnboarding(true)" },
    { label: 'Ajouter tes placements', icon: '💼', done: placementsDone, action: "openQuickAdd('home')" },
    { label: 'Découvrir ton score de santé', icon: '❤️', done: scoreDone, action: "nav('sante')" },
  ];
}

// Carte "Mise en route" : rendue en haut de l'accueil tant que les 3 étapes ne sont pas finies.
function setupProgressHTML() {
  const steps = kpSetupSteps();
  const done = steps.filter(s => s.done).length;
  const total = steps.length;
  if (done >= total) {
    // Tout est fait : on félicite une seule fois, puis la carte disparaît définitivement.
    try {
      if (localStorage.getItem('kp_setup_celebrated') !== '1') {
        localStorage.setItem('kp_setup_celebrated', '1');
        setTimeout(() => { try { qaConfetti(); showToast('🎉 Tout est en place — ton tableau de bord est prêt !'); } catch {} }, 400);
      }
    } catch {}
    return '';
  }
  const pct = Math.round(done / total * 100);
  const rows = steps.map((s, i) => {
    const circle = s.done
      ? '<span style="width:26px;height:26px;border-radius:50%;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">✓</span>'
      : `<span style="width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.22);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0">${i + 1}</span>`;
    const txtStyle = s.done ? 'color:rgba(255,255,255,0.5);text-decoration:line-through' : 'color:#fff';
    const arrow = s.done ? '' : '<span style="margin-left:auto;font-size:18px;color:#4ade80">›</span>';
    const onclick = s.done ? '' : `onclick="${s.action}"`;
    const bg = s.done ? '' : 'background:rgba(255,255,255,0.04);cursor:pointer';
    return `<div ${onclick} style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:12px;${bg}">
      ${circle}
      <span style="font-size:14px;font-weight:700;${txtStyle}">${s.icon} ${s.label}</span>
      ${arrow}
    </div>`;
  }).join('');
  return `<div style="background:linear-gradient(135deg,#0f1f17,#0b1220);border:1px solid rgba(22,163,74,0.35);border-radius:20px;padding:18px;margin-bottom:14px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="font-size:12px;font-weight:800;color:#4ade80;letter-spacing:0.4px;text-transform:uppercase">🚀 Mise en route</div>
      <div style="font-size:12px;font-weight:800;color:#fff">${done}/${total}</div>
    </div>
    <div style="background:rgba(255,255,255,0.1);border-radius:99px;height:8px;overflow:hidden;margin-bottom:14px">
      <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#22c55e,#4ade80);border-radius:99px;transition:width 0.8s ease"></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:5px">${rows}</div>
  </div>`;
}


// ═══════════════════════════════════════════════════════════════════════════
// NIVEAUX — on adapte les outils du menu au niveau choisi par l'utilisateur.
// Par défaut : niveau 3 (tout) → aucun changement pour les comptes existants.
// ═══════════════════════════════════════════════════════════════════════════
const KP_LEVELS = {
  1: { label: 'Je débute', emoji: '🌱', desc: 'L\'essentiel : accueil, portefeuille, objectif et assistant IA.', tools: ['home', 'portfolio', 'objectif', 'ai', 'bilan'] },
  2: { label: 'J\'ai déjà quelques placements', emoji: '📈', desc: 'En plus : le score de santé, le calculateur de dépenses et les actualités.', tools: ['home', 'portfolio', 'objectif', 'ai', 'bilan', 'sante', 'depenses', 'news'] },
  3: { label: 'Je gère un vrai portefeuille', emoji: '🚀', desc: 'Tous les outils, avec en plus : scénario de crise, simulateur DCA, aide à la décision.', tools: 'all' },
};
const KP_ALL_TOOLS = ['home', 'portfolio', 'sante', 'objectif', 'crise', 'news', 'decision', 'dca', 'depenses', 'ai', 'bilan'];

function kpGetLevel() {
  try { const m = currentUser && currentUser.user_metadata && currentUser.user_metadata.level; if (m >= 1 && m <= 3) return m; } catch {}
  try { const v = parseInt(localStorage.getItem('kp_level'), 10); if (v >= 1 && v <= 3) return v; } catch {}
  return 3;
}
function kpLevelChosen() {
  try { const m = currentUser && currentUser.user_metadata && currentUser.user_metadata.level; if (m >= 1 && m <= 3) return true; } catch {}
  try { if (localStorage.getItem('kp_level')) return true; } catch {}
  return false;
}
function kpUnlockKey() { try { return 'kp_unlocked_' + ((currentUser && currentUser.id) ? currentUser.id : 'anon'); } catch (e) { return 'kp_unlocked_anon'; } }
// Ouvrir un outil masqué par le niveau le débloque dans le menu (progression ludique)
function kpUnlockTool(page) {
  try {
    if (!KP_ALL_TOOLS.includes(page)) return;
    const cfg = KP_LEVELS[kpGetLevel()] || KP_LEVELS[3];
    if (cfg.tools === 'all' || cfg.tools.includes(page)) return;
    const u = JSON.parse(localStorage.getItem(kpUnlockKey()) || '[]');
    if (u.includes(page)) return;
    u.push(page);
    localStorage.setItem(kpUnlockKey(), JSON.stringify(u));
    applyUserLevel();
    const names = { sante: 'Santé', depenses: 'Mes dépenses', crise: 'Scénario crise', dca: 'Simulateur DCA', decision: 'Aide décision', news: 'Actualités' };
    showToast('🔓 ' + (names[page] || page) + ' ajouté à ton menu');
  } catch (e) {}
}
function kpAskedKey() { try { return 'kp_level_asked_' + ((currentUser && currentUser.id) ? currentUser.id : 'anon'); } catch { return 'kp_level_asked_anon'; } }

function applyUserLevel() {
  try {
    const lvl = kpGetLevel();
    const cfg = KP_LEVELS[lvl] || KP_LEVELS[3];
    const allowed = cfg.tools === 'all' ? KP_ALL_TOOLS.slice() : cfg.tools.slice();
    try { const _u = JSON.parse(localStorage.getItem(kpUnlockKey()) || '[]'); if (Array.isArray(_u)) _u.forEach(t => { if (!allowed.includes(t)) allowed.push(t); }); } catch (e) {}
    KP_ALL_TOOLS.forEach(t => {
      const btn = document.getElementById('nav-' + t);
      if (btn) btn.style.display = allowed.includes(t) ? '' : 'none';
    });
    const outilsVisible = ['news', 'decision', 'dca', 'depenses'].some(t => allowed.includes(t)) || !!document.getElementById('nav-calc');   // les calculateurs sont visibles à tous les niveaux
    const lbl = document.getElementById('navlbl-outils'); if (lbl) lbl.style.display = outilsVisible ? '' : 'none';
    const sep = document.getElementById('navsep-outils'); if (sep) sep.style.display = outilsVisible ? '' : 'none';
  } catch (e) {}
}

function kpSetLevel(l) {
  try { localStorage.setItem('kp_level', String(l)); } catch {}
  try { localStorage.setItem(kpAskedKey(), '1'); } catch {}
  try { if (typeof isDemo !== 'undefined' && !isDemo && typeof currentUser !== 'undefined' && currentUser && typeof sb !== 'undefined') { currentUser.user_metadata = Object.assign({}, currentUser.user_metadata || {}, { level: l }); sb.auth.updateUser({ data: { level: l } }).catch(() => {}); } } catch {}
  document.getElementById('kp-level-modal')?.remove();
  applyUserLevel();
  try { showToast('✓ Interface adaptée à ton niveau'); } catch {}
  try { nav('home'); } catch {}
}

function showLevelChooser(fromSettings) {
  try { localStorage.setItem(kpAskedKey(), '1'); } catch {}
  document.getElementById('kp-level-modal')?.remove();
  const current = kpLevelChosen() ? kpGetLevel() : 0;
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const surf = dark ? '#0f1629' : '#fff', txt = dark ? '#fff' : '#09090b', sub = dark ? 'rgba(255,255,255,0.6)' : '#71717a', bord = dark ? 'rgba(255,255,255,0.12)' : '#e4e4e7';
  const card = (l) => {
    const c = KP_LEVELS[l];
    const on = l === current;
    return `<button type="button" onclick="kpSetLevel(${l})" style="display:block;width:100%;text-align:left;padding:16px;border-radius:16px;margin-bottom:10px;cursor:pointer;font:inherit;background:${on ? 'linear-gradient(135deg,#0f1f17,#0b1220)' : (dark ? 'rgba(255,255,255,0.05)' : '#f9fafb')};border:1.5px solid ${on ? 'rgba(22,163,74,0.6)' : bord}" onmouseover="if(!${on})this.style.borderColor='#16a34a'" onmouseout="if(!${on})this.style.borderColor='${bord}'">
      <div style="font-size:15px;font-weight:900;color:${on ? '#fff' : txt};margin-bottom:3px">${c.emoji} ${c.label}${on ? ' · actuel' : ''}</div>
      <div style="font-size:12.5px;color:${on ? 'rgba(255,255,255,0.72)' : sub};line-height:1.45">${c.desc}</div>
    </button>`;
  };
  const o = document.createElement('div');
  o.id = 'kp-level-modal';
  o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10055;display:flex;align-items:center;justify-content:center;padding:18px';
  o.innerHTML = `<div style="background:${surf};width:100%;max-width:440px;border-radius:22px;padding:22px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.4)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <div style="font-size:19px;font-weight:900;color:${txt}">Où en es-tu ?</div>
      <button type="button" onclick="document.getElementById('kp-level-modal').remove()" style="background:none;border:none;color:${sub};font-size:22px;cursor:pointer;line-height:1">✕</button>
    </div>
    <div style="font-size:13px;color:${sub};margin-bottom:16px;line-height:1.5">On adapte l'appli à ton niveau pour ne pas te noyer sous les outils. Tu pourras changer à tout moment dans « Mon niveau ».</div>
    ${card(1)}${card(2)}${card(3)}
  </div>`;
  document.body.appendChild(o);
}

// ═══ VIDÉOS TUTORIELS (fabriquées depuis le Studio : api/_tuto.js → tuto/record.mjs) ═══
const KP_TUTO_BASE = 'https://soyyznyceqzimhoaffaw.supabase.co/storage/v1/object/public/social/tuto/';
let _kpTutoManifest = null, _kpTutoAt = 0;
async function kpTutoManifest() {
  if (_kpTutoManifest && Date.now() - _kpTutoAt < 10 * 60 * 1000) return _kpTutoManifest;
  try { const r = await fetch(KP_TUTO_BASE + 'manifest.json?t=' + Math.floor(Date.now() / 600000)); _kpTutoManifest = r.ok ? await r.json() : (_kpTutoManifest || {}); }
  catch (e) { _kpTutoManifest = _kpTutoManifest || {}; }
  _kpTutoAt = Date.now();
  return _kpTutoManifest;
}
function kpTutoSeenKey(id) { try { return 'kp_tuto_seen_' + id + '_' + ((currentUser && currentUser.id) ? currentUser.id : 'anon'); } catch (e) { return 'kp_tuto_seen_' + id; } }
// opts : { auto (lancée seule : démarre sans le son), skippable (bouton « Passer »), onDone }
async function kpOpenTuto(id, opts) {
  opts = opts || {};
  const m = await kpTutoManifest();
  const wide = window.innerWidth >= 900 && m && m[id + '__desktop'] && m[id + '__desktop'].url;   // grand écran : version ordinateur si elle existe
  const v = m && (wide ? m[id + '__desktop'] : m[id]);
  if (!v || !v.url) { if (!opts.auto) showToast('Vidéo bientôt disponible'); if (opts.onDone) opts.onDone(); return; }
  document.getElementById('kp-tuto-modal')?.remove();
  let done = false;
  const finish = () => { if (done) return; done = true; const o = document.getElementById('kp-tuto-modal'); if (o) { const vd = o.querySelector('video'); try { vd.pause(); } catch (e) {} o.remove(); } try { localStorage.setItem(kpTutoSeenKey(id), '1'); } catch (e) {} if (opts.onDone) setTimeout(opts.onDone, 200); };
  const o = document.createElement('div');
  o.id = 'kp-tuto-modal';
  o.style.cssText = 'position:fixed;inset:0;z-index:10090;background:rgba(5,8,15,0.88);display:flex;align-items:center;justify-content:center;padding:14px';
  o.innerHTML = '<div style="position:relative;' + (wide ? 'width:min(100%,calc(80vh * 1.6),1100px)' : 'width:min(100%,calc(86vh * 0.4615));max-width:420px') + '">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;color:#fff"><div style="font-size:15px;font-weight:800">🎬 ' + _escHtml(v.title || 'Kapitaro') + '</div>'
    + (opts.skippable ? '<button type="button" id="kp-tuto-skip" style="padding:7px 14px;border-radius:999px;border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.08);color:#fff;font:inherit;font-size:13px;font-weight:800;cursor:pointer">Passer ›</button>' : '<button type="button" id="kp-tuto-skip" aria-label="Fermer" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;line-height:1">✕</button>')
    + '</div>'
    + '<div style="position:relative;container-type:inline-size;border-radius:18px;overflow:hidden;background:#000;aspect-ratio:' + (wide ? '1280/800' : '390/844') + ';box-shadow:0 20px 60px rgba(0,0,0,0.5)">'
    + '<video playsinline controls preload="auto" poster="' + _escHtml(v.poster || '') + '" src="' + _escHtml(v.url) + '" style="width:100%;height:100%;display:block;object-fit:contain"></video>'
    + (Array.isArray(v.captions) && v.captions.length ? '<div id="kp-tuto-cap" style="position:absolute;left:4%;right:4%;bottom:' + (wide ? '11%' : '12%') + ';display:flex;justify-content:center;pointer-events:none"></div><button type="button" id="kp-tuto-cc" style="position:absolute;right:10px;top:10px;padding:6px 11px;border-radius:999px;border:1px solid rgba(255,255,255,0.35);background:rgba(9,9,11,0.7);color:#fff;font:inherit;font-size:12px;font-weight:800;cursor:pointer"></button>' : '')
    + ('<button type="button" id="kp-tuto-sound" style="display:none;position:absolute;left:50%;top:14px;transform:translateX(-50%);padding:8px 14px;border-radius:999px;border:none;background:#16a34a;color:#fff;font:inherit;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.35)">🔊 Activer le son</button>')
    + '</div></div>';
  document.body.appendChild(o);
  const vd = o.querySelector('video');
  vd.muted = false;   // le son est actif d'office ; le navigateur peut le refuser sans geste préalable (voir plus bas)
  vd.addEventListener('ended', finish);
  o.querySelector('#kp-tuto-skip').onclick = finish;
  const sb2 = o.querySelector('#kp-tuto-sound');
  if (sb2) sb2.onclick = () => { vd.muted = false; try { vd.currentTime = 0; } catch (e) {} vd.play().catch(() => {}); sb2.remove(); };
  vd.addEventListener('volumechange', () => { if (!vd.muted && sb2 && sb2.isConnected) sb2.remove(); });
  kpTutoCaptions(o, vd, v.captions, wide);
  // Son refusé par le navigateur : la vidéo démarre muette et le bouton « Activer le son » apparaît
  vd.play().catch(() => { vd.muted = true; if (sb2) sb2.style.display = 'block'; vd.play().catch(() => {}); });
  try { trackEvent('tuto_open', { id, auto: !!opts.auto }); } catch (e) {}
}
// Sous-titres des vidéos : affichés par-dessus la vidéo (pas incrustés), bouton pour les masquer, choix mémorisé
function kpTutoCaptions(o, vd, caps, wide) {
  const box = o.querySelector('#kp-tuto-cap'), btn = o.querySelector('#kp-tuto-cc');
  if (!box || !btn || !Array.isArray(caps)) return;
  let on = true; try { on = localStorage.getItem('kp_tuto_subs') !== '0'; } catch (e) {}
  const paint = () => { btn.textContent = on ? '💬 Sous-titres ✓' : '💬 Sous-titres ✕'; btn.style.opacity = on ? '1' : '0.75'; box.style.display = on ? 'flex' : 'none'; };
  btn.onclick = () => { on = !on; try { localStorage.setItem('kp_tuto_subs', on ? '1' : '0'); } catch (e) {} paint(); try { trackEvent('tuto_subs', { on }); } catch (e) {} };
  paint();
  let cur = -1, els = [];
  const tick = () => {
    if (!o.isConnected) return;
    const t = vd.currentTime || 0, k = caps.findIndex(c => t >= c.s && t < c.e);
    if (k !== cur) {
      cur = k;
      if (k < 0) { box.innerHTML = ''; els = []; }
      else {
        box.innerHTML = '<span style="background:rgba(9,9,11,0.84);color:#fff;font-weight:800;line-height:1.38;font-size:' + (wide ? 'clamp(13px,1.9cqw,22px)' : 'clamp(12px,4.3cqw,18px)') + ';padding:0.55em 0.8em;border-radius:0.8em;text-align:center;max-width:' + (wide ? '70%' : '100%') + '">' + caps[k].words.map(w => '<i style="font-style:normal;opacity:.45;transition:opacity .1s">' + _escHtml(w.w) + '</i>').join(' ') + '</span>';
        els = [...box.querySelectorAll('i')];
      }
    }
    if (k >= 0) { const rel = t - caps[k].s; els.forEach((e, i) => { e.style.opacity = caps[k].words[i].t <= rel + 0.05 ? '1' : '.45'; }); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
// Bouton « ▶ C'est quoi ? » sur les pages qui ont une vidéo (à la première visite, la vidéo est aussi proposée dans la fenêtre d'explication de l'onglet, voir tab-hints.js)
async function kpTutoForPage(page) {
  try {
    const m = await kpTutoManifest();
    const id = Object.keys(m || {}).find(k => !k.includes('__') && m[k] && m[k].page === page && m[k].url);
    const sec = document.getElementById('sec-' + page);
    const h1 = sec && sec.querySelector('h1');
    if (!id || !sec) return;
    // page sans titre (Actualités) : le bouton se place en haut de la page, hors du contenu redessiné
    if (!h1) { if (!sec.querySelector('.kp-tuto-row')) sec.insertAdjacentHTML('afterbegin', '<div class="kp-tuto-row" style="display:flex;justify-content:flex-end;margin:0 0 8px"><button type="button" class="kp-tuto-btn" onclick="kpOpenTuto(\'' + id + '\')" style="padding:5px 12px;border-radius:999px;border:1px solid #bbf7d0;background:#f0fdf4;color:#16a34a;font:inherit;font-size:12px;font-weight:800;cursor:pointer">▶ C’est quoi ?</button></div>'); }
    else if (!h1.querySelector('.kp-tuto-btn')) h1.insertAdjacentHTML('beforeend', ' <button type="button" class="kp-tuto-btn" onclick="kpOpenTuto(\'' + id + '\')" style="vertical-align:middle;margin-left:6px;padding:4px 10px;border-radius:999px;border:1px solid #bbf7d0;background:#f0fdf4;color:#16a34a;font:inherit;font-size:12px;font-weight:800;cursor:pointer;letter-spacing:0">▶ C’est quoi ?</button>');
  } catch (e) {}
}
// Première ouverture d'un nouveau compte : la présentation passe avant le tutoriel (on peut la passer)
async function kpMaybePresentation() {
  try {
    const willOnboard = !localStorage.getItem(obKey()) && (isDemo || positions.length === 0);
    if (!willOnboard || isDemo || localStorage.getItem(kpTutoSeenKey('presentation'))) return showOnboarding();
    const m = await kpTutoManifest();
    if (!m || !m.presentation) return showOnboarding();
    kpOpenTuto('presentation', { auto: true, skippable: true, onDone: () => showOnboarding() });
  } catch (e) { showOnboarding(); }
}

// ═══ NOUVEAUTÉS : liste datée + petit point sur « Nouveautés » (menu) et sur le bouton du menu quand il y a du nouveau ═══
// Pour annoncer une nouveauté : ajouter une entrée EN HAUT de KP_NEWS (n = numéro suivant, at = heure de mise en ligne en UTC).
// - un petit point s'allume pour les comptes créés AVANT cette heure, jusqu'à l'ouverture de « Nouveautés » ;
// - popup:true ouvre en plus la fenêtre automatiquement (à réserver aux grosses nouveautés) ;
// - les nouveaux arrivants (compte créé après at) ne voient rien : ils découvrent directement la version actuelle.
const KP_NEWS = [
  { n: 2, at: '2026-10-05T14:30:00Z', date: '5 octobre 2026', popup: false, title: 'Graphiques de cours',
    items: [
      ['📈', 'Graphiques de cours, en direct', 'Appuie sur le mini-graphique d’une ligne du portefeuille, ou sur « 📈 Graphique » depuis une fiche, l’aide à la décision ou « Ajouter ». Bougies ou ligne, périodes, moyennes mobiles, volume et ton prix de revient. <b>En direct</b> pour les actions américaines, cryptos et devises ; environ <b>15 min de retard</b> sur les actions européennes (règle des bourses).'],
      ['🔁', 'Doublons fusionnés', 'Si un même actif est saisi sous deux noms (ex. « Air Liquide » et « AI.PA »), un bandeau te propose de les fusionner dans le portefeuille.'],
    ] },
  { n: 1, at: '2026-10-05T13:38:00Z', date: '5 octobre 2026', popup: true, title: 'Cryptos, matières premières et analyses',
    items: [
      ['🪙', 'Cryptos, devises et matières premières', 'Ajoute-les depuis « Ajouter », avec des onglets par catégorie. <b>Cryptos et devises : suivi du cours seulement</b>, sans analyse. <b>Matières premières</b> : or, argent, platine, pétrole, gaz, cuivre (en direct ou via des ETC), avec analyse et un nouvel onglet dans Actualités.'],
      ['🔎', 'Des analyses sur données réelles', 'Plans, signaux et conseils s’appuient désormais sur les vrais cours, la tendance du marché et les actualités des entreprises.'],
      ['⚡', 'Plan du mois : « Tout ajouter »', 'Ajoute toutes les lignes du plan en un clic (les lignes que tu détiens déjà sont renforcées). Tes plans sont enregistrés sur ton compte, identiques sur tous tes appareils.'],
      ['🎚️', 'Règle ton niveau', 'Débutant, curieux, initié ou confirmé : l’appli adapte ses outils. Les Actualités (avec les matières premières) apparaissent dès le niveau 2.'],
    ] },
];
function kpNewsKey() { try { return 'kp_news_seen_' + ((currentUser && currentUser.id) ? currentUser.id : 'anon'); } catch (e) { return 'kp_news_seen_anon'; } }
// Numéro de la dernière nouveauté vue (l'ancien format « 2026-10-06 » valait la nouveauté 1)
function kpNewsSeenN() {
  const conv = v => { if (v === '2026-10-06') return 1; const k = parseInt(v, 10); return k > 0 ? k : 0; };
  let a = 0, b = 0;
  try { a = conv(localStorage.getItem(kpNewsKey())); } catch (e) {}
  try { b = conv(currentUser && currentUser.user_metadata && currentUser.user_metadata.news_seen); } catch (e) {}
  return Math.max(a, b);
}
// Nouveautés non vues ET qui concernent ce compte (créé avant leur mise en ligne)
function kpNewsUnseen() {
  const seen = kpNewsSeenN();
  const created = Date.parse((currentUser && currentUser.created_at) || '');
  return KP_NEWS.filter(e => e.n > seen && !(created && created >= Date.parse(e.at)));
}
function kpMarkNewsSeen() {
  const top = KP_NEWS.reduce((m, e) => Math.max(m, e.n), 0);
  try { localStorage.setItem(kpNewsKey(), String(top)); } catch (e) {}
  try { if (typeof isDemo !== 'undefined' && !isDemo && currentUser && typeof sb !== 'undefined') { currentUser.user_metadata = Object.assign({}, currentUser.user_metadata || {}, { news_seen: top }); sb.auth.updateUser({ data: { news_seen: top } }).catch(() => {}); } } catch (e) {}
  kpUpdateNewsDot();
}
// Petit point : sur l'entrée « Nouveautés » du menu et sur le bouton du menu (visible même menu fermé)
function kpUpdateNewsDot() {
  let on = false;
  try { on = !(typeof isDemo !== 'undefined' && isDemo) && !!currentUser && kpNewsUnseen().length > 0; } catch (e) {}
  const dot = document.getElementById('nav-news-dot'); if (dot) dot.style.display = on ? 'inline-block' : 'none';
  const btn = document.querySelector('.menu-btn');
  if (btn) {
    let d = btn.querySelector('.kp-news-dot');
    if (on && !d) { d = document.createElement('i'); d.className = 'kp-news-dot'; d.setAttribute('aria-label', 'Nouveautés'); d.style.cssText = 'position:absolute;top:2px;right:2px;width:9px;height:9px;border-radius:50%;background:#16a34a;box-shadow:0 0 0 2px var(--color-surface,#fff);pointer-events:none'; btn.appendChild(d); }
    if (!on && d) d.remove();
  }
}
function kpShowWhatsNew(manual) {
  document.getElementById('kp-news-modal')?.remove();
  const list = manual ? KP_NEWS : (kpNewsUnseen().length ? kpNewsUnseen() : KP_NEWS);
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const surf = dark ? '#0f1629' : '#fff', txt = dark ? '#fff' : '#09090b', sub = dark ? 'rgba(255,255,255,0.65)' : '#52525b', bord = dark ? 'rgba(255,255,255,0.12)' : '#e4e4e7', soft = dark ? 'rgba(255,255,255,0.05)' : '#f4f4f5';
  const item = it => '<div style="display:flex;gap:12px;padding:12px;border-radius:14px;background:' + soft + ';margin-bottom:9px"><div style="font-size:22px;line-height:1.2;flex-shrink:0">' + it[0] + '</div><div><div style="font-size:14px;font-weight:800;color:' + txt + ';margin-bottom:2px">' + it[1] + '</div><div style="font-size:12.5px;color:' + sub + ';line-height:1.5">' + it[2] + '</div></div></div>';
  const unseenN = new Set(kpNewsUnseen().map(e => e.n));
  const block = e => '<div style="margin:14px 0 6px;font-size:11.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:' + sub + '">' + e.date + ' · ' + e.title + (unseenN.has(e.n) ? ' <span style="color:#16a34a">● nouveau</span>' : '') + '</div>' + e.items.map(item).join('');
  const hasLevel = list.some(e => e.n === 1);
  const o = document.createElement('div');
  o.id = 'kp-news-modal';
  o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10056;display:flex;align-items:center;justify-content:center;padding:18px';
  o.onclick = ev => { if (ev.target === o) kpCloseWhatsNew(); };
  o.innerHTML = '<div role="dialog" aria-label="Nouveautés Kapitaro" style="background:' + surf + ';width:100%;max-width:460px;border-radius:22px;padding:22px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.4)">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px"><div style="font-size:20px;font-weight:900;color:' + txt + '">✨ Nouveautés Kapitaro</div><button type="button" onclick="kpCloseWhatsNew()" aria-label="Fermer" style="background:none;border:none;color:' + sub + ';font-size:22px;cursor:pointer;line-height:1">✕</button></div>'
    + '<div style="font-size:13px;color:' + sub + ';line-height:1.5">Voici ce qui change dans l’appli.</div>'
    + list.map(block).join('')
    + '<div style="display:flex;gap:8px;margin-top:14px">' + (hasLevel ? '<button type="button" onclick="kpCloseWhatsNew();showLevelChooser(true)" style="flex:1;padding:12px;border-radius:12px;border:1px solid ' + bord + ';background:transparent;color:' + txt + ';font:inherit;font-size:13px;font-weight:800;cursor:pointer">🎚️ Régler mon niveau</button>' : '') + '<button type="button" onclick="kpCloseWhatsNew()" style="flex:1;padding:12px;border-radius:12px;border:none;background:#16a34a;color:#fff;font:inherit;font-size:13px;font-weight:800;cursor:pointer">Compris</button></div>'
    + '</div>';
  document.body.appendChild(o);
  kpMarkNewsSeen();
}
function kpCloseWhatsNew() { document.getElementById('kp-news-modal')?.remove(); }
// À l'arrivée : la fenêtre s'ouvre seule uniquement pour une grosse nouveauté (popup:true) non vue ; sinon le petit point suffit. Jamais pendant un autre écran.
function kpMaybeWhatsNew(tries) {
  try {
    if (typeof isDemo !== 'undefined' && isDemo) return;
    if (!currentUser) return;
    const un = kpNewsUnseen();
    kpUpdateNewsDot();
    if (!un.some(e => e.popup)) return;
    const ob = document.getElementById('onboarding-modal');
    const busy = (ob && ob.style.display === 'flex') || document.getElementById('kp-level-modal') || document.getElementById('legal-accept') || document.getElementById('pr-modal') || document.getElementById('kp-news-modal') || document.getElementById('kp-tour') || document.getElementById('kp-tuto-modal');
    if (busy) { if ((tries || 0) < 6) setTimeout(() => kpMaybeWhatsNew((tries || 0) + 1), 10000); return; }
    kpShowWhatsNew(false);
  } catch (e) {}
}

// Demande le niveau une seule fois, à l'arrivée (sauf pendant l'onboarding objectif).
function maybeAskLevel() {
  try {
    if (kpLevelChosen()) return false;
    if (localStorage.getItem(kpAskedKey())) return false;
    const ob = document.getElementById('onboarding-modal');
    if (ob && ob.style.display === 'flex') return false;
    if (document.getElementById('kp-level-modal')) return true;
    showLevelChooser(false);
    return true;
  } catch { return false; }
}


function activationCardHTML() {
  const opt = (icon, title, sub, onclick, main) => `<button type="button" onclick="${onclick}" class="${main ? 'kp-pulse' : ''}" style="display:flex;align-items:center;gap:14px;width:100%;text-align:left;padding:14px 16px;border-radius:14px;cursor:pointer;font:inherit;${main ? 'background:linear-gradient(135deg,#16a34a,#059669);border:none;color:#fff;box-shadow:0 6px 22px rgba(22,163,74,0.35)' : 'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#fff'}">
      <span style="font-size:24px;flex-shrink:0">${icon}</span>
      <span style="min-width:0"><span style="display:block;font-size:14.5px;font-weight:800">${title}</span><span style="display:block;font-size:12px;opacity:0.75;margin-top:2px">${sub}</span></span>
      <span style="margin-left:auto;font-size:18px;opacity:0.6">›</span></button>`;
  return `<div style="background:linear-gradient(135deg,#0f1f17,#0b1220);border:1px solid rgba(22,163,74,0.35);border-radius:20px;padding:22px 18px;margin-bottom:14px">
    <div style="font-size:11.5px;font-weight:800;color:#4ade80;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px">Pour bien démarrer · 2 minutes</div>
    <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.03em;margin-bottom:6px">Ajoute tes placements pour voir ton score</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.62);margin-bottom:16px;line-height:1.5">Ton score de santé, tes alertes et l'assistant IA se basent sur ton portefeuille. Choisis comment commencer :</div>
    <div style="display:grid;gap:10px">
      ${opt('📥', 'Importer le relevé de mon courtier', 'PDF, Excel ou CSV : Trade Republic, Boursorama, XTB…', "trackEvent('activation_click',{c:'import'});showCSVHelp()", true)}
      ${opt('⚡', 'Ajouter mes placements', 'Plusieurs d\'un coup, sans se perdre', "trackEvent('activation_click',{c:'rapide'});openQuickAdd('home')")}
      ${opt('🌱', "Je n'ai pas encore investi", 'Construis ton premier plan à partir d\'un objectif', "trackEvent('activation_click',{c:'debutant'});showOnboarding(true)")}
    </div>
  </div>`;
}

// Courbe de l'accueil : vrais cours du dernier mois, avec les quantités actuelles (aucune donnée simulée).
// Si les cours manquent pour une trop grande part du portefeuille, on n'affiche pas de courbe.
async function kpHomeCurve() {
  const el = document.getElementById('home-curve');
  if (!el || !positions.length) return;
  const total = positions.reduce((a, p) => a + p.qty * p.price, 0);
  if (!total) return;
  const results = await Promise.all(positions.map(async p => {
    try {
      const d = await kpFetchChart(kpTickerOf(p.name) || p.name, '1m');
      const pts = (d.points || []).filter(x => x && x.c > 0);
      return pts.length > 1 ? { p, pts } : null;
    } catch (e) { return null; }
  }));
  const series = results.filter(Boolean);
  const covered = series.reduce((a, r) => a + r.p.qty * r.p.price, 0);
  if (!series.length || covered / total < 0.7) return;
  const ref = series.reduce((a, r) => r.pts.length > a.pts.length ? r : a).pts;
  const values = ref.map(point => series.reduce((sum, r) => {
    const last = r.pts[r.pts.length - 1].c;
    let c = r.pts[0].c;
    for (const x of r.pts) { if (x.t <= point.t) c = x.c; else break; }
    return sum + r.p.qty * r.p.price * c / last;
  }, 0));
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const W = 320, H = 64;
  const line = values.map((v, i) => `${(i / (values.length - 1) * W).toFixed(1)},${(H - 4 - (v - min) / range * (H - 10)).toFixed(1)}`);
  const up = values[values.length - 1] >= values[0];
  const color = up ? '#4ade80' : '#f87171';
  const target = document.getElementById('home-curve');
  if (!target) return;
  target.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="M0,${H} L${line.join(' L')} L${W},${H} Z" fill="${color}" opacity="0.13"/><path d="M${line.join(' L')}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg><div class="kph-curve-note">1 mois, à composition actuelle</div>`;
}

async function renderHome() {
  const h = new Date().getHours();
  const greet = h<12?'Bonjour':h<18?'Bon après-midi':'Bonsoir';
  const emojis = ['👋','👋','👋','👋','👋'];
  const emoji = emojis[new Date().getDay() % emojis.length];
  const name = userFirstName();
  const tv = positions.reduce((a,p)=>a+p.qty*p.price, 0);
  const ti = positions.reduce((a,p)=>a+p.qty*p.pru, 0);
  const tpnl = tv - ti;
  const tpct = ti ? tpnl/ti*100 : 0;
  const avgChange = positions.length ? positions.reduce((a,p)=>a+(p.change_pct||0),0)/positions.length : 0;
  const {score, items: scoreItems} = calcScore();
  const scoreColor = score>=7?'#1a7f5a':score>=5?'#f59e0b':'#cc2f26';
  const targetVal = objChartTarget > 1000 ? objChartTarget : (objective.target || 0);
  const pctObj = targetVal > 0 ? Math.min(tv/targetVal*100, 100) : 0;
  const sorted = [...positions].sort((a,b)=>(b.change_pct||0)-(a.change_pct||0));
  const best = sorted[0], worst = sorted[sorted.length-1];
  const today = new Date().toISOString().split('T')[0];

  document.getElementById('home-greeting').textContent = `${greet}${name ? ' ' + name : ''} ! ${emoji}`;
  const subEl = document.getElementById('home-date');
  if (subEl) subEl.textContent = 'Voici la santé de ton portefeuille aujourd\'hui.';

  // Portefeuille vierge : on garde le tableau de bord complet (tout à zéro) et on
  // ajoute l'invitation "Commence ton investissement" EN DESSOUS.
  const isEmpty = !positions.length;

  // Générer sparkline SVG
  function sparkline(data, color, width=120, height=40, fill=true) {
    if (!data || data.length < 2) return '';
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v,i) => `${(i/(data.length-1))*width},${height - ((v-min)/range)*(height-6) - 3}`);
    const pathD = 'M' + pts.join(' L');
    const fillD = fill ? `${pathD} L${width},${height} L0,${height} Z` : '';
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs><linearGradient id="sg${color.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      ${fill ? `<path d="${fillD}" fill="url(#sg${color.replace('#','')})"/>` : ''}
      <path d="${pathD}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  // Données sparkline simulées basées sur la perf
  function genSparkData(trend, points=20) {
    const data = [50];
    for (let i = 1; i < points; i++) {
      const v = data[i-1] + (Math.random()-0.5)*3 + trend*0.3;
      data.push(Math.max(20, Math.min(80, v)));
    }
    return data;
  }

  const pnlColor = tpnl >= 0 ? '#4ade80' : '#f87171';
  const pnlBg = tpnl >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)';
  const chgColor = avgChange >= 0 ? '#4ade80' : '#f87171';
  const scoreTxt = (isEmpty || !apos().length) ? '—' : score.toFixed(1).replace(".", ",");
  const scoreShownColor = (isEmpty || !apos().length) ? '#8e8e93' : scoreColor;
  const stripItems = (isEmpty || !scoreItems.length)
    ? ['Diversification','Concentration max','Part ETF','Performance'].map(label => ({label, score:0}))
    : scoreItems;

  // ── CARTE PRINCIPALE ──
  const perfSign = tpnl >= 0 ? '+' : '−';
  document.getElementById('home-metrics').innerHTML = `
    <div onclick="nav('portfolio')" class="kph-hero home-hover-card">
      <div class="kph-hero-label">Mon épargne</div>
      <div class="kph-hero-value" id="home-tv-counter">—</div>
      <div class="kph-hero-perf" style="color:${pnlColor}">${isEmpty ? 'Ajoute tes placements pour commencer' : `${perfSign}${Math.abs(tpct).toFixed(1).replace('.', ',')} % depuis le début · ${perfSign}${Math.abs(tpnl).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}</div>
      <div class="kph-curve" id="home-curve"></div>
    </div>`;

  // ── STRUCTURE EN 3 NIVEAUX ──
  // 1) Hero (déjà injecté ci-dessus) + actions rapides : ce qu'un débutant doit voir/faire.
  // 2) Bande compacte santé + insight : signal technique glanceable, sans noyer.
  // 3) "Voir plus d'analyses" : détail replié pour qui veut creuser (répartition...).
  let html = '';

  // Santé et objectif, côte à côte
  const scoreDeg = isEmpty ? 0 : Math.max(0, Math.min(10, score)) * 36;
  html += `
  <div class="kph-duo">
    <div onclick="nav('sante')" class="kph-card home-hover-card">
      <div class="kph-card-title">Santé du portefeuille</div>
      <div class="kph-ring" style="background:conic-gradient(${scoreShownColor} ${scoreDeg}deg, var(--color-border-subtle) 0)"><div><b style="color:${scoreShownColor}">${scoreTxt}</b><span>/10</span></div></div>
      <div class="kph-card-sub">${isEmpty ? 'Pas encore de données' : score >= 7 ? 'Solide' : score >= 5 ? 'Correct' : 'À améliorer'}</div>
    </div>
    <div onclick="nav('objectif')" class="kph-card home-hover-card">
      <div class="kph-card-title">Mon objectif</div>
      ${targetVal > 0 ? `
      <div class="kph-goal">${pctObj.toFixed(0)} %</div>
      <div class="kph-bar"><div id="home-prog-bar"></div></div>
      <div class="kph-card-sub">${fmtK(tv)} sur ${fmtK(targetVal)}</div>` : `
      <div class="kph-card-sub" style="margin-top:12px">Fixe ton objectif pour suivre ta progression</div>`}
    </div>
  </div>`;

  // Le point à regarder aujourd'hui
  html += `
  <div onclick="nav('sante')" class="kph-note home-hover-card">
    <span class="kph-note-dot"></span>
    <div id="home-ai-insight">${positions.length > 0 ? `${avgChange >= 0 ? 'Portefeuille en hausse de' : 'Portefeuille en baisse de'} <strong style="color:${avgChange >= 0 ? '#16a34a' : '#dc2626'}">${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(1).replace('.', ',')} %</strong> aujourd'hui.` : 'Ajoute une position pour voir ce qui mérite ton attention.'}</div>
    <span class="kph-arrow">›</span>
  </div>`;

  // Raccourcis
  html += `
  <div class="kph-actions">
    <button type="button" class="kph-action primary" onclick="nav('ajouter')">＋ Ajouter une position</button>
    <button type="button" class="kph-action" onclick="nav('ai')">Poser une question</button>
  </div>`;

  // Tous les outils (icônes reprises du menu)
  const kphIcon = id => document.getElementById('nav-' + id)?.querySelector('svg')?.outerHTML || '';
  const kphTools = [
    ['decision', 'Aide à la décision', "nav('decision')"],
    ['ai', 'Agent IA', "nav('ai')"],
    ['crise', 'Scénario crise', "nav('crise')"],
    ['dca', 'Simulateur DCA', "nav('dca')"],
    ['calc', 'Calculateurs', "nav('calc')"],
    ['depenses', 'Mes dépenses', "nav('depenses')"],
    ['bilan', 'Mon bilan', 'openBilan()'],
    ['news', 'Actualités', "nav('news')"],
  ];
  html += `
  <div class="kph-tools-title">Mes outils</div>
  <div class="kph-tools">
    ${kphTools.map(([id, label, go]) => `<button type="button" class="kph-tool" onclick="${go}"><span class="kph-tool-ico">${kphIcon(id)}</span><span>${label}</span></button>`).join('')}
  </div>`;

  // Meilleure + pire performance avec sparkline
  let bwHtml = '';
  if (best && worst && best !== worst) {
    bwHtml = `
    <div class="home-bw" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:10px">
      <div onclick="nav('portfolio')" style="cursor:pointer;background:#fff;border:1px solid var(--color-border);border-radius:16px;padding:16px;transition:all 0.2s" class="home-hover-card">
        <div style="font-size:9px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">🏆 Meilleure performance</div>
        <div style="font-size:18px;font-weight:800;color:#09090b;letter-spacing:-0.04em;margin-bottom:2px">${best.name}</div>
        <div style="font-size:20px;font-weight:900;color:${(best.change_pct||0)>=0?'#16a34a':'#dc2626'};letter-spacing:-0.04em;margin-bottom:8px">${(best.change_pct||0)>=0?'+':''}${(best.change_pct||0).toFixed(2).replace(".", ",")} %</div>
      </div>
      <div onclick="nav('portfolio')" style="cursor:pointer;background:#fff;border:1px solid var(--color-border);border-radius:16px;padding:16px;transition:all 0.2s" class="home-hover-card">
        <div style="font-size:9px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">📉 Plus faible performance</div>
        <div style="font-size:18px;font-weight:800;color:#09090b;letter-spacing:-0.04em;margin-bottom:2px">${worst.name}</div>
        <div style="font-size:20px;font-weight:900;color:${(worst.change_pct||0)>=0?'#16a34a':'#dc2626'};letter-spacing:-0.04em;margin-bottom:8px">${(worst.change_pct||0)>0?'+':''}${(worst.change_pct||0).toFixed(2).replace(".", ",")} %</div>
      </div>
    </div>`;
  }

  // Répartition par plateforme — repliée derrière "Voir plus d'analyses" (niveau 3)
  const platforms = {};
  positions.forEach(p=>{ const v=p.qty*p.price; platforms[p.platform||'Autre']=(platforms[p.platform||'Autre']||0)+v; });
  const platformEntries = Object.entries(platforms);

  if (platformEntries.length > 0) {
    const colors = ['#16a34a','#6366f1','#f59e0b','#ec4899','#06b6d4'];
    // Donut SVG
    function donutSVG(entries, total, size=80) {
      let offset = 0;
      const r = 28, c = size/2, circum = 2*Math.PI*r;
      const segments = entries.map(([name,val],i) => {
        const pct = val/total;
        const dash = pct * circum;
        const seg = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${colors[i%colors.length]}" stroke-width="8" stroke-dasharray="${dash} ${circum-dash}" stroke-dashoffset="${-offset*circum}" transform="rotate(-90 ${c} ${c})" stroke-linecap="round"/>`;
        offset += pct;
        return seg;
      });
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const textColor = isDark ? '#e8f5e8' : '#09090b';
      const subColor = isDark ? '#4a6a4a' : '#8e8e93';
      const trackColor = isDark ? '#1e2e1e' : '#f0f0f2';
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${trackColor}" stroke-width="8"/>
        ${segments.join('')}
        <text x="${c}" y="${c-3}" text-anchor="middle" font-size="9" font-weight="700" fill="${textColor}">${fmtK(total)}</text>
        <text x="${c}" y="${c+8}" text-anchor="middle" font-size="7" fill="${subColor}">Total</text>
      </svg>`;
    }

    html += `
    <div style="margin-bottom:4px">
      <button onclick="const el=document.getElementById('home-more');const open=el.style.display==='block';el.style.display=open?'none':'block';this.querySelector('span').textContent=open?'Voir plus d\\'analyses  ▾':'Voir moins  ▴'" style="width:100%;padding:10px;background:none;border:1px dashed var(--color-border);border-radius:12px;font-size:12px;font-weight:600;color:var(--color-text-secondary);cursor:pointer"><span>Voir plus d'analyses  ▾</span></button>
      <div id="home-more" style="display:none;margin-top:10px">
        ${bwHtml}
        <div style="background:#fff;border:1px solid var(--color-border);border-radius:16px;padding:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
            <div style="font-size:11px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.08em">Répartition par plateforme</div>
            <button onclick="nav('portfolio')" style="font-size:11px;font-weight:600;color:var(--color-text-secondary);background:none;border:none;cursor:pointer">Détails →</button>
          </div>
          <div style="display:flex;align-items:center;gap:20px">
            ${donutSVG(platformEntries, tv)}
            <div style="flex:1;display:flex;flex-direction:column;gap:8px">
              ${platformEntries.map(([name,val],i) => `
              <div>
                <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:4px">
                  <span style="color:#09090b">${name}</span>
                  <span style="color:#09090b">${fmtK(val)} <span style="color:var(--color-text-tertiary)">${(val/tv*100).toFixed(1).replace(".", ",")} %</span></span>
                </div>
                <div style="background:#f0f0f2;border-radius:99px;height:4px;overflow:hidden">
                  <div style="height:100%;background:${colors[i%colors.length]};width:${(val/tv*100)}%;border-radius:99px;transition:width 1s cubic-bezier(0.16,1,0.3,1)"></div>
                </div>
              </div>`).join('')}
            </div>
          </div>
          <div style="margin-top:12px;font-size:11px;color:var(--color-text-tertiary)">${platformEntries.length} plateforme${platformEntries.length>1?'s':''} connectée${platformEntries.length>1?'s':''}</div>
        </div>
      </div>
    </div>`;
  }

  if (isEmpty) {
    html = activationCardHTML() + html;
  }
  try { html = setupProgressHTML() + html; } catch (e) {}
  if (false) {
    html += `
    <div style="background:#0f0f14;border-radius:20px;padding:32px 24px;text-align:center;margin-top:10px">
      <div style="font-size:40px;margin-bottom:12px">📈</div>
      <div style="font-size:20px;font-weight:900;color:#fff;margin-bottom:8px;letter-spacing:-0.04em">Commence ton investissement</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:22px;max-width:320px;margin-left:auto;margin-right:auto">Suis ton portefeuille, reçois des signaux IA et atteins tes objectifs</div>
      <div style="display:flex;flex-direction:column;gap:10px;max-width:280px;margin:0 auto">
        <button onclick="nav('ajouter')" style="padding:13px;background:linear-gradient(135deg,#16a34a,#059669);color:#fff;border:none;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(22,163,74,0.35)">➕ Ajouter ma première position</button>
        <button onclick="showOnboarding(true)" style="padding:12px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.75);border-radius:14px;font-size:13px;font-weight:600;cursor:pointer">🎯 Créer mon premier objectif</button>
      </div>
    </div>`;
  }

  document.getElementById('home-score').innerHTML = html;
  try { applyUserLevel(); } catch (e) {}
  document.getElementById('home-alerts').innerHTML = '';
  document.getElementById('home-obj').innerHTML = '';
  // renderPlatforms() supprimé — déjà dans le donut chart

  // Animations
  setTimeout(() => {
    const tvEl = document.getElementById('home-tv-counter');
    if (tvEl) animateNumber(tvEl, 0, tv, 1000);
    const progBar = document.getElementById('home-prog-bar');
    if (progBar) animateBar(progBar, pctObj, 1100, 300);
    const chips = document.querySelectorAll('#home-metrics .a-chip');
    chips.forEach((chip, i) => {
      chip.style.opacity = '0';
      chip.style.transform = 'scale(0.9)';
      chip.style.transition = `opacity 0.25s ease ${i*80+200}ms, transform 0.25s ease ${i*80+200}ms`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        chip.style.opacity = '1';
        chip.style.transform = 'scale(1)';
      }));
    });
  }, 80);
  setTimeout(() => fadeInCards('#home-score > div', 90), 150);
  kpHomeCurve();

  // Insight IA asynchrone
  setTimeout(async () => {
    if (!positions.length) return;
    const insightEl = document.getElementById('home-ai-insight');
    if (!insightEl) return;
    const tv2 = positions.reduce((a,p)=>a+p.qty*p.price,0);
    const topSectors = {};
    positions.forEach(p => { if(p.sector) topSectors[p.sector]=(topSectors[p.sector]||0)+p.qty*p.price; });
    const topSector = Object.entries(topSectors).sort((a,b)=>b[1]-a[1])[0];
    const topPct = topSector ? (topSector[1]/tv2*100).toFixed(0) : 0;
    if (topSector && topPct > 35) {
      insightEl.innerHTML = `Ton exposition au secteur <strong style="color:var(--color-text)">${topSector[0]}</strong> est élevée (<strong style="color:#f59e0b">${topPct}%</strong>). Regarde le détail dans ta page Santé.`;
    }
  }, 800);
}


function buildAlertsData() {
  const tv = apos().reduce((a,p) => a + p.qty*p.price, 0);
  if (!tv) return [];

  // Grouper par ticker pour éviter les doublons
  const grouped = {};
  apos().forEach(p => {
    if (!grouped[p.name]) {
      grouped[p.name] = { name: p.name, type: p.type, val: 0, alert_price: p.alert_price, price: p.price };
    }
    grouped[p.name].val += p.qty * p.price;
    // Conserve l'alerte la plus basse définie
    if (p.alert_price && (!grouped[p.name].alert_price || p.alert_price > grouped[p.name].alert_price)) {
      grouped[p.name].alert_price = p.alert_price;
    }
  });

  let alerts = [];
  const seenAlerts = new Set();

  Object.values(grouped).forEach(g => {
    const w = g.val / tv * 100;
    const key = g.name;
    if (seenAlerts.has(key)) return;
    seenAlerts.add(key);

    if (g.type === 'ETF') { /* un ETF large n'est pas un risque de concentration */ } else if (w > 40) alerts.push({type:'err', msg:`⚡ <strong>${g.name}</strong> = ${w.toFixed(0)}% — concentration excessive`});
    else if (w > 25) alerts.push({type:'warn', msg:`<strong>${g.name}</strong> = ${w.toFixed(0)}% — surveille`});
    if (g.alert_price && g.price <= g.alert_price) {
      alerts.push({type:'err', msg:`🔔 <strong>${g.name}</strong> sous ton alerte ${fmt(g.alert_price)}€`});
    }
  });

  const etfPct = apos().filter(p => p.type==='ETF').reduce((a,p) => a+p.qty*p.price, 0) / tv * 100;
  if (etfPct < 30) alerts.push({type:'warn', msg:`Seulement ${etfPct.toFixed(0)}% d'ETF — vise 60–80%`});
  if (!alerts.length) alerts.push({type:'ok', msg:'✅ Portefeuille bien équilibré'});
  return alerts;
}

function emptyMsg() { return '<p style="font-size:14px;color:#c7c7cc;padding:4px 0;font-weight:500">Ajoutez des positions pour voir cet indicateur.</p>'; }

function renderPlatforms() {
  const tv = positions.reduce((a,p)=>a+p.qty*p.price,0);
  if (!tv) { document.getElementById('home-platforms').innerHTML=emptyMsg(); return; }
  const platforms = {};
  positions.forEach(p=>{ const v=p.qty*p.price; platforms[p.platform||'Autre']=(platforms[p.platform||'Autre']||0)+v; });
  document.getElementById('home-platforms').innerHTML = Object.entries(platforms).map(([name,val])=>`
    <div class="bar-row"><div class="bar-label"><span>${name}</span><span>${fmtK(val)} (${(val/tv*100).toFixed(1).replace(".", ",")} %)</span></div>
    <div class="bar-bg"><div class="bar-fill" style="width:${val/tv*100}%;background:#1c1c1e"></div></div></div>`).join('');
}

// ===== SCORE =====
function calcScore() {
  if (!apos().length) return {score:0,items:[],details:{diversity:0,concentration:0,etfRatio:0,performance:0}};
  const tv = apos().reduce((a,p)=>a+p.qty*p.price,0);
  const maxW = Math.max(0, ...apos().filter(p=>p.type!=='ETF').map(p=>p.qty*p.price/tv*100));   // hors ETF larges et hors cryptos
  const etfPct = apos().filter(p=>p.type==='ETF').reduce((a,p)=>a+p.qty*p.price,0)/tv*100;
  const pnl = apos().reduce((a,p)=>a+(p.qty*p.price-p.qty*p.pru),0);
  // Seuils alignés sur les repères déjà affichés ailleurs dans la page Santé
  // (Min conseillé : 8 positions · Concentration max idéale : 25% · Part ETF idéale : 60%+)
  // pour qu'un score "Excellent" corresponde vraiment à un portefeuille qui respecte ces repères.
  const items=[
    {label:'Diversification',score:Math.min(10,apos().length*1.25),tip:apos().length<8?`${apos().length} positions — vise 8+`:''},
    {label:'Concentration max',score:maxW>50?1:maxW>40?3:maxW>25?5:maxW>15?8:10,tip:maxW>25?`Position dominante ${maxW.toFixed(0)}% — vise <25%`:''},
    {label:'Part ETF',score:etfPct>=70?10:etfPct>=60?9:etfPct>=45?6:etfPct>=25?4:2,tip:etfPct<60?`ETF = ${etfPct.toFixed(0)}% — vise 60%+`:''},
    {label:'Performance',score:pnl>=0?8:pnl>-tv*0.1?6:4,tip:''},
  ];
  const finalScore = Math.round(items.reduce((a,i)=>a+i.score,0)/items.length*10)/10;
  return { score:finalScore, items, details:{ diversity:items[0].score, concentration:items[1].score, etfRatio:items[2].score, performance:items[3].score } };
}
// ═══════════════════════════════════════════════════════════
//  ⚠️ ALERTES INTELLIGENTES
//  1) Des règles chiffrées (gratuites, instantanées) repèrent ce qui mérite
//     attention : position trop lourde, grosse perte.
//  2) L'IA n'intervient QUE quand une règle se déclenche, pour expliquer et
//     proposer un remplacement — réservé Premium, mis en cache 7 jours.
//  Évaluées à l'ouverture de l'app (rien ne tourne en arrière-plan).
// ═══════════════════════════════════════════════════════════
const SMART_CONC_MAX = 25;   // % max conseillé pour une action individuelle
const SMART_LOSS_MAX = -20;  // % de perte vs PRU à partir duquel on alerte

function _escHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function computeRuleAlerts() {
  if (!apos().length) return [];
  const grouped = {};
  apos().forEach(p => {
    const g = grouped[p.name] || (grouped[p.name] = { name: p.name, type: p.type, val: 0, cost: 0 });
    g.val += p.qty * p.price; g.cost += p.qty * p.pru;
  });
  const list = Object.values(grouped);
  const tv = list.reduce((a, g) => a + g.val, 0);
  if (!tv) return [];
  const out = [];
  list.forEach(g => {
    const pct = g.val / tv * 100;
    const perf = g.cost > 0 ? (g.val - g.cost) / g.cost * 100 : 0;
    // Un ETF large qui pèse lourd n'est pas un risque de concentration
    if (g.type !== 'ETF' && pct > SMART_CONC_MAX && list.length > 2)
      out.push({ key: 'conc:' + g.name, kind: 'concentration', ticker: g.name, name: displayName(g.name), pct, perf, severity: pct > 40 ? 3 : 2 });
    if (perf < SMART_LOSS_MAX)
      out.push({ key: 'loss:' + g.name, kind: 'loss', ticker: g.name, name: displayName(g.name), pct, perf, severity: perf < -35 ? 3 : 2 });
  });
  return out.sort((a, b) => b.severity - a.severity).slice(0, 3);
}

async function getSmartAdvice(a) {
  const week = Math.floor(Date.now() / (7 * 86400000));
  const cacheKey = 'iq_smart_' + (currentUser?.id || 'x') + '_' + a.key + '_' + week + '_' + Math.round(a.pct / 5) + '_' + Math.round(a.perf / 5);
  try { const c = JSON.parse(localStorage.getItem(cacheKey) || 'null'); if (c) return c; } catch {}

  const tv = apos().reduce((s, p) => s + p.qty * p.price, 0);
  const held = [...new Set(apos().map(p => p.name))].slice(0, 15).join(', ');
  const facts = a.kind === 'concentration'
    ? `${a.name} (${a.ticker}) représente ${a.pct.toFixed(0)}% du portefeuille (repère : ${SMART_CONC_MAX}%).`
    : `${a.name} (${a.ticker}) est à ${a.perf.toFixed(0)}% par rapport à ton prix de revient et pèse ${a.pct.toFixed(0)}% du portefeuille.`;
  const _dc = await fetchContextBlock([{ t: a.ticker, name: a.name }]);
  const prompt = `Portefeuille de ${fmtK(tv)} — lignes : ${held}.
Profil ${objRisk || profile.risk || 'équilibré'}, répartition cible ${objStockPct}% actions / ${100 - objStockPct}% ETF.
CONSTAT (calculé, factuel) : ${facts}

${_dc.text}

Donne un avis prudent et concret. N'invente AUCUNE actualité ni évènement : appuie-toi uniquement sur le constat, les données de marché ci-dessus et des principes connus (diversification, discipline).
Réponds UNIQUEMENT en JSON valide sans backticks :
{"verdict":"alléger|vendre|garder","raison":"1 à 2 phrases chiffrées, tutoiement","remplacement":{"ticker":"IWDA.AS","name":"iShares Core MSCI World","raison":"max 12 mots"}}
Pour "remplacement", propose un actif plus diversifié cohérent avec sa cible (souvent un ETF monde), choisi UNIQUEMENT parmi ces tickers : ${PLAN_ETFS.map(e => e[0]).join(', ')} ; si verdict "garder", mets remplacement à null.`;
  try {
    const raw = await callClaude(prompt, "Tu es Kapitaro, copilote financier prudent. Tu ne fournis pas de conseil réglementé. Réponds UNIQUEMENT en JSON valide.", 600, HAIKU_MODEL);
    if (callClaudeFailed(raw)) return null;
    const clean = raw.replace(/```json|```/g, '').trim();
    const data = JSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1));
    if (!data.verdict || !data.raison) return null;
    try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch {}
    return data;
  } catch (e) { console.warn('smartAdvice:', e); return null; }
}

async function renderSmartAlerts(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const alerts = computeRuleAlerts();
  if (!alerts.length) { el.innerHTML = ''; return; }
  const premium = isPremiumUser();
  const kindTxt = a => a.kind === 'concentration'
    ? `pèse <strong>${a.pct.toFixed(0)}%</strong> de ton portefeuille (repère : moins de ${SMART_CONC_MAX}%)`
    : `est à <strong>${a.perf.toFixed(0)}%</strong> par rapport à ton prix d'achat`;

  el.innerHTML = `
  <div style="background:linear-gradient(135deg,#1a1206,#241a0a);border:1px solid rgba(245,158,11,0.3);border-radius:16px;padding:16px 18px;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <span style="font-size:15px">⚠️</span>
      <span style="font-size:13px;font-weight:900;color:#fbbf24">À surveiller dans ton portefeuille</span>
    </div>
    ${alerts.map((a, i) => `
    <div style="padding:11px 0;${i ? 'border-top:1px solid rgba(255,255,255,0.08)' : ''}">
      <div style="font-size:12.5px;color:rgba(255,255,255,0.85);line-height:1.5"><strong style="color:#fff">${_escHtml(a.name)}</strong> ${kindTxt(a)}.</div>
      <div id="${containerId}-adv-${i}" style="margin-top:8px">
        ${premium
          ? `<div style="font-size:11px;color:rgba(255,255,255,0.4)">Analyse en cours…</div>`
          : `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:11px;color:rgba(255,255,255,0.5)"><span>🔒 Analyse IA de ce point d'attention — Premium</span><button onclick="showPlansModal()" style="background:#16a34a;border:none;color:#fff;font-size:11px;font-weight:700;padding:6px 12px;border-radius:8px;cursor:pointer">Débloquer</button></div>`}
      </div>
    </div>`).join('')}
  </div>`;

  // Une notification par alerte et par jour
  const today = new Date().toISOString().slice(0, 10);
  alerts.forEach(a => {
    const nk = 'iq_smart_notif_' + (currentUser?.id || 'x') + '_' + a.key;
    try {
      if (localStorage.getItem(nk) === today) return;
      localStorage.setItem(nk, today);
      notifications.unshift({ titre: `⚠️ ${a.name} à surveiller`, texte: `${a.name} ${a.kind === 'concentration' ? `pèse ${a.pct.toFixed(0)}% de ton portefeuille` : `est à ${a.perf.toFixed(0)}% vs ton prix d'achat`}.`, action: 'Voir Objectif', impact: 'high', heure: "Aujourd'hui", type: 'smart' });
      renderNotifications();
      document.getElementById('notif-dot')?.classList.add('show');
    } catch {}
  });

  if (!premium) return;
  for (let i = 0; i < alerts.length; i++) {
    const advEl = document.getElementById(`${containerId}-adv-${i}`);
    const adv = await getSmartAdvice(alerts[i]);
    if (!advEl || !document.getElementById(containerId)) return;
    if (!adv) { advEl.innerHTML = `<div style="font-size:11px;color:rgba(255,255,255,0.4)">Analyse indisponible pour le moment.</div>`; continue; }
    const vColor = adv.verdict === 'vendre' ? '#f87171' : adv.verdict === 'alléger' ? '#fbbf24' : '#4ade80';
    advEl.innerHTML = `
      <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:10px 12px">
        <div style="font-size:11px;font-weight:800;color:${vColor};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Point d'attention : ${_escHtml(({vendre:'ligne à réexaminer', 'alléger':'forte concentration', garder:'pas d’urgence'})[adv.verdict] || adv.verdict)}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.8);line-height:1.5">${_escHtml(adv.raison)}</div>
        ${adv.remplacement && adv.remplacement.ticker ? `<div style="font-size:11.5px;color:rgba(255,255,255,0.6);margin-top:6px">↪ Alternative à étudier : <strong style="color:#fff">${_escHtml(adv.remplacement.name || adv.remplacement.ticker)}</strong> <span style="opacity:.6">${_escHtml(adv.remplacement.ticker)}</span> — ${_escHtml(adv.remplacement.raison || '')}</div>` : ''}
      </div>`;
  }
}

function buildScore() {
  const {score,items}=calcScore();
  const color=score>=7?'#1a7f5a':score>=5?'#ff9500':'#ff3b30';
  const bg=score>=7?'#e8f8f0':score>=5?'#fff5e0':'#fff0f0';
  let html=`<div class="score-wrap"><div class="score-ring" style="background:${bg};border-color:${color}"><div class="score-num" style="color:${color}">${score.toFixed(1).replace(".", ",")}</div><div class="score-max" style="color:${color}">/10</div></div><div class="score-items">`;
  items.forEach(it=>{const c=it.score>=7?'#1a7f5a':it.score>=5?'#ff9500':'#ff3b30';html+=`<div class="score-row"><span class="score-row-label">${it.label}</span><div class="score-bar-bg"><div class="score-bar-fill" style="width:${it.score/10*100}%;background:${c}"></div></div><span class="score-val" style="color:${c}">${it.score}</span></div>`;});
  html+='</div></div>';
  const tips=items.filter(i=>i.tip);
  if(tips.length) html+='<div style="margin-top:8px">'+tips.map(t=>`<div style="font-size:13px;color:#8e8e93;margin-bottom:4px;font-weight:500">→ ${t.tip}</div>`).join('')+'</div>';
  return html;
}
function buildAlerts() {
  const tv=apos().reduce((a,p)=>a+p.qty*p.price,0);
  if (!tv) return emptyMsg();
  let alerts=[];
  apos().forEach(p=>{
    const w=p.qty*p.price/tv*100;
    if(p.type==='ETF'){} else if(w>40) alerts.push({type:'err',msg:`<strong>${p.name}</strong> = ${w.toFixed(0)}% — concentration excessive.`});
    else if(w>25) alerts.push({type:'warn',msg:`<strong>${p.name}</strong> = ${w.toFixed(0)}% — surveille.`});
    if(p.alert_price&&p.price<=p.alert_price) alerts.push({type:'err',msg:`<strong>${p.name}</strong> sous ton alerte prix de ${fmt(p.alert_price)}€ !`});
  });
  const etfPct=apos().filter(p=>p.type==='ETF').reduce((a,p)=>a+p.qty*p.price,0)/tv*100;
  if(etfPct<30) alerts.push({type:'warn',msg:`Seulement ${etfPct.toFixed(0)}% d'ETF — vise 60–80%.`});
  if(apos().length<3) alerts.push({type:'warn',msg:`${apos().length} position(s) — diversifie avec 3–5 actifs.`});
  if(!alerts.length) alerts.push({type:'ok',msg:'Portefeuille bien équilibré — aucune alerte !'});
  const icons={ok:'✓',warn:'⚠',err:'✕'};
  return alerts.map(a=>`<div class="alert alert-${a.type}"><span class="alert-icon">${icons[a.type]}</span><div>${a.msg}</div></div>`).join('');
}

// ===== PORTFOLIO =====
// Tri des lignes du portefeuille, mémorisé sur l'appareil
const KP_PORT_SORTS = [
  ['valeur', 'Valeur actuelle (la plus grosse)', (a, b) => b.val - a.val],
  ['investi', 'Somme investie (la plus grosse)', (a, b) => b.inv - a.inv],
  ['perf_haut', 'Les plus rentables (en %)', (a, b) => b.pct - a.pct],
  ['perf_bas', 'Les moins rentables (en %)', (a, b) => a.pct - b.pct],
  ['gain_haut', 'Plus gros gains (en €)', (a, b) => b.pnl - a.pnl],
  ['gain_bas', 'Plus grosses pertes (en €)', (a, b) => a.pnl - b.pnl],
  ['jour', "Variation d'aujourd'hui", (a, b) => b.chg - a.chg],
  ['nom', 'Nom (A à Z)', (a, b) => a.label.localeCompare(b.label, 'fr')],
];
function kpPortSort() {
  try { const k = localStorage.getItem('kp_port_sort'); if (KP_PORT_SORTS.some(x => x[0] === k)) return k; } catch (e) {}
  return 'valeur';
}
function kpSetPortSort(k) {
  try { localStorage.setItem('kp_port_sort', k); } catch (e) {}
  renderPortfolio(true);
}
function kpSortPositions(list) {
  const cmp = (KP_PORT_SORTS.find(x => x[0] === kpPortSort()) || KP_PORT_SORTS[0])[2];
  const key = p => { const val = p.qty * p.price, inv = p.qty * p.pru; return { val, inv, pnl: val - inv, pct: inv ? (val - inv) / inv * 100 : 0, chg: p.change_pct || 0, label: displayName(p.name) }; };
  return list.map(p => ({ p, k: key(p) })).sort((a, b) => cmp(a.k, b.k) || b.k.val - a.k.val).map(x => x.p);
}

function renderPortfolio(auto=false) {
  const tv = positions.reduce((a,p)=>a+p.qty*p.price, 0);
  const ti = positions.reduce((a,p)=>a+p.qty*p.pru, 0);
  const tpnl = tv - ti;
  const tpct = ti ? tpnl/ti*100 : 0;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const surfaceBg = isDark ? 'var(--color-surface)' : '#fff';
  const borderCol = isDark ? 'var(--color-border)' : '#e4e4e7';
  const textCol = isDark ? 'var(--color-text)' : '#09090b';
  const subCol = isDark ? 'var(--color-text-secondary)' : '#71717a';

  // Sparkline mini
  function miniSparkline(trend, color, w=80, h=28) {
    const pts = [50];
    for (let i=1;i<16;i++) { pts.push(Math.max(10,Math.min(90, pts[i-1]+(Math.random()-0.5)*4+trend*0.4))); }
    const min=Math.min(...pts), max=Math.max(...pts), range=max-min||1;
    const d = pts.map((v,i)=>`${i/(pts.length-1)*w},${h-((v-min)/range)*(h-4)-2}`);
    const path = 'M'+d.join(' L');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block">
      <defs><linearGradient id="mg${color.replace(/[^a-z0-9]/gi,'')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${path} L${w},${h} L0,${h} Z" fill="url(#mg${color.replace(/[^a-z0-9]/gi,'')})"/>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
  }

  // Donut
  function donutChart(data, total, size=130) {
    const colors = ['#3fb950','#6366f1','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#ef4444'];
    const c = size/2, r = 46, circum = 2*Math.PI*r;
    let offset = 0;
    const segs = data.map(([name,val],i) => {
      const pct = val/total;
      const dash = pct*circum;
      const s = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${colors[i%colors.length]}" stroke-width="10" stroke-dasharray="${dash} ${circum-dash}" stroke-dashoffset="${-offset*circum}" transform="rotate(-90 ${c} ${c})" stroke-linecap="round" style="transition:stroke-dashoffset 0.8s ease"/>`;
      offset += pct;
      return {seg:s, name, val, color:colors[i%colors.length], pct:(pct*100).toFixed(1)};
    });
    const trackColor = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f2';
    const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${trackColor}" stroke-width="10"/>
      ${segs.map(s=>s.seg).join('')}
      <text x="${c}" y="${c-5}" text-anchor="middle" font-size="13" font-weight="800" fill="${textCol}" font-family="-apple-system,sans-serif">${fmtK(total)}</text>
      <text x="${c}" y="${c+10}" text-anchor="middle" font-size="9" fill="${subCol}" font-family="-apple-system,sans-serif">Total</text>
    </svg>`;
    return {svg, segs};
  }

  // Dédupliquer les positions (même ticker + même plateforme = regrouper)
  const dedupMap = {};
  positions.forEach(p => {
    const key = p.name + '|' + (p.platform||'');
    if (!dedupMap[key]) {
      dedupMap[key] = {...p};
    } else {
      // Prix de revient moyen pondéré : sinon la ligne regroupée gardait le PRU de la 1re ligne (investi et perf. faux)
      const d = dedupMap[key], q = d.qty + p.qty;
      if (q > 0) d.pru = (d.qty * d.pru + p.qty * p.pru) / q;
      d.qty = q;
    }
  });
  const dedupPositions = Object.values(dedupMap);

  // Allocation par position
  const byPos = dedupPositions.map(p=>([p.name, p.qty*p.price])).sort((a,b)=>b[1]-a[1]);
  const top5 = byPos.slice(0,5);
  const rest = byPos.slice(5).reduce((a,b)=>a+b[1],0);
  const donutData = rest > 0 ? [...top5, [`Autres (${byPos.length-5})`, rest]] : top5;
  const {svg: donutSvg, segs} = donutChart(donutData, tv);

  // Métriques topbar
  const metricsHtml = `
  <div class="port-metrics-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
    ${[
      {label:'Valeur totale', val: fmtK(tv), sub: '', spark: true, trend: 0.3},
      {label:'Investi', val: fmtK(ti), sub: '', spark: false},
      {label:'Plus-value', val: (tpnl>=0?'+':'')+tpnl.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €', sub: '', color: tpnl>=0?'#3fb950':'#f87171', spark: false},
      {label:'Performance', val: (tpct>=0?'+':'')+tpct.toFixed(2).replace(".", ",") + ' %', sub: '', color: tpct>=0?'#3fb950':'#f87171', spark: false},
    ].map(m=>`
    <div style="background:${surfaceBg};border:1px solid ${borderCol};border-radius:14px;padding:14px 16px">
      <div style="font-size:9px;font-weight:600;color:${subCol};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">${m.label}</div>
      ${m.spark ? `<div style="float:right;margin-top:-4px">${miniSparkline(0.3,'#3fb950',70,24)}</div>` : ''}
      <div style="font-size:20px;font-weight:800;color:${m.color||textCol};letter-spacing:-0.04em">${m.val}</div>
    </div>`).join('')}
  </div>`;

  // Tableau des positions
  setTimeout(() => { if (typeof selectMode !== 'undefined' && selectMode) toggleSelectMode(true); }, 30);
  const sorted = kpSortPositions(dedupPositions);
  const tableHtml = `
  <div style="background:${surfaceBg};border:1px solid ${borderCol};border-radius:16px;overflow:hidden;margin-bottom:20px">
    <!-- Header tableau -->
    <!-- Barre d'actions groupées (visible en mode sélection) -->
    <div id="bulk-bar" style="display:none;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 16px;background:rgba(99,102,241,0.08);border-bottom:1px solid ${borderCol}">
      <div style="display:flex;align-items:center;gap:10px">
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:12px;font-weight:700;color:${textCol}">
          <input type="checkbox" id="bulk-all" onchange="toggleSelectAll(this.checked)" style="width:16px;height:16px;accent-color:#6366f1">
          Tout sélectionner
        </label>
        <span id="bulk-count" style="font-size:12px;color:${subCol}">0 sélectionnée</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="bulkDelete()" style="padding:6px 13px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:12px;font-weight:700;color:#dc2626;cursor:pointer">🗑️ Supprimer</button>
        <button onclick="bulkAskAI()" style="padding:6px 13px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;font-size:12px;font-weight:700;color:#6366f1;cursor:pointer">🤖 Analyser <span style="font-size:10px;opacity:0.7">✨</span></button>
        <button onclick="toggleSelectMode(false)" style="padding:6px 13px;background:transparent;border:1px solid ${borderCol};border-radius:8px;font-size:12px;font-weight:600;color:${subCol};cursor:pointer">Annuler</button>
      </div>
    </div>
    ${dedupPositions.length > 1 ? `<div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:10px 16px;border-bottom:1px solid ${borderCol}">
      <label for="port-sort" style="font-size:12px;font-weight:600;color:${subCol};white-space:nowrap">Trier par</label>
      <select id="port-sort" onchange="kpSetPortSort(this.value)" style="width:auto;max-width:70%;padding:7px 10px;font-size:13px;font-weight:600;border:1px solid ${borderCol};border-radius:9px">
        ${KP_PORT_SORTS.map(([k, label]) => `<option value="${k}"${k === kpPortSort() ? ' selected' : ''}>${label}</option>`).join('')}
      </select>
    </div>` : ''}
    <div class="pos-row-head" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 80px 32px;gap:0;padding:10px 16px;border-bottom:1px solid ${borderCol}">
      ${['ACTIF','INVESTI','PRIX MOY.','VALEUR','PERF.','',''].map(h=>`<div style="font-size:10px;font-weight:600;color:${subCol};text-transform:uppercase;letter-spacing:0.06em">${h}</div>`).join('')}
    </div>
    <!-- Lignes positions -->
    ${sorted.map(p => {
      const val = p.qty*p.price;
      const inv = p.qty*p.pru;
      const pnl = val-inv;
      const pct = inv ? pnl/inv*100 : 0;
      const chg = p.change_pct||0;
      const pnlColor = pnl>=0?'#3fb950':'#f87171';
      const chgColor = chg>=0?'#3fb950':'#f87171';
      const initials = p.name.replace(/[^A-Z0-9]/g,'').slice(0,2)||p.name.slice(0,2).toUpperCase();
      const hoverBg = isDark ? 'rgba(255,255,255,0.03)' : '#fafafa';
      return `
      <div id="row-${p.id}" class="pos-row" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 80px 32px;gap:0;padding:12px 16px;border-bottom:1px solid ${borderCol};transition:background 0.15s;cursor:pointer"
        onmouseover="this.style.background='${hoverBg}'" onmouseout="this.style.background='transparent'"
        onclick="togglePos('${p.id}')">
        <!-- Actif -->
        <div style="display:flex;align-items:center;gap:10px">
          <input type="checkbox" class="pos-check" data-id="${p.id}" onclick="event.stopPropagation();updateBulkCount()" style="display:none;width:16px;height:16px;accent-color:#6366f1;flex-shrink:0">
          ${getCompanyLogo(p.name, p.fullName||p.name, 36, 10)}
          <div>
            <div style="font-size:13px;font-weight:700;color:${textCol};letter-spacing:-0.02em">${displayName(p.name)}</div>
            <div style="font-size:11px;color:${subCol};margin-top:1px">${p.name} · ${p.type||'Action'} · ${qtyLabel(p)} ${p.platform?`· <span style="color:${subCol}">${p.platform}</span>`:''}</div>
          </div>
        </div>
        <!-- Investi -->
        <div style="display:flex;align-items:center;font-size:13px;color:${textCol}">${inv.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} €</div>
        <!-- Prix moy -->
        <div style="display:flex;align-items:center;font-size:13px;color:${textCol}">${p.pru.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} €</div>
        <!-- Valeur -->
        <div style="display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:13px;font-weight:600;color:${textCol}">${val.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} €</div>
          <div style="font-size:11px;color:${pnlColor}">${pnl>=0?'+':''}${pnl.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} €</div>
        </div>
        <!-- Perf -->
        <div style="display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:13px;font-weight:700;color:${pnlColor}">${pnl>=0?'+':''}${pct.toFixed(2).replace(".", ",")} %</div>
          <div style="font-size:10px;color:${chgColor}">${chg>=0?'+':''}${chg.toFixed(2).replace(".", ",")} % auj.</div>
        </div>
        <!-- Sparkline -->
        <div class="kp-row-spark" role="button" tabindex="0" title="Voir le graphique" aria-label="Ouvrir le graphique de ${jsArg(displayName(p.name) || p.name)}" onclick="event.stopPropagation();openChart('${jsArg(p.name)}','${jsArg(displayName(p.name) || p.name)}',${Number(p.pru) || 0})" onkeydown="if(event.key==='Enter'){event.stopPropagation();this.click()}" style="display:flex;align-items:center;cursor:pointer">${miniSparkline(chg>0?1:-1, pnl>=0?'#3fb950':'#f87171')}</div>
        <!-- Menu -->
        <div style="display:flex;align-items:center;justify-content:center">
          <button onclick="event.stopPropagation();showPosMenu('${p.id}', event)" style="background:none;border:none;cursor:pointer;color:${subCol};font-size:16px;padding:4px;border-radius:6px;transition:background 0.15s" onmouseover="this.style.background='rgba(128,128,128,0.1)'" onmouseout="this.style.background='none'">⋯</button>
        </div>
      </div>`;
    }).join('')}
  </div>`;

  // Section bas — Répartition + Insights IA
  const bottomHtml = `
  <div class="port-split" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
    <!-- Donut répartition -->
    <div style="background:${surfaceBg};border:1px solid ${borderCol};border-radius:16px;padding:20px">
      <div style="font-size:14px;font-weight:700;color:${textCol};letter-spacing:-0.03em;margin-bottom:16px">Répartition</div>
      <div style="display:flex;align-items:center;gap:20px">
        ${donutSvg}
        <div style="flex:1;display:flex;flex-direction:column;gap:8px">
          ${segs.map(s=>`
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div style="display:flex;align-items:center;gap:7px">
              <div style="width:8px;height:8px;border-radius:50%;background:${s.color};flex-shrink:0"></div>
              <span style="font-size:12px;font-weight:600;color:${textCol}">${s.name}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="background:${isDark?'rgba(255,255,255,0.08)':'#f4f4f5'};border-radius:4px;height:3px;width:60px;overflow:hidden">
                <div style="height:100%;background:${s.color};width:${s.pct}%;border-radius:4px"></div>
              </div>
              <span style="font-size:11px;color:${subCol};min-width:36px;text-align:right">${s.pct}%</span>
            </div>
          </div>`).join('')}
        </div>
      </div>
      <button onclick="nav('sante')" style="width:100%;margin-top:14px;padding:8px;background:none;border:1px solid ${borderCol};border-radius:8px;font-size:12px;font-weight:600;color:${subCol};cursor:pointer;transition:all 0.15s" onmouseover="this.style.borderColor='${textCol}'" onmouseout="this.style.borderColor='${borderCol}'">Voir la répartition détaillée →</button>
    </div>
    <!-- Insight IA -->
    <div style="background:${isDark?'linear-gradient(135deg,#080c10,#0d1520)':'linear-gradient(135deg,#f0fdf4,#ecfdf5)'};border:1px solid ${isDark?'rgba(63,185,80,0.15)':'rgba(22,163,74,0.2)'};border-radius:16px;padding:20px;position:relative;overflow:hidden">
      <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;background:radial-gradient(circle,rgba(63,185,80,0.15),transparent);pointer-events:none"></div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
        <div style="width:6px;height:6px;background:#3fb950;border-radius:50%;animation:pulse-dot 2s infinite"></div>
        <span style="font-size:10px;font-weight:700;color:#3fb950;text-transform:uppercase;letter-spacing:0.08em">✦ Insights IA</span>
      </div>
      <div id="port-ai-insight" style="font-size:13px;color:${isDark?'rgba(230,237,243,0.8)':'#374151'};line-height:1.6;margin-bottom:14px">
        Analyse de ton portefeuille en cours...
      </div>
      <button onclick="nav('ai')" style="padding:8px 16px;background:#16a34a;border:none;border-radius:8px;font-size:12px;font-weight:600;color:#fff;cursor:pointer">Voir l'analyse complète →</button>
    </div>
  </div>
  <!-- Disclaimer -->
  <div style="text-align:center;padding:12px;font-size:11px;color:${subCol}">
    ⓘ Les données sont fournies à titre indicatif et ne constituent pas un conseil en investissement.
  </div>`;

  // Injecter dans le DOM
  const metricsEl = document.getElementById('port-metrics');
  const gridEl = document.getElementById('pos-grid');
  const allocEl = document.getElementById('alloc-bars');

  if (metricsEl) metricsEl.innerHTML = metricsHtml;
  if (gridEl) gridEl.innerHTML = tableHtml + bottomHtml;
  if (allocEl) allocEl.innerHTML = '';

  // Insight IA
  setTimeout(() => {
    const el = document.getElementById('port-ai-insight');
    if (!el || !positions.length) return;
    const topSectors = {};
    positions.forEach(p => { if(p.sector) topSectors[p.sector]=(topSectors[p.sector]||0)+p.qty*p.price; });
    const top = Object.entries(topSectors).sort((a,b)=>b[1]-a[1])[0];
    const topPct = top ? (top[1]/tv*100).toFixed(0) : null;
    const pnlPositions = positions.filter(p=>p.qty*p.price > p.qty*p.pru).length;
    if (top && topPct > 30) {
      el.innerHTML = `Ton exposition au secteur <strong>${top[0]}</strong> est élevée (<strong style="color:#f59e0b">${topPct}%</strong>). Envisage une diversification pour réduire le risque.`;
    } else {
      el.innerHTML = `<strong>${pnlPositions}</strong> position${pnlPositions>1?'s':''} en plus-value sur ${positions.length}. Portef. ${tpct>=0?'en hausse':'en baisse'} de <strong style="color:${tpct>=0?'#3fb950':'#f87171'}">${Math.abs(tpct).toFixed(1).replace(".", ",")} %</strong> au total.`;
    }
  }, 600);

  // Animations
  setTimeout(() => {
    const rows = document.querySelectorAll('#pos-grid [style*="grid-template-columns:2fr"]');
    rows.forEach((row, i) => {
      row.style.opacity = '0';
      row.style.transition = `opacity 0.2s ease ${i*40}ms`;
      requestAnimationFrame(() => requestAnimationFrame(() => { row.style.opacity = '1'; }));
    });
  }, 50);

}




// Déplie un panneau d'actions sous la ligne de position cliquée
function togglePos(id) {
  const existing = document.getElementById('posdetail-' + id);
  if (existing) { existing.remove(); return; }
  // Fermer tout autre panneau ouvert
  document.querySelectorAll('[id^="posdetail-"]').forEach(el => el.remove());

  const row = document.getElementById('row-' + id);
  const p = positions.find(x => String(x.id) === String(id));
  if (!row || !p) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const bg = isDark ? 'rgba(255,255,255,0.02)' : '#fafafa';
  const bord = isDark ? 'var(--color-border)' : '#eee';
  const sub = isDark ? 'var(--color-text-secondary)' : '#71717a';
  const val = p.qty * p.price;
  const pnl = p.pru > 0 ? (p.price - p.pru) / p.pru * 100 : 0;
  const pnlEur = val - p.qty * p.pru;
  const c = pnl >= 0 ? '#3fb950' : '#f87171';

  const panel = document.createElement('div');
  panel.id = 'posdetail-' + id;
  panel.style.cssText = `background:${bg};border-bottom:1px solid ${bord};padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;animation:fadeIn 0.15s ease`;
  panel.innerHTML = `
    <div style="display:flex;gap:18px;flex-wrap:wrap;font-size:12px;color:${sub}">
      <span>PRU <strong style="color:var(--color-text)">${fmt(p.pru)} €</strong></span>
      <span>Prix <strong style="color:var(--color-text)">${fmt(p.price)} €</strong></span>
      <span>P&L <strong style="color:${c}">${pnlEur>=0?'+':''}${fmtI(pnlEur)} € (${pnl>=0?'+':''}${pnl.toFixed(1).replace(".", ",")} %)</strong></span>
      ${p.alert_price ? `<span>🔔 Alerte <strong style="color:var(--color-text)">${fmt(p.alert_price)} €</strong></span>` : ''}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button onclick="event.stopPropagation();openChart('${p.name.replace(/'/g,"\\'")}', '${(displayName(p.name) || p.name).replace(/'/g,"\\'")}', ${Number(p.pru) || 0})" style="padding:7px 13px;background:#fff7ed;border:1px solid #fed7aa;border-radius:9px;font-size:12px;font-weight:700;color:#c2410c;cursor:pointer">📈 Graphique</button>
      <button data-an="1" onclick="event.stopPropagation();openDecisionFromPos('${p.name.replace(/'/g,"\\'")}', 'garder')" style="padding:7px 13px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:9px;font-size:12px;font-weight:700;color:#6366f1;cursor:pointer">🤖 Analyser</button>
      <button data-an="1" onclick="event.stopPropagation();sq('Que penses-tu de ma position ${p.name.replace(/'/g,"\\'")} ?');nav('ai')" style="padding:7px 13px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:9px;font-size:12px;font-weight:700;color:#16a34a;cursor:pointer">💬 Demander à l'IA</button>
      <button onclick="event.stopPropagation();openEditPos('${p.id}')" style="padding:7px 13px;background:var(--color-bg-subtle,#f5f5f5);border:1px solid var(--color-border,#e4e4e7);border-radius:9px;font-size:12px;font-weight:700;color:var(--color-text-secondary);cursor:pointer">✏️ Modifier</button>
      ${p.platform && p.platform !== 'Autre' && PLATFORM_URLS[p.platform] ? `<button onclick="event.stopPropagation();openOnPlatform('${p.platform}','${(p.name||'').replace(/'/g,"\\'")}')" style="padding:7px 13px;background:${p.platform==='Trade Republic'?'#eef2ff':'#fff7ed'};border:1px solid ${p.platform==='Trade Republic'?'#c7d2fe':'#fed7aa'};border-radius:9px;font-size:12px;font-weight:700;color:${p.platform==='Trade Republic'?'#4f46e5':'#ea580c'};cursor:pointer">🔗 ${p.platform}</button>` : ''}
    </div>`;
  if (isTrackOnly(p)) {
    panel.querySelectorAll('[data-an]').forEach(b => b.remove());
    panel.insertAdjacentHTML('beforeend', '<div style="font-size:12px;color:' + sub + ';margin-top:8px">ℹ️ Suivi du cours uniquement : Kapitaro n’analyse pas les ' + (p.type === 'Devise' ? 'devises' : 'cryptomonnaies') + '.</div>');
  }
  row.after(panel);
}

function togglePosSignal(id) {
  const el=document.getElementById('sig-'+id);
  if(el) el.style.display=el.style.display==='block'?'none':'block';
}
let decisionIntention = null;
function openDecisionFromPos(name, action) {
  decisionIntention = action;
  // Vider l'ancienne analyse
  document.getElementById('d-result').innerHTML = '';
  nav('decision');
  setTimeout(() => {
    setDecisionAsset(name);
    updateDecisionAmount(parseInt(document.getElementById('d-amount-display')?.dataset.amount || 500));
    selectIntent(action);
    document.getElementById('sec-decision')?.scrollTo(0,0);
  }, 50);
}

function markFieldError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.border = '1.5px solid #ef4444';
  el.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.15)';
  const clear = () => { el.style.border = ''; el.style.boxShadow = ''; el.removeEventListener('input', clear); el.removeEventListener('change', clear); };
  el.addEventListener('input', clear); el.addEventListener('change', clear);
  try { el.focus(); } catch (e) {}
  try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
}
async function addPos() {
  const name = document.getElementById('f-name').value.trim();
  const qty = parseFloat(document.getElementById('f-qty').value);
  const pru = parseFloat(document.getElementById('f-pru').value);
  const price = parseFloat(document.getElementById('f-price').value);
  const alertPrice = parseFloat(document.getElementById('f-alert').value) || null;
  const type = document.getElementById('f-type-hidden')?.value || (acSelected?.type) || 'Action';
  const sector = document.getElementById('f-sector').value || (acSelected?.sector) || '';
  const platform = document.getElementById('f-platform').value || 'Autre';

  // Validation avec messages clairs
  if (!name) { showToast('⚠ Recherche et sélectionne une action'); markFieldError('f-search'); return false; }
  if (isNaN(qty) || qty <= 0) { showToast('⚠ Indique une quantité valide'); markFieldError('f-qty'); return false; }
  if (isNaN(pru) || pru <= 0) { showToast('⚠ Indique ton prix de revient (PRU)'); markFieldError('f-pru'); return false; }
  if (isNaN(price) || price <= 0) { showToast('⚠ Indique le prix actuel'); markFieldError('f-price'); return false; }

  const pos = { name, qty, pru, price, type, sector, platform, alert_price: alertPrice };

  // ── FUSION : si la position existe déjà, on cumule les parts et on recalcule le PRU moyen pondéré ──
  const existing = positions.find(p => kpTickerOf(p.name) === kpTickerOf(name));
  if (existing) {
    const totalQty = existing.qty + qty;
    const newPru = (existing.qty * existing.pru + qty * pru) / totalQty;
    // Nouvelles valeurs appliquées à la position seulement après l'enregistrement réussi (sinon l'écran et la base divergent)
    const upd = { qty: Math.round(totalQty * 1e8) / 1e8, pru: Math.round(newPru * 100) / 100, price, alert_price: alertPrice || existing.alert_price };
    if (!isDemo && currentUser) {
      const { error } = await sb.from('positions')
        .update(upd)
        .eq('id', existing.id);
      if (error) { showToast('Erreur: ' + error.message); return false; }
    }
    Object.assign(existing, upd);
    if (!isDemo && currentUser) {
      await addTransaction(name, 'achat', qty, pru, 'Renforcement de position');
      trackEvent('position_added', { type, renforcement: true });
    }
    acClear();
    kpAfterAddNav();
    showToast(`✓ ${displayName(name)} renforcé — ${existing.qty} parts, PRU moyen ${existing.pru.toFixed(2)} €`);
    return true;
  }

  if (isDemo) {
    positions.push({ id: 'd'+Date.now(), ...pos });
    acClear();
    kpAfterAddNav();
    showToast('✓ Position ajoutée !');
    return true;
  }

  const { data, error } = await sb.from('positions').insert({ ...pos, user_id: currentUser.id }).select().single();
  if (error) { showToast('Erreur: ' + error.message); return false; }
  if (data) {
    positions.push(data);
    await addTransaction(name, 'achat', qty, pru, 'Ouverture de position');
    trackEvent('position_added', { type, renforcement: false });
    acClear();
    kpAfterAddNav();
    showToast('✓ ' + name + ' ajouté au portefeuille !');
    return true;
  }
}
// Page affichée après l'ajout d'une position (formulaire « Ajouter »)
function kpAfterAddNav() {
  const back = window._kpAddReturn; window._kpAddReturn = null;
  if (back === 'objectif') { nav('objectif'); setTimeout(() => { try { showGoToPortfolioHint(); } catch (e) {} }, 1200); }
  else nav('portfolio');
}
async function delPos(id) {
  if(!confirm('Supprimer cette position ?'))return;
  if(!isDemo)await sb.from('positions').delete().eq('id',id);
  positions=positions.filter(p=>p.id!==id);delete posSignals[id];
  renderPortfolio();renderHome();
}

async function delPosGroup(ids) {
  const msg = ids.length > 1
    ? `Supprimer les ${ids.length} lignes de cette position ?`
    : 'Supprimer cette position ?';
  if(!confirm(msg)) return;
  for (const id of ids) {
    if(!isDemo) await sb.from('positions').delete().eq('id', id);
    positions = positions.filter(p => p.id !== id);
    delete posSignals[id];
  }
  renderPortfolio(); renderHome();
}
async function loadDemo() {
  const demo=[
    {name:'IWDA.L',qty:15,pru:87.5,price:94.2,type:'ETF',sector:'Monde',platform:'Trade Republic',alert_price:80},
    {name:'VWCE.DE',qty:8,pru:110,price:118.5,type:'ETF',sector:'Monde',platform:'Trade Republic',alert_price:null},
    {name:'LVMH',qty:2,pru:730,price:685,type:'Action',sector:'Luxe',platform:'XTB',alert_price:650},
    {name:'Air Liquide',qty:5,pru:162,price:179,type:'Action',sector:'Industrie',platform:'XTB',alert_price:null},
  ];
  if(isDemo){positions=[...demo.map((p,i)=>({...p,id:'d'+(i+1)}))];nav('portfolio');return;}
  for(const p of demo){const {data}=await sb.from('positions').insert({...p,user_id:currentUser.id}).select().single();if(data)positions.push(data);}
  nav('portfolio');
}

// ===== EXPORT PDF =====
function exportPDF() {
  const tv=positions.reduce((a,p)=>a+p.qty*p.price,0);
  const ti=positions.reduce((a,p)=>a+p.qty*p.pru,0);
  const tpnl=tv-ti, tpct=ti?tpnl/ti*100:0;
  const rows=positions.map(p=>{const val=p.qty*p.price,pnl=val-p.qty*p.pru,pct=p.qty*p.pru?pnl/(p.qty*p.pru)*100:0;return`<tr><td>${p.name}</td><td>${p.type}</td><td>${p.qty}</td><td>${fmt(p.pru)}€</td><td>${fmt(p.price)}€</td><td>${fmt(val)}€</td><td style="color:${pnl>=0?'#1a7f5a':'#ff3b30'}">${pnl>=0?'+':''}${pct.toFixed(1).replace(".", ",")} %</td></tr>`;}).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Kapitaro — Rapport</title><style>body{font-family:-apple-system,sans-serif;padding:40px;color:#1c1c1e}h1{font-size:28px;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px}p{color:#8e8e93}table{width:100%;border-collapse:collapse;margin-top:24px}th{text-align:left;padding:10px;background:#f2f2f7;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#8e8e93}td{padding:12px 10px;border-bottom:1px solid #f2f2f7;font-size:14px}.summary{display:flex;gap:24px;margin:24px 0}.metric{background:#f2f2f7;border-radius:14px;padding:16px;min-width:140px}.metric-label{font-size:11px;color:#8e8e93;text-transform:uppercase;font-weight:700;margin-bottom:6px}.metric-val{font-size:22px;font-weight:800}</style></head><body><h1>Kapitaro</h1><p>Rapport du ${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</p><div class="summary"><div class="metric"><div class="metric-label">Valeur totale</div><div class="metric-val">${fmtK(tv)}</div></div><div class="metric"><div class="metric-label">Total investi</div><div class="metric-val">${fmtK(ti)}</div></div><div class="metric"><div class="metric-label">Plus-value</div><div class="metric-val" style="color:${tpnl>=0?'#1a7f5a':'#ff3b30'}">${tpnl>=0?'+':''}${fmtK(tpnl)}</div></div><div class="metric"><div class="metric-label">Performance</div><div class="metric-val" style="color:${tpnl>=0?'#1a7f5a':'#ff3b30'}">${tpnl>=0?'+':''}${tpct.toFixed(2).replace(".", ",")} %</div></div></div><table><thead><tr><th>Actif</th><th>Type</th><th>Qté</th><th>PRU</th><th>Prix actuel</th><th>Valeur</th><th>+/-</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  const win=window.open('','_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(()=>win.print(),500);
}

// ===== SANTE =====
async function renderSante() {
  const el = document.getElementById('sante-content');
  if (!el) return;
  // Mêmes lignes regroupées, prix de revient moyen pondéré
  const dedupMap = {};
  apos().forEach(p => {
    const key = p.name + '|' + (p.platform || '');
    if (!dedupMap[key]) dedupMap[key] = { ...p };
    else { const d = dedupMap[key], q = d.qty + p.qty; if (q > 0) d.pru = (d.qty * d.pru + p.qty * p.pru) / q; d.qty = q; }
  });
  const list = Object.values(dedupMap);
  if (!list.length) {
    el.innerHTML = positions.some(isTrackOnly)
      ? '<div class="kps-card kps-empty"><b>Pas de score pour le suivi seul</b><p>Tes cryptomonnaies et devises sont suivies pour leur cours : elles ne comptent pas dans ce score.</p></div>'
      : '<div class="kps-card kps-empty"><b>Ton score apparaîtra ici</b><p>Ajoute au moins un placement pour voir comment ton argent est réparti.</p><button type="button" class="kps-btn" onclick="nav(\'ajouter\')">Ajouter une position</button></div>';
    return;
  }

  const { score, details } = calcScore();
  const tv = list.reduce((a, p) => a + p.qty * p.price, 0);
  const ti = list.reduce((a, p) => a + p.qty * p.pru, 0);
  const tpnl = tv - ti, tpct = ti ? tpnl / ti * 100 : 0;
  const nb = list.length;
  const etfPct = tv > 0 ? list.filter(p => p.type === 'ETF').reduce((a, p) => a + p.qty * p.price, 0) / tv * 100 : 0;
  const nonEtf = list.filter(p => p.type !== 'ETF');
  const top = nonEtf.length ? nonEtf.reduce((a, p) => p.qty * p.price > a.qty * a.price ? p : a, nonEtf[0]) : null;
  const topPct = top && tv > 0 ? top.qty * top.price / tv * 100 : 0;
  const topName = top ? _escHtml(displayName(top.name)) : '';
  const pct0 = n => Math.round(n).toLocaleString('fr-FR') + ' %';
  const scoreColor = score >= 7 ? '#16a34a' : score >= 5 ? '#d97706' : '#dc2626';
  const scoreLabel = score >= 7 ? 'Solide' : score >= 5 ? 'Correct' : 'À améliorer';

  // Les 4 points notés, expliqués simplement
  const rows = [
    { key: 'diversity', note: details.diversity, title: 'Nombre de lignes', value: nb + (nb > 1 ? ' lignes' : ' ligne'), mark: 'Repère : 8 ou plus',
      why: 'Plus ton argent est réparti, moins une seule ligne peut te faire mal.',
      focus: `Tu as ${nb} ligne${nb > 1 ? 's' : ''} dans ton portefeuille. Avec peu de lignes, chacune pèse lourd dans ton résultat.` },
    { key: 'concentration', note: details.concentration, title: 'Ligne la plus lourde', value: top ? `${topName} : ${pct0(topPct)}` : 'Aucune action seule', mark: 'Repère : moins de 25 %',
      why: 'Si une seule action pèse beaucoup, sa baisse se voit tout de suite sur tout ton portefeuille.',
      focus: `${topName} représente ${pct0(topPct)} de ton portefeuille. Si cette action chute, tout ton portefeuille le ressent.` },
    { key: 'etfRatio', note: details.etfRatio, title: "Part d'ETF", value: pct0(etfPct), mark: 'Repère : 60 % ou plus',
      why: "Un ETF regroupe de nombreuses entreprises d'un coup : il répartit déjà ton argent.",
      focus: `Les ETF représentent ${pct0(etfPct)} de ton portefeuille. Un ETF regroupe de nombreuses entreprises en une seule ligne.` },
    { key: 'performance', note: details.performance, title: 'Résultat depuis tes achats', value: `${tpnl >= 0 ? '+' : '−'}${Math.abs(tpct).toFixed(1).replace('.', ',')} %`, mark: `${tpnl >= 0 ? '+' : '−'}${Math.abs(Math.round(tpnl)).toLocaleString('fr-FR')} €`,
      why: "Ton gain ou ta perte à ce jour. Ce point compte moins : un résultat récent ne dit pas ce qui va se passer." },
  ];
  const priority = rows.filter(r => r.focus && r.note < 8).sort((x, y) => x.note - y.note)[0];
  const scoreDeg = Math.max(0, Math.min(10, score)) * 36;
  const COLORS = ['#16a34a', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#14b8a6'];
  const cryptoNote = positions.some(isTrackOnly) ? '<div class="kps-note">Tes cryptomonnaies et devises sont suivies pour leur cours : elles ne comptent pas dans ce score.</div>' : '';

  // Alertes de prix et fortes baisses (la concentration est déjà traitée plus haut)
  const alerts = [];
  list.forEach(p => {
    if (p.alert_price && p.price < p.alert_price) alerts.push(`<b>${_escHtml(displayName(p.name))}</b> est passé sous ton alerte de ${p.alert_price.toLocaleString('fr-FR')} €.`);
    const perf = p.pru ? (p.price - p.pru) / p.pru * 100 : 0;
    if (perf < -20) alerts.push(`<b>${_escHtml(displayName(p.name))}</b> est à ${perf.toFixed(0).replace('-', '−')} % de ton prix d'achat.`);
  });

  const ask = q => `askAgentFrom(${JSON.stringify(q).replace(/"/g, '&quot;')})`;
  el.innerHTML = `${cryptoNote}
  <div class="kps-card kps-score">
    <div class="kph-ring kps-ring" style="background:conic-gradient(${scoreColor} ${scoreDeg}deg, var(--color-border-subtle) 0)"><div><b style="color:${scoreColor}">${score.toFixed(1).replace('.', ',')}</b><span>/10</span></div></div>
    <div>
      <div class="kps-score-label" style="color:${scoreColor}">${scoreLabel}</div>
      <p>Ce score regarde comment ton argent est réparti. Il ne dit pas si tes placements vont monter.</p>
    </div>
  </div>

  ${priority ? `
  <div class="kps-card kps-priority">
    <div class="kps-kicker">Le point à regarder en premier</div>
    <div class="kps-priority-title">${priority.title}</div>
    <p>${priority.focus}</p>
    <div class="kps-mark">${priority.mark}</div>
  </div>` : `
  <div class="kps-card kps-priority">
    <div class="kps-kicker">Le point à regarder en premier</div>
    <p>Aucun point ne ressort : ton portefeuille respecte les repères ci-dessous.</p>
  </div>`}

  <div class="kps-title">Comment ton score est calculé</div>
  <div class="kps-card kps-rows">
    ${rows.map(r => {
      const c = r.note >= 8 ? '#16a34a' : r.note >= 5 ? '#d97706' : '#dc2626';
      return `<div class="kps-row">
        <div class="kps-row-head"><b>${r.title}</b><span style="color:${c}">${String(r.note).replace('.', ',')}/10</span></div>
        <div class="kph-bar"><div style="width:${r.note * 10}%;background:${c}"></div></div>
        <div class="kps-row-value"><span>${r.value}</span><span>${r.mark}</span></div>
        <p>${r.why}</p>
      </div>`;
    }).join('')}
    <div class="kps-foot">Ton score est la moyenne de ces 4 notes.</div>
  </div>

  <div class="kps-title">Où est ton argent</div>
  <div class="kps-card kps-alloc">
    ${[...list].sort((x, y) => y.qty * y.price - x.qty * x.price).map((p, i) => {
      const w = tv > 0 ? p.qty * p.price / tv * 100 : 0;
      return `<div class="kps-alloc-row">
        ${getCompanyLogo(p.name, p.name, 28, 8)}
        <div class="kps-alloc-main">
          <div><b>${_escHtml(displayName(p.name))}</b><span>${w.toFixed(1).replace('.', ',')} %</span></div>
          <div class="kph-bar"><div style="width:${w}%;background:${COLORS[i % COLORS.length]}"></div></div>
        </div>
      </div>`;
    }).join('')}
  </div>

  ${alerts.length ? `
  <div class="kps-title">À noter</div>
  <div class="kps-card kps-list">${alerts.map(a => `<p>${a}</p>`).join('')}</div>` : ''}

  <div class="kps-title">Comprendre avec l'assistant</div>
  <div class="kps-card kps-asks">
    <button type="button" onclick="${ask('Explique-moi mon score de santé avec des mots simples.')}">Explique-moi mon score<span>›</span></button>
    <button type="button" onclick="${ask("C'est quoi un ETF et à quoi ça sert dans un portefeuille ?")}">C'est quoi un ETF ?<span>›</span></button>
    <button type="button" onclick="${ask('Pourquoi répartir son argent réduit-il le risque ? Explique avec un exemple simple.')}">Pourquoi répartir son argent ?<span>›</span></button>
  </div>
  <div class="kps-legal">Repères généraux à visée éducative, pas un conseil personnalisé.</div>`;
}




// ===== OBJECTIF WIZARD =====
let objPlan = null;

function objGo(step) {
  if (step > 1) setTimeout(objFeasPreview, 0);
  [1,2,3].forEach(i => {
    const s = document.getElementById('obj-s'+i);
    if (s) s.style.display = i===step ? 'block' : 'none';
    const wp = document.getElementById('owp'+i);
    if (wp) {
      wp.classList.toggle('active', i<=step);
      wp.classList.toggle('done', i<step);
    }
  });
  // Étape 1 : afficher bouton "Importer" optionnel, ne pas auto-remplir
  if (step === 1) {
    const tv = positions.reduce((a,p)=>a+p.qty*p.price, 0);
    const capitalEl = document.getElementById('obj-capital');
    const monthlyEl = document.getElementById('obj-monthly');
    // Ne PAS pré-remplir le capital automatiquement — l'utilisateur doit saisir
    if (capitalEl && !capitalEl.value) {
      capitalEl.value = ''; // toujours vide par défaut
    }
    // Affiche bouton d'import seulement si un portefeuille existe
    const hint = document.getElementById('obj-capital-hint');
    if (hint) {
      if (tv > 0) {
        hint.innerHTML = `<button type="button" onclick="
          document.getElementById('obj-capital').value=${Math.round(tv)};
          this.style.background='#16a34a';
          this.innerHTML='✓ Importé — ${fmtK(tv)}';
          this.disabled=true;
        " style="background:#1d4ed8;border:none;color:#fff;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer">
          📥 Importer mon portefeuille (${fmtK(tv)})
        </button>`;
        hint.style.display = 'block';
      } else {
        hint.style.display = 'none';
      }
    }
  }
}

function selectRisk(risk) {
  objRisk = risk;
  document.querySelectorAll('.risk-card').forEach(c => c.classList.remove('active'));
  document.getElementById('risk-' + risk)?.classList.add('active');
  objFeasPreview();
}

function toggleObjDetail() {
  const wrap = document.getElementById('obj-detail-wrap');
  const btn = document.getElementById('obj-detail-btn');
  if (!wrap) return;
  const open = wrap.style.display === 'block';
  wrap.style.display = open ? 'none' : 'block';
  btn.textContent = open ? '▾ Voir la projection détaillée' : '▴ Masquer la projection';
}

// ═══ MODAL "AJUSTER MA RÉPARTITION" ═══
function openAllocModal() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const surf = isDark ? '#161b26' : '#fff';
  const txt = isDark ? '#f0f0f0' : '#09090b';
  document.getElementById('alloc-modal')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'alloc-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10002;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = `
    <div style="background:${surf};border-radius:20px;padding:24px;max-width:440px;width:100%">
      <div style="font-size:18px;font-weight:800;color:${txt};margin-bottom:4px">🎚️ Ajuste ta répartition</div>
      <div style="font-size:12px;color:var(--color-text-secondary);margin-bottom:18px">Choisis ta part d'actions et d'ETF. Ton plan sera recalculé en conséquence.</div>
      <div id="edit-alloc-container" style="margin-bottom:20px"></div>
      <div style="display:flex;gap:10px">
        <button onclick="document.getElementById('alloc-modal').remove()" style="flex:1;padding:12px;background:transparent;border:1px solid var(--color-border);border-radius:12px;font-size:13px;font-weight:600;color:var(--color-text-secondary);cursor:pointer">Annuler</button>
        <button onclick="saveAllocEdit()" style="flex:2;padding:12px;background:var(--color-primary,#16a34a);border:none;border-radius:12px;font-size:13px;font-weight:800;color:#fff;cursor:pointer">Valider & recalculer</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  renderAllocSlider('edit-alloc-container', 'edit', objStockPct, objGlide);
}

async function saveAllocEdit() {
  const alloc = readAllocSlider('edit');
  objStockPct = alloc.stockPct; objGlide = alloc.glide; objRisk = alloc.risk; objChartRate = alloc.rate;
  document.getElementById('alloc-modal')?.remove();
  if (!isDemo && currentUser && activeObjId) {
    const { error } = await sb.from('objectives').update({ stock_pct:objStockPct, glide:objGlide, risk:objRisk, rate:objChartRate }).eq('id', activeObjId);
    if (error) {
      console.error('[saveAllocEdit] Supabase:', error);
      showToast('⚠️ Erreur base : ' + (error.message||'').slice(0,60));
    } else {
      console.log('[saveAllocEdit] OK — stock_pct sauvé:', objStockPct);
    }
  }
  const obj = allObjectives.find(o => o.id === activeObjId);
  if (obj) { obj.stock_pct=objStockPct; obj.glide=objGlide; obj.risk=objRisk; obj.rate=objChartRate; }
  if (activeObjId) saveAllocLocal(activeObjId, objStockPct, objGlide);
  // Invalider les caches (plan mensuel + plan ETF) pour forcer une vraie régénération
  try {
    localStorage.removeItem(MONTHLY_PLAN_KEY);
    localStorage.removeItem(CACHE_ETF_PLAN);
    if (activeObjId) localStorage.removeItem(CACHE_ETF_PLAN + '_' + activeObjId);
  } catch(e) {}
  savePlanToAccount(activeObjId, 'etf_plan', null); savePlanToAccount(activeObjId, 'monthly_plan', null);
  showToast('✓ Répartition mise à jour — plan recalculé');
  // showValidatedChart re-render le titre ET rappelle generateETFPlan + generateMonthlyPlan
  try { showValidatedChart(); } catch(e) {}
  try { generateMonthlyPlan(true); } catch(e) {}
  try { if (typeof renderMultiObjChart==='function') renderMultiObjChart(); } catch(e) {}
}

let objEditId = null; // objectif en cours de modification (null = création d'un nouvel objectif)

// mode 'edit' : rouvre l'objectif actif prérempli et le met à jour à la validation.
// sinon : création d'un nouvel objectif.
function resetObj(mode) {
  if (!objectifGate()) return;
  objEditId = null;
  const note = document.getElementById('obj-edit-note');
  if (note) note.innerHTML = '';
  if (mode === 'edit') {
    const a = allObjectives.find(o => o.id === activeObjId) || allObjectives[0];
    if (a) {
      objEditId = a.id;
      const setv = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
      setv('obj-capital', a.capital); setv('obj-monthly', a.monthly);
      setv('obj-target', a.target);   setv('obj-years', a.years);
      selectRisk(OBJ_RISK_RATES[a.risk] ? a.risk : 'equilibre');
      if (note) note.innerHTML = `<div style="background:#eef2ff;border:1px solid #c7d2fe;color:#4338ca;border-radius:12px;padding:9px 14px;font-size:12px;font-weight:700;margin-bottom:12px">✏ Tu modifies « ${_escHtml(a.label)} » — les changements remplaceront l'objectif actuel.</div>`;
    }
  }
  // Reset les variables pour forcer le wizard
  objChartTarget = 0;
  objChartCapital = 0;
  document.getElementById('obj-results').style.display = 'none';
  document.getElementById('obj-wizard').style.display = 'block';
  const el = document.getElementById('obj-ai-simple');
  if (el) el.innerHTML = '';
  // Efface aussi le cache localStorage pour éviter rechargement auto
  try { localStorage.removeItem('iq_validated_objective'); } catch {}
  objGo(1);
}

async function generateObjPlan() {
  if (!objectifGate()) return;
  // Limite max objectifs (ne s'applique pas à la modification d'un objectif existant)
  if (allObjectives.length >= 3 && !objEditId) {
    // Affiche le message dans le wizard lui-même
    document.getElementById('obj-wizard').style.display = 'none';
    document.getElementById('obj-results').style.display = 'block';
    renderMultiObjChart();
    // Bandeau rouge persistant en haut de la section objectif
    const existing = document.getElementById('obj-max-banner');
    if (!existing) {
      const banner = document.createElement('div');
      banner.id = 'obj-max-banner';
      banner.style.cssText = 'background:#fff0f0;border:2px solid #cc2f26;border-radius:14px;padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:12px';
      banner.innerHTML = `<div>
        <div style="font-size:14px;font-weight:800;color:#cc2f26">⚠ Maximum 3 objectifs atteint</div>
        <div style="font-size:13px;color:#7f1d1d;margin-top:3px">Supprime un objectif existant (bouton ×) pour en créer un nouveau.</div>
      </div>
      <button onclick="document.getElementById('obj-max-banner').remove()" style="background:#cc2f26;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0">OK</button>`;
      const resultsEl = document.getElementById('obj-results');
      if (resultsEl) resultsEl.insertBefore(banner, resultsEl.firstChild);
    }
    return;
  }

  // Objectif très éloigné : on prévient avant de l'enregistrer
  {
    const c = parseFloat(document.getElementById('obj-capital')?.value) || 0;
    const m = parseFloat(document.getElementById('obj-monthly')?.value) || 0;
    const t = parseFloat(document.getElementById('obj-target')?.value) || 0;
    const y = parseInt(document.getElementById('obj-years')?.value) || 0;
    if (t > 0 && y > 0) {
      const f = objFeasibility(c, m, t, y, OBJ_RISK_RATES[objRisk] || 7);
      if (f.level === 'unrealistic' && !confirm(`Cet objectif est très éloigné : à ce rythme tu atteindrais environ ${Math.round(f.ratio * 100)}% de ${fmtK(t)} (${fmtK(f.fv)}).\n\nLe plan te montrera comment l'ajuster. Créer l'objectif quand même ?`)) return;
    }
  }

  // ── Feedback visuel immédiat ──
  const genBtn = document.querySelector('.btn-obj-generate');
  if (genBtn) {
    genBtn.disabled = true;
    genBtn.innerHTML = '<svg class="spinning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:middle"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Sauvegarde en cours...';
  }

  // Overlay de progression dans le wizard
  const wizardEl = document.getElementById('obj-wizard');
  const stepCards = wizardEl?.querySelectorAll('.obj-step-card');
  stepCards?.forEach(c => c.style.opacity = '0.4');

  // Injecte un bandeau de progression
  let progressEl = document.getElementById('obj-gen-progress');
  if (!progressEl) {
    progressEl = document.createElement('div');
    progressEl.id = 'obj-gen-progress';
    progressEl.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1c1c1e;color:#fff;border-radius:14px;padding:14px 20px;font-size:14px;font-weight:700;z-index:9999;display:flex;align-items:center;gap:10px;box-shadow:0 8px 30px rgba(0,0,0,0.3);min-width:260px;justify-content:center';
    document.body.appendChild(progressEl);
  }

  function setProgress(msg) {
    if (progressEl) progressEl.innerHTML = `<svg class="spinning" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a7f5a" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>${msg}</span>`;
  }
  function setProgressDone(msg) {
    if (progressEl) progressEl.innerHTML = `<span style="color:#4ade80;font-size:18px">✓</span><span>${msg}</span>`;
    setTimeout(() => { progressEl?.remove(); progressEl = null; }, 2000);
  }

  setProgress('Enregistrement...');

  const tv = apos().reduce((a,p) => a+p.qty*p.price, 0);
  const capital = parseFloat(document.getElementById('obj-capital').value) || 0;
  const monthly = parseFloat(document.getElementById('obj-monthly').value) || 200;
  const target = parseFloat(document.getElementById('obj-target').value) || 100000;
  const years = parseInt(document.getElementById('obj-years').value) || 10;
  const goal = document.getElementById('obj-goal').value;
  const goalLabels = { retraite:'Retraite anticipée', immo:'Achat immobilier', enfants:'Études enfants', liberte:'Liberté financière', autre:'Projet personnel' };
  const riskRates = { prudent: 4.5, equilibre: 7, agressif: 11 };
  const rate = riskRates[objRisk] / 100 / 12;
  const n = years * 12;

  // Save objective — variables globales
  objective = { target, years, rate: riskRates[objRisk], monthly };
  objChartCapital = capital;
  objChartMonthly = monthly;
  objChartTarget  = target;
  objChartYears   = years;
  objChartRate    = riskRates[objRisk];

  if (!isDemo && currentUser) {
    try {
      // Cherche si un objectif identique existe déjà
      const existing = objEditId
        ? allObjectives.find(o => o.id === objEditId)
        : allObjectives.find(o => o.target === target && o.monthly === monthly);
      if (existing) {
        const { error: ue } = await sb.from('objectives').update({
          capital, monthly, target, years,
          rate: riskRates[objRisk], risk: objRisk
        }).eq('id', existing.id);
        if (ue) console.warn('[generateObjPlan] update error:', ue.message);
      } else {
        const { data: ins, error: ie } = await sb.from('objectives').insert({
          user_id: currentUser.id, capital, monthly, target, years,
          rate: riskRates[objRisk], risk: objRisk
        }).select().single();
        if (ie) console.warn('[generateObjPlan] insert error:', ie.message);
        else {
          console.log('[generateObjPlan] insert OK:', ins?.id);
          // Mémorise le mois de création : sert à mettre l'investissement de départ en tête ce mois-là
          try { if (ins?.id) localStorage.setItem('iq_obj_start_' + ins.id, currentMonthId()); } catch {}
        }
      }
      // Recharge les objectifs pour mettre à jour allObjectives + onglets
      setProgress('Chargement du plan...');
      await loadObjective();
      // loadObjective() remet l'objectif n°1 en actif : on garde celui qu'on vient de modifier
      if (objEditId && allObjectives.find(o => o.id === objEditId)) {
        activeObjId = objEditId;
        applyObjData(allObjectives.find(o => o.id === objEditId));
      }
      objEditId = null;
    } catch(e) { console.warn('[generateObjPlan] save error:', e); }
  }

  // localStorage fallback
  try { localStorage.setItem('iq_validated_objective', JSON.stringify({
    capital, monthly, target, years,
    rate: riskRates[objRisk], risk: objRisk,
    validatedAt: new Date().toISOString()
  })); } catch {}

  // Show results section — reset feedback
  stepCards?.forEach(c => c.style.opacity = '1');
  if (genBtn) { genBtn.disabled = false; genBtn.innerHTML = '🤖 Générer mon plan'; }
  setProgress('Génération du plan IA...');
  document.getElementById('obj-wizard').style.display = 'none';
  document.getElementById('obj-results').style.display = 'block';

  // Calculate projection
  const fv = capital * Math.pow(1+rate, n) + monthly * ((Math.pow(1+rate,n)-1)/rate);
  const onTrack = fv >= target;
  const monthlyNeeded = Math.max((target - capital*Math.pow(1+rate,n)) * rate / (Math.pow(1+rate,n)-1), 0);
  const pct = Math.min(tv/target*100, 100);
  const rateNeeded = onTrack ? riskRates[objRisk] : calcNeededRate(capital, monthly, target, years);

  // Progress card now handled by buildObjChart
  // (obj-progress-card is no longer used — chart takes its place)

  // AI Plan
  document.getElementById('obj-ai-plan').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;color:#8e8e93;font-size:14px;padding:12px 0">
      <svg class="spinning" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      Génération de ton plan personnalisé...
    </div>`;

  const portfolioCtx = apos().length ? `Portefeuille actuel : ${apos().map(p=>`${p.name}(${p.type},${p.qty}parts,PRU ${p.pru}€)`).join(', ')}.` : 'Pas encore de positions.';
  const prompt = `Tu es le copilote financier IA de Kapitaro (tutoiement, ton chaleureux et concret). Génère un plan d'investissement ultra-personnalisé, formulé comme un ami compétent qui explique simplement.

PROFIL :
- Capital de départ : ${fmtK(capital)}
- Versement mensuel : ${monthly}€/mois  
- Objectif : ${fmtK(target)} en ${years} ans pour : ${goalLabels[goal]}
- Profil de risque : ${objRisk} (~${riskRates[objRisk]}%/an)
- ${portfolioCtx}

Génère un plan structuré avec :

**1. Analyse de la faisabilité**
Est-ce que l'objectif est réaliste ? Sois honnête et pédagogue.

**2. Allocation recommandée**
Répartition précise en % avec les ETF/actions spécifiques à acheter (donne les vrais tickers).

**3. Plan d'action mois par mois**
Comment répartir les ${monthly}€/mois exactement.

**4. Les 3-5 actifs prioritaires à acheter maintenant**
Avec le montant exact à investir sur chacun.

**5. Points de vigilance**
Les risques spécifiques à ce profil et comment s'en protéger.

Sois très concret, donne des chiffres précis, utilise un langage simple pour débutant.`;

  // Simple plan first
  const adjustMsg = !onTrack ? `\n\nSituation : l'objectif n'est PAS atteint avec ce plan. Pour y arriver il faudrait soit : augmenter le versement à ${fmtI(monthlyNeeded)}€/mois, soit viser un rendement de ${rateNeeded}%/an (profil plus agressif), soit allonger la durée.` : '';

  const simplePrompt = `Tu es conseiller financier. Réponds en 3 blocs clairs avec des titres en gras :

**Ton premier apport de ${capital}€**
Répartition exacte avec montants (ex: 700€ sur IWDA, 300€ sur VWCE)

**Chaque mois : ${monthly}€**  
Répartition exacte avec montants

**Pourquoi cette stratégie ?**
1 phrase simple${adjustMsg}

Profil : ${objRisk} (~${riskRates[objRisk]}%/an), objectif ${fmtK(target)} en ${years} ans. Sois ULTRA concret, donne les vrais noms et montants.`;
  
  const _sfx = await planDataSuffix(objRisk);
  const simpleR = await callClaude(simplePrompt + _sfx, undefined, undefined, undefined, OBJ_AI);
  const simpleFailed = callClaudeFailed(simpleR);

  // Build nice cards for the recommendation
  document.getElementById('obj-ai-simple').innerHTML = `
    <div style="font-size:14px;color:#1c1c1e;line-height:1.8">${simpleFailed
      ? aiFailureHTML(simpleR, 'generateObjPlan()')
      : formatMD(simpleR)}</div>
    ${!onTrack ? `
    <div style="margin-top:16px;background:#fff5e0;border-radius:14px;padding:16px;border-left:4px solid #f59e0b">
      <div style="font-size:14px;font-weight:800;color:#92400e;margin-bottom:8px">⚠ Point à revoir</div>
      <div style="font-size:13px;color:#78350f;line-height:1.6">
        Pour atteindre <strong>${fmtK(target)}</strong> en <strong>${years} ans</strong>, voici tes options :
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
          <div style="background:#fff;border-radius:10px;padding:10px 14px;font-weight:600">💰 Augmenter à <strong>${fmtI(monthlyNeeded)}€/mois</strong> (au lieu de ${monthly}€)</div>
          <div style="background:#fff;border-radius:10px;padding:10px 14px;font-weight:600">📈 Viser <strong>${rateNeeded <= 15 ? rateNeeded + '%/an' : 'un rendement trop élevé'}</strong>${rateNeeded <= 15 ? ' → profil ' + (rateNeeded > 9 ? 'Agressif 🚀' : 'Équilibré ⚖️') : ' — non réaliste'}</div>
          <div style="background:#fff;border-radius:10px;padding:10px 14px;font-weight:600">⏳ Allonger à <strong>${calcNeededYears(capital, monthly, target, riskRates[objRisk]) ? calcNeededYears(capital, monthly, target, riskRates[objRisk]) + '+ ans' : '60+ ans (très long terme)'}</strong></div>
        </div>
      </div>
    </div>` : `
    <div style="margin-top:16px;background:#e8f8f0;border-radius:14px;padding:14px 16px;border-left:4px solid #1a7f5a">
      <div style="font-size:14px;font-weight:700;color:#1a7f5a">✓ Objectif atteignable avec ce plan — continue comme ça !</div>
    </div>`}
    <div style="margin-top:12px;padding:10px 14px;background:#f5f5f5;border-radius:12px;font-size:12px;color:#8e8e93">
      ⚠ Simulation éducative — pas un conseil financier réglementé.
    </div>
    <div style="margin-top:16px;text-align:center">
      <button class="btn-obj-validate" onclick="validateObjectif()">✓ Valider et suivre cet objectif</button>
    </div>`;

  // Full analysis in background
  callClaude(prompt + _sfx, undefined, undefined, undefined, OBJ_AI).then(r => {
    const el = document.getElementById('obj-ai-plan');
    if (!el) return;
    el.innerHTML = callClaudeFailed(r)
      ? aiFailureHTML(r)
      : `<div style="font-size:14px;color:#3c3c43;line-height:1.7;font-weight:500">${formatMD(r)}</div>`;
  });

  // Build interactive chart
  setTimeout(() => { if (allObjectives.length > 0) { renderMultiObjChart(); } else { buildObjChart(capital, monthly, target, years, riskRates[objRisk]); } }, 100);
  // Projection table in background
  renderProjectionTable(capital, monthly, target, years, riskRates[objRisk]);
  // Done
  setProgressDone('Objectif créé !');
}

function calcNeededRate(capital, monthly, target, years) {
  // Binary search for needed rate
  let lo = 0, hi = 30;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const r = mid/100/12, n = years*12;
    const fv = capital*Math.pow(1+r,n) + monthly*((Math.pow(1+r,n)-1)/r);
    if (fv < target) lo = mid; else hi = mid;
  }
  return Math.round((lo+hi)/2 * 10) / 10;
}

function calcNeededYears(capital, monthly, target, annualRate) {
  // Binary search: how many years to reach target at given rate
  const r = annualRate / 100 / 12;
  for (let y = 1; y <= 60; y++) {
    const n = y * 12;
    const fv = r > 0
      ? capital * Math.pow(1+r, n) + monthly * ((Math.pow(1+r, n) - 1) / r)
      : capital + monthly * n;
    if (fv >= target) return y;
  }
  return null; // not reachable in 60 years
}

// ═══════════════════════════════════════════════════════════
//  🎯 FAISABILITÉ D'UN OBJECTIF
//  Calcul + explication claire : combien on atteint, ce qui manque, et
//  les 3 leviers (épargne, durée, rendement). Utilisé pendant la saisie
//  (aperçu live) et sur la page Objectif une fois l'objectif créé.
// ═══════════════════════════════════════════════════════════
const OBJ_RISK_RATES = { prudent: 4.5, equilibre: 7, dynamique: 8, agressif: 11 };

function objFeasibility(capital, monthly, target, years, ratePct) {
  const r = ratePct / 100 / 12, n = years * 12;
  const grow = Math.pow(1 + r, n);
  const fv = capital * grow + (r > 0 ? monthly * ((grow - 1) / r) : monthly * n);
  const ratio = target > 0 ? fv / target : 1;
  const monthlyNeeded = Math.max(0, r > 0 ? (target - capital * grow) * r / (grow - 1) : (target - capital) / n);
  const yearsNeeded = ratio >= 1 ? years : calcNeededYears(capital, monthly, target, ratePct);
  const rateNeeded = ratio >= 1 ? ratePct : calcNeededRate(capital, monthly, target, years);
  const level = ratio >= 1 ? 'ok' : ratio >= 0.75 ? 'tight' : ratio >= 0.4 ? 'hard' : 'unrealistic';
  return { fv, ratio, gap: Math.max(0, target - fv), invested: capital + monthly * n, monthlyNeeded, yearsNeeded, rateNeeded, level };
}

const OBJ_FEAS_STYLE = {
  ok:          { color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0', label:'✓ Objectif atteignable',   badge:'✓ Objectif atteignable' },
  tight:       { color:'#65a30d', bg:'#f7fee7', border:'#d9f99d', label:'≈ Presque atteignable',    badge:'≈ Presque atteignable' },
  hard:        { color:'#d97706', bg:'#fffbeb', border:'#fde68a', label:'⚠ Ambitieux',              badge:'⚠ Ambitieux' },
  unrealistic: { color:'#dc2626', bg:'#fef2f2', border:'#fecaca', label:'⛔ Hors de portée en l\'état', badge:'⛔ Hors de portée' },
};

function objFeasibilityHTML(capital, monthly, target, years, ratePct) {
  if (!(target > 0) || !(years > 0)) return '';
  const f = objFeasibility(capital || 0, monthly || 0, target, years, ratePct);
  const st = OBJ_FEAS_STYLE[f.level];
  const pct = Math.min(100, Math.round(f.ratio * 100));
  const gains = Math.max(0, f.fv - f.invested);
  const yrsTxt = f.yearsNeeded ? `${f.yearsNeeded} an${f.yearsNeeded > 1 ? 's' : ''}` : 'plus de 60 ans';
  const rateUnreal = f.rateNeeded > 12;
  const explain = `Avec <strong>${fmtK(capital || 0)}</strong> de départ et <strong>${fmtI(monthly || 0)} €/mois</strong> à <strong>${ratePct}%/an</strong> pendant ${years} an${years > 1 ? 's' : ''}, tu verses ${fmtK(f.invested)} au total et les intérêts composés en ajoutent ${fmtK(gains)} : soit <strong>${fmtK(f.fv)}</strong>.`;
  const verdict = {
    ok: `C'est au-dessus de ta cible de ${fmtK(target)} : à ce rythme, tu y arrives.`,
    tight: `Il manque ${fmtK(f.gap)} pour atteindre ${fmtK(target)}. Un petit ajustement suffit.`,
    hard: `Il manque ${fmtK(f.gap)} pour atteindre ${fmtK(target)}. C'est ambitieux : il faudra augmenter l'effort ou le temps.`,
    unrealistic: `Tu n'atteindrais que ${pct}% de ta cible de ${fmtK(target)} (il manque ${fmtK(f.gap)}). Aucun rendement de marché raisonnable ne comble cet écart : il faut revoir le montant visé, la durée ou l'épargne mensuelle.`,
  }[f.level];
  return `
  <div style="background:${st.bg};border:1.5px solid ${st.border};border-radius:16px;padding:16px 18px;margin-top:18px;text-align:left">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <span style="font-size:13px;font-weight:800;color:${st.color}">${st.label}</span>
      <span style="font-size:12px;font-weight:700;color:#3c3c43">${fmtK(f.fv)} <span style="color:#8e8e93;font-weight:600">projetés sur ${fmtK(target)}</span></span>
    </div>
    <div style="background:rgba(0,0,0,0.07);border-radius:99px;height:8px;overflow:hidden;margin-bottom:12px">
      <div style="height:100%;width:${Math.max(pct, 2)}%;background:${st.color};border-radius:99px;transition:width .4s"></div>
    </div>
    <div style="font-size:12.5px;color:#3c3c43;line-height:1.6;margin-bottom:${f.level === 'ok' ? 0 : 14}px">${explain}<br><span style="color:${st.color};font-weight:700">${verdict}</span></div>
    ${f.level === 'ok' ? '' : (() => {
      const monthlyRounded = Math.ceil(f.monthlyNeeded / 10) * 10;
      const stepT = f.fv < 10000 ? 100 : 1000;
      const targetNice = Math.max(stepT, Math.floor(f.fv / stepT) * stepT);
      const canYears = !!f.yearsNeeded;
      const riskNext = f.rateNeeded > 7 ? 'agressif' : 'equilibre';
      const canRisk = !rateUnreal && (OBJ_RISK_RATES[objRisk] || 7) < f.rateNeeded && (OBJ_RISK_RATES[riskNext] || 0) > (OBJ_RISK_RATES[objRisk] || 7);
      const card = (kind, val, title, big, sub, enabled, subColor) => `
        <button type="button" ${enabled ? `onclick="objApplyLever('${kind}', ${typeof val === 'number' ? val : `'${val}'`})"` : 'disabled'} style="text-align:left;font:inherit;cursor:${enabled ? 'pointer' : 'not-allowed'};opacity:${enabled ? 1 : 0.55};background:#fff;border:1px solid ${st.border};border-radius:12px;padding:10px 12px;transition:all .15s" ${enabled ? `onmouseover="this.style.borderColor='${st.color}';this.style.transform='translateY(-1px)'" onmouseout="this.style.borderColor='${st.border}';this.style.transform='none'"` : ''}>
          <div style="font-size:10px;color:#8e8e93;font-weight:700;margin-bottom:3px">${title}</div>
          <div style="font-size:15px;font-weight:900;color:${subColor === '#dc2626' ? '#dc2626' : '#1c1c1e'}">${big}</div>
          <div style="font-size:10.5px;color:${subColor || '#8e8e93'}">${sub}</div>
          ${enabled ? `<div style="font-size:10.5px;font-weight:800;color:${st.color};margin-top:5px">Appliquer →</div>` : ''}
        </button>`;
      return `
    <div style="font-size:10.5px;font-weight:800;color:#8e8e93;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Comment y arriver — clique pour appliquer</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">
      ${card('monthly', monthlyRounded, 'ÉPARGNER PLUS', fmtI(monthlyRounded) + ' €/mois', 'au lieu de ' + fmtI(monthly || 0) + ' €', true)}
      ${card('years', f.yearsNeeded || 0, 'PRENDRE PLUS DE TEMPS', yrsTxt, 'au lieu de ' + years + ' an' + (years > 1 ? 's' : ''), canYears)}
      ${card('risk', riskNext, 'VISER PLUS DE RENDEMENT', (f.rateNeeded >= 30 ? '30%+' : f.rateNeeded + '%') + '/an', rateUnreal ? 'irréaliste à long terme' : (canRisk ? 'passer en profil ' + (riskNext === 'agressif' ? 'Agressif' : 'Équilibré') : 'profil plus risqué'), canRisk, rateUnreal ? '#dc2626' : null)}
      ${card('target', targetNice, 'VISER PLUS BAS', fmtK(targetNice), 'ce que tu atteins à ce rythme', true)}
    </div>`;
    })()}
  </div>`;
}

// Applique un levier de la carte de faisabilité (dans le wizard, ou depuis la page Objectif
// en rouvrant l'objectif actif en mode modification avec la valeur déjà ajustée).
function objApplyLever(kind, value) {
  const wizardHidden = document.getElementById('obj-wizard').style.display === 'none';
  if (wizardHidden && !objectifGate()) return;
  if (wizardHidden) resetObj('edit');
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  let msg = '';
  if (kind === 'monthly') { set('obj-monthly', value); msg = `Versement mensuel passé à ${fmtI(value)} €`; }
  if (kind === 'years')   { set('obj-years', value);   msg = `Durée passée à ${value} ans`; }
  if (kind === 'target')  { set('obj-target', value);  msg = `Objectif ramené à ${fmtK(value)}`; }
  if (kind === 'risk')    { selectRisk(value);         msg = `Profil ${value === 'agressif' ? 'Agressif' : 'Équilibré'} sélectionné`; }
  objFeasPreview();
  if (wizardHidden) objGo(3);
  showToast('✓ ' + msg + (wizardHidden ? ' — vérifie puis clique sur « Générer mon plan »' : ''));
}

// Aperçu live pendant la saisie du wizard (étapes 2 et 3)
function objFeasPreview() {
  const capital = parseFloat(document.getElementById('obj-capital')?.value) || 0;
  const monthly = parseFloat(document.getElementById('obj-monthly')?.value) || 0;
  const target  = parseFloat(document.getElementById('obj-target')?.value) || 0;
  const years   = parseInt(document.getElementById('obj-years')?.value) || 0;
  const html = objFeasibilityHTML(capital, monthly, target, years, OBJ_RISK_RATES[objRisk] || 7);
  ['obj-feas-2', 'obj-feas-3'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = html; });
}

// Panneau d'explication sur la page Objectif (objectif actif)
function renderObjFeasibilityPanel() {
  const el = document.getElementById('obj-feasibility');
  if (!el) return;
  const a = allObjectives.find(o => o.id === activeObjId) || allObjectives[0];
  if (!a) { el.innerHTML = ''; return; }
  const html = objFeasibilityHTML(a.capital, a.monthly, a.target, a.years, a.rate);
  const f = objFeasibility(a.capital, a.monthly, a.target, a.years, a.rate);
  el.innerHTML = f.level === 'ok' ? '' : `<div style="margin-bottom:14px">${html.replace('margin-top:18px', 'margin-top:0')}</div>`;
  const badge = document.getElementById('obj-track-badge');
  if (badge) {
    badge.textContent = String(OBJ_FEAS_STYLE[f.level].badge).replace(/^[✓⚠!]\s*/, '');   // le symbole est déjà dans la pastille ronde
    badge.className = 'obj-track-badge ' + (f.level === 'ok' || f.level === 'tight' ? 'on-track' : 'off-track');
    const box = document.getElementById('obj-badge-box'), ck = document.getElementById('obj-badge-ck'), good = f.level === 'ok' || f.level === 'tight';
    if (box) box.classList.toggle('warn', !good);
    if (ck) ck.textContent = good ? '✓' : '!';
  }
}

function renderProjectionTable(capital, monthly, target, years, annualRate) {
  const rate = annualRate/100/12;
  let rows = '';
  const milestones = [1,2,3,5,7,10,15,20].filter(y => y <= years+1);
  for (const y of milestones) {
    const n = y*12;
    const fv = capital*Math.pow(1+rate,n) + monthly*((Math.pow(1+rate,n)-1)/rate);
    const invested = capital + monthly*n;
    const gain = fv - invested;
    const onT = fv >= target;
    rows += `<tr>
      <td style="font-weight:700">Année ${y}</td>
      <td style="font-weight:800;color:${onT?'#1a7f5a':'#1c1c1e'}">${fmtK(Math.round(fv))}</td>
      <td style="color:#8e8e93">${fmtK(Math.round(invested))}</td>
      <td style="color:#1a7f5a;font-weight:700">+${fmtK(Math.round(gain))}</td>
      <td>${onT?'<span style="color:#1a7f5a;font-weight:700">✓ Atteint</span>':'<span style="color:#8e8e93">En cours</span>'}</td>
    </tr>`;
  }
  document.getElementById('obj-projection').innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="border-bottom:2px solid #f5f5f5">
        <th style="text-align:left;padding:8px 0;color:#8e8e93;font-weight:700;font-size:11px;text-transform:uppercase">Année</th>
        <th style="text-align:left;padding:8px 0;color:#8e8e93;font-weight:700;font-size:11px;text-transform:uppercase">Capital</th>
        <th style="text-align:left;padding:8px 0;color:#8e8e93;font-weight:700;font-size:11px;text-transform:uppercase">Investi</th>
        <th style="text-align:left;padding:8px 0;color:#8e8e93;font-weight:700;font-size:11px;text-transform:uppercase">Gains</th>
        <th style="text-align:left;padding:8px 0;color:#8e8e93;font-weight:700;font-size:11px;text-transform:uppercase">Objectif</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderObj() { /* legacy - kept for compat */ }
async function saveObjectif() { /* legacy */ }

