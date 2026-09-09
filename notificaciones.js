require('dotenv').config();

function construirMensaje(datos) {
  return [
    '⚠️ ALERTA — SISTEMA DE INVERNADEROS',
    `Área: ${datos.area || 'desconocida'}`,
    `Tipo: ${datos.tipo || 'emergencia'}`,
    `Origen: ${datos.origen || 'sistema'}`,
    `Descripción: ${datos.descripcion || 'sin detalles'}`,
    `Fecha/Hora: ${new Date().toLocaleString('es-AR')}`,
  ].join('\n');
}

function enviarEmail(asunto, texto) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, EMAIL_TO } = process.env;
  if (!SMTP_HOST || !EMAIL_FROM || !EMAIL_TO) return Promise.resolve('no configurado');
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return transport
    .sendMail({ from: EMAIL_FROM, to: EMAIL_TO, subject: asunto, text: texto })
    .then(() => 'ok')
    .catch(err => `error: ${err.message}`);
}

function enviarWhatsApp(mensaje) {
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  const desde = process.env.TWILIO_WHATSAPP_FROM;
  const para = process.env.TWILIO_WHATSAPP_TO;
  if (!sid || !token || !desde || !para) return Promise.resolve('no configurado');
  const body = new URLSearchParams({
    To: `whatsapp:${para}`,
    From: `whatsapp:${desde}`,
    Body: mensaje,
  });
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  return fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: body.toString(),
  })
    .then(async r => {
      if (r.ok) return 'ok';
      const data = await r.json().catch(() => null);
      return `error HTTP ${r.status}: ${data && data.message}`;
    })
    .catch(err => `error: ${err.message}`);
}

async function notificarAlerta(datos) {
  const mensaje = construirMensaje(datos);
  const asunto = `⚠️ Alerta: ${datos.tipo || 'emergencia'} — ${datos.area || 'Invernaderos'}`;
  const [email, whatsapp] = await Promise.all([
    enviarEmail(asunto, mensaje),
    enviarWhatsApp(mensaje),
  ]);
  return { email, whatsapp };
}

module.exports = { notificarAlerta };