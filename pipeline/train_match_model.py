#!/usr/bin/env python3
"""Train a time-ordered Premier League match outcome baseline."""

from __future__ import annotations

import csv
import gzip
import json
import math
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "work" / "source-data" / "games.csv.gz"
OUT = ROOT / "data" / "match-model.json"
FEATURES = ["elo_difference", "home_points_5", "away_points_5", "home_goal_difference_5", "away_goal_difference_5", "home_goals_for_5", "away_goals_for_5", "home_goals_against_5", "away_goals_against_5"]
CLASSES = ["home_win", "draw", "away_win"]


def average(items, key):
    return sum(item[key] for item in items) / len(items)


def softmax(logits):
    shifted = logits - logits.max(axis=1, keepdims=True)
    exp = np.exp(shifted)
    return exp / exp.sum(axis=1, keepdims=True)


def metrics(probabilities, target):
    chosen = probabilities[np.arange(len(target)), target]
    truth = np.eye(3)[target]
    return {
        "accuracy": round(float(np.mean(np.argmax(probabilities, axis=1) == target)), 4),
        "log_loss": round(float(-np.mean(np.log(np.maximum(chosen, 1e-12)))), 4),
        "brier_score": round(float(np.mean(np.sum((probabilities - truth) ** 2, axis=1))), 4),
    }


def main():
    games = []
    with gzip.open(SOURCE, "rt", encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["competition_id"] == "GB1" and row["home_club_goals"] != "" and row["away_club_goals"] != "":
                games.append(row)
    games.sort(key=lambda row: (row["date"], int(row["game_id"])))
    seasons = sorted({int(row["season"]) for row in games})
    latest, calibration_season = seasons[-1], seasons[-2]
    histories = defaultdict(lambda: deque(maxlen=5))
    elo = defaultdict(lambda: 1500.0)
    names = {}
    rows = []

    for game in games:
        home, away = game["home_club_id"], game["away_club_id"]
        names[home], names[away] = game["home_club_name"], game["away_club_name"]
        home_history, away_history = histories[home], histories[away]
        if len(home_history) == 5 and len(away_history) == 5:
            rows.append({
                "season": int(game["season"]),
                "features": [
                    elo[home] - elo[away], average(home_history, "points"), average(away_history, "points"),
                    average(home_history, "gd"), average(away_history, "gd"), average(home_history, "gf"),
                    average(away_history, "gf"), average(home_history, "ga"), average(away_history, "ga"),
                ],
                "target": 0 if int(game["home_club_goals"]) > int(game["away_club_goals"]) else 1 if int(game["home_club_goals"]) == int(game["away_club_goals"]) else 2,
            })
        hg, ag = int(game["home_club_goals"]), int(game["away_club_goals"])
        home_points, away_points = (3, 0) if hg > ag else (1, 1) if hg == ag else (0, 3)
        histories[home].append({"points": home_points, "gf": hg, "ga": ag, "gd": hg - ag, "result": "W" if hg > ag else "D" if hg == ag else "L"})
        histories[away].append({"points": away_points, "gf": ag, "ga": hg, "gd": ag - hg, "result": "W" if ag > hg else "D" if ag == hg else "L"})
        expected_home = 1 / (1 + 10 ** ((elo[away] - (elo[home] + 65)) / 400))
        actual_home = 1 if hg > ag else 0.5 if hg == ag else 0
        adjustment = 22 * (actual_home - expected_home)
        elo[home] += adjustment
        elo[away] -= adjustment

    X = np.array([row["features"] for row in rows], dtype=float)
    y = np.array([row["target"] for row in rows], dtype=int)
    season = np.array([row["season"] for row in rows], dtype=int)
    train = season < calibration_season
    calibration = season == calibration_season
    test = season == latest
    mean, scale = X[train].mean(axis=0), X[train].std(axis=0)
    scale[scale == 0] = 1
    Xz = (X - mean) / scale
    train_design = np.column_stack([np.ones(train.sum()), Xz[train]])
    weights = np.zeros((train_design.shape[1], 3))
    truth = np.eye(3)[y[train]]
    for step in range(5000):
        probability = softmax(train_design @ weights)
        gradient = train_design.T @ (probability - truth) / len(truth)
        gradient[1:] += 0.015 * weights[1:]
        weights -= 0.08 * gradient

    calibration_logits = np.column_stack([np.ones(calibration.sum()), Xz[calibration]]) @ weights
    temperatures = np.linspace(0.55, 2.2, 166)
    temperature = min(temperatures, key=lambda value: -np.mean(np.log(np.maximum(softmax(calibration_logits / value)[np.arange(calibration.sum()), y[calibration]], 1e-12))))
    test_logits = np.column_stack([np.ones(test.sum()), Xz[test]]) @ weights
    test_probability = softmax(test_logits / temperature)
    test_target = y[test]
    always_home_accuracy = float(np.mean(test_target == 0))
    majority_class = int(np.bincount(test_target, minlength=3).argmax())
    majority_accuracy = float(np.mean(test_target == majority_class))
    elo_favorite = np.where(X[test, 0] + 65 >= 0, 0, 2)
    elo_favorite_accuracy = float(np.mean(elo_favorite == test_target))
    current_clubs = {game["home_club_id"] for game in games if int(game["season"]) == latest} | {game["away_club_id"] for game in games if int(game["season"]) == latest}
    teams = []
    for club_id in sorted(current_clubs, key=lambda value: names[value]):
        history = list(histories[club_id])
        teams.append({
            "club_id": int(club_id), "name": names[club_id], "elo": round(elo[club_id], 2),
            "form": "".join(item["result"] for item in history),
            "points_5": round(average(history, "points"), 3), "goal_difference_5": round(average(history, "gd"), 3),
            "goals_for_5": round(average(history, "gf"), 3), "goals_against_5": round(average(history, "ga"), 3),
        })
    artifact = {
        "version": "match-softmax-2025-v1", "trained_at": datetime.now(timezone.utc).isoformat(), "competition": "GB1",
        "latest_season": latest, "calibration_season": calibration_season, "algorithm": "regularized_multinomial_logistic_regression",
        "classes": CLASSES, "features": FEATURES, "mean": mean.round(8).tolist(), "scale": scale.round(8).tolist(),
        "weights": weights.round(10).tolist(), "temperature": round(float(temperature), 4),
        "split": {"method": "season_ordered", "train_through": calibration_season - 1, "calibration_season": calibration_season, "test_season": latest},
        "metrics": {"train_matches": int(train.sum()), "calibration_matches": int(calibration.sum()), "test_matches": int(test.sum()), **metrics(test_probability, test_target),
                    "baselines": {"always_home_accuracy": round(always_home_accuracy, 4), "majority_class": CLASSES[majority_class], "majority_class_accuracy": round(majority_accuracy, 4), "elo_favorite_accuracy": round(elo_favorite_accuracy, 4)}},
        "teams": teams,
        "source": {"name": "dcaribou/transfermarkt-datasets", "license": "CC0-1.0", "url": "https://github.com/dcaribou/transfermarkt-datasets"},
    }
    OUT.write_text(json.dumps(artifact, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(artifact["metrics"], indent=2))


if __name__ == "__main__":
    main()
