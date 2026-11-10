// Seeded synthetic payment history for one fictional Erebor business customer (a robotics / defense hardware
// company). Eight months of outgoing payments, a handful of legitimate bank-detail changes, planted fraud
// attempts in the evaluation window, and today's "Needs approval" queue. Not Erebor data; all names fictional.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function gauss(rng) { let u = 0; while (u === 0) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); }

export const SEED = 20261110;
export const DAY = 86400000;
export const START = Date.UTC(2026, 2, 2); // Mon 2 Mar 2026, first month at Erebor
export const CAL_START = Date.UTC(2026, 5, 1); // calibration window Jun-Jul
export const TEST_START = Date.UTC(2026, 7, 1); // evaluation window Aug-Oct
export const TODAY = Date.UTC(2026, 10, 10, 15, 0); // Tue 10 Nov 2026, 10:00 ET

export const CUSTOMER = { name: 'Corvid Robotics', legal: 'Corvid Robotics, Inc.' };
export const USERS = [
  { id: 'u1', name: 'Maya Chen', role: 'Controller', share: 0.42 },
  { id: 'u2', name: 'Devin Ortiz', role: 'AP specialist', share: 0.4 },
  { id: 'u3', name: 'Priya Natarajan', role: 'CFO', share: 0.08 },
  { id: 'u4', name: 'NetSuite sync', role: 'Integration', share: 0.1 },
];

