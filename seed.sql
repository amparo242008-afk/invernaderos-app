-- ============================================
-- DATOS DE EJEMPLO - PROYECTO INVERNADEROS
-- Ejecutar sobre la base 'invernaderos' ya creada
-- (debe correr primero esquema_invernaderos.sql)
-- ============================================

-- Áreas del parque ambiental
INSERT INTO areas (nombre, tipo, descripcion) VALUES
  ('Invernadero 1', 'invernadero', 'Vivero principal de cultivos de hoja'),
  ('Invernadero 2', 'invernadero', 'Plantas ornamentales y flores'),
  ('Hidroponia', 'hidroponia', 'Cultivos hidroponicos de lechuga y aromáticas'),
  ('Vivero de árboles', 'vivero', 'Producción de plantines forestales');

-- Empleados
INSERT INTO empleados (nombre, apellido, dni, telefono, email, tarea, area_id) VALUES
  ('María', 'González', '30111222', '3515550101', 'mariagonzalez@parque.com', 'Encargada de Invernadero 1', 1),
  ('Jorge', 'Pérez', '27888999', '3515550202', 'jorgeperez@parque.com', 'Administrador de Hidroponia', 3),
  ('Lucía', 'Fernández', '32222333', '3515550303', 'luciafernandez@parque.com', 'Riego y mantenimiento', 2),
  ('Carlos', 'Ramírez', '26555666', '3515550404', 'carlosramirez@parque.com', 'Vivero de árboles', 4);

-- Usuarios del sistema (contraseña de ejemplo: admin123 para admin, empleado123 para el otro)
-- admin -> rol administrador
INSERT INTO usuarios (empleado_id, username, password_hash, rol, activo) VALUES
  (1, 'admin', '$2b$10$K9xsObAEn3eA8zRF0Osay.czjjHnkWP4LnxWr9QzdCBtrv/1htcI6', 'administrador', true),
  (2, 'jperez', '$2b$10$K9xsObAEn3eA8zRF0Osay.czjjHnkWP4LnxWr9QzdCBtrv/1htcI6', 'generico', true);

-- Sensores por área
INSERT INTO sensores (area_id, tipo, codigo_dispositivo, activo) VALUES
  (1, 'temperatura', 'ESP32-01', true),
  (1, 'humedad', 'ESP32-01', true),
  (3, 'temperatura', 'ESP32-02', true),
  (3, 'humedad', 'ESP32-02', true);

-- Rango normal por área y tipo de sensor
INSERT INTO rangos_config (area_id, tipo_sensor, valor_min, valor_max) VALUES
  (1, 'temperatura', 15, 30),
  (1, 'humedad', 40, 80),
  (3, 'temperatura', 18, 28),
  (3, 'humedad', 50, 85);

-- Llamados de ejemplo
INSERT INTO llamados (area_id, origen, sensor_id, empleado_id, tipo, descripcion, atendido, atendido_por, fecha_hora, fecha_atencion) VALUES
  (1, 'sensor', 1, NULL, 'emergencia', 'temperatura fuera de rango: 34.50', true, 1, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),
  (3, 'sensor', 4, NULL, 'emergencia', 'humedad fuera de rango: 90.10', false, NULL, NOW() - INTERVAL '30 minutes', NULL),
  (2, 'empleado', NULL, 1, 'normal', 'Se necesitan más macetas en el sector de flores', true, 3, NOW() - INTERVAL '1 day', NOW() - INTERVAL '20 hours');

-- Lecturas de ejemplo para que el dashboard muestre datos
INSERT INTO lecturas (sensor_id, valor, fecha_hora) VALUES
  (1, 24.2, NOW() - INTERVAL '10 minutes'),
  (1, 24.5, NOW() - INTERVAL '20 minutes'),
  (2, 60.1, NOW() - INTERVAL '10 minutes'),
  (2, 61.3, NOW() - INTERVAL '20 minutes'),
  (3, 22.0, NOW() - INTERVAL '10 minutes'),
  (3, 22.4, NOW() - INTERVAL '20 minutes'),
  (4, 84.0, NOW() - INTERVAL '10 minutes'),
  (4, 90.1, NOW() - INTERVAL '30 minutes');
