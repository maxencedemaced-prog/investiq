// tab-hints.js — première visite : un point rouge sur chaque onglet du menu, et au premier clic une petite fenêtre
// explique en quelques mots à quoi sert l'outil. Le point disparaît dès le premier clic ; c'est mémorisé par compte.
// Dépend d'app.js : currentUser, isPremiumUser.

const TAB_HINTS = {
  home:      { title: 'Accueil', text: 'Ton tableau de bord : la valeur de ton portefeuille, ton score de santé, ton objectif et ce qui mérite ton attention, en un coup d\'œil.' },
  portfolio: { title: 'Portefeuille', text: 'Toutes tes positions avec les prix en direct. Ajoute des actions ou des ETF, suis ta performance et crée des alertes de prix.' },
  sante:     { title: 'Santé du portefeuille', text: 'Un score sur 10 qui mesure ta diversification, ta concentration et ta part d\'ETF, avec ce qu\'il faut améliorer en priorité.' },
  objectif:  { title: 'Objectif', text: 'Fixe un objectif (capital visé, durée, versement mensuel), vois s\'il est réaliste et reçois un plan d\'investissement chiffré, mois par mois.' },
  crise:     { title: 'Scénario crise', text: 'Simule une chute des marchés sur ton portefeuille pour voir ce que tu perdrais, avant que ça n\'arrive.' },
  news:      { title: 'Actualités', text: 'Les actualités qui concernent tes positions et les entreprises que tu suis. Elles ne se chargent que quand tu ouvres cette page.' },
  decision:  { title: 'Aide à la décision', text: 'Tu hésites à acheter ou à vendre ? Décris ton idée : l\'IA te donne un avis clair et chiffré.' },
  dca:       { title: 'Simulateur DCA', text: 'Vois ce que la régularité et les intérêts composés font de ton épargne sur la durée, selon ce que tu investis chaque mois.' },
  depenses:  { title: 'Mes dépenses', premium: true, text: 'Importe ton relevé de compte : InvestIQ retrouve tes abonnements, classe tes dépenses et te montre ce que tu économiserais en l\'investissant.' },
  ai:        { title: 'Agent IA', text: 'Ton copilote financier : pose-lui des questions sur ton portefeuille, demande-lui un avis, ou faites ensemble un ordre comme ajouter une position ou une alerte.' },
  bilan:     { title: 'Mon bilan', premium: true, text: 'Le bilan patrimonial complet : ta situation, tes objectifs, un plan d\'action chiffré et un PDF à garder. Tu le retrouves ici à tout moment.' },
  settings:  { title: 'Paramètres', text: 'Ton compte, ton abonnement, tes notifications et l\'apparence de l\'application (thème clair ou sombre).' },
};

const tabSeenKey = () => 'iq_seen_tabs_' + (currentUser?.id || 'demo');
const tabPageOf = b => String((b && b.id) || '').replace(/^(bnav|nav)-/, '');
function tabSeenSet() { try { return new Set(JSON.parse(localStorage.getItem(tabSeenKey()) || '[]')); } catch { return new Set(); } }
function tabMarkSeen(pages) {
  const s = tabSeenSet();
  [].concat(pages).forEach(p => s.add(p));
  try { localStorage.setItem(tabSeenKey(), JSON.stringify([...s])); } catch {}
}

// Point rouge sur chaque onglet pas encore ouvert
function updateNavDots() {
  const seen = tabSeenSet();
  document.querySelectorAll('.nav-btn, .bnav-btn').forEach(b => {
    const page = tabPageOf(b);
    if (!TAB_HINTS[page]) return;
    const dot = b.querySelector('.nav-dot');
    if (seen.has(page)) { if (dot) dot.remove(); return; }
    if (!dot) { const d = document.createElement('i'); d.className = 'nav-dot'; d.setAttribute('aria-label', 'Nouveau'); b.appendChild(d); }
  });
}

