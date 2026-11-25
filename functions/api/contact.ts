import { Resend } from 'resend';

interface Env {
  RESEND_API_KEY: string;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const data = await context.request.formData();

  // Honeypot: pretend success so bots don't learn they were caught
  if (data.get('website')) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const name = data.get('name') as string;
  const email = data.get('email') as string;
  const betreff = data.get('betreff') as string;
  const nachricht = data.get('nachricht') as string;

  if (!name || !email || !betreff || !nachricht) {
    return new Response(JSON.stringify({ error: 'Fehlende Felder' }), { status: 400 });
  }

  const resend = new Resend(context.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: 'Kontaktformular Pfadi Gossau <noreply@forms.pfadigossau.ch>',
    to: 'info@pfadigossau.ch',
    replyTo: email,
    subject: betreff,
    text: `Von: ${name} <${email}>\n\nBetreff: ${betreff}\n\n${nachricht}`,
  });

  if (error) {
    return new Response(JSON.stringify({ error: 'Senden fehlgeschlagen' }), { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}