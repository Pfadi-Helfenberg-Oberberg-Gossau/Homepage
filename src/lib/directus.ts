import { createDirectus, rest, staticToken, readSingleton } from '@directus/sdk';

const client = createDirectus(import.meta.env.DIRECTUS_URL)
  .with(staticToken(import.meta.env.DIRECTUS_TOKEN))
  .with(rest());

export default client;

/** Full asset URL for a Directus file id, or undefined if there is none */
export function assetUrl(id?: string | null): string | undefined {
  return id ? `${import.meta.env.DIRECTUS_URL}/assets/${id}` : undefined;
}

/**
 * Read a singleton without breaking the build if the collection doesn't exist
 * yet or is empty. Returns null on failure so the page can render a fallback.
 */
export async function readSingletonSafe<T = Record<string, any>>(
  collection: string,
  fields: string[],
): Promise<T | null> {
  try {
    return (await client.request(readSingleton(collection as any, { fields } as any))) as T;
  } catch (err) {
    console.error(`readSingleton("${collection}") failed:`, err);
    return null;
  }
}
