// Erebor · Payments · Risk review (unofficial concept). Everything below is computed in the browser from the
// seeded synthetic customer in core/gen.js by core/risk.js. No number on the page is typed in by hand.
import { makeData, CAL_START, TEST_START, TODAY, DAY } from './core/gen.js';
import { scoreAll, backtest, SIGNALS } from './core/risk.js';

const $ = (id) => document.getElementById(id);
const D = makeData();
const contacts = Object.fromEntries(D.contacts.map((c) => [c.id, c]));
const accounts = {}; D.contacts.forEach((c) => c.accounts.forEach((a) => (accounts[a.id] = a)));
const users = Object.fromEntries(D.users.map((u) => [u.id, u]));
const pay = Object.fromEntries(D.payments.map((p) => [p.id, p]));
const state = { alpha: 0.03, sel: null, tab: 'payment', R: null, B: null };
const TEST_END = TODAY - 2 * DAY;

function run() {
  state.R = scoreAll(D, { alpha: state.alpha, calStart: CAL_START, testStart: TEST_START });
  state.B = backtest(D, state.R, { testStart: TEST_START, testEnd: TEST_END });
}

// ---------- formatting ----------
const usd = (v, d = 2) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const usd0 = (v) => usd(v, 0);
const oneIn = (p) => { const n = 1 / p; return n >= 1e6 ? '1 in 1M+' : n >= 1000 ? `1 in ${Math.round(n / 100) / 10}k` : `1 in ${Math.max(1, Math.round(n))}`; };
const et = (ts) => new Date(ts - 5 * 3600000);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const when = (ts) => { const d = et(ts); const h = d.getUTCHours(), m = d.getUTCMinutes(); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const AV = [['#7b9285', '#0d1711'], ['#5795b5', '#001724'], ['#c08070', '#362420'], ['#cca84c', '#1f1200'], ['#8489b1', '#121323'], ['#81955e', '#101802'], ['#b97b58', '#230e09'], ['#a47bae', '#1e0d22'], ['#4d98a3', '#03171c'], ['#bdbdc7', '#1a1a1c']];
const avatar = (name) => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const [bg, fg] = AV[h % AV.length]; const ini = name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase(); return `<span class="av" style="background:${bg};color:${fg}">${ini}</span>`; };
const railLabel = (r) => ({ ACH: 'ACH', Wire: 'Wire', SWIFT: 'Intl. wire', FedNow: 'FedNow', USDC: 'USDC' })[r] || r;
const accLabel = (a) => (a.country === 'XX' ? a.bank : `${a.bank} ••${a.last4}`);

function explain(p, k, r) {
  const d = r.detail[k] || {}; const c = contacts[p.contactId];
  switch (k) {
    case 'amount': return `${usd0(p.amount)} is ${d.ratio.toFixed(1)}× the typical ${usd0(d.typical)} for this payee`;
    case 'timing': return `${d.gapDays < 1 ? Math.round(d.gapDays * 24) + ' hours' : d.gapDays.toFixed(0) + ' days'} after the last payment; usually about every ${Math.round(d.typicalDays)} days`;
    case 'duplicate': return `Same amount as a payment ${Math.max(1, Math.round(d.daysAgo))} day${Math.round(d.daysAgo) === 1 ? '' : 's'} ago (${usd(d.amount)})`;
    case 'velocity': return `${d.count} payments to ${c.name} in the last 24 hours`;
    case 'newPayee': return `No earlier payments to ${c.name}; added ${Math.max(0, Math.round((p.ts - c.createdAt) / DAY))} day${Math.round((p.ts - c.createdAt) / DAY) === 1 ? '' : 's'} ago`;
    case 'newAccount': { const prev = c.accounts.filter((a) => a.id !== p.accountId && a.addedAt < accounts[p.accountId].addedAt).at(-1); return `${accLabel(accounts[p.accountId])}${prev ? `; earlier payments went to ${accLabel(prev)}` : ''}`; }
    case 'unverified': return `Added ${d.addedDaysAgo < 1 ? 'today' : Math.round(d.addedDaysAgo) === 1 ? 'yesterday' : Math.round(d.addedDaysAgo) + ' days ago'} via “${d.via}”, no callback on file`;
    case 'country': return `Destination moved from ${d.from} to ${d.to === 'XX' ? 'an onchain wallet' : d.to}`;
    case 'rail': return d.usual && d.usual !== p.rail ? `${railLabel(p.rail)}; this payee is usually paid by ${railLabel(d.usual)}` : `${railLabel(p.rail)} is rare for this kind of payee`;
    case 'initiator': return `${users[p.initiator].name} rarely pays ${c.name}`;
    case 'offHours': return `Initiated ${DOW[d.dow]} at ${when(p.ts).split(', ')[1]} ET`;
    default: return '';
  }
}
const ICON = { amount: 'ph-chart-line-up', timing: 'ph-clock-countdown', duplicate: 'ph-copy', velocity: 'ph-lightning', newPayee: 'ph-user-plus', newAccount: 'ph-bank', unverified: 'ph-phone-x', country: 'ph-globe-hemisphere-east', rail: 'ph-swap', initiator: 'ph-user-switch', offHours: 'ph-moon-stars' };

