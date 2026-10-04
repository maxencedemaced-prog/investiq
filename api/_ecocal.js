// api/_ecocal.js — calendrier officiel des grandes annonces économiques (préfixe « _ » : pas une route Vercel).
// Sources (relevées le 2026-10-04) : Fed (federalreserve.gov, réunions FOMC), BCE (ecb.europa.eu, réunions de politique
// monétaire), BLS (bls.gov : CPI, Employment Situation), BEA (bea.gov : PIB, revenus et dépenses / PCE),
// Eurostat (estimation rapide de l'inflation de la zone euro).
// Les heures sont celles de l'institution, dans son fuseau : la conversion en UTC gère les changements d'heure.
// À COMPLÉTER chaque année : BLS, BEA et Eurostat n'avaient pas encore publié leurs dates 2027 au 2026-10-04.
// Les dates FOMC restent « provisoires jusqu'à confirmation à la réunion précédente » (mention de la Fed).

const RAW = [
  { fam: 'fed', zone: 'US', tz: 'America/New_York', time: '14:00',
    titre: 'Décision de taux de la Fed', desc: 'La banque centrale américaine annonce ses taux : les marchés peuvent bouger fortement.',
    dates: ['2026-10-28', '2026-12-09', '2027-01-27', '2027-03-17', '2027-04-28', '2027-06-09', '2027-07-28', '2027-09-15', '2027-10-27', '2027-12-08'] },
  { fam: 'ecb', zone: 'EU', tz: 'Europe/Berlin', time: '14:15',
    titre: 'Décision de taux de la BCE', desc: 'La Banque centrale européenne annonce ses taux : impact direct sur les marchés européens.',
    dates: ['2026-10-29', '2026-12-17', '2027-02-04', '2027-03-18', '2027-04-29', '2027-06-10', '2027-07-22', '2027-09-09', '2027-10-28', '2027-12-16'] },
  { fam: 'cpi-us', zone: 'US', tz: 'America/New_York', time: '08:30',
    titre: 'Inflation américaine (CPI)', desc: 'Chiffre très suivi : il pèse sur les décisions de la Fed et sur les marchés.',
    dates: ['2026-10-14', '2026-11-10', '2026-12-10'] },
  { fam: 'nfp', zone: 'US', tz: 'America/New_York', time: '08:30',
    titre: 'Emploi américain (NFP)', desc: 'Créations d\'emplois et chômage aux États-Unis : souvent un gros mouvement de marché.',
    dates: ['2026-11-06', '2026-12-04'] },
  { fam: 'gdp-us', zone: 'US', tz: 'America/New_York', time: '08:30',
    titre: 'Croissance du PIB américain (1re estimation)', desc: 'Première mesure de la croissance du trimestre aux États-Unis.',
    dates: ['2026-10-29'] },
  { fam: 'pce-us', zone: 'US', tz: 'America/New_York', time: '08:30',
    titre: 'Inflation PCE américaine', desc: 'L\'indicateur d\'inflation préféré de la Fed.',
    dates: ['2026-11-25', '2026-12-23'] },
  { fam: 'hicp-eu', zone: 'EU', tz: 'Europe/Luxembourg', time: '11:00',
    titre: 'Inflation de la zone euro (estimation rapide)', desc: 'Première mesure de l\'inflation du mois dans la zone euro, suivie par la BCE.',
    dates: ['2026-11-04', '2026-12-01'] },
];
const LAST_UPDATED = '2026-10-04';

// Heure « murale » d'un fuseau → instant UTC (deux passes suffisent pour les changements d'heure)
function zonedToUtc(date, time, tz) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wanted = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wanted;
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  for (let i = 0; i < 2; i++) {
    const g = Object.fromEntries(fmt.formatToParts(new Date(guess)).map(p => [p.type, p.value]));
    guess += wanted - Date.UTC(+g.year, +g.month - 1, +g.day, +g.hour, +g.minute);
  }
  return new Date(guess);
}

let _cache = null;
function allEvents() {
  if (_cache) return _cache;
  _cache = RAW.flatMap(f => f.dates.map(date => ({
    id: `${f.fam}-${date}`, family: f.fam, zone: f.zone, titre: f.titre, desc: f.desc, utc: zonedToUtc(date, f.time, f.tz),
  }))).sort((a, b) => a.utc - b.utc);
  return _cache;
}

// Date et heure de Paris d'un instant (« 2026-10-28 », « 19:00 », « 19h00 »)
const parisDate = (d) => d.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
const parisHM = (d) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
const parisH = (d) => parisHM(d).replace(':', 'h');

module.exports = { allEvents, zonedToUtc, parisDate, parisHM, parisH, LAST_UPDATED };
