#!/usr/bin/env python3
"""Train Touchline's reproducible Premier League valuation baseline.

Input tables come from dcaribou/transfermarkt-datasets (CC0). The script joins
current Premier League profiles to their latest-season appearances, engineers
features, trains a ridge regression on log market value, evaluates a held-out
split, and writes compact artifacts consumed by the web API.
"""

from __future__ import annotations

import csv
import gzip
import json
import math
import os
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ.get("TOUCHLINE_SOURCE_DIR", ROOT / "work" / "source-data"))
OUT = Path(os.environ.get("TOUCHLINE_OUTPUT_DIR", ROOT / "data"))
COMPETITION = "GB1"
MODEL_VERSION = os.environ.get("TOUCHLINE_MODEL_VERSION", "valuation-ridge-2025-v1")
FEATURES = [
    "age", "appearances", "goals", "assists", "minutes",
    "goals_per_90", "assists_per_90", "international_caps",
    "is_forward", "is_midfielder", "is_defender", "is_goalkeeper",
]
SCOUT_FEATURES = ["age", "appearances", "goals_per_90", "assists_per_90", "minutes_per_appearance", "international_caps"]
POSITION_FEATURES = FEATURES[:8]


def ridge_fit(X: np.ndarray, y: np.ndarray, train_idx: np.ndarray):
    mean = X[train_idx].mean(axis=0)
    scale = X[train_idx].std(axis=0)
    scale[scale == 0] = 1
    standardized = (X - mean) / scale
    design = np.column_stack([np.ones(len(train_idx)), standardized[train_idx]])
    penalty = np.eye(design.shape[1]) * 1.5
    penalty[0, 0] = 0
    weights = np.linalg.solve(design.T @ design + penalty, design.T @ y[train_idx])
    return mean, scale, weights


def ridge_predict(X: np.ndarray, mean: np.ndarray, scale: np.ndarray, weights: np.ndarray, indices: np.ndarray):
    standardized = (X[indices] - mean) / scale
    return np.maximum(np.expm1(np.column_stack([np.ones(len(indices)), standardized]) @ weights), 0)


def regression_metrics(predicted: np.ndarray, actual: np.ndarray):
    return {
        "mae_eur": float(np.mean(np.abs(predicted - actual))),
        "r2": float(1 - np.sum((actual - predicted) ** 2) / np.sum((actual - actual.mean()) ** 2)),
    }


