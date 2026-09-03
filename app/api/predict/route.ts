import model from "../../../data/valuation-model.json";
import { z } from "zod";
import { apiError, parse, rateLimit, recordEvent } from "../shared";

export const runtime = "edge";

type Input = { age: number; position: string; appearances: number; goals: number; assists: number; minutes: number; internationalCaps?: number };

const inputSchema = z.object({
  age: z.coerce.number().min(16).max(42), position: z.enum(["Attack", "Midfield", "Defender", "Goalkeeper"]),
  appearances: z.coerce.number().min(1).max(38), goals: z.coerce.number().min(0).max(45), assists: z.coerce.number().min(0).max(35),
  minutes: z.coerce.number().min(1).max(3420), internationalCaps: z.coerce.number().min(0).max(220).optional().default(0),
});

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
  const positionModels = model.position_models as Record<string, typeof model> | undefined;
  const serving = positionModels?.[position] ?? model;
  let logValue = serving.intercept;
  const logContributions = serving.features.map((feature, index) => ({ feature, impact: ((values[feature] - serving.mean[index]) / serving.scale[index]) * serving.coefficients[index] }));
  logContributions.forEach(({ impact }) => { logValue += impact; });
  const estimate = Math.max(250_000, Math.expm1(logValue));
  const samples = serving.prediction_interval.coefficients.map((coefficients, sampleIndex) => Math.max(250_000, Math.expm1(serving.prediction_interval.intercepts[sampleIndex] + coefficients.reduce((sum, coefficient, index) => sum + coefficient * ((values[serving.features[index]] - serving.mean[index]) / serving.scale[index]), 0)))).sort((a, b) => a - b);
  const labels: Record<string, string> = { age: "Age", appearances: "Availability", goals: "Goals", assists: "Assists", goals_per_90: "Goals / 90", assists_per_90: "Assists / 90", international_caps: "International caps", is_forward: "Forward role", is_midfielder: "Midfield role", is_defender: "Defender role", is_goalkeeper: "Goalkeeper role" };
  const contributions = logContributions.map(({ feature, impact }) => ({ feature, label: labels[feature] ?? feature, impactEur: Math.round(estimate * (Math.exp(impact) - 1)), direction: impact >= 0 ? "up" : "down" })).sort((a, b) => Math.abs(b.impactEur) - Math.abs(a.impactEur)).slice(0, 5);
  return { estimateEur: Math.round(estimate), lowEur: Math.round(samples[Math.floor(samples.length * .1)]), highEur: Math.round(samples[Math.floor(samples.length * .9)]), intervalMethod: serving.prediction_interval.method, modelScope: positionModels?.[position] ? `position:${position}` : "global", contributions, values };
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
  const positionModels = model.position_models as Record<string, { records: number; metrics: unknown }> | undefined;
  return Response.json({ version: model.version, season: model.season, algorithm: model.algorithm, metrics: model.metrics, source: model.source, features: model.features, positionModels: positionModels ? Object.fromEntries(Object.entries(positionModels).map(([position, value]) => [position, { records: value.records, metrics: value.metrics }])) : {} });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const limited = await rateLimit(request); if (limited) return limited;
  try {
    const input = parse(inputSchema, await request.json()) as Input;
    const result = predict(input);
    await persistPrediction(input, result.estimateEur);
    await recordEvent("/api/predict", 200, startedAt);
    return Response.json({ ...result, version: model.version, metrics: model.metrics, currency: model.currency });
  } catch (error) {
    await recordEvent("/api/predict", 400, startedAt); return apiError(error);
  }
}