function showTabHint(page) {
  const h = TAB_HINTS[page]; if (!h) return;
  document.getElementById('tab-hint')?.remove();
  const icon = (document.getElementById('nav-' + page) || document.getElementById('bnav-' + page))?.querySelector('svg')?.outerHTML || '';
  const el = document.createElement('div');
  el.id = 'tab-hint';
  el.style.cssText = 'position:fixed;inset:0;z-index:10004;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.28)';
  el.onclick = e => { if (e.target === el) el.remove(); };
  el.innerHTML = `
    <div role="dialog" aria-label="${h.title}" style="max-width:390px;width:100%;background:var(--color-surface,#fff);color:var(--color-text,#1c1c1e);border:1px solid var(--color-border,#e4e4e7);border-radius:18px;padding:18px 18px 14px;box-shadow:0 24px 60px rgba(0,0,0,0.35)">
      <div style="display:flex;gap:13px;align-items:flex-start">
        <span style="width:38px;height:38px;border-radius:11px;background:rgba(22,163,74,0.12);color:#16a34a;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="display:flex;width:20px;height:20px">${icon.replace(/width="\d+"/, 'width="20"').replace(/height="\d+"/, 'height="20"')}</span></span>
        <div style="min-width:0">
          <div style="font-size:15px;font-weight:800;letter-spacing:-0.02em">${h.title}${h.premium ? ' <span style="font-size:10px;font-weight:800;color:#16a34a;background:rgba(22,163,74,0.14);padding:2px 8px;border-radius:99px;vertical-align:2px;margin-left:4px">Premium</span>' : ''}</div>
          <div style="font-size:13px;line-height:1.55;color:var(--color-text-secondary,#71717a);margin-top:4px">${h.text}</div>
          ${h.premium ? `<div style="display:flex;align-items:center;gap:7px;margin-top:10px;padding:8px 11px;border-radius:10px;background:rgba(22,163,74,0.1);color:#16a34a;font-size:12px;font-weight:700;line-height:1.4"><span>✨</span><span>${(typeof isPremiumUser === 'function' && isPremiumUser()) ? 'Outil inclus dans ton abonnement Premium.' : 'Outil réservé aux membres Premium.'}</span></div>` : ''}
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:14px">
        <button type="button" onclick="tabHintsOff()" style="background:none;border:none;color:var(--color-text-secondary,#71717a);font:inherit;font-size:11.5px;text-decoration:underline;cursor:pointer;padding:0">Ne plus afficher ces explications</button>
        <button type="button" onclick="document.getElementById('tab-hint')?.remove()" style="background:#16a34a;color:#fff;border:none;border-radius:10px;padding:9px 18px;font:inherit;font-size:13px;font-weight:700;cursor:pointer">Compris</button>
      </div>
    </div>`;
  document.body.appendChild(el);
}
// « Ne plus afficher » : tous les onglets sont considérés comme vus
function tabHintsOff() {
  tabMarkSeen(Object.keys(TAB_HINTS));
  updateNavDots();
  document.getElementById('tab-hint')?.remove();
}

// Paramètres : remet tous les points rouges et les explications
function tabHintsReset() {
  try { localStorage.removeItem(tabSeenKey()); } catch {}
  updateNavDots();
  const b = document.getElementById('tab-hints-reset');
  if (b) { b.textContent = '✓ Explications réactivées : clique sur un onglet'; setTimeout(() => { b.textContent = '🔴 Réafficher les explications des onglets'; }, 3500); }
}

// Premier clic sur un onglet : le point disparaît et la fenêtre d'explication s'ouvre
document.addEventListener('click', e => {
  const b = e.target && e.target.closest ? e.target.closest('.nav-btn, .bnav-btn') : null;
  if (!b) return;
  const page = tabPageOf(b);
  if (!TAB_HINTS[page] || tabSeenSet().has(page)) return;
  if (document.getElementById('app')?.style.display === 'none') return;
  tabMarkSeen(page);
  updateNavDots();
  if (page === 'bilan' && typeof isPremiumUser === 'function' && !isPremiumUser()) return;   // la fenêtre des offres l'explique déjà
  setTimeout(() => showTabHint(page), 300);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('tab-hint')?.remove(); });
window.addEventListener('DOMContentLoaded', () => { try { updateNavDots(); } catch {} });
