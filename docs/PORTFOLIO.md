# Portfolio talking points

## Resume bullets

- Built and deployed a full-stack Premier League analytics platform combining player valuation, similarity scouting, and calibrated match forecasting with React, Next.js, TypeScript, Python, and Cloudflare Workers.
- Engineered reproducible pipelines over CC0 football data; trained a 12-feature log-target ridge model on 414 players that achieved 0.61 held-out R² and approximately €9.9M MAE.
- Prevented temporal leakage in a 5,185-match forecasting pipeline with season-ordered train/calibration/test splits, sequential Elo, rolling-form features, and temperature-scaled probabilities.
- Designed typed edge APIs, versioned model artifacts, input validation, graceful persistence fallback, automated artifact checks, and CI-backed production builds.

## 60-second demo

1. Start on valuation and explain that this is a deployed ML product, not a notebook.
2. Change a striker's age or goal output and point out the estimate, range, and held-out metrics.
3. Open scouting, select a player, apply an age/value constraint, and explain standardized nearest-neighbour retrieval.
4. Open match lab, choose two teams, and show calibrated probabilities plus the factors driving the result.
5. Close with the architecture: reproducible Python training produces versioned artifacts consumed by TypeScript edge routes.

## Honest limitations to mention

- Market value is an observed estimate rather than an actual transfer price.
- The valuation baseline is linear and uses broad positions, so it does not capture every interaction or tactical role.
- Match outcomes contain substantial irreducible randomness; calibration and baseline comparisons matter more than accuracy alone.
- The current system is batch-trained and does not yet monitor live drift.
