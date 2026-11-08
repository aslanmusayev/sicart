// Browser helper for POST /api/session/:cartId/:action.
import type { SessionState } from "./types";

export class ActionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function sendAction(
  cartId: number,
  action: string,
  body: Record<string, unknown> = {},
  pin?: string,
): Promise<SessionState> {
  const res = await fetch(`/api/session/${cartId}/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(pin ? { "x-demo-pin": pin } : {}) },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new ActionError(json.error ?? "Request failed", res.status);
  return json as SessionState;
}
