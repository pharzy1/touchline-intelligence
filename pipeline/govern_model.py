#!/usr/bin/env python3
"""Evaluate candidate artifacts and promote only when production gates pass."""
from __future__ import annotations
import argparse, json, shutil, statistics
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ["valuation-model.json", "scouting-index.json", "player-histories.json", "data-refresh-report.json"]

def load(directory: Path, name: str): return json.loads((directory / name).read_text())

def predict_log(model: dict, player: dict) -> float:
    position = player["position"]
    values = {
        **player,
        "is_forward": 1 if position == "Attack" else 0,
        "is_midfielder": 1 if position == "Midfield" else 0,
        "is_defender": 1 if position == "Defender" else 0,
        "is_goalkeeper": 1 if position == "Goalkeeper" else 0,
    }
    standardized = [(float(values[name]) - model["mean"][index]) / max(model["scale"][index], 1e-9) for index, name in enumerate(model["features"])]
    return model["intercept"] + sum(value * coefficient for value, coefficient in zip(standardized, model["coefficients"]))

def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--candidate-dir", type=Path, required=True); parser.add_argument("--production-dir", type=Path, default=ROOT / "data"); parser.add_argument("--report", type=Path, default=ROOT / "data" / "model-report.json"); parser.add_argument("--promote", action="store_true"); args = parser.parse_args()
    current = load(args.production_dir, "valuation-model.json"); candidate = load(args.candidate_dir, "valuation-model.json"); current_scout = load(args.production_dir, "scouting-index.json"); candidate_scout = load(args.candidate_dir, "scouting-index.json"); histories = load(args.candidate_dir, "player-histories.json")
    cm, nm = current["metrics"], candidate["metrics"]; ccv, ncv = cm["cross_validation"], nm["cross_validation"]
    shifts = {feature: round(abs((candidate_scout["mean"][i] - current_scout["mean"][i]) / max(current_scout["scale"][i], 1e-9)), 4) for i, feature in enumerate(current_scout["features"])}
    current_predictions = [predict_log(current, player) for player in candidate_scout["players"]]
    candidate_predictions = [predict_log(candidate, player) for player in candidate_scout["players"]]
    prediction_scale = max(statistics.pstdev(current_predictions), 1e-9)
    prediction_shift = round(abs(statistics.median(candidate_predictions) - statistics.median(current_predictions)) / prediction_scale, 4)
    gates = [
        {"name": "Artifact contract", "passed": candidate["features"] == current["features"] and len(candidate_scout["players"]) == nm["records"] and histories["model_version"] == candidate["version"], "detail": "Serving feature order, player index, and history model reference agree."},
        {"name": "Dataset coverage", "passed": nm["records"] >= cm["records"] * .9, "detail": f"{nm['records']} candidate records vs {cm['records']} production."},
        {"name": "Holdout quality", "passed": nm["r2"] >= cm["r2"] - .02 and nm["mae_eur"] <= cm["mae_eur"] * 1.10, "detail": "R² may fall at most 0.02 and MAE may rise at most 10%."},
        {"name": "Cross-validation stability", "passed": ncv["r2_mean"] >= ccv["r2_mean"] - .03 and ncv["r2_std"] <= max(ccv["r2_std"] * 1.5, .03), "detail": "Mean quality and fold variance must remain stable."},
        {"name": "Population drift", "passed": max(shifts.values(), default=0) <= 1.0, "detail": "No standardized feature mean may move more than 1.0σ."},
        {"name": "Prediction drift", "passed": prediction_shift <= .75, "detail": "Median log-value output may move at most 0.75σ on the candidate population."},
        {"name": "Interpretable serving model", "passed": nm["model_comparison"]["serving_choice"] == "ridge", "detail": "Ridge stays production-serving for coefficient-level explanations."},
    ]
    passed = all(gate["passed"] for gate in gates); changed = candidate["version"] != current["version"]; promoted = bool(args.promote and passed and changed)
    if promoted:
        for name in FILES: shutil.copy2(args.candidate_dir / name, args.production_dir / name)
    previous = json.loads(args.report.read_text()) if args.report.exists() else None
    history = (previous or {}).get("history", [])
    decision = "promoted" if promoted else "passed_candidate" if passed and changed else "passed_no_change" if passed else "rejected"
    event = {"version": candidate["version"], "evaluatedAt": datetime.now(timezone.utc).isoformat(), "decision": decision, "r2": nm["r2"], "maeEur": nm["mae_eur"], "records": nm["records"]}
    history = ([event] + [item for item in history if item.get("version") != event["version"]])[:12]
    report = {"schemaVersion": 1, "generatedAt": event["evaluatedAt"], "productionVersion": candidate["version"] if promoted else current["version"], "candidateVersion": candidate["version"], "decision": event["decision"], "promotionMode": "threshold-gated pull request", "rollbackVersion": current["version"] if promoted else None, "gates": gates, "drift": {"method": "standardized mean and prediction-distribution shift", "maximumShift": max(shifts.values(), default=0), "predictionShift": prediction_shift, "features": shifts}, "metrics": {"production": {"r2": cm["r2"], "maeEur": cm["mae_eur"], "cvR2Mean": ccv["r2_mean"], "cvR2Std": ccv["r2_std"], "records": cm["records"]}, "candidate": {"r2": nm["r2"], "maeEur": nm["mae_eur"], "cvR2Mean": ncv["r2_mean"], "cvR2Std": ncv["r2_std"], "records": nm["records"], "ridge": nm["model_comparison"]["ridge"], "gradientBoostedTrees": nm["model_comparison"]["gradient_boosted_trees"]}}, "history": history}
    args.report.parent.mkdir(parents=True, exist_ok=True); args.report.write_text(json.dumps(report, indent=2) + "\n"); print(json.dumps({"decision": report["decision"], "passed": passed, "promoted": promoted, "version": candidate["version"]}))
    if not passed: raise SystemExit(2)

if __name__ == "__main__": main()
