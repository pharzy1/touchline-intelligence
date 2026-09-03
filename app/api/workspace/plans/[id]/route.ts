import { parsePlan, publicSlug, updatePlanSchema, validationError, workspaceContext } from "../../shared";

export const runtime = "edge";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const context = await workspaceContext(); if ("error" in context) return context.error;
  try {
    const { id } = await params; const plan = await context.db.prepare("SELECT * FROM workspace_plans WHERE id = ? AND owner_id = ?").bind(id, context.user.userId).first<Record<string, unknown>>();
    if (!plan) return Response.json({ error: "Plan not found" }, { status: 404 });
    const versions = await context.db.prepare("SELECT id, version, name, description, payload_json, created_at FROM workspace_plan_versions WHERE plan_id = ? ORDER BY version DESC").bind(id).all();
    return Response.json({ plan: parsePlan(plan), versions: versions.results.map((row) => parsePlan(row as Record<string, unknown>)) });
  } catch (error) { return validationError(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  const context = await workspaceContext(); if ("error" in context) return context.error;
  try {
    const { id } = await params; const input = updatePlanSchema.parse(await request.json());
    const current = await context.db.prepare("SELECT * FROM workspace_plans WHERE id = ? AND owner_id = ?").bind(id, context.user.userId).first<Record<string, unknown>>();
    if (!current) return Response.json({ error: "Plan not found" }, { status: 404 });
    if (Number(current.version) !== input.expectedVersion) return Response.json({ error: "This plan changed elsewhere. Reload before saving.", currentVersion: current.version }, { status: 409 });
    const version = Number(current.version) + 1; const now = new Date().toISOString(); const name = input.name ?? String(current.name); const description = input.description ?? String(current.description); const payload = JSON.stringify(input.payload ?? JSON.parse(String(current.payload_json))); const visibility = input.visibility ?? String(current.visibility); const archived = input.archived === undefined ? Number(current.archived) : Number(input.archived); const slug = visibility === "public" ? String(current.public_slug ?? publicSlug()) : null;
    const results = await context.db.batch([
      context.db.prepare("UPDATE workspace_plans SET name = ?, description = ?, payload_json = ?, visibility = ?, public_slug = ?, archived = ?, version = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND version = ?").bind(name, description, payload, visibility, slug, archived, version, now, id, context.user.userId, input.expectedVersion),
      context.db.prepare("INSERT INTO workspace_plan_versions (plan_id, version, name, description, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(id, version, name, description, payload, now),
    ]);
    if (!results[0].meta.changes) return Response.json({ error: "This plan changed elsewhere. Reload before saving." }, { status: 409 });
    return Response.json({ plan: { ...parsePlan(current), name, description, payload: JSON.parse(payload), visibility, public_slug: slug, archived: Boolean(archived), version, version_count: Number(current.version) + 1, updated_at: now } });
  } catch (error) { return validationError(error); }
}

export async function DELETE(_request: Request, { params }: Context) {
  const context = await workspaceContext(); if ("error" in context) return context.error;
  try {
    const { id } = await params; const result = await context.db.prepare("DELETE FROM workspace_plans WHERE id = ? AND owner_id = ?").bind(id, context.user.userId).run();
    if (!result.meta.changes) return Response.json({ error: "Plan not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) { return validationError(error); }
}
