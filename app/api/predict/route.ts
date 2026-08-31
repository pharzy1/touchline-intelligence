import model from "../../../data/valuation-model.json";

export const runtime = "edge";

type Input = { age: number; position: string; appearances: number; goals: number; assists: number; minutes: number; internationalCaps?: number };

const limits = {
  age: [16, 42], appearances: [1, 38], goals: [0, 45], assists: [0, 35], minutes: [1, 3420], internationalCaps: [0, 220],
} as const;

function bounded(name: keyof typeof limits, value: unknown) {
  const numeric = Number(value);
  const [min, max] = limits[name];
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) throw new Error(`${name} must be between ${min} and ${max}`);
  return numeric;
}

function predict(input: Input) {
  const minutes = bounded("minutes", input.minutes);
  const position = String(input.position);
  if (!["Attack", "Midfield", "Defender", "Goalkeeper"].includes(position)) throw new Error("position is invalid");
  const values: Record<string, number> = {
    age: bounded("age", input.age), appearances: bounded("appearances", input.appearances), goals: bounded("goals", input.goals), assists: bounded("assists", input.assists), minutes,
    goals_per_90: Number(input.goals) * 90 / minutes,
    assists_per_90: Number(input.assists) * 90 / minutes,
    international_caps: bounded("internationalCaps", input.internationalCaps ?? 0),
    is_forward: position === "Attack" ? 1 : 0,
    is_midfielder: position === "Midfield" ? 1 : 0,
    is_defender: position === "Defender" ? 1 : 0,
    is_goalkeeper: position === "Goalkeeper" ? 1 : 0,
  };
  let logValue = model.intercept;
  model.features.forEach((feature, index) => { logValue += ((values[feature] - model.mean[index]) / model.scale[index]) * model.coefficients[index]; });
  const estimate = Math.max(250_000, Math.expm1(logValue));
  const spread = model.uncertainty_ratio;
  return { estimateEur: Math.round(estimate), lowEur: Math.round(estimate * (1 - spread)), highEur: Math.round(estimate * (1 + spread)), values };
}

async function persistPrediction(input: Input, estimateEur: number) {
  try {
    // Dynamic loading keeps the route testable in Node while resolving to the
    // native binding inside Cloudflare Workers.
    const runtimeModule = "cloudflare:workers";
    const { env } = await import(/* @vite-ignore */ runtimeModule) as { env: { DB?: D1Database } };
    if (!env.DB) return;
    await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO model_runs (version, trained_at, algorithm, records, r2, mae_eur, artifact_json) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(model.version, model.trained_at, model.algorithm, model.metrics.records, model.metrics.r2, model.metrics.mae_eur, JSON.stringify(model)),
      env.DB.prepare(`INSERT INTO predictions (model_version, input_json, estimate_eur, created_at) VALUES (?, ?, ?, ?)`).bind(model.version, JSON.stringify(input), estimateEur, new Date().toISOString()),
    ]);
  } catch {
    // Prediction remains available if analytics persistence is unavailable.
  }
}

export async function GET() {
  return Response.json({ version: model.version, season: model.season, algorithm: model.algorithm, metrics: model.metrics, source: model.source, features: model.features });
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as Input;
    const result = predict(input);
    await persistPrediction(input, result.estimateEur);
    return Response.json({ ...result, version: model.version, metrics: model.metrics, currency: model.currency });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
