import { z } from "zod";
import { rateLimit } from "../shared";
import { validationError, workspaceContext } from "../workspace/shared";

export const runtime = "edge";
export const dynamic = "force-dynamic";
const updateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read"), id: z.string().uuid() }),
  z.object({ action: z.literal("read_all") }),
  z.object({ action: z.literal("preferences"), collaborationEnabled: z.boolean(), weeklyEnabled: z.boolean() }),
]);

export async function GET(request: Request) {
  const limited = await rateLimit(request, 120); if (limited) return limited;
  const context = await workspaceContext(); if ("error" in context) return context.error;
  try {
    const [items, preference, queue] = await Promise.all([
      context.db.prepare("SELECT id, type, title, body, href, read_at, created_at FROM notifications WHERE lower(recipient_email) = lower(?) ORDER BY created_at DESC LIMIT 100").bind(context.user.email).all(),
      context.db.prepare("SELECT collaboration_enabled, weekly_enabled FROM notification_preferences WHERE lower(email) = lower(?)").bind(context.user.email).first<Record<string, number>>(),
      context.db.prepare("SELECT status, COUNT(*) AS count FROM notification_jobs WHERE lower(recipient_email) = lower(?) GROUP BY status").bind(context.user.email).all(),
    ]);
    const notifications = items.results; return Response.json({ notifications, unread: notifications.filter((item) => !item.read_at).length, preferences: { collaborationEnabled: preference ? Boolean(preference.collaboration_enabled) : true, weeklyEnabled: preference ? Boolean(preference.weekly_enabled) : true }, queue: queue.results });
  } catch (error) { return validationError(error); }
}

export async function PATCH(request: Request) {
  const limited = await rateLimit(request, 60); if (limited) return limited;
  const context = await workspaceContext(); if ("error" in context) return context.error;
  try {
    const input = updateSchema.parse(await request.json()); const now = new Date().toISOString();
    if (input.action === "read") await context.db.prepare("UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE id = ? AND lower(recipient_email) = lower(?)").bind(now, input.id, context.user.email).run();
    if (input.action === "read_all") await context.db.prepare("UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE lower(recipient_email) = lower(?)").bind(now, context.user.email).run();
    if (input.action === "preferences") await context.db.prepare("INSERT INTO notification_preferences (email, collaboration_enabled, weekly_enabled, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET collaboration_enabled = excluded.collaboration_enabled, weekly_enabled = excluded.weekly_enabled, updated_at = excluded.updated_at").bind(context.user.email.toLowerCase(), Number(input.collaborationEnabled), Number(input.weeklyEnabled), now).run();
    return Response.json({ ok: true });
  } catch (error) { return validationError(error); }
}

export async function DELETE(request: Request) {
  const limited = await rateLimit(request, 60); if (limited) return limited;
  const context = await workspaceContext(); if ("error" in context) return context.error;
  try {
    const id = z.string().uuid().parse(new URL(request.url).searchParams.get("id"));
    await context.db.prepare("DELETE FROM notifications WHERE id = ? AND lower(recipient_email) = lower(?)").bind(id, context.user.email).run();
    return new Response(null, { status: 204 });
  } catch (error) { return validationError(error); }
}
