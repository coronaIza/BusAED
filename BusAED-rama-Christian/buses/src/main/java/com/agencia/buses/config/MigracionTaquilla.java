package com.agencia.buses.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class MigracionTaquilla implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    public MigracionTaquilla(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(String... args) {
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS venta (
                    id SERIAL PRIMARY KEY,
                    id_reserva INTEGER,
                    id_viaje INTEGER REFERENCES viaje(id),
                    nombre_cliente VARCHAR(150),
                    numero_asiento INTEGER NOT NULL,
                    total NUMERIC(12,2) NOT NULL CHECK (total > 0),
                    comprobante VARCHAR(30) NOT NULL UNIQUE,
                    estado VARCHAR(20) NOT NULL,
                    fecha_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS encomienda (
                    id SERIAL PRIMARY KEY,
                    id_viaje INTEGER REFERENCES viaje(id),
                    remitente VARCHAR(150) NOT NULL,
                    destinatario VARCHAR(150) NOT NULL,
                    telefono_destinatario VARCHAR(30),
                    origen VARCHAR(150) NOT NULL DEFAULT '',
                    destino VARCHAR(150) NOT NULL DEFAULT '',
                    descripcion TEXT,
                    estado VARCHAR(20) NOT NULL,
                    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    fecha_entrega TIMESTAMP
                )
                """);
        Integer columnasDestino = jdbc.queryForObject("""
                SELECT COUNT(*)
                  FROM information_schema.columns
                 WHERE table_schema = current_schema()
                   AND table_name = 'encomienda'
                   AND column_name = 'destino'
                """, Integer.class);
        if (Boolean.FALSE.equals(columnasDestino != null && columnasDestino > 0)) {
            jdbc.execute("ALTER TABLE encomienda ADD COLUMN destino VARCHAR(150) NOT NULL DEFAULT ''");
        }
        Integer columnasOrigen = jdbc.queryForObject("""
                SELECT COUNT(*)
                  FROM information_schema.columns
                 WHERE table_schema = current_schema()
                   AND table_name = 'encomienda'
                   AND column_name = 'origen'
                """, Integer.class);
        if (Boolean.FALSE.equals(columnasOrigen != null && columnasOrigen > 0)) {
            jdbc.execute("ALTER TABLE encomienda ADD COLUMN origen VARCHAR(150) NOT NULL DEFAULT ''");
        }
        Integer columnasDescripcion = jdbc.queryForObject("""
                SELECT COUNT(*)
                  FROM information_schema.columns
                 WHERE table_schema = current_schema()
                   AND table_name = 'encomienda'
                   AND column_name = 'descripcion'
                """, Integer.class);
        if (Boolean.FALSE.equals(columnasDescripcion != null && columnasDescripcion > 0)) {
            jdbc.execute("ALTER TABLE encomienda ADD COLUMN descripcion TEXT");
        }
        asegurarColumnaEncomienda("telefono_destinatario", "VARCHAR(30)");
        asegurarColumnaEncomienda("fecha_entrega", "TIMESTAMP");
        asegurarColumnaEncomienda("fecha_registro", "TIMESTAMP");
        asegurarColumnaEncomienda("peso_kg", "NUMERIC(8,2)");
        asegurarColumnaEncomienda("precio", "NUMERIC(12,2)");
        jdbc.execute("UPDATE encomienda SET peso_kg = 0 WHERE peso_kg IS NULL");
        jdbc.execute("ALTER TABLE encomienda ALTER COLUMN peso_kg SET DEFAULT 0");
        jdbc.execute("ALTER TABLE encomienda ALTER COLUMN peso_kg SET NOT NULL");
        jdbc.execute("UPDATE encomienda SET precio = 0 WHERE precio IS NULL");
        jdbc.execute("ALTER TABLE encomienda ALTER COLUMN precio SET DEFAULT 0");
        jdbc.execute("ALTER TABLE encomienda ALTER COLUMN precio SET NOT NULL");
        jdbc.execute("UPDATE encomienda SET fecha_registro = CURRENT_TIMESTAMP WHERE fecha_registro IS NULL");
        jdbc.execute("ALTER TABLE encomienda ALTER COLUMN fecha_registro SET DEFAULT CURRENT_TIMESTAMP");
        jdbc.execute("ALTER TABLE encomienda ALTER COLUMN fecha_registro SET NOT NULL");
        jdbc.execute("ALTER TABLE encomienda ALTER COLUMN id_viaje DROP NOT NULL");
        jdbc.execute("UPDATE encomienda SET origen = '' WHERE origen IS NULL");
        jdbc.execute("UPDATE encomienda SET destino = '' WHERE destino IS NULL");
        jdbc.execute("ALTER TABLE encomienda ALTER COLUMN origen SET DEFAULT ''");
        jdbc.execute("ALTER TABLE encomienda ALTER COLUMN destino SET DEFAULT ''");
        jdbc.execute("ALTER TABLE encomienda ALTER COLUMN origen SET NOT NULL");
        jdbc.execute("ALTER TABLE encomienda ALTER COLUMN destino SET NOT NULL");
        // Correo que asocia la venta/encomienda con la cuenta del pasajero (ya existen en tu BD; esto
        // solo las crea si faltan, por ejemplo en una base nueva).
        jdbc.execute("ALTER TABLE venta ADD COLUMN IF NOT EXISTS correousuario VARCHAR(150)");
        jdbc.execute("ALTER TABLE encomienda ADD COLUMN IF NOT EXISTS correoremitente VARCHAR(150)");
    }

    private void asegurarColumnaEncomienda(String columna, String tipo) {
        Integer existe = jdbc.queryForObject("""
                SELECT COUNT(*)
                  FROM information_schema.columns
                 WHERE table_schema = current_schema()
                   AND table_name = 'encomienda'
                   AND column_name = ?
                """, Integer.class, columna);
        if (Boolean.FALSE.equals(existe != null && existe > 0)) {
            jdbc.execute("ALTER TABLE encomienda ADD COLUMN " + columna + " " + tipo);
        }
    }
}