// ---------- queue ----------
function renderQueue() {
  const R = state.R; const q = D.queue.map((id) => pay[id]).sort((a, b) => R.scores[a.id].p - R.scores[b.id].p);
  const held = q.filter((p) => R.scores[p.id].held);
  $('qCount').textContent = q.length; $('navBadge').textContent = q.length;
  const B = state.B.rules;
  $('riskAlert').innerHTML = `<i class="ph ph-shield-check"></i><div><h3>Risk review <span class="tag tag--new">New</span></h3><p><b>${held.length} of ${q.length}</b> payments waiting for approval look unusual for their payee and are sorted to the top. Tuned so about <b>${Math.round(state.alpha * 100)}%</b> of normal payments get a second look. On your last three months it would have held <b>${B.model.caught} of ${state.B.nAttempts}</b> planted fraud attempts and <b>${B.model.held} of ${state.B.nLegit}</b> normal payments.</p></div><button class="btn btn--secondary" id="openPolicy">Review policy</button>`;
  $('openPolicy').onclick = () => { state.tab = 'policy'; renderBlade(); };
  const head = `<div class="tr th"><span class="cb"></span><span>Contact</span><span class="r">Amount</span><span>Initiated</span><span>Risk review</span></div>`;
  $('queue').innerHTML = head + q.map((p) => {
    const r = R.scores[p.id]; const c = contacts[p.contactId]; const a = accounts[p.accountId];
    const lvl = Math.min(1, Math.log10(r.oneIn) / 3);
    return `<div class="tr${state.sel === p.id ? ' is-sel' : ''}" data-id="${p.id}"><span class="cb"></span>
      <span class="who">${avatar(c.name)}<span style="min-width:0"><b>${c.name}</b><small>${railLabel(p.rail)} · ${a.country === 'XX' ? 'wallet' : '••' + a.last4} · ${users[p.initiator].name}</small></span></span>
      <span class="amt">${usd(p.amount)}</span><span class="td sec">${when(p.ts)}</span>
      <span class="risk">${r.held ? `<span class="tag tag--danger"><i class="ph-fill ph-warning"></i>${oneIn(r.p)}</span>` : `<span class="tag tag--neutral">${r.oneIn < 3 ? 'Typical' : oneIn(r.p)}</span>`}<span class="meter${r.held ? ' is-held' : ''}"><i style="width:${Math.max(4, lvl * 100)}%"></i></span></span></div>`;
  }).join('');
  if (!state.sel) state.sel = q[0].id;
}

