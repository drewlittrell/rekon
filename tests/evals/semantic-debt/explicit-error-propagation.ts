export async function loadRequired(read: () => Promise<string | undefined>): Promise<string> {
  const value = await read();
  if (value === undefined) throw new Error("Required value was not found.");
  return value;
}
