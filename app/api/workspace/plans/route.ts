import { createPlanSchema, parsePlan, validationError, workspaceContext } from "../shared";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await workspaceContext(); if ("error" in context) return context.error;
  const includeArchived = new URL(request.url).searchParams.get("archived") === "all";
  try {
    const result = await context.db.prepare(`SELECT id, kind, name, description, payload_json, visibility, public_slug, archived, version, created_at, updated_at, (SELECT COUNT(*) FROM workspace_plan_versions v WHERE v.plan_id = workspace_plans.id) AS version_count FROM workspace_plans WHERE owner_id = ? ${includeArchived ? "" : "AND archived = 0"} ORDER BY updated_at DESC`).bind(context.user.userId).all();
    return Response.json({ user: { displayName: context.user.displayName, email: context.user.email }, plans: result.results.map((row) => parsePlan(row as Record<string, unknown>)) });
  } catch (error) { return validationError(error); }
}

export async function POST(request: Request) {
  const context = await workspaceContext(); if ("error" in context) return context.error;
  try {
    const input = createPlanSchema.parse(await request.json()); const id = crypto.randomUUID(); const now = new Date().toISOString(); const payload = JSON.stringify(input.payload);
    await context.db.batch([
      context.db.prepare("INSERT INTO workspace_plans (id, owner_id, kind, name, description, payload_json, visibility, public_slug, archived, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'private', NULL, 0, 1, ?, ?)").bind(id, context.user.userId, input.kind, input.name, input.description, payload, now, now),
      context.db.prepare("INSERT INTO workspace_plan_versions (plan_id, version, name, description, payload_json, created_at) VALUES (?, 1, ?, ?, ?, ?)").bind(id, input.name, input.description, payload, now),
    ]);
    return Response.json({ plan: { id, kind: input.kind, name: input.name, description: input.description, payload: input.payload, visibility: "private", public_slug: null, archived: false, version: 1, version_count: 1, created_at: now, updated_at: now } }, { status: 201 });
  } catch (error) { return validationError(error); }
}
