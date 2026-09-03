import type { Metadata } from "next";
import model from "../../data/valuation-model.json";
import report from "../../data/model-report.json";
import { SiteNav } from "../site-nav";

export const metadata: Metadata = {
  title: "Model Registry — Touchline",
  description: "Inspect Touchline model versions, evaluation gates, drift evidence, comparisons, and rollback policy.",
};

const money = (value: number) => `€${(value / 1_000_000).toFixed(2)}m`;

export default function ModelsPage() {
  const comparison = report.metrics.candidate;
  const last = report.history[0];

  return <main className="models-page">
    <SiteNav active="models" />
    <header className="models-hero shell">
      <div className="eyebrow"><span /> MODEL REGISTRY / PRODUCTION</div>
      <h1>Promote with evidence.<br /><em>Rollback by design.</em></h1>
      <p>Touchline refreshes its player data weekly, trains competing candidates, and proposes a production change only after every quality, stability, drift, and artifact gate passes.</p>
    </header>
    <div className="shell models-content">
      <section className="registry-banner">
        <div><span className="status-dot" /><strong>Production model governed</strong></div>
        <code>{report.productionVersion}</code>
      </section>
      <section className="registry-kpis">
        <article><span>HOLDOUT R²</span><strong>{comparison.r2.toFixed(3)}</strong><small>Current candidate</small></article>
        <article><span>MEAN CV R²</span><strong>{comparison.cvR2Mean.toFixed(3)}</strong><small>± {comparison.cvR2Std.toFixed(3)} across 5 folds</small></article>
        <article><span>HOLDOUT MAE</span><strong>{money(comparison.maeEur)}</strong><small>{comparison.records} player records</small></article>
        <article><span>PREDICTION DRIFT</span><strong>{report.drift.predictionShift.toFixed(2)}σ</strong><small>Promotion limit: 0.75σ</small></article>
      </section>
      <section className="model-comparison">
        <div><div className="section-index">01 / CHALLENGER TEST</div><h2>Ridge versus<br />gradient boosting.</h2><p>Both candidates see the same seeded split. Ridge remains the serving choice because it preserves stable per-feature explanations while staying competitive on holdout quality.</p></div>
        <div className="model-table">
          <div><span>MODEL</span><span>R²</span><span>MAE</span><span>ROLE</span></div>
          <div><strong>Ridge regression</strong><strong>{comparison.ridge.r2.toFixed(3)}</strong><strong>{money(comparison.ridge.mae_eur)}</strong><em>SERVING</em></div>
          <div><strong>Gradient-boosted trees</strong><strong>{comparison.gradientBoostedTrees.r2.toFixed(3)}</strong><strong>{money(comparison.gradientBoostedTrees.mae_eur)}</strong><em>CHALLENGER</em></div>
        </div>
      </section>
      <section className="gate-panel position-model-panel">
        <div className="section-index">02 / POSITION MODELS</div><h2>Different roles. Separate evidence.</h2>
        <p className="position-model-copy">Touchline fits and cross-validates an independent ridge model for each role. Small cohorts and weak scores remain visible rather than being hidden behind the global metric.</p>
        <div className="position-model-grid">{Object.entries(model.position_models).map(([position, positionModel]) => <article key={position}><span>{position === "Attack" ? "FORWARD" : position.toUpperCase()}</span><strong>{positionModel.metrics.cross_validation.r2_mean.toFixed(3)}</strong><small>mean CV R² · {positionModel.records} records</small><div><b>Ridge MAE</b><em>{money(positionModel.metrics.model_comparison.ridge.mae_eur)}</em></div><div><b>Tree MAE</b><em>{money(positionModel.metrics.model_comparison.gradient_boosted_trees.mae_eur)}</em></div></article>)}</div>
      </section>
      <section className="gate-panel">
        <div className="section-index">03 / PROMOTION CONTRACT</div><h2>Every gate must pass.</h2>
        <div className="gate-grid">{report.gates.map((gate) => <article key={gate.name}><i className={gate.passed ? "passed" : "failed"}>{gate.passed ? "✓" : "!"}</i><div><strong>{gate.name}</strong><p>{gate.detail}</p></div></article>)}</div>
      </section>
      <section className="drift-panel">
        <div><div className="section-index">03 / POPULATION DRIFT</div><h2>Feature movement</h2><p>Candidate feature means and the resulting prediction distribution are compared with production. A feature shift over 1σ or median output shift over 0.75σ blocks promotion.</p></div>
        <div>{Object.entries(report.drift.features).map(([feature, value]) => <article key={feature}><span>{feature.replaceAll("_", " ")}</span><div><i style={{ width: `${Math.min(100, value * 100)}%` }} /></div><strong>{value.toFixed(2)}σ</strong></article>)}</div>
      </section>
      <section className="registry-ledger">
        <div><div className="section-index">04 / LATEST EVALUATION</div><h2>{last.decision.replaceAll("_", " ")}</h2><p>{new Date(last.evaluatedAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })} · {last.records} records · R² {last.r2.toFixed(3)} · MAE {money(last.maeEur)}</p></div>
        <div><div className="section-index">05 / ROLLBACK</div><h2>Git-backed artifacts</h2><p>Every promotion is reviewed as a pull request. The previous artifact family remains recoverable from Git history and production changes only after merge and deployment.</p><code>{model.version}</code></div>
      </section>
    </div>
    <footer className="footer shell"><div className="brand"><span className="brand-mark">T</span><span>TOUCHLINE</span></div><p>Weekly refresh · threshold-gated promotion</p><a href="/status">Production status →</a></footer>
  </main>;
}
