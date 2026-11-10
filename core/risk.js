// Payment Risk Review: score every outgoing payment against what is normal for that payee, using only history
// strictly before it. Each signal is a tail probability under "normal" (Bayesian per-payee models with
// category-level priors); signals are combined with the harmonic mean p-value (robust to dependence between
// signals) into one p-value, shown as "1 in N". A hold threshold is set by split-conformal
// calibration on a past window so that a chosen share of normal payments gets a second look.
import { DAY } from './gen.js';

// ---------- small numerics ----------
function lgamma(x) { const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x); x -= 1; let a = c[0]; const t = x + g + 0.5; for (let i = 1; i < g + 2; i++) a += c[i] / (x + i); return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a); }
function betacf(a, b, x) { let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - (qab * x) / qap; if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; let h = d; for (let m = 1; m <= 200; m++) { const m2 = 2 * m; let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; h *= d * c; aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-14) break; } return h; }
export function ibeta(a, b, x) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b; }
// upper tail of Student-t with nu dof
export function tUpper(t, nu) { const x = nu / (nu + t * t); const tail = 0.5 * ibeta(nu / 2, 0.5, x); return t >= 0 ? tail : 1 - tail; }
// Harmonic mean p-value (Wilson 2019): valid under dependence up to a small constant, dominated by the
// smallest p-values, and not dragged around by signals sitting near p = 1. Every signal is always counted
// (p = 1 when it did not fire), so a payment is not penalised for having more checks apply.
export function harmonicCombine(ps, k = ps.length) { const s = ps.reduce((a, p) => a + 1 / Math.max(p, 1e-15), 0) + (k - ps.length); return Math.min(1, k / s); }
const smooth = (k, n) => (k + 1) / (n + 2);

// Normal-Inverse-Gamma posterior predictive for a log quantity
function nigPredict(stats, prior) {
  const { n, mean, m2 } = stats; const k0 = prior.k0, a0 = prior.a0, b0 = prior.a0 * prior.s2, m0 = prior.m;
  const kn = k0 + n, mn = (k0 * m0 + n * mean) / kn, an = a0 + n / 2, bn = b0 + 0.5 * m2 + (k0 * n * (mean - m0) ** 2) / (2 * kn);
  return { loc: mn, scale: Math.sqrt((bn * (kn + 1)) / (an * kn)), nu: 2 * an };
}
const push = (s, x) => { s.n++; const d = x - s.mean; s.mean += d / s.n; s.m2 += d * (x - s.mean); };
const newStats = () => ({ n: 0, mean: 0, m2: 0 });
const etHour = (ts) => { const d = new Date(ts - 5 * 3600000); return { h: d.getUTCHours(), dow: d.getUTCDay() }; };
const offHours = (ts) => { const { h, dow } = etHour(ts); return dow === 0 || dow === 6 || h < 7 || h >= 21; };

export const SIGNALS = {
  amount: 'Amount vs this payee',
  timing: 'Sooner than this payee’s rhythm',
  duplicate: 'Matches a recent payment',
  velocity: 'Several payments to one payee today',
  newPayee: 'First payment to a new payee',
  newAccount: 'First payment to these bank details',
  unverified: 'Bank details added recently, not callback-verified',
  country: 'Destination country changed',
  rail: 'Unusual payment method for this payee',
  initiator: 'Unusual initiator for this payee',
  offHours: 'Initiated outside business hours',
};

