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

async function notificarAlerta(datos) {
  const mensaje = construirMensaje(datos);
  const asunto = `⚠️ Alerta: ${datos.tipo || 'emergencia'} — ${datos.area || 'Invernaderos'}`;
  const email = await enviarEmail(asunto, mensaje);
  return { email };
}

module.exports = { notificarAlerta };