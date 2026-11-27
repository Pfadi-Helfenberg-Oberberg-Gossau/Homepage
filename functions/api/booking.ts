import { Resend } from 'resend';

interface Env {
  RESEND_API_KEY: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

  const organisation = readText(data, 'organisation');
  const anlass = readText(data, 'anlass');
  const vorname = readText(data, 'vorname');
  const nachname = readText(data, 'nachname');
  const adresse = readText(data, 'adresse');
  const plz = readText(data, 'plz');
  const stadt = readText(data, 'stadt');
  const telefon = readText(data, 'telefon');
  const email = readText(data, 'email');
  const anzahl = readText(data, 'anzahl');
  const datumVon = readText(data, 'datum_von');
  const datumBis = readText(data, 'datum_bis');
  const betreff = readText(data, 'betreff');
  const bemerkung = readText(data, 'bemerkung');
  const wohnsitz = data.get('wohnsitz');

  const required = [organisation, anlass, vorname, nachname, adresse, plz, stadt, telefon, email, anzahl, datumVon, datumBis, betreff];
  if (required.some((value) => !value)) {
    return jsonResponse({ error: 'Bitte füllen Sie alle Pflichtfelder aus.' }, 400);
  }

  if (!wohnsitz) {
    return jsonResponse({ error: 'Bitte bestätigen Sie den Wohn- bzw. Firmensitz in der Schweiz.' }, 400);
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return jsonResponse({ error: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' }, 400);
  }

  const personen = Number(anzahl);
  if (!Number.isInteger(personen) || personen < 1) {
    return jsonResponse({ error: 'Bitte geben Sie eine gültige Anzahl Personen ein.' }, 400);
  }

  // ISO dates (YYYY-MM-DD) compare correctly as strings
  if (!DATE_PATTERN.test(datumVon) || !DATE_PATTERN.test(datumBis) || datumBis < datumVon) {
    return jsonResponse({ error: 'Bitte prüfen Sie die Daten. Das Enddatum darf nicht vor dem Startdatum liegen.' }, 400);
  }

  const text = [
    `Buchungsanfrage Pfadiheim`,
    ``,
    `Organisation: ${organisation}`,
    `Art des Anlasses: ${anlass}`,
    `Anzahl Personen: ${personen}`,
    `Datum: ${datumVon} bis ${datumBis}`,
    ``,
    `Kontakt: ${vorname} ${nachname}`,
    `Adresse: ${adresse}, ${plz} ${stadt}`,
    `Telefon: ${telefon}`,
    `E-Mail: ${email}`,
    `Wohnsitz/Firmensitz Schweiz: bestätigt`,
    ``,
    `Betreff: ${betreff}`,
    ``,
    `Bemerkung:`,
    bemerkung || '(keine)',
  ].join('\n');

  const resend = new Resend(context.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: 'Buchungsanfrage Pfadi Gossau <noreply@forms.pfadigossau.ch>',
    to: 'pfadiheim@pfadigossau.ch', 
    replyTo: email,
    subject: `Buchungsanfrage: ${betreff}`,
    text,
  });

  if (error) {
    return jsonResponse({ error: 'Senden fehlgeschlagen.' }, 502);
  }

  return jsonResponse({ ok: true }, 200);
}