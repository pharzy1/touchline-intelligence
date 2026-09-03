import { getChatGPTUser } from "../../chatgpt-auth";
import { recordSecurityEvent } from "../shared";

export async function operationsContext() {
  const user = await getChatGPTUser();
  if (!user) {
    await recordSecurityEvent("operations_unauthenticated", "/api/operations", 401, null);
    return { error: Response.json({ error: "Sign in to access operations" }, { status: 401 }) } as const;
  }
  const runtimeModule = "cloudflare:workers";
  const { env } = await import(/* @vite-ignore */ runtimeModule) as { env: { DB?: D1Database; OPS_ADMIN_EMAILS?: string } };
  const allowed = new Set((env.OPS_ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!allowed.has(user.email.toLowerCase())) {
    await recordSecurityEvent("operations_forbidden", "/api/operations", 403, null);
    return { error: Response.json({ error: "Operations access is restricted" }, { status: 403 }) } as const;
  }
  if (!env.DB) return { error: Response.json({ error: "Operations database unavailable" }, { status: 503 }) } as const;
  return { user, db: env.DB } as const;
}