// ---------- blade ----------
function histChart(p) {
  const ps = D.payments.filter((x) => x.contactId === p.contactId && x.ts < p.ts && x.status === 'done' && !(x.attack && state.R.scores[x.id].held));
  if (!ps.length) return `<p class="quiet">No earlier payments to this payee.</p>`;
  const W = 420, H = 120, L = 46, Rr = 8, T = 8, Bt = 18; const t0 = Math.min(...ps.map((x) => x.ts)), t1 = p.ts;
  const vals = [...ps.map((x) => x.amount), p.amount]; const lo = Math.log10(Math.min(...vals)) - 0.15, hi = Math.log10(Math.max(...vals)) + 0.15;
  const X = (t) => L + ((t - t0) / Math.max(1, t1 - t0)) * (W - L - Rr); const Y = (v) => T + (1 - (Math.log10(v) - lo) / (hi - lo)) * (H - T - Bt);
  const ticks = []; for (let e = Math.ceil(lo); e <= Math.floor(hi); e++) ticks.push(10 ** e); if (ticks.length < 2) ticks.push(10 ** ((lo + hi) / 2));
  const fmtK = (v) => (v >= 1e6 ? `$${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}k` : `$${Math.round(v)}`);
  const held = state.R.scores[p.id].held;
  return `<svg class="hist" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    ${ticks.map((v) => `<line x1="${L}" x2="${W - Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#54401014"/><text x="${L - 6}" y="${Y(v) + 3}" text-anchor="end">${fmtK(v)}</text>`).join('')}
    <text x="${L}" y="${H - 4}">${MON[et(t0).getUTCMonth()]}</text><text x="${W - Rr}" y="${H - 4}" text-anchor="end">Today</text>
    ${ps.map((x) => `<circle cx="${X(x.ts).toFixed(1)}" cy="${Y(x.amount).toFixed(1)}" r="3" fill="${x.accountId === p.accountId ? '#696762' : '#c2beb2'}"/>`).join('')}
    <circle cx="${X(p.ts)}" cy="${Y(p.amount)}" r="5" fill="${held ? '#be123c' : '#1a1a18'}" stroke="#fff" stroke-width="1.5"/></svg>
    <p class="quiet">${ps.length} earlier payments to this payee. Dark dots went to the same bank details as this one.</p>`;
}

