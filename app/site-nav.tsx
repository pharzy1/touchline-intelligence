import refresh from "../data/data-refresh-report.json";

type Page = "home" | "valuation" | "scouting" | "compare" | "trends" | "transfers" | "squad-planner" | "matches" | "models" | "status" | "workspace" | "operations" | "notifications";

export function SiteNav({ active }: { active: Page }) {
  return <nav className="nav shell" aria-label="Primary navigation">
    <a className="brand" href="/" aria-label="Touchline home"><span className="brand-mark">T</span><span>TOUCHLINE</span></a>
    <div className="nav-links">
      <a className={active === "valuation" ? "active" : ""} href="/valuation">Valuation</a>
      <a className={active === "scouting" ? "active" : ""} href="/scouting">Scouting</a>
      <a className={active === "compare" ? "active" : ""} href="/compare">Compare</a>
      <a className={active === "trends" ? "active" : ""} href="/trends">Trends</a>
      <a className={active === "transfers" ? "active" : ""} href="/transfers">Transfers</a>
      <a className={active === "squad-planner" ? "active" : ""} href="/squad-planner">Planner</a>
      <a className={active === "matches" ? "active" : ""} href="/matches">Matches</a>
    </div>
    <div className="nav-utility"><a className="data-freshness" href="/status#data-refresh" title={`Validated ${new Date(refresh.generatedAt).toLocaleDateString()}`}><i /> DATA · {refresh.season}</a><a className={active === "workspace" ? "status-link active" : "status-link"} href="/workspace">Workspace</a><a className={active === "notifications" ? "status-link active" : "status-link"} href="/notifications">Inbox</a><a className={active === "operations" ? "status-link active" : "status-link"} href="/operations">Ops</a><a className={active === "models" ? "status-link active" : "status-link"} href="/models">Models</a><a className={active === "status" ? "status-link active" : "status-link"} href="/status"><i /> Status</a><a className="github-link" href="https://github.com/pharzy1/touchline-intelligence">GitHub ↗</a></div>
  </nav>;
}