// category: cadence (days, null = irregular rate per week), amount (median, log-sd), rails, trend per month
const C = (name, cat, o) => ({ name, cat, ...o });
export const CONTACT_SPECS = [
  C('Ridgeline Payroll', 'payroll', { every: 14, med: 1180000, sd: 0.03, rails: { ACH: 1 }, trend: 0.012, users: ['u1'] }),
  C('Ridgeline Payroll Taxes', 'tax', { every: 14, med: 402000, sd: 0.04, rails: { ACH: 1 }, trend: 0.012, users: ['u1'] }),
  C('Arcwell Compute', 'cloud', { every: 30, med: 612000, sd: 0.12, rails: { Wire: 1 }, trend: 0.03, users: ['u1', 'u3'] }),
  C('Stratus Cloud Services', 'cloud', { every: 30, med: 148000, sd: 0.1, rails: { ACH: 1 }, trend: 0.02, users: ['u2'] }),
  C('Halden Precision Machining', 'mfg', { perWeek: 1.4, med: 186000, sd: 0.45, rails: { Wire: 0.85, ACH: 0.15 }, users: ['u2', 'u1'] }),
  C('Tri-County Castings', 'mfg', { perWeek: 0.8, med: 94000, sd: 0.5, rails: { Wire: 0.6, ACH: 0.4 }, users: ['u2'] }),
  C('Shenzhen Lianfa Motors', 'intl', { perWeek: 0.5, med: 228000, sd: 0.4, rails: { SWIFT: 0.75, USDC: 0.25 }, users: ['u1'] }),
  C('Kaohsiung Sensor Works', 'intl', { perWeek: 0.35, med: 141000, sd: 0.45, rails: { SWIFT: 1 }, users: ['u1'] }),
  C('Bremen Antriebstechnik', 'intl', { perWeek: 0.25, med: 96000, sd: 0.35, rails: { SWIFT: 1 }, users: ['u1'] }),
  C('Apex Harness & Cable', 'components', { perWeek: 1.6, med: 24000, sd: 0.6, rails: { ACH: 0.9, Wire: 0.1 }, users: ['u2', 'u4'] }),
  C('Midwest Fastener Supply', 'components', { perWeek: 2.2, med: 6800, sd: 0.7, rails: { ACH: 1 }, users: ['u4', 'u2'] }),
  C('Lakeshore Electronics', 'components', { perWeek: 1.3, med: 31000, sd: 0.55, rails: { ACH: 0.85, Wire: 0.15 }, users: ['u2', 'u4'] }),
  C('Brightline Batteries', 'components', { perWeek: 0.7, med: 72000, sd: 0.5, rails: { Wire: 0.7, ACH: 0.3 }, users: ['u2'] }),
  C('Ohio Valley Power & Light', 'utility', { every: 30, med: 58000, sd: 0.18, rails: { ACH: 1 }, users: ['u4'] }),
  C('Columbus Water Works', 'utility', { every: 30, med: 4200, sd: 0.15, rails: { ACH: 1 }, users: ['u4'] }),
  C('Neil Avenue Properties', 'rent', { every: 30, med: 96500, sd: 0.0, rails: { ACH: 1 }, users: ['u1'] }),
  C('Hartwell & Sloane LLP', 'legal', { perWeek: 0.45, med: 38000, sd: 0.6, rails: { Wire: 0.6, ACH: 0.4 }, users: ['u1', 'u3'] }),
  C('Brenner Patent Group', 'legal', { perWeek: 0.25, med: 21000, sd: 0.5, rails: { ACH: 1 }, users: ['u1'] }),
  C('Kline Audit Partners', 'professional', { perWeek: 0.15, med: 64000, sd: 0.3, rails: { Wire: 1 }, users: ['u3'] }),
  C('Atlas Freight Forwarding', 'logistics', { perWeek: 1.0, med: 17500, sd: 0.55, rails: { ACH: 1 }, users: ['u2', 'u4'] }),
  C('Granite Insurance Brokers', 'insurance', { every: 91, med: 212000, sd: 0.05, rails: { Wire: 1 }, users: ['u3'] }),
  C('Figma', 'saas', { every: 30, med: 3600, sd: 0.0, rails: { ACH: 1 }, users: ['u4'] }),
  C('Onshape', 'saas', { every: 30, med: 9200, sd: 0.0, rails: { ACH: 1 }, users: ['u4'] }),
  C('Rippling Benefits Admin', 'saas', { every: 30, med: 14800, sd: 0.03, rails: { ACH: 1 }, users: ['u4'] }),
  C('Ansys Simulation', 'saas', { every: 30, med: 22500, sd: 0.0, rails: { ACH: 1 }, users: ['u4'] }),
  C('Slack', 'saas', { every: 30, med: 2900, sd: 0.02, rails: { ACH: 1 }, users: ['u4'] }),
  C('T. Alvarez (contract firmware)', 'contractor', { every: 30, med: 18500, sd: 0.0, rails: { ACH: 1 }, users: ['u2'] }),
  C('R. Okafor (contract test eng.)', 'contractor', { every: 30, med: 14200, sd: 0.0, rails: { ACH: 1 }, users: ['u2'] }),
  C('J. Lindqvist (contract design)', 'contractor', { every: 30, med: 16000, sd: 0.04, rails: { ACH: 1 }, users: ['u2'] }),
  C('Defense Logistics Agency fees', 'gov', { perWeek: 0.12, med: 8800, sd: 0.4, rails: { FedNow: 1 }, users: ['u1'] }),
  C('Pinecrest Test Range', 'services', { perWeek: 0.3, med: 46000, sd: 0.4, rails: { Wire: 0.5, ACH: 0.5 }, users: ['u1', 'u2'] }),
  C('Cleanroom Supply Co.', 'components', { perWeek: 0.6, med: 9800, sd: 0.5, rails: { ACH: 1 }, users: ['u4'] }),
];

const BANKS = { US: ['JPMorgan Chase', 'Huntington National Bank', 'Fifth Third Bank', 'PNC Bank', 'KeyBank', 'Wells Fargo', 'Bank of America', 'Citizens Bank'], CN: ['Bank of China (Shenzhen)', 'China Merchants Bank'], TW: ['Cathay United Bank'], DE: ['Commerzbank Bremen'] };
const COUNTRY = (cat, name) => (cat === 'intl' ? (name.includes('Shenzhen') ? 'CN' : name.includes('Kaohsiung') ? 'TW' : 'DE') : 'US');

function pick(rng, obj) { const r = rng(); let c = 0; for (const [k, w] of Object.entries(obj)) { c += w; if (r <= c) return k; } return Object.keys(obj).at(-1); }
function businessHour(rng, ts) { // shift a date to a weekday business hour (ET ~ UTC-5)
  let d = new Date(ts); while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d = new Date(d.getTime() + DAY);
  const h = 13 + Math.floor(rng() * 9); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, Math.floor(rng() * 60));
}

