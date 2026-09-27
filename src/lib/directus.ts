import { createDirectus, rest, staticToken, readSingleton } from '@directus/sdk';

const client = createDirectus(import.meta.env.DIRECTUS_URL)
  .with(staticToken(import.meta.env.DIRECTUS_TOKEN))
  .with(rest());

export default client;

type Transform = Record<string, string | number | boolean>;

/**
 * Add Directus image transformation parameters to an asset URL, e.g.
 * { width: 300, height: 300, fit: 'cover' }. Directus resizes the image
 * itself and applies the EXIF rotation of phone photos correctly.
 */
export function withTransform(url: string, transform: Transform): string {
  const u = new URL(url);
  for (const [key, value] of Object.entries(transform)) u.searchParams.set(key, String(value));
  return u.toString();
}

/** Full asset URL for a Directus file id, optionally resized by Directus */
export function assetUrl(id?: string | null, transform?: Transform): string | undefined {
  if (!id) return undefined;
  const url = `${import.meta.env.DIRECTUS_URL}/assets/${id}`;
  return transform ? withTransform(url, transform) : url;
}

/** One-line message from a Directus SDK error instead of the full response dump */
export function directusError(err: unknown): string {
  const e = err as { errors?: { message?: string }[]; message?: string };
  return e?.errors?.[0]?.message ?? e?.message ?? String(err);
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
    console.warn(`[directus] ${collection}: ${directusError(err)}`);
    return null;
  }
}