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

## 7. Desplegar en Render (para que funcione sin "localhost")
El proyecto ya trae un `render.yaml` (blueprint). Pasos:

1. Subí el repo a GitHub (dejalo en privado: la base tiene datos personales).
2. Entrá a [render.com](https://render.com) con tu cuenta de GitHub.
3. Botón **New → Blueprint**, elegí el repo, y Render arma solo:
   - la base PostgreSQL (`invernaderos-db`)
   - el servidor web (`invernaderos-app`) que al arrancar corre
     `node db-setup.js` (crea el esquema) y después `npm start`.
4. En **Environment** del servicio web, definí las variables que hagan falta:
   - `ADMIN_PASSWORD`: la contraseña del usuario `admin` inicial
   - Las de alertas si querés (ver tabla de más arriba)
5. Te va a quedar un URL tipo `https://invernaderos-app.onrender.com`.
6. Cargá en el ESP32 ese URL en `API_URL` dentro del `.ino`, por ejemplo:
   `https://invernaderos-app.onrender.com/api/lecturas`
   (recordá que el ESP32 con HTTPS necesita el certificado CA de Let's Encrypt).

Windows (local) no necesita nada especial: `node db-setup.js` también sirve
para crear/verificar el esquema en tu PC sin tocar pgAdmin.

## Restaurar el backup completo en Render (opcional)
Si querés que la base de Render tenga todos tus datos (empleados, sensores,
usuarios con sus contraseñas), abrí en tu PC pgAdmin → conectar a la base de
Render con el "Internal Database URL" que te da Render → clic derecho sobre
`invernaderos` → **Restore…** → elegí `database/invernaderos_backup.sql`.
Si psql avisa de la línea `\restrict`, borrala del archivo y reintentá.

## Qué le falta a esto todavía (para seguir después de la entrega urgente)
- ~~Editar empleados~~ ✓ (ya se puede)
- ~~Pantalla de reportes con gráficos y exportación a PDF/CSV~~ ✓
- ~~Conectar el ESP32 real~~ ✓ (el endpoint `POST /api/lecturas` está listo y probado)
- Alertas externas por Telegram / Email / WhatsApp ✓ (las emergencias notifican si configurás las variables)

## Exportación de reportes a PDF/CSV
En la pantalla **Reportes** hay dos botones: "Exportar CSV" y "Exportar PDF".
Descargan los llamados con los mismos filtros que tengas aplicados (área, tipo y fechas).

## Alertas por Email / WhatsApp
Las alertas se disparan cuando un sensor queda fuera de rango o se reporta una
emergencia a mano. Hoy solo se guardaban en la tabla `llamados`; ahora además se
notifica por los canales que tengas configurados en `.env` (todo es opcional):

| Canal | Variables necesarias |
|-------|----------------------|
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `EMAIL_TO` (sirve Gmail con contraseña de aplicación) |
| WhatsApp | `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_WHATSAPP_FROM`, `TWILIO_WHATSAPP_TO` (sandbox gratis de Twilio) |

Si la variable no está configurada, ese canal simplemente se saltea.




1) La base de datos en GitHub ✓
Qué hice: armé un archivo de respaldo de toda tu BD en database/invernaderos_backup.sql y lo subí al repo (ya está en GitHub, rama main). Ese archivo contiene todo: áreas, empleados, sensores, lecturas, rangos y también tus usuarios con los logins (vas a poder entrar con los mismos usuarios que usás en tu casa).
En la escuela (en la PC de la escuela):
1. Instalá PostgreSQL igual que en tu casa (o pedí que esté instalado), con pgAdmin.
2. En pgAdmin creá una base vacía que se llame invernaderos (clic derecho en Databases → Create → Database, nombre invernaderos).
3. git clone tu repo en esa PC (o copiá toda la carpeta del proyecto).
4. Restaurá el backup: en pgAdmin, clic derecho sobre la base invernaderos → Restore…, elegí el archivo invernaderos_backup.sql y dale. Todo el contenido vuelve.
5. Creá el archivo .env con el password de postgres de ESA computadora (no se sube a GitHub a propósito, es secreto). Copialo igual que el tuyo pero cambiá DB_PASSWORD.
6. npm install y npm start, entrá a localhost:3000 y listo, vas a ver todo cargado.
Importante: ese backup tiene datos personales (DNI, teléfonos). Dejá tu repo en privado en GitHub.
Nota: los cambios que hicimos antes ("Reportes para empleados") siguen en tu máquina pero no subidos. ¿Querés que los suba también así los tenés en la escuela?