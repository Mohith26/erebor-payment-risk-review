// Writes the seeded synthetic history to data/payments.csv and data/payees.csv for inspection outside the app.
import { writeFileSync } from 'node:fs';
import { makeData } from '../core/gen.js';
const D = makeData(); const acc = {}; D.contacts.forEach((c) => c.accounts.forEach((a) => (acc[a.id] = a)));
const esc = (v) => (/[",]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
const pay = [['id', 'initiated_utc', 'payee_id', 'amount_usd', 'rail', 'initiator', 'bank', 'account_last4', 'status', 'planted_attack'], ...D.payments.map((p) => [p.id, new Date(p.ts).toISOString(), p.contactId, p.amount.toFixed(2), p.rail, p.initiator, acc[p.accountId].bank, acc[p.accountId].last4, p.status, p.attack || ''])];
writeFileSync(new URL('../data/payments.csv', import.meta.url), pay.map((r) => r.map(esc).join(',')).join('\n') + '\n');
const pe = [['id', 'name', 'category', 'country', 'created_utc', 'accounts'], ...D.contacts.map((c) => [c.id, c.name, c.cat, c.country, new Date(c.createdAt).toISOString(), c.accounts.map((a) => `${a.bank} ${a.last4} (${a.via}${a.verified ? ', verified' : ''})`).join(' | ')])];
writeFileSync(new URL('../data/payees.csv', import.meta.url), pe.map((r) => r.map(esc).join(',')).join('\n') + '\n');
console.log(`wrote ${D.payments.length} payments, ${D.contacts.length} payees`);
