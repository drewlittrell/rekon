import { requireAuth } from "../../infra/http/auth";
import { sessionIdentity } from "../../infra/Identity/session";

export async function GET() {
  requireAuth();
  return new Response(sessionIdentity());
}
