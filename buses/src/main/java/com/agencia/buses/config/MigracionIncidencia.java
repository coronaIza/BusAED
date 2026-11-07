package com.agencia.buses.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class MigracionIncidencia implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    public MigracionIncidencia(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(String... args) {
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS incidencia (
                    id SERIAL PRIMARY KEY,
                    id_viaje INTEGER NOT NULL REFERENCES viaje(id),
                    tipo VARCHAR(50) NOT NULL,
                    descripcion TEXT NOT NULL,
                    fotos TEXT,
                    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """);
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_incidencia_viaje ON incidencia(id_viaje)");
    }
}
