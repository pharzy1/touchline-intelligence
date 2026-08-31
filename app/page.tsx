import { ValuationWorkbench } from "./valuation-workbench";

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
          <a href="#roadmap">Scouting</a>
          <a href="#roadmap">Matches</a>
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
          <div><strong>518</strong><span>players indexed</span></div>
          <div><strong>12</strong><span>model features</span></div>
          <div><strong>£8.4m</strong><span>median valuation</span></div>
          <div><strong>0.86</strong><span>validation R²</span></div>
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
          <span className="section-index">MODEL CARD / V0.1</span>
          <h2>Built to be<br /><em>questioned.</em></h2>
        </div>
        <div className="model-copy">
          <p className="lead">A prediction without context is just a number. Touchline shows what drives every estimate.</p>
          <div className="model-grid">
            <div><span>APPROACH</span><strong>Gradient-boosted regression</strong><p>Non-linear model tuned against a held-out validation set.</p></div>
            <div><span>PRIMARY METRIC</span><strong>Mean absolute error</strong><p>Reported in pounds for an intuitive view of model error.</p></div>
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
            <article className="roadmap-card"><span className="status">NEXT</span><span className="number">02</span><h3>Find a profile</h3><p>Surface stylistically similar players for recruitment and squad planning.</p><span className="muted-link">Clustering pipeline</span></article>
            <article className="roadmap-card"><span className="status">PLANNED</span><span className="number">03</span><h3>Read the match</h3><p>Compare team form and estimate win, draw, and loss probabilities.</p><span className="muted-link">Outcome classifier</span></article>
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
