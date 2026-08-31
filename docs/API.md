# API reference

Base URL: `https://touchline-intelligence.zesty-mole-4007.chatgpt.site`

All responses are JSON. Invalid inputs return a `400` response with an `error` field.

## Player valuation

`GET /api/predict` returns model metadata, feature order, training season, source, and held-out metrics.

`POST /api/predict` accepts:

```json
{
  "age": 23,
  "position": "Attack",
  "appearances": 31,
  "goals": 14,
  "assists": 8,
  "minutes": 2410,
  "internationalCaps": 12
}
```

```bash
curl -X POST https://touchline-intelligence.zesty-mole-4007.chatgpt.site/api/predict \
  -H 'content-type: application/json' \
  -d '{"age":23,"position":"Attack","appearances":31,"goals":14,"assists":8,"minutes":2410,"internationalCaps":12}'
```

The response contains `estimateEur`, `lowEur`, `highEur`, derived feature values, model version, and held-out metrics. Valid positions are `Attack`, `Midfield`, `Defender`, and `Goalkeeper`.

## Similarity scouting

`GET /api/scouting?q=saka&position=Attack` searches by player or club name and optionally filters by broad position.

`GET /api/scouting?player_id=433177&max_age=25&max_value_eur=50000000&club=different` retrieves up to five same-position comparables.

| Parameter | Meaning |
| --- | --- |
| `player_id` | Selected player identifier |
| `max_age` | Maximum comparable-player age |
| `max_value_eur` | Maximum market value |
| `club` | `any`, `different`, or an exact club name |

Matches include a 0–100 similarity score and the three closest shared feature signals.

## Match forecast

`GET /api/matches` lists teams, current model state, split metadata, and test metrics.

`GET /api/matches?home_id=31&away_id=11` returns calibrated home-win, draw, and away-win probabilities. The two identifiers must be valid and different.

The response also reports the four largest model factors and which side each factor favours.
