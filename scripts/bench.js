// Re-generate the synthetic customer under many seeds (amounts, timing, banks, queue all change; the kinds of
// planted attacks stay the same) and score the evaluation window. Also runs an ablation without the
// "recently added, not callback-verified" signal, which is the strongest single input.
// Usage: node scripts/bench.js [seeds]
import { makeData, CAL_START, TEST_START, TODAY, DAY } from '../core/gen.js';
import { scoreAll, backtest } from '../core/risk.js';

export function bench(n = 30, alpha = 0.03) {
  const agg = (useVerification) => {
    const r = { model: [0, 0, 0], amount: [0, 0, 0], newOrChanged: [0, 0, 0] }; let legit = 0, att = 0, queueCaught = 0, queueAtt = 0, queueFalse = 0, queueLegit = 0;
    for (let s = 1; s <= n; s++) {
      const D = makeData(1000 + s); const R = scoreAll(D, { alpha, calStart: CAL_START, testStart: TEST_START, useVerification });
      const B = backtest(D, R, { testStart: TEST_START, testEnd: TODAY - 2 * DAY });
      legit += B.nLegit; att += B.nAttempts;
      for (const k of Object.keys(r)) { r[k][0] += B.rules[k].held; r[k][1] += B.rules[k].caught; }
      for (const id of D.queue) { const p = D.payments.find((x) => x.id === id); if (p.attack) { queueAtt++; if (R.scores[id].held) queueCaught++; } else { queueLegit++; if (R.scores[id].held) queueFalse++; } }
    }
    const out = { seeds: n, alpha, legitPayments: legit, attempts: att };
    for (const k of Object.keys(r)) out[k] = { holdRate: +(r[k][0] / legit).toFixed(4), caught: +(r[k][1] / att).toFixed(3) };
    out.queue = { attacksHeld: `${queueCaught}/${queueAtt}`, normalHeld: `${queueFalse}/${queueLegit}` };
    return out;
  };
  return { full: agg(true), withoutVerificationSignal: agg(false) };
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(bench(Number(process.argv[2] || 30)), null, 1));
