import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
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
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Touchline — Premier League Intelligence<\/title>/i);
  assert.match(html, /Find the signal/);
  assert.match(html, /Player valuation lab/);
  assert.match(html, /Estimated market value/);
  assert.match(html, /Find a profile/);
  assert.match(html, /Read the match/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("includes accessible controls and social metadata", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /aria-label="Primary navigation"/);
  assert.match(html, /type="range"/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
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
