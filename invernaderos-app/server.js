require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // para que el ESP32 pueda mandar JSON

app.use(session({
  secret: process.env.SESSION_SECRET || 'secreto_temporal',
  resave: false,
  saveUninitialized: false,
}));

// ---------- Middleware: protege rutas que necesitan login ----------
function requiereLogin(req, res, next) {
  if (!req.session.usuario) return res.redirect('/');
  next();
}

// ---------- Middleware: protege rutas exclusivas del administrador ----------
function requiereAdmin(req, res, next) {
  if (!req.session.usuario) return res.redirect('/');
  if (req.session.usuario.rol !== 'administrador') {
    return res.status(403).send('No tenés permiso para ver esta sección (es solo para administradores)');
  }
  next();
}

// ============================================
// LOGIN
// ============================================
app.get('/', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.password_hash, u.rol, e.nombre, e.apellido
       FROM usuarios u
       LEFT JOIN empleados e ON e.id = u.empleado_id
       WHERE u.username = $1 AND u.activo = true`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.render('login', { error: 'Usuario o contraseña incorrectos' });
    }

    const usuario = result.rows[0];
    const passwordOk = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordOk) {
      return res.render('login', { error: 'Usuario o contraseña incorrectos' });
    }

    req.session.usuario = usuario;
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Error del servidor, revisá la consola' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ============================================
// DASHBOARD: áreas con su última lectura + llamados recientes
// ============================================
app.get('/dashboard', requiereLogin, async (req, res) => {
  try {
    const areasResult = await pool.query(`
      SELECT a.id, a.nombre,
             s.tipo,
             l.valor,
             resp.nombre AS responsable_nombre,
             resp.apellido AS responsable_apellido
      FROM areas a
      LEFT JOIN sensores s ON s.area_id = a.id
      LEFT JOIN LATERAL (
        SELECT valor FROM lecturas WHERE sensor_id = s.id
        ORDER BY fecha_hora DESC LIMIT 1
      ) l ON true
      LEFT JOIN LATERAL (
        SELECT nombre, apellido FROM empleados WHERE area_id = a.id LIMIT 1
      ) resp ON true
      ORDER BY a.nombre
    `);

    const llamadosResult = await pool.query(`
      SELECT l.*, a.nombre AS area_nombre
      FROM llamados l
      JOIN areas a ON a.id = l.area_id
      ORDER BY l.fecha_hora DESC
      LIMIT 10
    `);

    res.render('dashboard', {
      usuario: req.session.usuario,
      areas: areasResult.rows,
      llamados: llamadosResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar el dashboard');
  }
});

// ============================================
// EMPLEADOS: listar y crear
// ============================================
app.get('/empleados', requiereAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, a.nombre AS area_nombre
      FROM empleados e
      LEFT JOIN areas a ON a.id = e.area_id
      ORDER BY e.apellido
    `);
    const areas = await pool.query('SELECT id, nombre FROM areas ORDER BY nombre');
    res.render('empleados', {
      usuario: req.session.usuario,
      empleados: result.rows,
      areas: areas.rows,
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar empleados');
  }
});

