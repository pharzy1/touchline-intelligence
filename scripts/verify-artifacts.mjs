import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const load = async (name) => JSON.parse(await readFile(new URL(`../data/${name}`, import.meta.url), "utf8"));
const [valuation, scouting, match, images, histories, report, refresh] = await Promise.all([
  load("valuation-model.json"),
  load("scouting-index.json"),
  load("match-model.json"),
  load("player-images.json"),
  load("player-histories.json"),
  load("model-report.json"),
  load("data-refresh-report.json"),
]);

assert.match(valuation.version, /^valuation-/);
assert.equal(valuation.features.length, valuation.mean.length);
assert.equal(valuation.features.length, valuation.scale.length);
assert.equal(valuation.features.length, valuation.coefficients.length);
assert.ok(valuation.metrics.records >= 400);
assert.ok(valuation.metrics.r2 > 0 && valuation.metrics.r2 <= 1);
assert.ok(valuation.metrics.mae_eur > 0);
assert.deepEqual(Object.keys(valuation.position_models).sort(), ["Attack", "Defender", "Goalkeeper", "Midfield"]);
for (const positionModel of Object.values(valuation.position_models)) {
  assert.ok(positionModel.records >= 30);
  assert.equal(positionModel.features.length, positionModel.mean.length);
  assert.equal(positionModel.features.length, positionModel.scale.length);
  assert.equal(positionModel.features.length, positionModel.coefficients.length);
  assert.equal(positionModel.prediction_interval.intercepts.length, positionModel.prediction_interval.coefficients.length);
  assert.ok(positionModel.metrics.cross_validation.folds >= 4);
  assert.equal(positionModel.promotion.serving_choice, positionModel.promotion.eligible ? "position" : "global");
  assert.equal(typeof positionModel.promotion.observed_cv_r2_margin, "number");
}

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

assert.match(images.version, /^commons-player-images-/);
for (const [playerId, photo] of Object.entries(images.players)) {
  assert.ok(scouting.players.some((player) => String(player.player_id) === playerId));
  assert.match(photo.license, /^(CC BY|CC0|Public domain|PDM)/);
  assert.match(photo.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.match(photo.src, /^\/players\/[\w.-]+$/);
  await access(new URL(`../public${photo.src}`, import.meta.url));
}

assert.match(histories.version, /^player-history-/);
assert.equal(histories.model_version, valuation.version);
assert.equal(histories.players.length, scouting.players.length);
assert.ok(histories.players.every((player) => player.points.length > 0 && player.points.every((point) => point.estimate_eur > 0 && point.low_eur > 0 && point.low_eur <= point.estimate_eur && point.high_eur >= point.estimate_eur && point.peer_median_eur > 0 && ["limited", "moderate", "strong"].includes(point.evidence_quality))));
assert.equal(report.schemaVersion, 1);
assert.equal(report.productionVersion, valuation.version);
assert.ok(report.gates.length >= 5 && report.gates.every((gate) => typeof gate.passed === "boolean"));
assert.ok(report.drift.maximumShift >= 0);
assert.ok(report.drift.predictionShift >= 0);
assert.equal(refresh.schemaVersion, 1);
assert.equal(refresh.status, "validated");
assert.equal(refresh.modelVersion, scouting.version);
assert.equal(refresh.season, scouting.season);
assert.equal(refresh.counts.candidatePlayers, scouting.players.length);
assert.ok(refresh.counts.clubs >= 18);
assert.ok(refresh.gates.length >= 5 && refresh.gates.every((gate) => gate.passed === true));

console.log(`Verified ${valuation.version}, ${scouting.version}, ${match.version}, ${histories.version}, and ${Object.keys(images.players).length} licensed player images.`);
