type Page = "home" | "valuation" | "scouting" | "compare" | "transfers" | "matches" | "status";

export function SiteNav({ active }: { active: Page }) {
  return <nav className="nav shell" aria-label="Primary navigation">
    <a className="brand" href="/" aria-label="Touchline home"><span className="brand-mark">T</span><span>TOUCHLINE</span></a>
    <div className="nav-links">
      <a className={active === "valuation" ? "active" : ""} href="/valuation">Valuation</a>
      <a className={active === "scouting" ? "active" : ""} href="/scouting">Scouting</a>
      <a className={active === "compare" ? "active" : ""} href="/compare">Compare</a>
      <a className={active === "transfers" ? "active" : ""} href="/transfers">Transfers</a>
      <a className={active === "matches" ? "active" : ""} href="/matches">Matches</a>
    </div>
    <div className="nav-utility"><a className={active === "status" ? "status-link active" : "status-link"} href="/status"><i /> Status</a><a className="github-link" href="https://github.com/pharzy1/touchline-intelligence">GitHub ↗</a></div>
  </nav>;
}
