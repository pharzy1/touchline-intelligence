import { z } from "zod";
import { activity, commentSchema, inviteSchema, planAccess, validationError, workspaceContext } from "../../../shared";

export const runtime = "edge";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("invite"), invite: inviteSchema }),
  z.object({ action: z.literal("comment"), comment: commentSchema }),
]);

export async function GET(_request: Request, { params }: Context) {
  const context = await workspaceContext(); if ("error" in context) return context.error;
  try {
    const { id } = await params; const plan = await planAccess(context.db, id, context.user);
    if (!plan) return Response.json({ error: "Plan not found" }, { status: 404 });
    const [members, comments, events] = await Promise.all([
      context.db.prepare("SELECT id, email, role, user_id, created_at FROM workspace_plan_members WHERE plan_id = ? ORDER BY created_at").bind(id).all(),
      context.db.prepare("SELECT id, author_email, body, player_id, created_at FROM workspace_plan_comments WHERE plan_id = ? ORDER BY created_at DESC LIMIT 100").bind(id).all(),
      context.db.prepare("SELECT id, actor_email, action, detail, created_at FROM workspace_plan_activity WHERE plan_id = ? ORDER BY created_at DESC LIMIT 100").bind(id).all(),
    ]);
    return Response.json({ role: plan.access_role, members: members.results, comments: comments.results, activity: events.results });
  } catch (error) { return validationError(error); }
}

export async function POST(request: Request, { params }: Context) {
  const context = await workspaceContext(); if ("error" in context) return context.error;
  try {
    const { id } = await params; const plan = await planAccess(context.db, id, context.user);
    if (!plan) return Response.json({ error: "Plan not found" }, { status: 404 });
    const input = requestSchema.parse(await request.json()); const now = new Date().toISOString();
    if (input.action === "invite") {
      if (plan.access_role !== "owner") return Response.json({ error: "Only the owner can manage access" }, { status: 403 });
      if (input.invite.email === context.user.email.toLowerCase()) return Response.json({ error: "You already own this plan" }, { status: 400 });
      const member = await context.db.prepare("SELECT id FROM workspace_plan_members WHERE plan_id = ? AND lower(email) = lower(?)").bind(id, input.invite.email).first<{ id: string }>();
      const memberId = member?.id ?? crypto.randomUUID();
      await context.db.batch([
        member ? context.db.prepare("UPDATE workspace_plan_members SET role = ? WHERE id = ?").bind(input.invite.role, memberId) : context.db.prepare("INSERT INTO workspace_plan_members (id, plan_id, email, user_id, role, invited_by, created_at) VALUES (?, ?, ?, NULL, ?, ?, ?)").bind(memberId, id, input.invite.email, input.invite.role, context.user.userId, now),
        activity(context.db, id, context.user, member ? "access_changed" : "invited", `${input.invite.email} · ${input.invite.role}`),
      ]);
      return Response.json({ member: { id: memberId, email: input.invite.email, role: input.invite.role, user_id: null, created_at: now } }, { status: member ? 200 : 201 });
    }
    const commentId = crypto.randomUUID();
    await context.db.batch([
      context.db.prepare("INSERT INTO workspace_plan_comments (id, plan_id, author_id, author_email, body, player_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(commentId, id, context.user.userId, context.user.email, input.comment.body, input.comment.playerId ?? null, now),
      activity(context.db, id, context.user, "commented", input.comment.playerId ? `Player ${input.comment.playerId}` : "Plan comment"),
    ]);
    return Response.json({ comment: { id: commentId, author_email: context.user.email, body: input.comment.body, player_id: input.comment.playerId ?? null, created_at: now } }, { status: 201 });
  } catch (error) { return validationError(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  const context = await workspaceContext(); if ("error" in context) return context.error;
  try {
    const { id } = await params; const plan = await planAccess(context.db, id, context.user);
    if (!plan) return Response.json({ error: "Plan not found" }, { status: 404 });
    if (plan.access_role !== "owner") return Response.json({ error: "Only the owner can revoke access" }, { status: 403 });
    const memberId = new URL(request.url).searchParams.get("member");
    if (!memberId) return Response.json({ error: "Member is required" }, { status: 400 });
    const member = await context.db.prepare("SELECT email FROM workspace_plan_members WHERE id = ? AND plan_id = ?").bind(memberId, id).first<{ email: string }>();
    if (!member) return Response.json({ error: "Collaborator not found" }, { status: 404 });
    await context.db.batch([
      context.db.prepare("DELETE FROM workspace_plan_members WHERE id = ? AND plan_id = ?").bind(memberId, id),
      activity(context.db, id, context.user, "access_revoked", member.email),
    ]);
    return new Response(null, { status: 204 });
  } catch (error) { return validationError(error); }
}
