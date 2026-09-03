-- ============================================
-- ESQUEMA DE BASE DE DATOS - PROYECTO INVERNADEROS
-- PostgreSQL
-- ============================================

-- Áreas o zonas del parque ambiental (invernaderos, hidroponía, etc.)
CREATE TABLE areas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(50), -- ej: 'invernadero', 'hidroponia'
    descripcion TEXT
);

-- Empleados del parque, con sus datos personales y tarea
CREATE TABLE empleados (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    dni VARCHAR(20) UNIQUE NOT NULL,
    telefono VARCHAR(30),
    email VARCHAR(150),
    tarea VARCHAR(100), -- ej: 'encargado de riego', 'administrador de área'
    area_id INTEGER REFERENCES areas(id)
);

-- Usuarios del sistema (login). Cada usuario está vinculado a un empleado.
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER REFERENCES empleados(id),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- nunca guardar la contraseña en texto plano
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('administrador', 'generico')),
    activo BOOLEAN DEFAULT TRUE
);

-- Sensores instalados en cada área
CREATE TABLE sensores (
    id SERIAL PRIMARY KEY,
    area_id INTEGER REFERENCES areas(id) NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('temperatura', 'humedad')),
    codigo_dispositivo VARCHAR(50), -- identificador del ESP32 físico
    activo BOOLEAN DEFAULT TRUE
);

-- Rango normal configurado por área y tipo de sensor (esto es lo que definimos antes)
CREATE TABLE rangos_config (
    id SERIAL PRIMARY KEY,
    area_id INTEGER REFERENCES areas(id) NOT NULL,
    tipo_sensor VARCHAR(30) NOT NULL CHECK (tipo_sensor IN ('temperatura', 'humedad')),
    valor_min NUMERIC(5,2) NOT NULL,
    valor_max NUMERIC(5,2) NOT NULL
);

-- Cada lectura que manda un ESP32 (esto va a crecer mucho, es la tabla más pesada)
CREATE TABLE lecturas (
    id SERIAL PRIMARY KEY,
    sensor_id INTEGER REFERENCES sensores(id) NOT NULL,
    valor NUMERIC(5,2) NOT NULL,
    fecha_hora TIMESTAMP DEFAULT NOW()
);

-- Llamados: pueden originarse en un sensor (automático) o en un empleado (manual)
CREATE TABLE llamados (
    id SERIAL PRIMARY KEY,
    area_id INTEGER REFERENCES areas(id) NOT NULL,
    origen VARCHAR(20) NOT NULL CHECK (origen IN ('sensor', 'empleado')),
    sensor_id INTEGER REFERENCES sensores(id), -- null si el origen es empleado
    empleado_id INTEGER REFERENCES empleados(id), -- quién lo generó, o null si es de sensor
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('normal', 'emergencia')),
    descripcion TEXT,
    atendido BOOLEAN DEFAULT FALSE,
    atendido_por INTEGER REFERENCES empleados(id), -- quién lo resolvió
    fecha_hora TIMESTAMP DEFAULT NOW(),
    fecha_atencion TIMESTAMP
);

-- Índices que van a hacer falta cuando haya muchos datos (reportes filtrados por fecha/área)
CREATE INDEX idx_lecturas_sensor_fecha ON lecturas(sensor_id, fecha_hora);
CREATE INDEX idx_llamados_area_fecha ON llamados(area_id, fecha_hora);
CREATE INDEX idx_llamados_tipo ON llamados(tipo);
