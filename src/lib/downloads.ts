// Downloadable documents.
//
// Files live in Directus, but the website never links there. Every document
// is served from /dateien/<id>/<filename>, see src/pages/dateien/[id]/[name].ts:
//   dev:   that endpoint fetches the file live from Directus on each request
//   build: Astro calls it once per file and writes the result into dist/,
//          so in production Cloudflare serves the file and Directus can be down.
//
// Pages and the endpoint both get their documents from the functions below,
// so every linked file is guaranteed to be built.
import client, { directusError, readSingletonSafe } from './directus';
import { readItems } from '@directus/sdk';

export type DownloadFile = {
  id: string;
  title?: string | null;
  filename_download?: string | null;
  type?: string | null;
  filesize?: number | null;
};

export type DownloadCategory = {
  name: string;
  files: { name: string; sort: number; file: DownloadFile }[];
};

const FILE_FIELDS = ['id', 'title', 'filename_download', 'type', 'filesize'];

/** File name used in the URL: the original name, made URL-safe */
export function fileSlug(file: DownloadFile): string {
  const name = file.filename_download || file.id;
  return name.normalize('NFKD').replace(/[^\w.\-]+/g, '_');
}

/** Public URL of a document on the website */
export function downloadUrl(file: DownloadFile): string {
  return `/files/${file.id}/${fileSlug(file)}`;
}

/** Categories with files, from download_categories or pfadiheim_download_categories */
export async function getDownloadCategories(
  collection: 'download_categories' | 'pfadiheim_download_categories',
): Promise<DownloadCategory[]> {
  try {
    const rows = (await client.request(
      readItems(collection as any, {
        filter: { status: { _eq: 'published' } },
        fields: ['name', 'files.name', 'files.sort', ...FILE_FIELDS.map((f) => `files.file.${f}`)],
        sort: ['sort'],
      } as any),
    )) as any[];

    return rows.map((c) => ({
      name: c.name,
      files: (c.files ?? [])
        .filter((f: any) => f.file)
        .sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0)),
    }));
  } catch (err) {
    console.warn(`[directus] ${collection}: ${directusError(err)}`);
    return [];
  }
}

/** Documents attached to the "altpfadiverein" singleton, as one category */
export async function getAltpfadivereinDokumente(): Promise<DownloadCategory[]> {
  const seite = await readSingletonSafe<{ dokumente?: { directus_files_id: DownloadFile | null }[] }>(
    'altpfadiverein',
    FILE_FIELDS.map((f) => `dokumente.directus_files_id.${f}`),
  );

  const files = (seite?.dokumente ?? [])
    .map((d) => d.directus_files_id)
    .filter((f): f is DownloadFile => Boolean(f));

  if (files.length === 0) return [];

  return [{
    name: 'Dokumente',
    files: files.map((file, i) => ({
      name: file.title || file.filename_download || 'Dokument',
      sort: i,
      file,
    })),
  }];
}

/** Every document linked anywhere on the site, without duplicates */
export async function getAllDownloadFiles(): Promise<DownloadFile[]> {
  const categories = (
    await Promise.all([
      getDownloadCategories('download_categories'),
      getDownloadCategories('pfadiheim_download_categories'),
      getAltpfadivereinDokumente(),
    ])
  ).flat();

  const byId = new Map<string, DownloadFile>();
  for (const category of categories) {
    for (const entry of category.files) byId.set(entry.file.id, entry.file);
  }
  return [...byId.values()];
}
