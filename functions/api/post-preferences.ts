import { Resend } from 'resend';

interface Env {
  RESEND_API_KEY: string;
  HERMES_FORM_ADDRESS: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CATEGORY_KEY_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const MAX_CATEGORIES = 50;
const MAX_NAME_LENGTH = 100;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function readText(data: FormData, field: string): string {
  return ((data.get(field) as string | null) ?? '').trim();
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const data = await context.request.formData();

  // Honeypot: pretend success so bots don't learn they were caught
  if (data.get('website')) {
    return jsonResponse({ ok: true }, 200);
  }

  const email = readText(data, 'email');
  const firstName = readText(data, 'firstName');
  const lastName = readText(data, 'lastName');
  const nickname = readText(data, 'nickname');

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return jsonResponse({ error: 'Bitte gib eine gültige E-Mail-Adresse ein.' }, 400);
  }

  if (!firstName || !lastName) {
    return jsonResponse({ error: 'Bitte gib Vor- und Nachnamen an.' }, 400);
  }

  if (firstName.length > MAX_NAME_LENGTH || lastName.length > MAX_NAME_LENGTH || nickname.length > MAX_NAME_LENGTH) {
    return jsonResponse({ error: 'Ein Name ist zu lang.' }, 400);
  }

  // Full desired state: no boxes checked is a valid answer (email only).
  // Only the format is checked here. Hermes decides whether a key exists.
  const postInformations = [...new Set(
    data.getAll('postInformations')
      .map((value) => String(value).trim())
      .filter((key) => CATEGORY_KEY_PATTERN.test(key))
  )];

  if (postInformations.length > MAX_CATEGORIES) {
    return jsonResponse({ error: 'Ungültige Auswahl.' }, 400);
  }

  // camelCase to match intake ("email") and Hermes' deserialization.
  // nickname is null when empty, so Hermes falls back to first + last name.
  const payload = {
    email,
    firstName,
    lastName,
    nickname: nickname || null,
    postInformations,
  };

  const resend = new Resend(context.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: 'Hermes Formular <hermes@forms.pfadigossau.ch>',
    to: context.env.HERMES_FORM_ADDRESS,
    subject: 'Hermes-Formular',
    text: JSON.stringify(payload),
  });

  if (error) {
    return jsonResponse({ error: 'Senden fehlgeschlagen.' }, 502);
  }

  return jsonResponse({ ok: true }, 200);
}