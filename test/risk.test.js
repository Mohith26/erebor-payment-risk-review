import test from 'node:test';
import assert from 'node:assert/strict';
import { makeData, SEED, CAL_START, TEST_START, TODAY, DAY } from '../core/gen.js';
import { scoreAll, backtest, tUpper, harmonicCombine, conformalTau, SIGNALS } from '../core/risk.js';
import { bench } from '../scripts/bench.js';

const D = makeData();
const R = scoreAll(D, { alpha: 0.03, calStart: CAL_START, testStart: TEST_START });

test('generator is deterministic and plausible', () => {
  const a = makeData(SEED), b = makeData(SEED), c = makeData(SEED + 1);
  assert.deepEqual(a.payments.slice(0, 20), b.payments.slice(0, 20));
  assert.notDeepEqual(a.payments.slice(0, 20).map((p) => p.amount), c.payments.slice(0, 20).map((p) => p.amount));
  assert.ok(D.payments.length > 400 && D.payments.length < 900);
  assert.equal(D.queue.length, 12);
  assert.equal(D.queue.filter((id) => D.payments.find((p) => p.id === id).attack).length, 2);
});

test('Student-t tail matches known values', () => {
  assert.ok(Math.abs(tUpper(0, 7) - 0.5) < 1e-12);
  assert.ok(Math.abs(tUpper(2.0, 10) - 0.036694) < 2e-5);
  assert.ok(Math.abs(tUpper(-1.5, 4) - (1 - 0.104)) < 1e-3);
});

test('harmonic mean combination: one strong signal dominates, quiet signals stay quiet', () => {
  assert.equal(harmonicCombine([1, 1, 1], 3), 1);
  const p = harmonicCombine([1e-4, 1, 1, 1], 4); assert.ok(p < 5e-4 && p > 1e-4);
  assert.ok(harmonicCombine([0.01, 0.01], 2) < harmonicCombine([0.01, 1], 2));
});

test('conformal threshold: a new exchangeable score falls below it with probability <= alpha', () => {
  const cal = Array.from({ length: 199 }, (_, i) => (i + 1) / 200);
  const tau = conformalTau(cal, 0.05); assert.ok(cal.filter((p) => p <= tau).length / (cal.length + 1) <= 0.05 + 1e-9);
});

test('scores only use the past: changing a later payment never changes an earlier score', () => {
  const D2 = makeData(); const last = D2.payments.at(-30); last.amount *= 50;
  const R2 = scoreAll(D2, { alpha: 0.03, calStart: CAL_START, testStart: TEST_START });
  for (const p of D2.payments) { if (p.ts >= last.ts) break; assert.equal(R2.scores[p.id].p, R.scores[p.id].p); }
});

test('backtest on the default customer: every planted attempt held at a ~3% review rate', () => {
  const B = backtest(D, R, { testStart: TEST_START, testEnd: TODAY - 2 * DAY });
  assert.equal(B.rules.model.caught, B.nAttempts);
  assert.ok(B.rules.model.holdRate <= 0.05, `hold rate ${B.rules.model.holdRate}`);
  assert.ok(B.rules.newOrChanged.caught < B.nAttempts, 'new-or-changed-payee rule misses the duplicate and the inflated bill');
  assert.ok(B.rules.amount.holdRate > B.rules.model.holdRate * 3);
});

test("today's queue: both attacks held with readable reasons", () => {
  for (const id of D.queue) {
    const p = D.payments.find((x) => x.id === id); const r = R.scores[id];
    if (p.attack) { assert.ok(r.held, p.attack); assert.ok(Object.keys(r.signals).some((k) => r.signals[k] < 0.02 && SIGNALS[k])); }
  }
  assert.ok(D.queue.filter((id) => R.scores[id].held).length <= 4);
});

test('across 10 seeds the realised hold rate tracks the 3% target and catch rate stays high', () => {
  const b = bench(10).full; assert.ok(b.model.holdRate > 0.015 && b.model.holdRate < 0.05, JSON.stringify(b.model)); assert.ok(b.model.caught >= 0.95);
});
