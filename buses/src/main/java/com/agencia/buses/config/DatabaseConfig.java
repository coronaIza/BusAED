package com.agencia.buses.config;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// Esta clase solo se encarga de abrir conexiones JDBC a PostgreSQL.
// JDBC (Java Database Connectivity) es la API de Java para hablar con bases de datos.
// Los datos de conexion se leen de application.properties con @Value.
@Component
public class DatabaseConfig {

    @Value("${spring.datasource.url}")
    private String url;

    @Value("${spring.datasource.username}")
    private String usuario;

    @Value("${spring.datasource.password}")
    private String password;

    // Devuelve una conexion nueva. Quien la use debe cerrarla (try-with-resources en el DAO).
    public Connection getConnection() throws SQLException {
        return DriverManager.getConnection(url, usuario, password);
    }
}
