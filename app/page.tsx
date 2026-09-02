import model from "../data/valuation-model.json";
import { SiteNav } from "./site-nav";

const Arrow = () => <span aria-hidden="true">↗</span>;

export default function Home() {
  return (
    <main>
      <SiteNav active="home" />

      <section className="hero shell" id="top">
        <div className="eyebrow"><span /> PREMIER LEAGUE INTELLIGENCE</div>
        <h1>Find the signal<br />before the market does.</h1>
        <div className="hero-foot">
          <p>Decision tools for player valuation, squad planning, and match analysis—built on transparent, reproducible data.</p>
          <a className="primary-cta" href="/squad-planner">Plan a squad <span aria-hidden="true">↗</span></a>
        </div>
        <div className="hero-rule" />
        <div className="ticker" aria-label="Platform statistics">
          <div><strong>{model.metrics.records}</strong><span>players trained</span></div>
          <div><strong>{model.features.length}</strong><span>model features</span></div>
          <div><strong>€{Math.round(model.metrics.mae_eur / 1_000_000)}m</strong><span>validation MAE</span></div>
          <div><strong>{model.metrics.r2.toFixed(2)}</strong><span>validation R²</span></div>
        </div>
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
            <div><span className="section-index">LIVE PRODUCT SUITE</span><h2>One data spine.<br />Four decisions.</h2></div>
            <p>Each capability has its own focused page while sharing versioned player, valuation, and match-model artifacts.</p>
          </div>
          <div className="roadmap-grid">
            <article className="roadmap-card live"><span className="status">LIVE</span><span className="number">01</span><h3>Value a player</h3><p>Estimate market value from performance, age, position, and experience.</p><a href="/valuation">Try the model <Arrow /></a></article>
            <article className="roadmap-card live-secondary"><span className="status">LIVE</span><span className="number">02</span><h3>Find a profile</h3><p>Surface statistically similar players within recruitment constraints.</p><a href="/scouting">Open scouting lab <Arrow /></a></article>
            <article className="roadmap-card live-tertiary"><span className="status">LIVE</span><span className="number">03</span><h3>Read the match</h3><p>Compare team form and estimate calibrated win, draw, and loss probabilities.</p><a href="/matches">Open match lab <Arrow /></a></article>
            <article className="roadmap-card live-transfer"><span className="status">LIVE</span><span className="number">04</span><h3>Plan a transfer</h3><p>Compare replacement profiles, model costs, trade-offs, and potential savings.</p><a href="/transfers">Build a scenario <Arrow /></a></article>
            <article className="roadmap-card live-planner"><span className="status">NEW</span><span className="number">05</span><h3>Build the squad</h3><p>Shape an XI, expose positional gaps, and spend a transfer budget with model-backed alternatives.</p><a href="/squad-planner">Open squad planner <Arrow /></a></article>
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
