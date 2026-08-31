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
