import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import { recordError, recordSecurityEvent } from "../shared";
export { rateLimit } from "../shared";

export const kindSchema = z.enum(["squad", "transfer"]);
export const payloadSchema = z.object({
  url: z.string().startsWith("/").max(1800),
  summary: z.record(z.string(), z.union([z.string(), z.number(), z.array(z.number())])).optional(),
}).passthrough();
export const createPlanSchema = z.object({ kind: kindSchema, name: z.string().trim().min(1).max(80), description: z.string().trim().max(400).default(""), payload: payloadSchema });
export const updatePlanSchema = z.object({ name: z.string().trim().min(1).max(80).optional(), description: z.string().trim().max(400).optional(), payload: payloadSchema.optional(), visibility: z.enum(["private", "public"]).optional(), archived: z.boolean().optional(), expectedVersion: z.number().int().positive() }).refine((value) => Object.keys(value).some((key) => key !== "expectedVersion"), "No changes supplied");
export const inviteSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254), role: z.enum(["editor", "viewer"]) });
export const commentSchema = z.object({ body: z.string().trim().min(1).max(800), playerId: z.number().int().positive().nullable().optional() });

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

export type PlanRole = "owner" | "editor" | "viewer";

export async function planAccess(db: D1Database, id: string, user: { userId: string; email: string }) {
  const plan = await db.prepare(`SELECT p.*,
    CASE WHEN p.owner_id = ? THEN 'owner' ELSE m.role END AS access_role
    FROM workspace_plans p LEFT JOIN workspace_plan_members m
      ON m.plan_id = p.id AND (m.user_id = ? OR lower(m.email) = lower(?))
    WHERE p.id = ? AND (p.owner_id = ? OR m.id IS NOT NULL) LIMIT 1`)
    .bind(user.userId, user.userId, user.email, id, user.userId).first<Record<string, unknown>>();
  if (plan && plan.access_role !== "owner") await db.prepare("UPDATE workspace_plan_members SET user_id = ? WHERE plan_id = ? AND lower(email) = lower(?) AND user_id IS NULL").bind(user.userId, id, user.email).run();
  return plan;
}

export function canEdit(role: unknown) { return role === "owner" || role === "editor"; }

export function activity(db: D1Database, planId: string, user: { userId: string; email: string }, action: string, detail = "") {
  return db.prepare("INSERT INTO workspace_plan_activity (plan_id, actor_id, actor_email, action, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(planId, user.userId, user.email, action, detail, new Date().toISOString());
}

export function workspaceDenial(route: string, detail: string) {
  return recordSecurityEvent("authorization_denied", route, 403, null, detail);
}

export function publicSlug() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function validationError(error: unknown) {
  if (error instanceof z.ZodError) return Response.json({ error: "Invalid workspace request", issues: error.issues }, { status: 400 });
  const fingerprint = await recordError("/api/workspace", error);
  return Response.json({ error: "Workspace request failed", fingerprint }, { status: 500 });
}