def train_position_model(records, position: str):
    """Fit an independently evaluated, explainable model for one playing role."""
    position_indices = np.array([index for index, row in enumerate(records) if row["position"] == position])
    position_X = np.array([[records[index][name] for name in POSITION_FEATURES] for index in position_indices], dtype=float)
    position_y_eur = np.array([records[index]["market_value_eur"] for index in position_indices], dtype=float)
    position_y = np.log1p(position_y_eur)
    rng = np.random.default_rng(42)
    shuffled = rng.permutation(len(position_indices))
    split = max(1, min(len(shuffled) - 1, int(len(shuffled) * .8)))
    train_idx, test_idx = shuffled[:split], shuffled[split:]
    mean, scale, weights = ridge_fit(position_X, position_y, train_idx)
    predicted = ridge_predict(position_X, mean, scale, weights, test_idx)
    metrics = regression_metrics(predicted, position_y_eur[test_idx])

    fold_count = min(5, len(shuffled))
    folds = np.array_split(shuffled, fold_count)
    cv = []
    for fold_index, fold in enumerate(folds):
        fold_train = np.concatenate([part for index, part in enumerate(folds) if index != fold_index])
        fold_mean, fold_scale, fold_weights = ridge_fit(position_X, position_y, fold_train)
        cv.append(regression_metrics(ridge_predict(position_X, fold_mean, fold_scale, fold_weights, fold), position_y_eur[fold]))

    boosted = GradientBoostingRegressor(random_state=42, n_estimators=140, learning_rate=.04, max_depth=2, loss="huber")
    boosted.fit(position_X[train_idx], position_y[train_idx])
    boosted_metrics = regression_metrics(np.maximum(np.expm1(boosted.predict(position_X[test_idx])), 0), position_y_eur[test_idx])

    bootstrap_rng = np.random.default_rng(2026)
    bootstrap_intercepts, bootstrap_coefficients = [], []
    standardized = (position_X - mean) / scale
    for _ in range(80):
        sample = bootstrap_rng.choice(train_idx, size=len(train_idx), replace=True)
        design = np.column_stack([np.ones(len(sample)), standardized[sample]])
        penalty = np.eye(design.shape[1]) * 1.5; penalty[0, 0] = 0
        sample_weights = np.linalg.solve(design.T @ design + penalty, design.T @ position_y[sample])
        bootstrap_intercepts.append(round(float(sample_weights[0]), 10))
        bootstrap_coefficients.append(sample_weights[1:].round(10).tolist())

    return {
        "features": POSITION_FEATURES,
        "records": len(position_indices),
        "mean": mean.round(8).tolist(), "scale": scale.round(8).tolist(),
        "intercept": float(weights[0]), "coefficients": weights[1:].round(10).tolist(),
        "prediction_interval": {"method": "seeded_bootstrap_percentile_80", "seed": 2026, "samples": 80, "intercepts": bootstrap_intercepts, "coefficients": bootstrap_coefficients},
        "metrics": {
            "test_records": len(test_idx), "r2": round(metrics["r2"], 4), "mae_eur": round(metrics["mae_eur"]),
            "cross_validation": {"folds": fold_count, "r2_mean": round(float(np.mean([item["r2"] for item in cv])), 4), "r2_std": round(float(np.std([item["r2"] for item in cv])), 4), "mae_eur_mean": round(float(np.mean([item["mae_eur"] for item in cv])))},
            "model_comparison": {"ridge": {"r2": round(metrics["r2"], 4), "mae_eur": round(metrics["mae_eur"])}, "gradient_boosted_trees": {"r2": round(boosted_metrics["r2"], 4), "mae_eur": round(boosted_metrics["mae_eur"])}, "serving_choice": "ridge", "reason": "Role-specific ridge keeps every estimate inspectable while the tree remains an evaluated challenger."},
        },
    }


def read_gzip_csv(name: str):
    with gzip.open(SOURCE / name, "rt", encoding="utf-8", newline="") as handle:
        yield from csv.DictReader(handle)


def number(value: str | None) -> float:
    try:
        return float(value or 0)
    except ValueError:
        return 0.0


def age_on(birth: str, when: date) -> int:
    born = datetime.fromisoformat(birth).date()
    return when.year - born.year - ((when.month, when.day) < (born.month, born.day))


