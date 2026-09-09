require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const PDFDocument = require('pdfkit');
const pool = require('./db');
const { notificarAlerta } = require('./notificaciones');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('trust proxy', 1);
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
      `SELECT u.id, u.username, u.password_hash, u.rol, u.empleado_id,
              e.nombre, e.apellido
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
             temp.valor AS temp_val,
             hum.valor AS hum_val,
             resp.nombre AS responsable_nombre,
             resp.apellido AS responsable_apellido
      FROM areas a
      LEFT JOIN LATERAL (
        SELECT l.valor
        FROM lecturas l
        JOIN sensores s ON s.id = l.sensor_id AND s.area_id = a.id AND s.tipo = 'temperatura'
        ORDER BY l.fecha_hora DESC LIMIT 1
      ) temp ON true
      LEFT JOIN LATERAL (
        SELECT l.valor
        FROM lecturas l
        JOIN sensores s ON s.id = l.sensor_id AND s.area_id = a.id AND s.tipo = 'humedad'
        ORDER BY l.fecha_hora DESC LIMIT 1
      ) hum ON true
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

app.post('/empleados/:id/editar', requiereAdmin, async (req, res) => {
  const { nombre, apellido, dni, telefono, email, tarea, area_id } = req.body;
  try {
    await pool.query(
      `UPDATE empleados SET nombre = $1, apellido = $2, dni = $3, telefono = $4, email = $5, tarea = $6, area_id = $7
       WHERE id = $8`,
      [nombre, apellido, dni, telefono, email, tarea, area_id || null, req.params.id]
    );
  } catch (err) {
    console.error(err);
  }
  res.redirect('/empleados');
});

// Ruta para editar usuario (actualiza usuarios + empleado vinculado)
app.post('/usuarios/editar/:id', requiereAdmin, async (req, res) => {
    const { id } = req.params;
    const { username, password, rol, activo, nombre, apellido, dni, telefono, email, tarea, area_id } = req.body;

    try {
        const usuarioResult = await pool.query('SELECT empleado_id FROM usuarios WHERE id = $1', [id]);
        if (usuarioResult.rows.length === 0) {
            return res.redirect('/usuarios');
        }
        const empleadoId = usuarioResult.rows[0].empleado_id;

        if (password && password.trim() !== '') {
            const hash = await bcrypt.hash(password, 10);
            await pool.query(
                'UPDATE usuarios SET username = $1, password_hash = $2, rol = $3, activo = $4 WHERE id = $5',
                [username, hash, rol, activo === 'on', id]
            );
        } else {
            await pool.query(
                'UPDATE usuarios SET username = $1, rol = $2, activo = $3 WHERE id = $4',
                [username, rol, activo === 'on', id]
            );
        }

        if (empleadoId) {
            await pool.query(
                `UPDATE empleados SET nombre = $1, apellido = $2, dni = $3, telefono = $4, email = $5, tarea = $6, area_id = $7
                 WHERE id = $8`,
                [nombre, apellido, dni, telefono, email, tarea, area_id || null, empleadoId]
            );
        } else if (nombre && apellido && dni) {
            const nuevoEmp = await pool.query(
                `INSERT INTO empleados (nombre, apellido, dni, telefono, email, tarea, area_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [nombre, apellido, dni, telefono, email, tarea, area_id || null]
            );
            await pool.query('UPDATE usuarios SET empleado_id = $1 WHERE id = $2', [nuevoEmp.rows[0].id, id]);
        }

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
      [req.session.usuario.empleado_id, req.params.id]
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
      [area_id, req.session.usuario.empleado_id, tipo, descripcion]
    );

    if (tipo === 'emergencia') {
      const areaResult = await pool.query('SELECT nombre FROM areas WHERE id = $1', [area_id]);
      notificarAlerta({
        area: areaResult.rows[0] ? areaResult.rows[0].nombre : String(area_id),
        tipo: 'emergencia',
        origen: 'empleado',
        descripcion: descripcion || 'Emergencia reportada manualmente',
      }).then(resultado => console.log('Notificación:', JSON.stringify(resultado)))
        .catch(err => console.error('Error al notificar:', err));
    }
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
      SELECT u.id, u.username, u.rol, u.activo, u.empleado_id,
             e.nombre, e.apellido, e.dni, e.telefono, e.email, e.tarea, e.area_id
      FROM usuarios u
      LEFT JOIN empleados e ON e.id = u.empleado_id
      ORDER BY u.username
    `);
    const empleados = await pool.query('SELECT id, nombre, apellido FROM empleados ORDER BY apellido');
    const areas = await pool.query('SELECT id, nombre FROM areas ORDER BY nombre');
    res.render('usuarios', {
      usuario: req.session.usuario,
      usuarios: result.rows,
      empleados: empleados.rows,
      areas: areas.rows,
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
// (lo ven tanto administradores como empleados)
// ============================================
function buildFiltrosLLamados(filtros = {}) {
  const condiciones = [];
  const valores = [];

  if (filtros.area_id) { valores.push(filtros.area_id); condiciones.push(`l.area_id = $${valores.length}`); }
  if (filtros.tipo) { valores.push(filtros.tipo); condiciones.push(`l.tipo = $${valores.length}`); }
  if (filtros.desde) { valores.push(filtros.desde); condiciones.push(`l.fecha_hora >= $${valores.length}`); }
  if (filtros.hasta) { valores.push(filtros.hasta); condiciones.push(`l.fecha_hora <= $${valores.length}`); }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return { where, valores };
}

function truncarParaPdf(texto, max) {
  texto = String(texto == null ? '' : texto).replace(/\s+/g, ' ').trim();
  return texto.length > max ? texto.slice(0, max - 1) + '…' : texto;
}

function dibujarEncabezadosPdf(doc, headers, x0, ancho, y) {
  doc.font('Helvetica-Bold').fontSize(8);
  let x = x0;
  headers.forEach(h => {
    doc.rect(x, y, h.width, 18).fill('#2e7d32');
    doc.fill('#ffffff').text(h.label, x + 4, y + 5, { width: h.width - 8 });
    x += h.width;
  });
  doc.fillColor('#000000');
  return y + 18;
}

app.get('/reportes', requiereLogin, async (req, res) => {
  const { area_id, tipo, desde, hasta } = req.query;
  const { where, valores } = buildFiltrosLLamados(req.query);

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

// Exportación de reportes a CSV o PDF (respeta los mismos filtros de la pantalla)
app.get('/reportes/exportar', requiereLogin, async (req, res) => {
  const formato = req.query.formato || 'csv';
  const { where, valores } = buildFiltrosLLamados(req.query);

  try {
    const result = await pool.query(
      `SELECT l.*, a.nombre AS area_nombre,
              emp.nombre AS atendido_nombre, emp.apellido AS atendido_apellido
       FROM llamados l
       JOIN areas a ON a.id = l.area_id
       LEFT JOIN empleados emp ON emp.id = l.atendido_por
       ${where}
       ORDER BY l.fecha_hora DESC`,
      valores
    );

    if (formato === 'csv') {
      const columnas = ['ID', 'Área', 'Tipo', 'Origen', 'Descripción', 'Estado', 'Fecha', 'Atendido por'];
      const filas = result.rows.map(l => [
        l.id,
        l.area_nombre,
        l.tipo,
        l.origen,
        truncarParaPdf(l.descripcion, 120).replace(/;/g, ' '),
        l.atendido ? 'Atendido' : 'Sin atender',
        new Date(l.fecha_hora).toLocaleString('es-AR'),
        l.atendido ? `${l.atendido_nombre || ''} ${l.atendido_apellido || ''}`.trim() : '',
      ]);
      const csv = [columnas.join(';'), ...filas.map(f => f.join(';'))].join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte_llamados.csv"');
      return res.send('\uFEFF' + csv);
    }

    // PDF
    const areasFiltro = await pool.query('SELECT id, nombre FROM areas');
    const nombreArea = areasFiltro.rows.find(a => String(a.id) === String(req.query.area_id));
    const etiquetas = [];
    if (req.query.area_id) etiquetas.push(`Área: ${nombreArea ? nombreArea.nombre : req.query.area_id}`);
    if (req.query.tipo) etiquetas.push(`Tipo: ${req.query.tipo}`);
    if (req.query.desde) etiquetas.push(`Desde: ${req.query.desde}`);
    if (req.query.hasta) etiquetas.push(`Hasta: ${req.query.hasta}`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_llamados.pdf"');
    doc.pipe(res);

    const ancho = doc.page.width - 100;
    const x0 = 50;
    const headers = [
      { label: 'Área', width: ancho * 0.17 },
      { label: 'Tipo', width: ancho * 0.09 },
      { label: 'Origen', width: ancho * 0.10 },
      { label: 'Descripción', width: ancho * 0.28 },
      { label: 'Estado', width: ancho * 0.11 },
      { label: 'Fecha', width: ancho * 0.25 },
    ];

    doc.font('Helvetica-Bold').fontSize(16).text('Reporte de llamados', { align: 'center' });
    doc.font('Helvetica').fontSize(9)
      .text(`Generado el ${new Date().toLocaleString('es-AR')}${etiquetas.length ? '  |  Filtros: ' + etiquetas.join(', ') : ''}`, { align: 'center' });
    doc.moveDown();

    let y = doc.y;
    y = dibujarEncabezadosPdf(doc, headers, x0, ancho, y);

    if (result.rows.length === 0) {
      doc.font('Helvetica').fontSize(10).text('No hay llamados que coincidan con los filtros aplicados.', x0, y + 16);
    } else {
      doc.font('Helvetica').fontSize(8);
      result.rows.forEach(l => {
        if (y > doc.page.height - 60) {
          doc.addPage();
          y = 50;
          y = dibujarEncabezadosPdf(doc, headers, x0, ancho, y);
        }
        const celdas = [
          truncarParaPdf(l.area_nombre, 26),
          l.tipo,
          l.origen,
          truncarParaPdf(l.descripcion, 60),
          l.atendido ? 'Atendido' : 'Sin atender',
          new Date(l.fecha_hora).toLocaleString('es-AR'),
        ];
        doc.rect(x0, y, ancho, 16).lineWidth(0.5).stroke('#cccccc');
        let x = x0;
        headers.forEach((h, i) => {
          doc.text(celdas[i], x + 3, y + 5, { width: h.width - 6 });
          x += h.width;
        });
        y += 16;
      });
    }

    y += 20;
    doc.font('Helvetica-Bold').fontSize(10).text(`Total de llamados: ${result.rows.length}`, x0, y);
    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al exportar el reporte');
  }
});

// ============================================
// PARÁMETROS DE SENSORES (rangos_config):
// definen cuándo la lectura dispara la alerta/buzzer
// ============================================
app.get('/parametros', requiereAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT rc.*, a.nombre AS area_nombre
      FROM rangos_config rc
      JOIN areas a ON a.id = rc.area_id
      ORDER BY a.nombre, rc.tipo_sensor
    `);
    const areas = await pool.query('SELECT id, nombre FROM areas ORDER BY nombre');
    res.render('parametros', {
      usuario: req.session.usuario,
      parametros: result.rows,
      areas: areas.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar parámetros');
  }
});

