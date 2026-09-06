--
-- PostgreSQL database dump
--

\restrict zSP89J8cPKKgxtDXEfIWlcfzdEHuuDz9Ktvar77qgjjlQ7RfRsT0fFcicQHNsnk

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_empleado_id_fkey;
ALTER TABLE IF EXISTS ONLY public.sensores DROP CONSTRAINT IF EXISTS sensores_area_id_fkey;
ALTER TABLE IF EXISTS ONLY public.rangos_config DROP CONSTRAINT IF EXISTS rangos_config_area_id_fkey;
ALTER TABLE IF EXISTS ONLY public.llamados DROP CONSTRAINT IF EXISTS llamados_sensor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.llamados DROP CONSTRAINT IF EXISTS llamados_empleado_id_fkey;
ALTER TABLE IF EXISTS ONLY public.llamados DROP CONSTRAINT IF EXISTS llamados_atendido_por_fkey;
ALTER TABLE IF EXISTS ONLY public.llamados DROP CONSTRAINT IF EXISTS llamados_area_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lecturas DROP CONSTRAINT IF EXISTS lecturas_sensor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.empleados DROP CONSTRAINT IF EXISTS empleados_area_id_fkey;
DROP INDEX IF EXISTS public.idx_llamados_tipo;
DROP INDEX IF EXISTS public.idx_llamados_area_fecha;
DROP INDEX IF EXISTS public.idx_lecturas_sensor_fecha;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_username_key;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_pkey;
ALTER TABLE IF EXISTS ONLY public.sensores DROP CONSTRAINT IF EXISTS sensores_pkey;
ALTER TABLE IF EXISTS ONLY public.rangos_config DROP CONSTRAINT IF EXISTS rangos_config_pkey;
ALTER TABLE IF EXISTS ONLY public.llamados DROP CONSTRAINT IF EXISTS llamados_pkey;
ALTER TABLE IF EXISTS ONLY public.lecturas DROP CONSTRAINT IF EXISTS lecturas_pkey;
ALTER TABLE IF EXISTS ONLY public.empleados DROP CONSTRAINT IF EXISTS empleados_pkey;
ALTER TABLE IF EXISTS ONLY public.empleados DROP CONSTRAINT IF EXISTS empleados_dni_key;
ALTER TABLE IF EXISTS ONLY public.areas DROP CONSTRAINT IF EXISTS areas_pkey;
ALTER TABLE IF EXISTS public.usuarios ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sensores ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.rangos_config ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.llamados ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lecturas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.empleados ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.areas ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.usuarios_id_seq;
DROP TABLE IF EXISTS public.usuarios;
DROP SEQUENCE IF EXISTS public.sensores_id_seq;
DROP TABLE IF EXISTS public.sensores;
DROP SEQUENCE IF EXISTS public.rangos_config_id_seq;
DROP TABLE IF EXISTS public.rangos_config;
DROP SEQUENCE IF EXISTS public.llamados_id_seq;
DROP TABLE IF EXISTS public.llamados;
DROP SEQUENCE IF EXISTS public.lecturas_id_seq;
DROP TABLE IF EXISTS public.lecturas;
DROP SEQUENCE IF EXISTS public.empleados_id_seq;
DROP TABLE IF EXISTS public.empleados;
DROP SEQUENCE IF EXISTS public.areas_id_seq;
DROP TABLE IF EXISTS public.areas;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: areas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.areas (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    tipo character varying(50),
    descripcion text
);


ALTER TABLE public.areas OWNER TO postgres;

--
-- Name: areas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.areas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.areas_id_seq OWNER TO postgres;

--
-- Name: areas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.areas_id_seq OWNED BY public.areas.id;


--
-- Name: empleados; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empleados (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    dni character varying(20) NOT NULL,
    telefono character varying(30),
    email character varying(150),
    tarea character varying(100),
    area_id integer
);


ALTER TABLE public.empleados OWNER TO postgres;

--
-- Name: empleados_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.empleados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.empleados_id_seq OWNER TO postgres;

--
-- Name: empleados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.empleados_id_seq OWNED BY public.empleados.id;


--
-- Name: lecturas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lecturas (
    id integer NOT NULL,
    sensor_id integer NOT NULL,
    valor numeric(5,2) NOT NULL,
    fecha_hora timestamp without time zone DEFAULT now()
);


ALTER TABLE public.lecturas OWNER TO postgres;

--
-- Name: lecturas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lecturas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lecturas_id_seq OWNER TO postgres;

--
-- Name: lecturas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lecturas_id_seq OWNED BY public.lecturas.id;