def main() -> None:
    game_seasons: dict[str, int] = {}
    latest_season = 0
    latest_date = date(2000, 1, 1)
    for game in read_gzip_csv("games.csv.gz"):
        if game["competition_id"] != COMPETITION:
            continue
        season = int(game["season"])
        game_seasons[game["game_id"]] = season
        latest_season = max(latest_season, season)
        latest_date = max(latest_date, date.fromisoformat(game["date"]))

    totals = defaultdict(lambda: {"appearances": 0, "goals": 0, "assists": 0, "minutes": 0})
    for row in read_gzip_csv("appearances.csv.gz"):
        if game_seasons.get(row["game_id"]) != latest_season:
            continue
        stats = totals[row["player_id"]]
        stats["appearances"] += 1
        stats["goals"] += int(row["goals"] or 0)
        stats["assists"] += int(row["assists"] or 0)
        stats["minutes"] += int(row["minutes_played"] or 0)

    records = []
    for player in read_gzip_csv("players.csv.gz"):
        if player["current_club_domestic_competition_id"] != COMPETITION:
            continue
        if not player["date_of_birth"] or not player["market_value_in_eur"]:
            continue
        stats = totals[player["player_id"]]
        if stats["appearances"] < 3 or stats["minutes"] < 180:
            continue
        age = age_on(player["date_of_birth"], latest_date)
        position = player["position"]
        minutes = stats["minutes"]
        values = {
            "age": age,
            **stats,
            "goals_per_90": stats["goals"] * 90 / minutes,
            "assists_per_90": stats["assists"] * 90 / minutes,
            "international_caps": number(player["international_caps"]),
            "is_forward": 1 if position == "Attack" else 0,
            "is_midfielder": 1 if position == "Midfield" else 0,
            "is_defender": 1 if position == "Defender" else 0,
            "is_goalkeeper": 1 if position == "Goalkeeper" else 0,
            "minutes_per_appearance": minutes / stats["appearances"],
        }
        records.append({
            "player_id": int(player["player_id"]),
            "name": player["name"],
            "club": player["current_club_name"],
            "position": position,
            "market_value_eur": int(player["market_value_in_eur"]),
            **values,
        })

    records.sort(key=lambda row: row["player_id"])
    X = np.array([[row[name] for name in FEATURES] for row in records], dtype=float)
    y_eur = np.array([row["market_value_eur"] for row in records], dtype=float)
    y = np.log1p(y_eur)

    rng = np.random.default_rng(42)
    indices = rng.permutation(len(records))
    split = int(len(records) * 0.8)
    train_idx, test_idx = indices[:split], indices[split:]
    mean, scale, weights = ridge_fit(X, y, train_idx)
    predicted = ridge_predict(X, mean, scale, weights, test_idx)
    actual = y_eur[test_idx]
    mae = float(np.mean(np.abs(predicted - actual)))
    r2 = float(1 - np.sum((actual - predicted) ** 2) / np.sum((actual - actual.mean()) ** 2))
    median_ape = float(np.median(np.abs(predicted - actual) / np.maximum(actual, 1)))
    residual_ratio = np.abs(predicted - actual) / np.maximum(predicted, 1)
    uncertainty = float(np.clip(np.quantile(residual_ratio, 0.68), 0.18, 0.75))

    folds = np.array_split(indices, 5)
    cross_validation = []
    for fold_index, fold in enumerate(folds):
        fold_train = np.concatenate([part for index, part in enumerate(folds) if index != fold_index])
        fold_mean, fold_scale, fold_weights = ridge_fit(X, y, fold_train)
        fold_prediction = ridge_predict(X, fold_mean, fold_scale, fold_weights, fold)
        fold_metrics = regression_metrics(fold_prediction, y_eur[fold])
        cross_validation.append(fold_metrics)

    boosted = GradientBoostingRegressor(random_state=42, n_estimators=180, learning_rate=0.035, max_depth=2, loss="huber")
    boosted.fit(X[train_idx], y[train_idx])
    boosted_prediction = np.maximum(np.expm1(boosted.predict(X[test_idx])), 0)
    boosted_metrics = regression_metrics(boosted_prediction, actual)
    position_models = {position: train_position_model(records, position) for position in ["Goalkeeper", "Defender", "Midfield", "Attack"]}

    bootstrap_rng = np.random.default_rng(2026)
    bootstrap_intercepts = []
    bootstrap_coefficients = []
    Xz = (X - mean) / scale
    for _ in range(120):
        sample = bootstrap_rng.choice(train_idx, size=len(train_idx), replace=True)
        design = np.column_stack([np.ones(len(sample)), Xz[sample]])
        penalty = np.eye(design.shape[1]) * 1.5
        penalty[0, 0] = 0
        sample_weights = np.linalg.solve(design.T @ design + penalty, design.T @ y[sample])
        bootstrap_intercepts.append(round(float(sample_weights[0]), 10))
        bootstrap_coefficients.append(sample_weights[1:].round(10).tolist())

    artifact = {
        "version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "competition": COMPETITION,
        "season": latest_season,
        "currency": "EUR",
        "target": "market_value_in_eur",
        "algorithm": "ridge_regression_on_log_target",
        "features": FEATURES,
        "mean": mean.round(8).tolist(),
        "scale": scale.round(8).tolist(),
        "intercept": float(weights[0]),
        "coefficients": weights[1:].round(10).tolist(),
        "uncertainty_ratio": uncertainty,
        "prediction_interval": {
            "method": "seeded_bootstrap_percentile_80",
            "seed": 2026,
            "samples": len(bootstrap_intercepts),
            "intercepts": bootstrap_intercepts,
            "coefficients": bootstrap_coefficients,
        },
        "position_models": position_models,
        "metrics": {
            "records": len(records),
            "train_records": len(train_idx),
            "test_records": len(test_idx),
            "mae_eur": round(mae),
            "r2": round(r2, 4),
            "median_absolute_percentage_error": round(median_ape, 4),
            "cross_validation": {
                "folds": 5,
                "r2_mean": round(float(np.mean([item["r2"] for item in cross_validation])), 4),
                "r2_std": round(float(np.std([item["r2"] for item in cross_validation])), 4),
                "mae_eur_mean": round(float(np.mean([item["mae_eur"] for item in cross_validation]))),
                "mae_eur_std": round(float(np.std([item["mae_eur"] for item in cross_validation]))),
            },
            "model_comparison": {
                "ridge": {"r2": round(r2, 4), "mae_eur": round(mae)},
                "gradient_boosted_trees": {"r2": round(boosted_metrics["r2"], 4), "mae_eur": round(boosted_metrics["mae_eur"])},
                "serving_choice": "ridge",
                "reason": "Ridge remains the serving baseline for stable, inspectable per-feature contributions.",
            },
        },
        "split": {"method": "seeded_random_80_20", "seed": 42},
        "source": {
            "name": "dcaribou/transfermarkt-datasets",
            "license": "CC0-1.0",
            "url": "https://github.com/dcaribou/transfermarkt-datasets",
        },
    }
    OUT.mkdir(exist_ok=True)
    (OUT / "valuation-model.json").write_text(json.dumps(artifact, indent=2) + "\n")
    scouting_matrix = np.array([[row[name] for name in SCOUT_FEATURES] for row in records], dtype=float)
    scouting_mean = scouting_matrix.mean(axis=0)
    scouting_scale = scouting_matrix.std(axis=0)
    scouting_scale[scouting_scale == 0] = 1
    scouting = {
        "version": f"scouting-neighbors-{MODEL_VERSION}",
        "created_at": artifact["trained_at"],
        "season": latest_season,
        "features": SCOUT_FEATURES,
        "method": "same-position standardized euclidean nearest neighbors",
        "mean": scouting_mean.round(8).tolist(),
        "scale": scouting_scale.round(8).tolist(),
        "source": artifact["source"],
        "players": [
            {
                "player_id": row["player_id"], "name": row["name"], "club": row["club"], "position": row["position"],
                "age": row["age"], "appearances": row["appearances"], "goals": row["goals"], "assists": row["assists"],
                "minutes": row["minutes"], "goals_per_90": round(row["goals_per_90"], 4), "assists_per_90": round(row["assists_per_90"], 4),
                "minutes_per_appearance": round(row["minutes_per_appearance"], 2), "international_caps": row["international_caps"],
                "market_value_eur": row["market_value_eur"],
                "vector": ((np.array([row[name] for name in SCOUT_FEATURES]) - scouting_mean) / scouting_scale).round(6).tolist(),
            }
            for row in records
        ],
    }
    (OUT / "scouting-index.json").write_text(json.dumps(scouting, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(artifact["metrics"], indent=2))


if __name__ == "__main__":
    main()