export function makeData(seed = SEED) {
  const rng = mulberry32(seed);
  let accSeq = 0;
  const contacts = CONTACT_SPECS.map((s, i) => {
    const country = COUNTRY(s.cat, s.name);
    const bank = BANKS[country][Math.floor(rng() * BANKS[country].length)];
    return { id: `c${i + 1}`, name: s.name, cat: s.cat, country, createdAt: START - Math.floor(30 + rng() * 300) * DAY, accounts: [{ id: `a${++accSeq}`, bank, country, last4: String(1000 + Math.floor(rng() * 9000)), addedAt: START - 40 * DAY, addedBy: 'u1', via: 'Onboarding import', verified: true }], spec: s };
  });
  const payments = []; let pSeq = 0;
  const pay = (c, ts, amount, rail, user, extra = {}) => payments.push({ id: `p${++pSeq}`, ts, contactId: c.id, accountId: (extra.account || c.accounts.at(-1)).id, amount: Math.round(amount * 100) / 100, rail, initiator: user, attack: extra.attack || null, status: ts >= TODAY - DAY ? 'needs_approval' : 'done' });
  const END = TODAY - 2 * DAY;

  // legitimate bank-detail changes (verified by callback) partway through
  const legitChanges = [['Tri-County Castings', Date.UTC(2026, 4, 12)], ['Atlas Freight Forwarding', Date.UTC(2026, 6, 20)], ['Hartwell & Sloane LLP', Date.UTC(2026, 8, 30)], ['Lakeshore Electronics', Date.UTC(2026, 7, 18)], ['Cleanroom Supply Co.', Date.UTC(2026, 9, 6)]];
  const changeAt = {};
  for (const [name, ts] of legitChanges) { const c = contacts.find((x) => x.name === name); const bank = BANKS.US.filter((b) => b !== c.accounts[0].bank)[Math.floor(rng() * 7)]; changeAt[c.id] = { ts, acc: { id: `a${++accSeq}`, bank, country: 'US', last4: String(1000 + Math.floor(rng() * 9000)), addedAt: ts, addedBy: 'u1', via: 'Vendor portal, callback verified', verified: true } }; }

  for (const c of contacts) {
    const s = c.spec; const accFor = (ts) => (changeAt[c.id] && ts >= changeAt[c.id].ts ? changeAt[c.id].acc : c.accounts[0]);
    const amt = (ts) => s.med * Math.exp((s.trend || 0) * ((ts - START) / (30 * DAY))) * Math.exp(s.sd * gauss(rng));
    const user = () => s.users[Math.floor(rng() * s.users.length)];
    if (s.every) {
      let t = START + Math.floor(rng() * s.every) * DAY;
      while (t < END) { const ts = businessHour(rng, t + Math.round(gauss(rng) * (s.every >= 30 ? 1.2 : 0.3)) * DAY); pay(c, ts, amt(ts), pick(rng, s.rails), user(), { account: accFor(ts) }); t += s.every * DAY; }
    } else {
      for (let t = START; t < END; t += DAY) { if (rng() < s.perWeek / 5 && new Date(t).getUTCDay() % 6 !== 0) { const ts = businessHour(rng, t); pay(c, ts, amt(ts), pick(rng, s.rails), user(), { account: accFor(ts) }); } }
    }
    if (changeAt[c.id]) c.accounts.push(changeAt[c.id].acc);
  }

  // occasional legitimate new vendors
  const newVendors = [['Vantage Calibration Labs', 'services', Date.UTC(2026, 3, 14), 12400, 'ACH'], ['Summit Composite Tooling', 'mfg', Date.UTC(2026, 5, 9), 88000, 'Wire'], ['Keystone Safety Training', 'services', Date.UTC(2026, 6, 28), 6200, 'ACH'], ['Prairie Thermal Systems', 'components', Date.UTC(2026, 8, 3), 41500, 'ACH'], ['Bluewater Metrology', 'services', Date.UTC(2026, 9, 14), 19800, 'ACH']];
  for (const [name, cat, ts, a, rail] of newVendors) {
    const c = { id: `c${contacts.length + 1}`, name, cat, country: 'US', createdAt: ts - 3 * DAY, accounts: [{ id: `a${++accSeq}`, bank: BANKS.US[Math.floor(rng() * 8)], country: 'US', last4: String(1000 + Math.floor(rng() * 9000)), addedAt: ts - 3 * DAY, addedBy: 'u2', via: 'W-9 + callback verified', verified: true }], spec: null };
    contacts.push(c); pay(c, businessHour(rng, ts), a, rail, 'u2');
    if (rng() < 0.7) { const t2 = ts + 21 * DAY; if (t2 < END) pay(c, businessHour(rng, t2), a * Math.exp(0.3 * gauss(rng)), rail, 'u2'); }
  }

  // ---- planted fraud attempts (evaluation window Aug-Oct, plus two in today's queue) ----
  const byName = (n) => contacts.find((c) => c.name === n);
  const lastAmt = (c) => { const ps = payments.filter((p) => p.contactId === c.id && !p.attack).sort((a, b) => a.ts - b.ts); return ps.at(-1).amount; };
  const swapAccount = (c, ts, bank, country, via, by) => { const acc = { id: `a${++accSeq}`, bank, country, last4: String(1000 + Math.floor(rng() * 9000)), addedAt: ts, addedBy: by, via, verified: false }; c.accounts.push(acc); return acc; };
  const ATT = [];
  const plant = (label, fn) => { const before = payments.length; fn(); for (let k = before; k < payments.length; k++) { payments[k].attack = label; } ATT.push(label); };

  plant('Vendor bank-detail swap, normal invoice amount', () => { const c = byName('Halden Precision Machining'); const ts = Date.UTC(2026, 7, 19, 15, 10); const acc = swapAccount(c, ts - 2 * DAY, 'Metropolitan Commercial Bank', 'US', 'Emailed remittance change', 'u2'); pay(c, ts, lastAmt(c) * 1.04, 'Wire', 'u2', { account: acc }); });
  plant('Invoice redirect to a foreign account', () => { const c = byName('Arcwell Compute'); const ts = Date.UTC(2026, 8, 8, 16, 0); const acc = swapAccount(c, ts - 1 * DAY, 'DBS Bank (Singapore)', 'SG', 'Emailed remittance change', 'u1'); pay(c, ts, lastAmt(c), 'SWIFT', 'u1', { account: acc }); });
  plant('New payee just under the approval threshold, Sunday night', () => { const c = { id: `c${contacts.length + 1}`, name: 'Kestrel Logistics Group', cat: 'logistics', country: 'US', createdAt: Date.UTC(2026, 8, 20, 3), accounts: [], spec: null }; contacts.push(c); const acc = swapAccount(c, Date.UTC(2026, 8, 20, 3), 'Evolve Bank & Trust', 'US', 'Added in app', 'u2'); pay(c, Date.UTC(2026, 8, 20, 3, 40), 248500, 'Wire', 'u2', { account: acc }); });
  plant('Contractor payroll diversion', () => { const c = byName('R. Okafor (contract test eng.)'); const ts = Date.UTC(2026, 9, 1, 18, 20); const acc = swapAccount(c, ts - 3 * DAY, 'Green Dot Bank', 'US', 'Emailed direct-deposit change', 'u2'); pay(c, ts, lastAmt(c), 'ACH', 'u2', { account: acc }); });
  plant('Duplicate invoice payment', () => { const c = byName('Hartwell & Sloane LLP'); const prev = payments.filter((p) => p.contactId === c.id && p.ts < Date.UTC(2026, 7, 25)).at(-1); pay(c, prev.ts + 3 * DAY, prev.amount, prev.rail, 'u2', { account: contacts.find((x) => x.id === c.id).accounts.find((a) => a.id === prev.accountId) }); });
  plant('SaaS vendor asks for USDC to a new wallet', () => { const c = byName('Ansys Simulation'); const ts = Date.UTC(2026, 8, 24, 17, 5); const acc = swapAccount(c, ts - 1 * DAY, 'USDC wallet 0x7f3a…c91e (Base)', 'XX', 'Emailed payment-method change', 'u4'); pay(c, ts, lastAmt(c), 'USDC', 'u4', { account: acc }); });
  plant('Split payments under a $100k limit to a new payee', () => { const c = { id: `c${contacts.length + 1}`, name: 'Northgate Industrial Supply', cat: 'components', country: 'US', createdAt: Date.UTC(2026, 9, 21, 14), accounts: [], spec: null }; contacts.push(c); const acc = swapAccount(c, Date.UTC(2026, 9, 21, 14), 'Choice Financial Group', 'US', 'Added in app', 'u4'); for (const [h, a] of [[15, 96500], [16, 97200], [19, 95800]]) pay(c, Date.UTC(2026, 9, 21, h, 5), a, 'ACH', 'u4', { account: acc }); });
  plant('Utility bill inflated 6x', () => { const c = byName('Ohio Valley Power & Light'); const ts = Date.UTC(2026, 9, 27, 16, 0); pay(c, ts, lastAmt(c) * 6.1, 'ACH', 'u4'); });

  // ---- today's Needs approval queue ----
  const q = [];
  const qpay = (c, amount, rail, user, h, extra = {}) => { pay(c, Date.UTC(2026, 10, 10, h, Math.floor(rng() * 50)), amount, rail, user, extra); q.push(payments.at(-1)); };
  const typical = (name) => { const c = byName(name); const ps = payments.filter((p) => p.contactId === c.id && !p.attack); const xs = ps.slice(-6).map((p) => p.amount).sort((a, b) => a - b); return [c, xs[xs.length >> 1], ps.at(-1).rail, c.accounts.find((a) => a.id === ps.at(-1).accountId)]; };
  for (const name of ['Arcwell Compute', 'Brightline Batteries', 'Apex Harness & Cable', 'Shenzhen Lianfa Motors', 'Pinecrest Test Range', 'Atlas Freight Forwarding', 'Lakeshore Electronics', 'Brenner Patent Group', 'Kaohsiung Sensor Works']) {
    const [c, med, rail, acc] = typical(name); qpay(c, med * (rng() < 0.5 ? 0.93 - 0.12 * rng() : 1.04 + 0.14 * rng()), rail, c.spec.users[0], 13 + Math.floor(rng() * 3), { account: acc });
  }
  { const [c, med, , acc] = typical('Hartwell & Sloane LLP'); qpay(c, med * 1.1, 'Wire', 'u1', 14, { account: acc }); } // legit, account changed 6 weeks ago (verified)
  { const c = byName('Tri-County Castings'); const acc = swapAccount(c, Date.UTC(2026, 10, 6, 21), 'Pathward, N.A.', 'US', 'Emailed remittance change', 'u2'); const med = typical('Tri-County Castings')[1]; qpay(c, med, 'Wire', 'u2', 15, { account: acc, attack: 'Vendor bank-detail swap, normal invoice amount' }); }
  { const c = { id: `c${contacts.length + 1}`, name: 'Halberd Systems LLC', cat: 'services', country: 'US', createdAt: Date.UTC(2026, 10, 8, 2), accounts: [], spec: null }; contacts.push(c); const acc = swapAccount(c, Date.UTC(2026, 10, 8, 2), 'Lead Bank', 'US', 'Added in app', 'u2'); pay(c, Date.UTC(2026, 10, 9, 3, 12), 99400, 'Wire', 'u2', { account: acc, attack: 'New payee just under the approval threshold, Sunday night' }); payments.at(-1).status = 'needs_approval'; q.push(payments.at(-1)); }
  for (const p of q) if (p.attack) ATT.push(p.attack);

  payments.sort((a, b) => a.ts - b.ts);
  for (const c of contacts) delete c.spec;
  return { customer: CUSTOMER, users: USERS, contacts, payments, attacks: ATT, queue: q.map((p) => p.id) };
}
