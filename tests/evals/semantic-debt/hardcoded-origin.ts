const API_ORIGIN = "https://api.production.example.com";

export async function loadAccount(id: string): Promise<Response> {
  return fetch(`${API_ORIGIN}/accounts/${id}`);
}
