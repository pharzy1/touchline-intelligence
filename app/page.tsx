import { ValuationWorkbench } from "./valuation-workbench";
import model from "../data/valuation-model.json";

const Arrow = () => <span aria-hidden="true">↗</span>;

export default function Home() {
  return (
    <main>
      <nav className="nav shell" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Touchline home">
          <span className="brand-mark">T</span>
          <span>TOUCHLINE</span>
        </a>
        <div className="nav-links">
          <a className="active" href="#valuation">Valuation</a>
          <a href="/scouting">Scouting</a>
          <a href="/matches">Matches</a>
        </div>
        <a className="github-link" href="#model-card">Model card <Arrow /></a>
      </nav>

      <section className="hero shell" id="top">
        <div className="eyebrow"><span /> PREMIER LEAGUE INTELLIGENCE</div>
        <h1>Find the signal<br />before the market does.</h1>
        <div className="hero-foot">
          <p>Decision tools for player valuation, squad planning, and match analysis—built on transparent, reproducible data.</p>
          <a className="primary-cta" href="#valuation">Open valuation lab <span aria-hidden="true">↓</span></a>
        </div>
        <div className="hero-rule" />
        <div className="ticker" aria-label="Platform statistics">
          <div><strong>{model.metrics.records}</strong><span>players trained</span></div>
          <div><strong>{model.features.length}</strong><span>model features</span></div>
          <div><strong>€{Math.round(model.metrics.mae_eur / 1_000_000)}m</strong><span>validation MAE</span></div>
          <div><strong>{model.metrics.r2.toFixed(2)}</strong><span>validation R²</span></div>
        </div>
      </section>

      <section className="workbench-wrap" id="valuation">
        <div className="shell section-heading">
          <div>
            <span className="section-index">01 / 03</span>
            <h2>Player valuation lab</h2>
          </div>
          <p>Adjust a player profile and see how performance, age, role, and league experience influence the model’s estimate.</p>
        </div>
        <ValuationWorkbench />
      </section>

      <section className="model-section shell" id="model-card">
        <div className="model-title">
          <span className="section-index">MODEL CARD / {model.version}</span>
          <h2>Built to be<br /><em>questioned.</em></h2>
        </div>
        <div className="model-copy">
          <p className="lead">A prediction without context is just a number. Touchline shows what drives every estimate.</p>
          <div className="model-grid">
            <div><span>APPROACH</span><strong>Regularized log regression</strong><p>Reproducible baseline evaluated against a seeded 20% holdout.</p></div>
            <div><span>PRIMARY METRIC</span><strong>€{Math.round(model.metrics.mae_eur / 1_000_000)}m mean absolute error</strong><p>Reported in euros alongside R² and median percentage error.</p></div>
            <div><span>LIMITATION</span><strong>Market data is noisy</strong><p>Estimates are directional and should not replace professional scouting.</p></div>
            <div><span>VERSIONING</span><strong>Reproducible runs</strong><p>Each prediction records its feature set and model version.</p></div>
          </div>
        </div>
      </section>

      <section className="roadmap" id="roadmap">
        <div className="shell">
          <div className="section-heading light">
            <div><span className="section-index">PLATFORM ROADMAP</span><h2>One data spine.<br />Three decisions.</h2></div>
            <p>The valuation engine is the first complete module. Shared player and match data unlocks two more without rebuilding the foundation.</p>
          </div>
          <div className="roadmap-grid">
            <article className="roadmap-card live"><span className="status">LIVE MVP</span><span className="number">01</span><h3>Value a player</h3><p>Estimate market value from performance, age, position, and experience.</p><a href="#valuation">Try the model <Arrow /></a></article>
            <article className="roadmap-card live-secondary"><span className="status">LIVE</span><span className="number">02</span><h3>Find a profile</h3><p>Surface statistically similar players within recruitment constraints.</p><a href="/scouting">Open scouting lab <Arrow /></a></article>
            <article className="roadmap-card live-tertiary"><span className="status">LIVE</span><span className="number">03</span><h3>Read the match</h3><p>Compare team form and estimate calibrated win, draw, and loss probabilities.</p><a href="/matches">Open match lab <Arrow /></a></article>
          </div>
        </div>
      </section>

      <footer className="footer shell">
        <div className="brand"><span className="brand-mark">T</span><span>TOUCHLINE</span></div>
        <p>An independent football intelligence project.</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