--
-- Name: llamados; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.llamados (
    id integer NOT NULL,
    area_id integer NOT NULL,
    origen character varying(20) NOT NULL,
    sensor_id integer,
    empleado_id integer,
    tipo character varying(20) NOT NULL,
    descripcion text,
    atendido boolean DEFAULT false,
    atendido_por integer,
    fecha_hora timestamp without time zone DEFAULT now(),
    fecha_atencion timestamp without time zone,
    CONSTRAINT llamados_origen_check CHECK (((origen)::text = ANY ((ARRAY['sensor'::character varying, 'empleado'::character varying])::text[]))),
    CONSTRAINT llamados_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['normal'::character varying, 'emergencia'::character varying])::text[])))
);


ALTER TABLE public.llamados OWNER TO postgres;

--
-- Name: llamados_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.llamados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.llamados_id_seq OWNER TO postgres;

--
-- Name: llamados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.llamados_id_seq OWNED BY public.llamados.id;


--
-- Name: rangos_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rangos_config (
    id integer NOT NULL,
    area_id integer NOT NULL,
    tipo_sensor character varying(30) NOT NULL,
    valor_min numeric(5,2) NOT NULL,
    valor_max numeric(5,2) NOT NULL,
    CONSTRAINT rangos_config_tipo_sensor_check CHECK (((tipo_sensor)::text = ANY ((ARRAY['temperatura'::character varying, 'humedad'::character varying])::text[])))
);


ALTER TABLE public.rangos_config OWNER TO postgres;

--
-- Name: rangos_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rangos_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rangos_config_id_seq OWNER TO postgres;

--
-- Name: rangos_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rangos_config_id_seq OWNED BY public.rangos_config.id;


--
-- Name: sensores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sensores (
    id integer NOT NULL,
    area_id integer NOT NULL,
    tipo character varying(30) NOT NULL,
    codigo_dispositivo character varying(50),
    activo boolean DEFAULT true,
    CONSTRAINT sensores_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['temperatura'::character varying, 'humedad'::character varying])::text[])))
);


ALTER TABLE public.sensores OWNER TO postgres;

--
-- Name: sensores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sensores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sensores_id_seq OWNER TO postgres;

--
-- Name: sensores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sensores_id_seq OWNED BY public.sensores.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    empleado_id integer,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol character varying(20) NOT NULL,
    activo boolean DEFAULT true,
    CONSTRAINT usuarios_rol_check CHECK (((rol)::text = ANY ((ARRAY['administrador'::character varying, 'generico'::character varying])::text[])))
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: areas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areas ALTER COLUMN id SET DEFAULT nextval('public.areas_id_seq'::regclass);


--
-- Name: empleados id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados ALTER COLUMN id SET DEFAULT nextval('public.empleados_id_seq'::regclass);


--
-- Name: lecturas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturas ALTER COLUMN id SET DEFAULT nextval('public.lecturas_id_seq'::regclass);


--
-- Name: llamados id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.llamados ALTER COLUMN id SET DEFAULT nextval('public.llamados_id_seq'::regclass);


--
-- Name: rangos_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rangos_config ALTER COLUMN id SET DEFAULT nextval('public.rangos_config_id_seq'::regclass);