function renderBlade() {
  const p = pay[state.sel]; const r = state.R.scores[p.id]; const c = contacts[p.contactId]; const a = accounts[p.accountId];
  const sigs = Object.entries(r.signals).filter(([, v]) => v < 0.05).sort((x, y) => x[1] - y[1]);
  const head = `<div class="blade__head"><div class="blade__top"><span class="t-label-sm">Payment</span><span><i class="ph ph-arrows-out-simple"></i>&nbsp;&nbsp;<i class="ph ph-x"></i></span></div>
    <div class="blade__who">${avatar(c.name)}<span class="t-label-md">${c.name}</span></div>
    <div class="blade__amt">${usd(p.amount)}</div>
    <div class="blade__tags"><span class="tag tag--warn"><i class="ph ph-hourglass-medium"></i>Needs approval</span><span class="tag tag--neutral">${railLabel(p.rail)}</span>${r.held ? `<span class="tag tag--danger"><i class="ph-fill ph-warning"></i>Held for review · ${oneIn(r.p)}</span>` : `<span class="tag tag--ok"><i class="ph ph-check"></i>Typical for this payee</span>`}</div>
    <div class="blade__btns"><button class="btn btn--danger btn--lg">Reject</button><button class="btn btn--brand btn--lg">${r.held ? 'Approve after callback' : 'Approve'}</button></div></div>
    <div class="btabs tabs" style="margin:0"><button class="tab${state.tab === 'payment' ? ' is-active' : ''}" data-tab="payment">Risk review</button><button class="tab${state.tab === 'details' ? ' is-active' : ''}" data-tab="details">Details</button><button class="tab${state.tab === 'policy' ? ' is-active' : ''}" data-tab="policy">Policy</button></div>`;
  let body = '';
  if (state.tab === 'payment') {
    body = `<section class="bsec"><div class="score"><b>${oneIn(r.p)}</b><span class="sec">for ${c.name}</span></div>
      <p class="quiet" style="margin:0 0 12px">How often a payment this unusual shows up among this customer's normal payments, combining ${Object.keys(SIGNALS).length} checks against this payee's own history. Review threshold: ${oneIn(state.R.tau)}.</p>
      ${sigs.length ? sigs.map(([k, v]) => `<div class="sig${v < 0.005 ? ' is-strong' : ''}"><i class="ph ${ICON[k]}"></i><div><b>${SIGNALS[k]}</b><span>${explain(p, k, r)}</span></div><em>${oneIn(v)}</em></div>`).join('') : `<p class="quiet">Nothing unusual: amount, timing, destination, method and initiator all match this payee's history.</p>`}
      ${r.held ? `<p class="quiet" style="margin-top:12px"><i class="ph ph-phone"></i> Suggested: confirm the bank details with ${c.name} at a number already on file before approving.</p>` : ''}</section>
      <section class="bsec"><h4>Payment history <span class="sec t-body-sm">log scale</span></h4>${histChart(p)}</section>`;
  } else if (state.tab === 'details') {
    const rows = [['To', c.name], ['Bank details', accLabel(a)], ['Added', `${when(a.addedAt)} by ${users[a.addedBy]?.name || 'Import'}`], ['Added via', a.via], ['Callback verified', a.verified ? 'Yes' : 'No'], ['Method', railLabel(p.rail)], ['Requested by', `${users[p.initiator].name}, ${users[p.initiator].role}`], ['Initiated', when(p.ts) + ' ET']];
    body = `<section class="bsec"><h4>Details</h4>${rows.map(([k, v]) => `<div class="row"><span>${k}</span><span>${v}</span></div>`).join('')}</section>
      <section class="bsec"><h4>Timeline</h4><ul class="tl"><li>Initiated<small>${users[p.initiator].name} · ${when(p.ts)}</small></li><li>${r.held ? 'Held by risk review' : 'Risk review: typical'}<small>${oneIn(r.p)} for this payee</small></li><li class="todo">Awaiting approval<small>Requires 2 approvers</small></li></ul></section>`;
  } else {
    const B = state.B; const m = B.rules.model, nc = B.rules.newOrChanged, am = B.rules.amount;
    const att = D.payments.filter((x) => x.attack && x.ts >= TEST_START && x.ts < TEST_END);
    const pct = (x) => (x * 100).toFixed(1) + '%';
    body = `<section class="bsec"><h4>Review policy</h4><label class="slider">Second look for <input type="range" id="alpha" min="1" max="10" step="0.5" value="${state.alpha * 100}"><b class="num" style="width:40px;text-align:right">${(state.alpha * 100).toFixed(1)}%</b></label>
      <p class="quiet">Share of normal payments sent for a second look. The threshold (${oneIn(state.R.tau)}) is set on Jun-Jul so that a new normal payment crosses it at most this often, then tested on Aug-Oct.</p>
      <div class="policy-kpis"><div class="kpi"><small>Normal held</small><b>${pct(m.holdRate)}</b><small>${m.held} of ${B.nLegit}</small></div><div class="kpi"><small>Attempts held</small><b>${m.caught} of ${B.nAttempts}</b><small>Aug-Oct backtest</small></div><div class="kpi"><small>Held today</small><b>${D.queue.filter((id) => state.R.scores[id].held).length} of ${D.queue.length}</b><small>Needs approval</small></div></div>
      <table class="cmp"><tr><th>Rule</th><th>Normal held</th><th>Attempts held</th></tr>
        <tr class="mine"><td>Risk review</td><td>${pct(m.holdRate)}</td><td>${m.caught} of ${B.nAttempts}</td></tr>
        <tr><td>New or changed bank details</td><td>${pct(nc.holdRate)}</td><td>${nc.caught} of ${B.nAttempts}</td></tr>
        <tr><td>Amount ≥ $250,000</td><td>${pct(am.holdRate)}</td><td>${am.caught} of ${B.nAttempts}</td></tr></table></section>
      <section class="bsec"><h4>Backtest attempts <span class="sec t-body-sm">planted, synthetic</span></h4>${[...new Map(att.map((x) => [x.attack + x.contactId, x])).values()].map((x) => { const rr = state.R.scores[x.id]; return `<div class="row"><span>${x.attack}<br><small class="sec">${contacts[x.contactId].name} · ${usd0(x.amount)}</small></span><span>${rr.held ? `<span class="tag tag--danger">Held · ${oneIn(rr.p)}</span>` : `<span class="tag tag--neutral">Missed · ${oneIn(rr.p)}</span>`}</span></div>`; }).join('')}</section>`;
  }
  $('blade').innerHTML = head + body;
  $('blade').querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { state.tab = b.dataset.tab; renderBlade(); }));
  const al = document.getElementById('alpha'); if (al) al.oninput = (e) => { state.alpha = Number(e.target.value) / 100; run(); renderQueue(); renderBlade(); };
}

$('queue').addEventListener('click', (e) => { const r = e.target.closest('.tr[data-id]'); if (!r) return; state.sel = r.dataset.id; if (state.tab === 'policy') state.tab = 'payment'; renderQueue(); renderBlade(); });

run();
const hash = new URLSearchParams(location.hash.slice(1));
renderQueue();
if (hash.get('tab')) state.tab = hash.get('tab');
renderBlade();
window.__erebor = { D, state };
