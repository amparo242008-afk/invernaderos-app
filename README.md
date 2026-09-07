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