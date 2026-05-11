import { createDirectus, rest, staticToken } from '@directus/sdk';

const client = createDirectus(import.meta.env.DIRECTUS_URL)
  .with(staticToken(import.meta.env.DIRECTUS_TOKEN))
  .with(rest());

export default client;