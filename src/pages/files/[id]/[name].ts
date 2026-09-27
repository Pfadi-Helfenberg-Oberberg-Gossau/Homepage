// Serves every document under /dateien/<id>/<filename>.
// In production this runs once per file at build time and the result is
// written to dist/, so Cloudflare serves the file. See src/lib/downloads.ts.
import type { APIRoute } from 'astro';
import { getAllDownloadFiles, fileSlug, type DownloadFile } from '@/lib/downloads';

export async function getStaticPaths() {
  const files = await getAllDownloadFiles();
  return files.map((file) => ({
    params: { id: file.id, name: fileSlug(file) },
    props: { file },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const file = props.file as DownloadFile;
  const res = await fetch(`${import.meta.env.DIRECTUS_URL}/assets/${file.id}`, {
    headers: { Authorization: `Bearer ${import.meta.env.DIRECTUS_TOKEN}` },
  });

  // Fail the build loudly: a silently missing document is worse than a red build
  if (!res.ok) {
    throw new Error(`Download ${file.id} (${file.filename_download}) failed: HTTP ${res.status}`);
  }

  return new Response(await res.arrayBuffer(), {
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  });
};
