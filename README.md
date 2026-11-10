# Payment Risk Review for Erebor (concept)

**Live demo:** https://mohith26.github.io/erebor-payment-risk-review/

An imagined addition to the Payments page in Erebor's business app. Every payment waiting in **Needs approval** gets a calibrated "1 in N" score for how unusual it is *for that payee*, with plain-language reasons (new bank details added yesterday by emailed request, same amount as a payment 3 days ago, Sunday 10 PM, 6× the usual bill). Payments past a threshold are held for a second look, and the threshold is set so a chosen share of normal payments (default 3%) gets one.

*Unofficial concept demo by Mohith Gajjela. Not affiliated with Erebor. Synthetic data: Corvid Robotics, its 40 payees and 592 payments are fictional.*

## Why

Erebor's customers (defense, AI, energy, robotics, manufacturing) move large sums to a long tail of suppliers by wire, ACH, FedNow, SWIFT and stablecoin rails. The expensive frauds against companies like that rarely look like big numbers. They look like a normal invoice paid to new bank details, a duplicate invoice, or a new payee just under the approval limit. Dual control helps only if the approver knows *what* to look at. A rule like "hold anything over $250k" holds a lot of normal payments and misses most of these.

## What the demo shows

- **Payments > Needs approval** for a fictional customer, 12 payments, sorted by risk. Two are planted attacks (a castings supplier whose remittance details were changed by email four days ago, and a brand-new payee paid $99,400 on a Sunday night). Both are held; the other ten read as typical.
- **Blade > Risk review:** the score, each signal that fired with its own "1 in N", and the payee's payment history (log scale) with the current payment marked.
- **Blade > Policy:** a slider for the review share. Moving it recomputes the threshold and the Aug-Oct backtest live, next to two simple rules.

Default seed, Aug-Oct backtest (218 normal payments, 8 planted attempts):

| Rule | Normal payments held | Attempts held |
|---|---|---|
| **Risk review (3% target)** | **1.8% (4)** | **8 of 8** |
| New or changed bank details | 2.3% (5) | 6 of 8 |
| Amount ≥ $250,000 | 12.4% (27) | 3 of 8 |

## How it works (`core/risk.js`)

Payments are scored in time order using only history strictly before each one (there is a test for this).

Eleven signals, each a tail probability under "normal for this payee":
- **Amount:** log-amount with a Normal-Inverse-Gamma posterior per payee, shrunk toward its category (empirical Bayes), upper tail of the Student-t predictive.
- **Timing:** same model on the log gap since the last payment, lower tail.
- **Duplicate** (same amount within 10 days), **velocity** (Poisson tail for several payments to one payee in 24h), **new payee**, **first payment to these bank details**, **recently added and not callback-verified**, **destination country changed**, **off-hours**: smoothed historical rates of each event.
- **Rail** and **initiator:** Dirichlet-multinomial predictive per payee with category / global priors, discrete tail.

Signals are combined with the **harmonic mean p-value** (Wilson 2019), which is robust to dependence between signals and is driven by the strongest evidence. The hold threshold is a **split-conformal** quantile of scores on a calibration window (Jun-Jul), so a new normal payment crosses it with probability at most the chosen share, then everything is evaluated on Aug-Oct. Held attempts are treated as rejected and never enter the payee's history.

## Tests and benchmarks

```
npm test                 # node --test, 8 tests
node scripts/bench.js 30 # 30 re-generated customers
node scripts/report.js   # the numbers the page shows
```

Across 30 seeds (6,830 normal payments, 235 planted attempts): risk review held **2.7%** of normal payments (target 3%) and **99.6%** of attempts. New-or-changed-bank-details rule: 2.2% and 76.6%. Amount ≥ $250k: 11.6% and 28.1%. Today's queue across seeds: 60/60 attacks held, 18/300 normal payments held.

Ablation without the "added recently, not callback-verified" signal (the strongest single input): **92.3%** of attempts held at the same review share, and only 32/60 of the queue attacks. Verification status matters a lot, which is itself a useful finding.

## Honest limitations

- Synthetic data, one fictional customer, and I wrote the attacks, so the attack mix is mine. Real fraud adapts to whatever is checked.
- The verification flag carries a lot of weight; it assumes the bank knows whether new bank details were confirmed by callback.
- Calibration assumes Jun-Jul normal payments look like future ones (exchangeability). Seasonality, a new product line or an acquisition would shift it; the threshold should be re-fit on a rolling window.
- No cross-customer signals (e.g. the same beneficiary account appearing at several Erebor customers), which would be the most powerful thing a bank could add and is not something a single customer can see.
- Not a sanctions, AML or KYC tool.

## Novelty note

I checked Erebor's public app bundle (routes and UI strings for Payments, Approvals, Authorization rules, Limits), its public pages and press: approvals with quorums, dual control and authorization rules exist; I found no per-payment risk scoring or explanations. Rule-based controls exist elsewhere in the ecosystem (BOB, a fintech built on Erebor, lists velocity rules, trusted recipients and cooling-off periods; Bill.com has dual control for bank-detail changes; Trustpair and Eftsure verify vendor bank details). What this adds: per-payee statistical baselines, a calibrated review share instead of hand-set thresholds, and per-signal reasons an approver can act on.

## Run locally

Any static server, e.g. `python3 -m http.server`, then open `http://localhost:8000`. `#tab=policy` opens the policy view.
