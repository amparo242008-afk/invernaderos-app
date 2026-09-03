# Invernaderos — Sistema de gestión

Proyecto único: backend (API + lógica) y frontend (vistas EJS) juntos en el
mismo servidor Node/Express. Recibe datos del ESP32, los guarda en
PostgreSQL, genera llamados automáticos si algo está fuera de rango, y
muestra todo en un panel web con login.

## 1. Crear la base de datos
Con PostgreSQL instalado, creá una base llamada `invernaderos` y ejecutá
ahí el archivo `esquema_invernaderos.sql` (desde pgAdmin: click derecho en
la base > Query Tool > pegar el contenido del archivo > ejecutar).

## 2. Configurar el proyecto
Copiá `.env.example` como `.env` y completá `DB_PASSWORD` con tu contraseña
real de Postgres.

## 3. Instalar dependencias
```
npm install
```

## 4. Crear tu primer usuario (importante, sin esto no podés loguearte)
Las contraseñas no se guardan como texto plano, se guarda un "hash". Para
generar uno, corré esto en la terminal (reemplazá `tuPassword123` por la
contraseña que quieras usar):

```
node -e "console.log(require('bcrypt').hashSync('tuPassword123', 10))"
```

Te va a imprimir algo como `$2b$10$abc123...`. Copiá ese texto completo.

Después, en pgAdmin, insertá una fila en la tabla `usuarios` con:
- `username`: el que quieras (ej: `admin`)
- `password_hash`: el texto que copiaste
- `rol`: `administrador`
- `activo`: `true`
(el `empleado_id` lo podés dejar vacío por ahora)

## 5. Levantar el servidor
```
npm start
```
Entrá a `http://localhost:3000` y logueate con el usuario que creaste.

## 6. Cargar datos de prueba para ver el dashboard con contenido
Insertá manualmente en pgAdmin:
- Una fila en `areas` (ej: "Invernadero 1")
- Una fila en `sensores` apuntando a esa área (`area_id`, `tipo`: temperatura)
- Una fila en `rangos_config` con `valor_min` y `valor_max` para esa área/tipo

## Qué le falta a esto todavía (para seguir después de la entrega urgente)
- Editar empleados (hoy solo se puede agregar y eliminar)
- Pantalla de reportes con gráficos y exportación a PDF/CSV
- Conectar el ESP32 real (el endpoint `POST /api/lecturas` ya está listo
  y probado, falta cargar el `.ino` en la placa)
