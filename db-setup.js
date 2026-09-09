// Crea (o deja listo) el esquema de la base de datos y, si no hay usuarios
// y se definió ADMIN_PASSWORD, crea el primer administrador.
// Es idempotente: se puede correr las veces que quieras.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const pool = require('./db');

const CVE_DUPLICADO = '42P07';

function dividirSentencias(sql) {
  return sql
    .split(';')
    .map(s =>
      s
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('--') && !/^\\/.test(l))
        .join('\n')
        .trim()
    )
    .filter(s => s.length > 0);
}

async function main() {
  const esquema = fs.readFileSync(path.join(__dirname, 'esquema_invernaderos.sql'), 'utf8');
  const sentencias = dividirSentencias(esquema);

  for (const s of sentencias) {
    try {
      await pool.query(s);
    } catch (err) {
      if (err.code === CVE_DUPLICADO) {
        console.log('Ya existía:', s.split('\n')[0].replace('CREATE TABLE', '').trim());
      } else {
        console.error('Error ejecutando:', s.slice(0, 80));
        console.error(err);
      }
    }
  }

  const usuarios = await pool.query('SELECT COUNT(*) AS total FROM usuarios');
  const hayUsuarios = Number(usuarios.rows[0].total) > 0;

  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASSWORD;

  if (pass && pass.length > 0) {
    const hash = bcrypt.hashSync(pass, 10);
    if (!hayUsuarios) {
      await pool.query(
        `INSERT INTO usuarios (username, password_hash, rol, activo)
         VALUES ($1, $2, 'administrador', true)`,
        [user, hash]
      );
      console.log(`Usuario administrador "${user}" creado.`);
    } else {
      await pool.query(
        `UPDATE usuarios SET password_hash = $1
         WHERE username = $2 AND rol = 'administrador'`,
        [hash, user]
      );
      console.log(`Contraseña del administrador "${user}" sincronizada con ADMIN_PASSWORD.`);
    }
  } else {
    console.log('ADMIN_PASSWORD no definido. Sin administrador por defecto.');
  }

  console.log('Setup de base de datos terminado.');
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});