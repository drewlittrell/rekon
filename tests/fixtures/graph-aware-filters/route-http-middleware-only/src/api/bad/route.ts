import { db } from "../../infra/Database/client";

export async function GET() {
  return new Response(db());
}
