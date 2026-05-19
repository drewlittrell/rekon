import { handleWidgets } from "./handler";

export async function GET() {
  return handleWidgets();
}
