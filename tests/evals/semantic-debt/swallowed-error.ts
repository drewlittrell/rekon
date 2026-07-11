export async function loadQueue(read: () => Promise<string[]>): Promise<string[]> {
  try {
    return await read();
  } catch {
    return [];
  }
}