export function scoreAll(data, { alpha = 0.03, calStart, testStart, useVerification = true } = {}) {
  const contacts = Object.fromEntries(data.contacts.map((c) => [c.id, c]));
  const accounts = {}; data.contacts.forEach((c) => c.accounts.forEach((a) => (accounts[a.id] = { ...a, contactId: c.id })));
  const st = {}; // per-contact state
  const cat = {}; // per-category pooled stats of contact means/variances, rail and user counts
  const G = { n: 0, newPayee: 0, existing: 0, newAccount: 0, unverifiedRecent: 0, country: 0, off: 0, dup: 0, users: {}, rails: {} };
  const out = []; const calScores = []; let tau = null;

  const S = (cid) => st[cid] || (st[cid] = { amt: newStats(), gap: newStats(), last: null, recent: [], initiated: [], rails: {}, users: {}, accts: new Set(), countries: new Set(), n: 0 });
  const catPrior = (c) => {
    const pool = data.contacts.filter((x) => x.cat === c.cat && st[x.id] && st[x.id].amt.n >= 3 && x.id !== c.id).map((x) => st[x.id].amt);
    const all = Object.values(st).filter((s) => s.amt.n >= 3).map((s) => s.amt);
    const use = pool.length >= 2 ? pool : all;
    if (!use.length) return { m: Math.log(20000), s2: 1.5, k0: 0.5, a0: 2 };
    const m = use.reduce((a, s) => a + s.mean, 0) / use.length;
    const within = use.reduce((a, s) => a + s.m2, 0) / Math.max(1, use.reduce((a, s) => a + s.n - 1, 0));
    const between = use.length > 1 ? use.reduce((a, s) => a + (s.mean - m) ** 2, 0) / (use.length - 1) : 1;
    return { m, s2: Math.max(within, 0.02), k0: Math.min(2, Math.max(0.05, within / Math.max(between, 1e-6))), a0: 2 };
  };
  const catGap = (c) => { const g = data.contacts.filter((x) => x.cat === c.cat && st[x.id] && st[x.id].gap.n >= 2).map((x) => st[x.id].gap); if (!g.length) return { m: Math.log(14), s2: 1, k0: 0.5, a0: 2 }; const m = g.reduce((a, s) => a + s.mean, 0) / g.length; const w = g.reduce((a, s) => a + s.m2, 0) / Math.max(1, g.reduce((a, s) => a + s.n - 1, 0)); return { m, s2: Math.max(w, 0.01), k0: 1, a0: 2 }; };
  const discreteTail = (counts, prior, key) => { const keys = new Set([...Object.keys(prior), ...Object.keys(counts), key]); const tot = [...keys].reduce((a, k) => a + (counts[k] || 0) + (prior[k] || 0.05), 0); const pr = Object.fromEntries([...keys].map((k) => [k, ((counts[k] || 0) + (prior[k] || 0.05)) / tot])); return [...keys].filter((k) => pr[k] <= pr[key] + 1e-12).reduce((a, k) => a + pr[k], 0); };

  for (const p of data.payments) {
    const c = contacts[p.contactId]; const s = S(c.id); const acc = accounts[p.accountId]; const x = Math.log(p.amount);
    const sig = {}; const detail = {};
    // amount (upper tail)
    { const pr = s.amt.n >= 1 ? nigPredict(s.amt, catPrior(c)) : nigPredict(newStats(), catPrior(c)); const z = (x - pr.loc) / pr.scale; sig.amount = tUpper(z, pr.nu); detail.amount = { typical: Math.exp(pr.loc), ratio: p.amount / Math.exp(pr.loc), z }; }
    // timing (lower tail of log gap)
    if (s.last !== null && s.gap.n >= 3) { const gap = Math.max((p.ts - s.last) / DAY, 0.02); const pr = nigPredict(s.gap, catGap(c)); const z = (Math.log(gap) - pr.loc) / pr.scale; sig.timing = 1 - tUpper(z, pr.nu); detail.timing = { gapDays: gap, typicalDays: Math.exp(pr.loc) }; }
    // duplicate
    { const dupe = s.initiated.find((r) => p.ts - r.ts < 10 * DAY && Math.abs(r.amount - p.amount) / p.amount < 0.002); if (dupe) { sig.duplicate = smooth(G.dup, G.n); detail.duplicate = { daysAgo: (p.ts - dupe.ts) / DAY, amount: dupe.amount }; } }
    // velocity: payments to this payee in the past 24h vs its long-run daily rate
    { const k = s.initiated.filter((r) => p.ts - r.ts < DAY).length + 1; if (k >= 2) { const span = s.n >= 2 ? Math.max(30, (p.ts - s.first) / DAY) : 30; const lam = Math.max(s.n, 1) / span; let cdf = 0, term = Math.exp(-lam); for (let j = 0; j < k; j++) { cdf += term; term *= lam / (j + 1); } sig.velocity = Math.max(1e-12, 1 - cdf); detail.velocity = { count: k }; } }
    // destination
    const isNewPayee = s.n === 0 && p.ts - c.createdAt < 30 * DAY; // relationships imported at onboarding are not new payees
    if (isNewPayee) { sig.newPayee = smooth(G.newPayee, G.n); detail.newPayee = {}; }
    else if (s.n > 0 && !s.accts.has(acc.id)) { sig.newAccount = smooth(G.newAccount, G.existing); detail.newAccount = { bank: acc.bank, addedDaysAgo: (p.ts - acc.addedAt) / DAY, via: acc.via }; }
    const recentAdd = (p.ts - acc.addedAt) / DAY < 14 && !acc.verified;
    if (useVerification && recentAdd) { sig.unverified = smooth(G.unverifiedRecent, G.n); detail.unverified = { addedDaysAgo: (p.ts - acc.addedAt) / DAY, via: acc.via }; }
    if (s.n > 0 && !s.countries.has(acc.country)) { sig.country = smooth(G.country, G.existing); detail.country = { from: [...s.countries].join(', '), to: acc.country }; }
    // rail and initiator (discrete tails with category / global priors)
    { const catRails = cat[c.cat]?.rails || G.rails; const totC = Object.values(catRails).reduce((a, b) => a + b, 0) || 1; const prior = Object.fromEntries(Object.entries(catRails).map(([k, v]) => [k, (2 * v) / totC])); sig.rail = discreteTail(s.rails, prior, p.rail); detail.rail = { rail: p.rail, usual: Object.entries(s.rails).sort((a, b) => b[1] - a[1])[0]?.[0] || null }; }
    { const totU = Object.values(G.users).reduce((a, b) => a + b, 0) || 1; const prior = Object.fromEntries(Object.entries(G.users).map(([k, v]) => [k, (2 * v) / totU])); sig.initiator = discreteTail(s.users, prior, p.initiator); }
    if (offHours(p.ts)) { sig.offHours = smooth(G.off, G.n); detail.offHours = etHour(p.ts); }

    const pv = harmonicCombine(Object.values(sig), Object.keys(SIGNALS).length);
    const rec = { id: p.id, p: pv, oneIn: 1 / pv, signals: sig, detail, contactId: c.id };
    if (calStart && p.ts >= calStart && p.ts < testStart) calScores.push(pv);
    if (testStart && p.ts >= testStart && tau === null) tau = conformalTau(calScores, alpha);
    rec.held = tau !== null ? pv <= tau : null;
    out.push(rec);

    s.initiated.push({ ts: p.ts, amount: p.amount }); s.initiated = s.initiated.filter((r) => p.ts - r.ts < 30 * DAY);
    // executed payments enter history; a held attempt that is an attack is rejected by the approver
    const rejected = p.attack && rec.held;
    if (!rejected && p.status === 'done') {
      G.n++; if (isNewPayee) G.newPayee++; if (s.n > 0) { G.existing++; if (!s.accts.has(acc.id)) G.newAccount++; if (!s.countries.has(acc.country)) G.country++; }
      if (recentAdd) G.unverifiedRecent++; if (offHours(p.ts)) G.off++; if (sig.duplicate) G.dup++;
      G.users[p.initiator] = (G.users[p.initiator] || 0) + 1; G.rails[p.rail] = (G.rails[p.rail] || 0) + 1;
      const cc = cat[c.cat] || (cat[c.cat] = { rails: {} }); cc.rails[p.rail] = (cc.rails[p.rail] || 0) + 1;
      if (s.last !== null) push(s.gap, Math.log(Math.max((p.ts - s.last) / DAY, 0.02)));
      push(s.amt, x); if (s.n === 0) s.first = p.ts; s.last = p.ts; s.n++;
      s.recent.push({ ts: p.ts, amount: p.amount }); s.recent = s.recent.filter((r) => p.ts - r.ts < 30 * DAY);
      s.rails[p.rail] = (s.rails[p.rail] || 0) + 1; s.users[p.initiator] = (s.users[p.initiator] || 0) + 1; s.accts.add(acc.id); s.countries.add(acc.country);
    }
  }
  if (tau === null) tau = conformalTau(calScores, alpha);
  for (const r of out) if (r.held === null) r.held = r.p <= tau;
  return { scores: Object.fromEntries(out.map((r) => [r.id, r])), list: out, tau, calN: calScores.length, alpha };
}

