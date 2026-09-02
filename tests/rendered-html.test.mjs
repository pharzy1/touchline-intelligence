import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function requestWorker(request) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(request, { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the Touchline valuation product", async () => {
  const response = await render("/valuation");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Valuation Lab — Touchline<\/title>/i);
  assert.match(html, /Price the profile/);
  assert.match(html, /Estimated market value/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("includes accessible controls and social metadata", async () => {
  const response = await render("/valuation");
  const html = await response.text();
  assert.match(html, /aria-label="Primary navigation"/);
  assert.match(html, /type="range"/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
});

test("renders separate product routes and the transfer builder", async () => {
  const home = await (await render()).text();
  assert.match(home, /href="\/valuation"/); assert.match(home, /href="\/scouting"/); assert.match(home, /href="\/compare"/); assert.match(home, /href="\/transfers"/); assert.match(home, /href="\/matches"/);
  const response = await render("/transfers"); const html = await response.text();
  assert.equal(response.status, 200); assert.match(html, /Replace the role/); assert.match(html, /REFERENCE PLAYER/); assert.match(html, /REPLACEMENT SHORTLIST/);
});

test("renders the shareable player comparison workspace", async () => {
  const response = await render("/compare?players=433177,583255"); const html = await response.text();
  assert.equal(response.status, 200); assert.match(html, /Player Comparison — Touchline/); assert.match(html, /See the trade-offs/); assert.match(html, /Player comparison workspace/);
});

test("renders the photo-credit ledger", async () => {
  const response = await render("/photo-credits"); const html = await response.text();
  assert.equal(response.status, 200); assert.match(html, /Player photo credits/); assert.match(html, /Wikimedia Commons source/); assert.match(html, /Fallback policy/);
});

test("renders public production health and safe status data", async () => {
  const response = await render("/status"); const html = await response.text();
  assert.equal(response.status, 200); assert.match(html, /Trust the system/); assert.match(html, /PRODUCTION OPERATIONS/);
  const api = await requestWorker(new Request("http://localhost/api/status")); const data = await api.json();
  assert.equal(api.status, 200); assert.ok(["initializing", "operational", "delayed", "degraded", "stale"].includes(data.state)); assert.equal(data.models.matches, "match-softmax-2025-v1"); assert.equal(typeof data.telemetry.requests, "number"); assert.equal(typeof data.telemetry.p95LatencyMs, "number"); assert.ok(Array.isArray(data.telemetry.routes)); assert.equal(data.errorMessage, undefined);
});

test("renders the governed model registry and promotion evidence", async () => {
  const response = await render("/models"); const html = await response.text();
  assert.equal(response.status, 200); assert.match(html, /Model Registry — Touchline/); assert.match(html, /Promote with evidence/); assert.match(html, /Every gate must pass/); assert.match(html, /Ridge regression/); assert.match(html, /Prediction drift/);
});

test("rejects unauthenticated production fixture syncs", async () => {
  const response = await requestWorker(new Request("http://localhost/api/internal/fixture-sync", { method: "POST" }));
  assert.equal(response.status, 401); assert.deepEqual(await response.json(), { error: "Unauthorized" });
});

test("renders shareable player history with honest valuation methodology", async () => {
  const response = await render("/players/433177"); const html = await response.text();
  assert.equal(response.status, 200); assert.match(html, /Bukayo Saka/); assert.match(html, /VALUE TRAJECTORY/); assert.match(html, /LATEST RECORDED VALUE/); assert.match(html, /No invented prices/);
});

test("serves a versioned trained-model prediction", async () => {
  const response = await requestWorker(new Request("http://localhost/api/predict", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ age: 23, position: "Attack", appearances: 31, goals: 14, assists: 8, minutes: 2360, internationalCaps: 0 }),
  }));
  assert.equal(response.status, 200);
  const prediction = await response.json();
  assert.equal(prediction.version, "valuation-ridge-2025-v1");
  assert.equal(prediction.currency, "EUR");
  assert.ok(prediction.estimateEur > 1_000_000);
  assert.ok(prediction.lowEur < prediction.estimateEur);
  assert.ok(prediction.highEur > prediction.estimateEur);
  assert.equal(prediction.metrics.records, 414);
});

test("rejects out-of-domain prediction inputs", async () => {
  const response = await requestWorker(new Request("http://localhost/api/predict", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ age: 8, position: "Striker", appearances: 99, goals: 14, assists: 8, minutes: 2360 }),
  }));
  assert.equal(response.status, 400);
});

test("renders the scouting module", async () => {
  const response = await render("/scouting");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Recruit the profile/);
  assert.match(html, /Player similarity search/);
  assert.match(html, /RECRUITMENT CONSTRAINTS/);
  assert.match(html, /Similarity you can/);
});

test("searches players and returns explained nearest profiles", async () => {
  const searchResponse = await requestWorker(new Request("http://localhost/api/scouting?q=Haaland"));
  assert.equal(searchResponse.status, 200);
  const search = await searchResponse.json();
  assert.equal(search.players[0].name, "Erling Haaland");
  const riceResponse = await requestWorker(new Request("http://localhost/api/scouting?q=Declan%20Rice"));
  const rice = await riceResponse.json(); assert.match(rice.players[0].photo.src, /^\/players\//); assert.match(rice.players[0].photo.license, /^CC BY/);
  const response = await requestWorker(new Request(`http://localhost/api/scouting?player_id=${search.players[0].player_id}&club=different&max_age=30&max_value_eur=75000000`));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.version, "scouting-neighbors-2025-v1");
  assert.equal(result.selected.name, "Erling Haaland");
  assert.ok(result.matches.length > 0);
  assert.ok(result.matches.length <= 5);
  assert.ok(result.matches.every((player) => player.position === "Attack" && player.age <= 30 && player.market_value_eur <= 75_000_000 && player.club !== "Manchester City"));
  assert.ok(result.matches.every((player) => player.shared_signals.length === 3));
});

test("renders the match prediction module", async () => {
  const response = await render("/matches");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Read the matchup/);
  assert.match(html, /Match outcome prediction/);
  assert.match(html, /No peeking/);
  assert.match(html, /three-way accuracy/i);
});

test("returns calibrated three-way match probabilities", async () => {
  const teamsResponse = await requestWorker(new Request("http://localhost/api/matches"));
  assert.equal(teamsResponse.status, 200);
  const teams = await teamsResponse.json();
  assert.equal(teams.teams.length, 20);
  assert.equal(teams.split.method, "season_ordered");
  const response = await requestWorker(new Request("http://localhost/api/matches?home_id=11&away_id=281"));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.version, "match-softmax-2025-v1");
  assert.equal(result.home.name, "Arsenal FC");
  assert.equal(result.away.name, "Manchester City");
  const total = result.probabilities.home_win + result.probabilities.draw + result.probabilities.away_win;
  assert.ok(Math.abs(total - 1) < 1e-9);
  assert.equal(result.factors.length, 4);
  assert.equal(result.calibrated, true);
});

test("rejects an impossible self-match", async () => {
  const response = await requestWorker(new Request("http://localhost/api/matches?home_id=11&away_id=11"));
  assert.equal(response.status, 400);
});
