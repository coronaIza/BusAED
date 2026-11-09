package com.agencia.buses.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class MigracionDuracionRuta implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public MigracionDuracionRuta(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        String tipo = jdbcTemplate.queryForObject("""
                SELECT data_type
                  FROM information_schema.columns
                 WHERE table_schema = current_schema()
                   AND table_name = 'ruta'
                   AND column_name = 'duracion_estimada'
                """, String.class);

        if (!"numeric".equalsIgnoreCase(tipo)) {
            jdbcTemplate.update("""
                    UPDATE ruta
                       SET duracion_estimada =
                           regexp_replace(duracion_estimada, '\\s*(horas?|hrs?)\\s*$', '', 'i')
                     WHERE duracion_estimada ~* '\\s*(horas?|hrs?)\\s*$'
                    """);
            jdbcTemplate.execute("""
                    ALTER TABLE ruta
                    ALTER COLUMN duracion_estimada TYPE NUMERIC(8,2)
                    USING NULLIF(btrim(duracion_estimada), '')::NUMERIC(8,2)
                    """);
        }
    }
}
