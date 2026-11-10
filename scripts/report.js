// Prints the numbers the page shows for the default seed (keeps README and email honest).
import { makeData, CAL_START, TEST_START, TODAY, DAY } from '../core/gen.js';
import { scoreAll, backtest } from '../core/risk.js';
const D = makeData(); const R = scoreAll(D, { alpha: 0.03, calStart: CAL_START, testStart: TEST_START });
const B = backtest(D, R, { testStart: TEST_START, testEnd: TODAY - 2 * DAY });
const q = D.queue.map((id) => { const p = D.payments.find((x) => x.id === id); return { payee: D.contacts.find((c) => c.id === p.contactId).name, amount: p.amount, oneIn: Math.round(1 / R.scores[id].p), held: R.scores[id].held, attack: p.attack }; }).sort((a, b) => b.oneIn - a.oneIn);
console.log(JSON.stringify({ payments: D.payments.length, payees: D.contacts.length, threshold_oneIn: Math.round(1 / R.tau), calibrationN: R.calN, backtest: B, queue: q }, null, 1));