--
-- Name: sensores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensores ALTER COLUMN id SET DEFAULT nextval('public.sensores_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: areas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.areas (id, nombre, tipo, descripcion) FROM stdin;
1	invernadero 1	invernadero	\N
2	invernadero 2	invernadero	\N
3	hidroponía 1	hidroponía 	\N
4	invernadero 3	invernadero	\N
5	invernadero 4	invernadero	\N
6	hidroponia 2	hidroponia	\N
7	vivero 1	vivero	\N
8	invernadero 5	invernadero	\N
\.


--
-- Data for Name: empleados; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.empleados (id, nombre, apellido, dni, telefono, email, tarea, area_id) FROM stdin;
1	amparo	villanueva	34343	12334	\N	administracion	\N
3	Juan	Perez	30111222	1155550001	juan.perez@parque.com	encargado de riego	1
4	Maria	Gomez	30222333	1155550002	maria.gomez@parque.com	administrador de area	2
5	Carlos	Lopez	30333444	1155550003	carlos.lopez@parque.com	encargado de riego	4
6	Ana	Martinez	30444555	1155550004	ana.martinez@parque.com	control de humedad	1
7	Luis	Rodriguez	30555666	1155550005	luis.rodriguez@parque.com	encargado de mantenimiento	5
8	Sofia	Fernandez	30666777	1155550006	sofia.fernandez@parque.com	control de temperatura	4
11	Diego	Sanchez	30999000	1155550009	diego.sanchez@parque.com	administrador de area	3
12	Valentina	Romero	31000111	1155550010	valentina.romero@parque.com	encargado de riego	7
10	Lucia	Diaz	30888555	1155550008	lucia.diaz@parque.com	encargado de plantas	8
14	Olivia	Genius	111	4433	\N	Limpieza	2
2	delfina 	villanueva	676767	76767676	delfina@abc.com	tomar mate con DonSatur	3
13	zoe	otomano	5665	0800		encargado de vivero	7
\.


--
-- Data for Name: lecturas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lecturas (id, sensor_id, valor, fecha_hora) FROM stdin;
\.


--
-- Data for Name: llamados; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.llamados (id, area_id, origen, sensor_id, empleado_id, tipo, descripcion, atendido, atendido_por, fecha_hora, fecha_atencion) FROM stdin;
2	3	empleado	\N	1	normal	falta agua en el sector B	t	1	2026-09-02 20:23:47.237244	2026-09-02 21:17:13.586356
3	2	empleado	\N	1	emergencia	la temperatura supera los 80 grados	t	1	2026-09-03 14:19:57.677018	2026-09-03 14:20:02.812308
1	2	empleado	\N	1	emergencia	la temperatura supera los 27 grados	t	1	2026-09-02 20:23:11.705198	2026-09-03 15:40:12.300895
7	3	empleado	\N	1	normal	tatattesd	f	\N	2026-09-03 16:18:11.105082	\N
9	4	empleado	\N	6	normal	germinacion de tomates realizada	t	6	2026-09-03 16:34:45.34923	2026-09-03 16:34:55.926681
\.


--
-- Data for Name: rangos_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rangos_config (id, area_id, tipo_sensor, valor_min, valor_max) FROM stdin;
1	1	temperatura	15.00	35.00
2	2	temperatura	15.00	35.00
3	3	humedad	40.00	75.00
\.


--
-- Data for Name: sensores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sensores (id, area_id, tipo, codigo_dispositivo, activo) FROM stdin;
1	1	temperatura	\N	t
2	2	temperatura	\N	t
3	3	humedad	\N	t
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, empleado_id, username, password_hash, rol, activo) FROM stdin;
1	\N	admin	$2b$10$WLxpcBpI6u03ubcaXdcokuSFfRYEEmyuc9bmJjPdPVsYhJhoIGDeq	administrador	t
6	2	Delfina	$2b$10$UYgastKP2zNECuMNircAbex69oYRjccFfoEwSYG/ya3c53jCbcWyW	generico	t
7	13	zoe	$2b$10$vZ4FtPUJBduFf6g0.xIMze/qTxlhGDhNHKKY/Fh9LjqadyXwyH1K6	generico	t
\.


--
-- Name: areas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.areas_id_seq', 8, true);


--
-- Name: empleados_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.empleados_id_seq', 14, true);


--
-- Name: lecturas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lecturas_id_seq', 1, false);


--
-- Name: llamados_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.llamados_id_seq', 9, true);


--
-- Name: rangos_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rangos_config_id_seq', 3, true);


--
-- Name: sensores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sensores_id_seq', 3, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 8, true);


--
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id);


--
-- Name: empleados empleados_dni_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_dni_key UNIQUE (dni);


--
-- Name: empleados empleados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_pkey PRIMARY KEY (id);


--
-- Name: lecturas lecturas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturas
    ADD CONSTRAINT lecturas_pkey PRIMARY KEY (id);


--
-- Name: llamados llamados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.llamados
    ADD CONSTRAINT llamados_pkey PRIMARY KEY (id);


--
-- Name: rangos_config rangos_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rangos_config
    ADD CONSTRAINT rangos_config_pkey PRIMARY KEY (id);


--
-- Name: sensores sensores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensores
    ADD CONSTRAINT sensores_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_username_key UNIQUE (username);


--
-- Name: idx_lecturas_sensor_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lecturas_sensor_fecha ON public.lecturas USING btree (sensor_id, fecha_hora);


--
-- Name: idx_llamados_area_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_llamados_area_fecha ON public.llamados USING btree (area_id, fecha_hora);


--
-- Name: idx_llamados_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_llamados_tipo ON public.llamados USING btree (tipo);


--
-- Name: empleados empleados_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id);


--
-- Name: lecturas lecturas_sensor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturas
    ADD CONSTRAINT lecturas_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensores(id);


--
-- Name: llamados llamados_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.llamados
    ADD CONSTRAINT llamados_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id);


--
-- Name: llamados llamados_atendido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.llamados
    ADD CONSTRAINT llamados_atendido_por_fkey FOREIGN KEY (atendido_por) REFERENCES public.empleados(id);


--
-- Name: llamados llamados_empleado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.llamados
    ADD CONSTRAINT llamados_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- Name: llamados llamados_sensor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.llamados
    ADD CONSTRAINT llamados_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensores(id);


--
-- Name: rangos_config rangos_config_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rangos_config
    ADD CONSTRAINT rangos_config_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id);


--
-- Name: sensores sensores_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensores
    ADD CONSTRAINT sensores_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id);


--
-- Name: usuarios usuarios_empleado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- PostgreSQL database dump complete
--

\unrestrict zSP89J8cPKKgxtDXEfIWlcfzdEHuuDz9Ktvar77qgjjlQ7RfRsT0fFcicQHNsnk

