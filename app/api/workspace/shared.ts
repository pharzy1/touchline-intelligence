import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";

export const kindSchema = z.enum(["squad", "transfer"]);
export const payloadSchema = z.object({
  url: z.string().startsWith("/").max(1800),
  summary: z.record(z.string(), z.union([z.string(), z.number(), z.array(z.number())])).optional(),
}).passthrough();
export const createPlanSchema = z.object({ kind: kindSchema, name: z.string().trim().min(1).max(80), description: z.string().trim().max(400).default(""), payload: payloadSchema });
export const updatePlanSchema = z.object({ name: z.string().trim().min(1).max(80).optional(), description: z.string().trim().max(400).optional(), payload: payloadSchema.optional(), visibility: z.enum(["private", "public"]).optional(), archived: z.boolean().optional(), expectedVersion: z.number().int().positive() }).refine((value) => Object.keys(value).some((key) => key !== "expectedVersion"), "No changes supplied");

export async function workspaceContext() {
  const user = await getChatGPTUser();
  if (!user) return { error: Response.json({ error: "Sign in with ChatGPT to use your private workspace", signInUrl: "/signin-with-chatgpt?return_to=%2Fworkspace" }, { status: 401 }) } as const;
  const runtimeModule = "cloudflare:workers";
  const { env } = await import(/* @vite-ignore */ runtimeModule) as { env: { DB?: D1Database } };
  if (!env.DB) return { error: Response.json({ error: "Workspace storage is unavailable" }, { status: 503 }) } as const;
  return { user, db: env.DB } as const;
}

export function parsePlan(row: Record<string, unknown>) {
  return { ...row, archived: Boolean(row.archived), payload: JSON.parse(String(row.payload_json)), payload_json: undefined };
}

export function publicSlug() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validationError(error: unknown) {
  if (error instanceof z.ZodError) return Response.json({ error: "Invalid workspace request", issues: error.issues }, { status: 400 });
  console.error(JSON.stringify({ event: "workspace_error", message: error instanceof Error ? error.message : "Unknown failure" }));
  return Response.json({ error: "Workspace request failed" }, { status: 500 });
}