app.post('/parametros', requiereAdmin, async (req, res) => {
  const { area_id, tipo_sensor, valor_min, valor_max } = req.body;
  try {
    await pool.query(
      `INSERT INTO rangos_config (area_id, tipo_sensor, valor_min, valor_max)
       VALUES ($1, $2, $3, $4)`,
      [area_id, tipo_sensor, valor_min, valor_max]
    );
  } catch (err) {
    console.error(err);
  }
  res.redirect('/parametros');
});

app.post('/parametros/:id/editar', requiereAdmin, async (req, res) => {
  const { area_id, tipo_sensor, valor_min, valor_max } = req.body;
  try {
    await pool.query(
      `UPDATE rangos_config SET area_id = $1, tipo_sensor = $2, valor_min = $3, valor_max = $4
       WHERE id = $5`,
      [area_id, tipo_sensor, valor_min, valor_max, req.params.id]
    );
  } catch (err) {
    console.error(err);
  }
  res.redirect('/parametros');
});

app.post('/parametros/:id/eliminar', requiereAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM rangos_config WHERE id = $1', [req.params.id]);
  } catch (err) {
    console.error(err);
  }
  res.redirect('/parametros');
});

// ============================================
// API PÚBLICA: acá le pega el ESP32 (sin login, es un dispositivo, no una persona)
// ============================================
app.post('/api/lecturas', async (req, res) => {
  const { sensor_id, valor } = req.body;
  if (!sensor_id || valor === undefined) {
    return res.status(400).json({ error: 'Faltan sensor_id o valor' });
  }

  let alerta = false;

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
        alerta = true;
        await pool.query(
          `INSERT INTO llamados (area_id, origen, sensor_id, tipo, descripcion)
           VALUES ($1, 'sensor', $2, 'emergencia', $3)`,
          [area_id, sensor_id, `${tipo} fuera de rango: ${valor}`]
        );

        const areaResult = await pool.query('SELECT nombre FROM areas WHERE id = $1', [area_id]);
        notificarAlerta({
          area: areaResult.rows[0] ? areaResult.rows[0].nombre : String(area_id),
          tipo: 'emergencia',
          origen: 'sensor',
          descripcion: `${tipo} fuera de rango: ${valor} (límites ${valor_min} - ${valor_max})`,
        }).then(resultado => console.log('Notificación:', JSON.stringify(resultado)))
          .catch(err => console.error('Error al notificar:', err));
      }
    }

    res.status(201).json({ ok: true, alerta });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar la lectura' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

