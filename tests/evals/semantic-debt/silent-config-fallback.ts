type Config = { retries: number };

export function parseConfig(text: string): Config {
  try {
    return JSON.parse(text) as Config;
  } catch {
    return { retries: 0 };
  }
}