app.post('/empleados', requiereAdmin, async (req, res) => {
  const { nombre, apellido, dni, telefono, tarea, area_id } = req.body;
  try {
    await pool.query(
      `INSERT INTO empleados (nombre, apellido, dni, telefono, tarea, area_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [nombre, apellido, dni, telefono, tarea, area_id || null]
    );
    res.redirect('/empleados');
  } catch (err) {
    console.error(err);
    res.redirect('/empleados');
  }
});

app.post('/empleados/:id/eliminar', requiereAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM empleados WHERE id = $1', [req.params.id]);
  } catch (err) {
    console.error(err);
  }
  res.redirect('/empleados');
});

// Ruta para editar usuario (sin dependencia de nombres de middleware externos)
app.post('/usuarios/editar/:id', async (req, res) => {
    // Verificación de sesión directa
    if (!req.session || !req.session.usuario) {
        return res.redirect('/login');
    }

    const { id } = req.params;
    const { nombre, apellido, dni, telefono, email, rol, area } = req.body;

    try {
        await db.query(
            `UPDATE usuarios 
             SET nombre = ?, apellido = ?, dni = ?, telefono = ?, email = ?, rol = ?, area = ? 
             WHERE id = ?`,
            [nombre, apellido, dni, telefono, email, rol, area, id]
        );
        res.redirect('/usuarios?msg=Usuario actualizado correctamente');
    } catch (error) {
        console.error('Error al editar usuario:', error);
        res.status(500).send('Error interno al actualizar el usuario');
    }
});

// ============================================
// LLAMADOS: listar (con filtros) y marcar como atendido
// ============================================
app.get('/llamados', requiereLogin, async (req, res) => {
  const { tipo, area_id } = req.query;
  const condiciones = [];
  const valores = [];

  if (tipo) {
    valores.push(tipo);
    condiciones.push(`l.tipo = $${valores.length}`);
  }
  if (area_id) {
    valores.push(area_id);
    condiciones.push(`l.area_id = $${valores.length}`);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT l.*, a.nombre AS area_nombre
       FROM llamados l
       JOIN areas a ON a.id = l.area_id
       ${where}
       ORDER BY l.fecha_hora DESC`,
      valores
    );
    const areas = await pool.query('SELECT id, nombre FROM areas ORDER BY nombre');
    res.render('llamados', {
      usuario: req.session.usuario,
      llamados: result.rows,
      areas: areas.rows,
      filtroTipo: tipo || '',
      filtroArea: area_id || '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar llamados');
  }
});

app.post('/llamados/:id/atender', requiereLogin, async (req, res) => {
  try {
    await pool.query(
      `UPDATE llamados SET atendido = true, atendido_por = $1, fecha_atencion = NOW()
       WHERE id = $2`,
      [req.session.usuario.id, req.params.id]
    );
  } catch (err) {
    console.error(err);
  }
  res.redirect('/llamados');
});

// Un empleado también puede generar un llamado manual (emergencia reportada a mano)
app.post('/llamados', requiereLogin, async (req, res) => {
  const { area_id, tipo, descripcion } = req.body;
  try {
    await pool.query(
      `INSERT INTO llamados (area_id, origen, empleado_id, tipo, descripcion)
       VALUES ($1, 'empleado', $2, $3, $4)`,
      [area_id, req.session.usuario.id, tipo, descripcion]
    );
  } catch (err) {
    console.error(err);
  }
  res.redirect('/llamados');
});

// ============================================
// USUARIOS: listar y crear (solo administrador debería poder,
// simplificado para la entrega — TODO: restringir por rol)
// ============================================
app.get('/usuarios', requiereAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.rol, u.activo, e.nombre, e.apellido
      FROM usuarios u
      LEFT JOIN empleados e ON e.id = u.empleado_id
      ORDER BY u.username
    `);
    const empleados = await pool.query('SELECT id, nombre, apellido FROM empleados ORDER BY apellido');
    res.render('usuarios', {
      usuario: req.session.usuario,
      usuarios: result.rows,
      empleados: empleados.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar usuarios');
  }
});

app.post('/usuarios', requiereAdmin, async (req, res) => {
  const { username, password, rol, empleado_id } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO usuarios (username, password_hash, rol, empleado_id, activo)
       VALUES ($1, $2, $3, $4, true)`,
      [username, hash, rol, empleado_id || null]
    );
    res.redirect('/usuarios');
  } catch (err) {
    console.error(err);
    res.redirect('/usuarios');
  }
});

app.post('/usuarios/:id/eliminar', requiereAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
  } catch (err) {
    console.error(err);
  }
  res.redirect('/usuarios');
});



// ============================================
// REPORTES: conteo de llamados con filtros
// ============================================
app.get('/reportes', requiereAdmin, async (req, res) => {
  const { area_id, tipo, desde, hasta } = req.query;
  const condiciones = [];
  const valores = [];

  if (area_id) { valores.push(area_id); condiciones.push(`l.area_id = $${valores.length}`); }
  if (tipo) { valores.push(tipo); condiciones.push(`l.tipo = $${valores.length}`); }
  if (desde) { valores.push(desde); condiciones.push(`l.fecha_hora >= $${valores.length}`); }
  if (hasta) { valores.push(hasta); condiciones.push(`l.fecha_hora <= $${valores.length}`); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const resumen = await pool.query(`
      SELECT tipo, atendido, COUNT(*) AS cantidad
      FROM llamados l
      ${where}
      GROUP BY tipo, atendido
      ORDER BY tipo
    `, valores);

    const areas = await pool.query('SELECT id, nombre FROM areas ORDER BY nombre');

    res.render('reportes', {
      usuario: req.session.usuario,
      resumen: resumen.rows,
      areas: areas.rows,
      filtros: { area_id: area_id || '', tipo: tipo || '', desde: desde || '', hasta: hasta || '' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar reportes');
  }
});

// ============================================
// API PÚBLICA: acá le pega el ESP32 (sin login, es un dispositivo, no una persona)
// ============================================
app.post('/api/lecturas', async (req, res) => {
  const { sensor_id, valor } = req.body;
  if (!sensor_id || valor === undefined) {
    return res.status(400).json({ error: 'Faltan sensor_id o valor' });
  }

  try {
    await pool.query('INSERT INTO lecturas (sensor_id, valor) VALUES ($1, $2)', [sensor_id, valor]);

    const sensorResult = await pool.query('SELECT area_id, tipo FROM sensores WHERE id = $1', [sensor_id]);
    if (sensorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor no encontrado' });
    }
    const { area_id, tipo } = sensorResult.rows[0];

    const rangoResult = await pool.query(
      'SELECT valor_min, valor_max FROM rangos_config WHERE area_id = $1 AND tipo_sensor = $2',
      [area_id, tipo]
    );

    if (rangoResult.rows.length > 0) {
      const { valor_min, valor_max } = rangoResult.rows[0];
      if (valor < valor_min || valor > valor_max) {
        await pool.query(
          `INSERT INTO llamados (area_id, origen, sensor_id, tipo, descripcion)
           VALUES ($1, 'sensor', $2, 'emergencia', $3)`,
          [area_id, sensor_id, `${tipo} fuera de rango: ${valor}`]
        );
      }
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar la lectura' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

