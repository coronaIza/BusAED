CREATE TABLE IF NOT EXISTS venta (
    id SERIAL PRIMARY KEY,
    id_reserva INTEGER REFERENCES reserva_boleto(id),
    id_viaje INTEGER REFERENCES viaje(id),
    nombre_cliente VARCHAR(150),
    numero_asiento INTEGER NOT NULL,
    total NUMERIC(12,2) NOT NULL CHECK (total > 0),
    comprobante VARCHAR(30) NOT NULL UNIQUE,
    estado VARCHAR(20) NOT NULL,
    fecha_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS encomienda (
    id SERIAL PRIMARY KEY,
    id_viaje INTEGER REFERENCES viaje(id),
    remitente VARCHAR(150) NOT NULL,
    destinatario VARCHAR(150) NOT NULL,
    telefono_destinatario VARCHAR(30),
    origen VARCHAR(150) NOT NULL DEFAULT '',
    destino VARCHAR(150) NOT NULL DEFAULT '',
    descripcion TEXT,
    peso_kg NUMERIC(8,2) NOT NULL DEFAULT 0,
    precio NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado VARCHAR(20) NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidencia (
    id SERIAL PRIMARY KEY,
    id_viaje INTEGER NOT NULL REFERENCES viaje(id),
    tipo VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    fotos TEXT,
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_venta_viaje ON venta(id_viaje);
CREATE INDEX IF NOT EXISTS idx_venta_reserva ON venta(id_reserva);
CREATE INDEX IF NOT EXISTS idx_encomienda_viaje ON encomienda(id_viaje);
CREATE INDEX IF NOT EXISTS idx_incidencia_viaje ON incidencia(id_viaje);

-- Normaliza duraciones existentes como "4 horas" o "16 horas" y convierte la
-- columna al tipo NUMERIC que esperan los DAOs de Ruta y Viaje.
DO $$
BEGIN
    UPDATE ruta
       SET duracion_estimada = regexp_replace(duracion_estimada, '\s*(horas?|hrs?)\s*$', '', 'i')
     WHERE duracion_estimada ~* '\s*(horas?|hrs?)\s*$';

    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'ruta'
           AND column_name = 'duracion_estimada'
           AND data_type <> 'numeric'
    ) THEN
        ALTER TABLE ruta
            ALTER COLUMN duracion_estimada TYPE NUMERIC(8,2)
            USING NULLIF(btrim(duracion_estimada), '')::NUMERIC(8,2);
    END IF;
END
$$;