// split-conformal threshold: hold if p <= tau; with n exchangeable normal scores, P(hold a normal payment) <= alpha
export function conformalTau(cal, alpha) { const s = [...cal].sort((a, b) => a - b); const k = Math.floor(alpha * (s.length + 1)); return k < 1 ? 0 : s[Math.min(k, s.length) - 1]; }

// Backtest on the evaluation window: hold rate on normal payments, attacks caught, vs simple rules
export function backtest(data, R, { testStart, testEnd, threshold = 250000 } = {}) {
  const inWin = data.payments.filter((p) => p.ts >= testStart && p.ts < testEnd);
  const legit = inWin.filter((p) => !p.attack), att = inWin.filter((p) => p.attack);
  const attemptsOf = (ps) => [...new Set(ps.map((p) => p.attack + '|' + p.contactId))];
  const caughtAttempts = (pred) => { const g = {}; att.forEach((p) => { const k = p.attack + '|' + p.contactId; g[k] = g[k] || pred(p); }); return Object.values(g).filter(Boolean).length; };
  const accounts = {}; data.contacts.forEach((c) => c.accounts.forEach((a) => (accounts[a.id] = a)));
  const seen = {}; const firstTo = {}; for (const p of data.payments) { const k = p.contactId + '|' + p.accountId; if (!seen[k]) { seen[k] = true; firstTo[p.id] = true; } }
  const rules = {
    model: (p) => R.scores[p.id].held,
    amount: (p) => p.amount >= threshold,
    newOrChanged: (p) => !!firstTo[p.id],
  };
  const res = {};
  for (const [k, f] of Object.entries(rules)) res[k] = { holdRate: legit.filter(f).length / legit.length, held: legit.filter(f).length, caught: caughtAttempts(f) };
  return { nLegit: legit.length, nAttempts: attemptsOf(att).length, rules: res };
}
