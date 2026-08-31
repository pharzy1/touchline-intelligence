import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const load = async (name) => JSON.parse(await readFile(new URL(`../data/${name}`, import.meta.url), "utf8"));
const [valuation, scouting, match] = await Promise.all([
  load("valuation-model.json"),
  load("scouting-index.json"),
  load("match-model.json"),
]);

assert.match(valuation.version, /^valuation-/);
assert.equal(valuation.features.length, valuation.mean.length);
assert.equal(valuation.features.length, valuation.scale.length);
assert.equal(valuation.features.length, valuation.coefficients.length);
assert.ok(valuation.metrics.records >= 400);
assert.ok(valuation.metrics.r2 > 0 && valuation.metrics.r2 <= 1);
assert.ok(valuation.metrics.mae_eur > 0);

assert.match(scouting.version, /^scouting-/);
assert.equal(scouting.players.length, valuation.metrics.records);
assert.ok(scouting.players.every((player) => player.vector.length === scouting.features.length));

assert.match(match.version, /^match-/);
assert.deepEqual(match.classes, ["home_win", "draw", "away_win"]);
assert.equal(match.weights.length, match.features.length + 1);
assert.ok(match.weights.every((row) => row.length === match.classes.length));
assert.ok(match.teams.length >= 20);
assert.ok(match.split.train_through < match.split.calibration_season);
assert.ok(match.split.calibration_season < match.split.test_season);
assert.ok(match.metrics.test_matches > 0);

console.log(`Verified ${valuation.version}, ${scouting.version}, and ${match.version}.`);
