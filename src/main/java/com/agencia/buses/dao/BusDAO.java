package com.agencia.buses.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;

import org.springframework.stereotype.Repository;

import com.agencia.buses.config.DatabaseConfig;
import com.agencia.buses.modelo.Bus;

// El DAO se encarga únicamente de acceder a la base de datos.
// Aquí utilizamos JDBC para ejecutar las consultas SQL.
//
// PreparedStatement: es una consulta SQL "precompilada" donde los valores
// se envían por separado usando "?". Así evitamos concatenar texto del usuario
// dentro del SQL (esto previene la inyección SQL).
@Repository
public class BusDAO implements IBusDAO {

    // Spring nos entrega (inyecta) el objeto DatabaseConfig para poder abrir conexiones.
    private final DatabaseConfig db;

    public BusDAO(DatabaseConfig db) {
        this.db = db;
    }

    // SELECT: obtiene todos los buses y los guarda en un ArrayList<Bus>.
    @Override
    public ArrayList<Bus> listar() throws SQLException {
        ArrayList<Bus> buses = new ArrayList<>();
        String sql = "SELECT id, placa, modelo, capacidad_total, estado FROM bus ORDER BY id";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                buses.add(convertir(rs));
            }
        }
        return buses;
    }

    // SELECT con WHERE: busca un bus por su id. Devuelve null si no existe.
    @Override
    public Bus buscarPorId(Integer id) throws SQLException {
        String sql = "SELECT id, placa, modelo, capacidad_total, estado FROM bus WHERE id = ?";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id); // el primer "?" se reemplaza por el id
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return convertir(rs);
                }
            }
        }
        return null;
    }

    // SELECT con WHERE: busca un bus por placa (sirve para detectar placas duplicadas).
    @Override
    public Bus buscarPorPlaca(String placa) throws SQLException {
        String sql = "SELECT id, placa, modelo, capacidad_total, estado FROM bus WHERE placa = ?";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, placa);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return convertir(rs);
                }
            }
        }
        return null;
    }

    // INSERT: guarda un bus nuevo. PostgreSQL genera el id y lo recuperamos.
    @Override
    public Bus insertar(Bus bus) throws SQLException {
        String sql = "INSERT INTO bus (placa, modelo, capacidad_total, estado) VALUES (?, ?, ?, ?)";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setString(1, bus.getPlaca());
            ps.setString(2, bus.getModelo());
            ps.setInt(3, bus.getCapacidad());
            ps.setString(4, bus.getEstado());
            ps.executeUpdate();

            // Obtenemos el id que generó la base de datos
            try (ResultSet claves = ps.getGeneratedKeys()) {
                if (claves.next()) {
                    bus.setId(claves.getInt("id"));
                }
            }
        }
        return bus;
    }

    // UPDATE: modifica los datos de un bus existente.
    @Override
    public void actualizar(Bus bus) throws SQLException {
        String sql = "UPDATE bus SET placa = ?, modelo = ?, capacidad_total = ?, estado = ? WHERE id = ?";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, bus.getPlaca());
            ps.setString(2, bus.getModelo());
            ps.setInt(3, bus.getCapacidad());
            ps.setString(4, bus.getEstado());
            ps.setInt(5, bus.getId());
            ps.executeUpdate();
        }
    }

    // DELETE: elimina un bus por id.
    @Override
    public void eliminar(Integer id) throws SQLException {
        String sql = "DELETE FROM bus WHERE id = ?";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }

    // Convierte una fila de la tabla (ResultSet) en un objeto Bus.
    private Bus convertir(ResultSet rs) throws SQLException {
        return new Bus(
                rs.getInt("id"),
                rs.getString("placa"),
                rs.getString("modelo"),
                rs.getInt("capacidad_total"),
                rs.getString("estado"));
    }
}
