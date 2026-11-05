package com.agencia.buses.dao;

import com.agencia.buses.config.DatabaseConfig;
import com.agencia.buses.modelo.Ruta;
import org.springframework.stereotype.Repository;

import java.sql.*;
import java.util.ArrayList;

// Solo SQL (JDBC) sobre la tabla "ruta". Ninguna regla de negocio aquí.
@Repository
public class RutaDAO implements IRutaDAO {

    private static final String SELECT =
            "SELECT id, origen, destino, precio_base, duracion_estimada FROM ruta";

    private final DatabaseConfig db;

    public RutaDAO(DatabaseConfig db) {
        this.db = db;
    }

    @Override
    public ArrayList<Ruta> listar() throws SQLException {
        ArrayList<Ruta> rutas = new ArrayList<>();
        String sql = SELECT + " ORDER BY origen, destino";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                rutas.add(convertir(rs));
            }
        }
        return rutas;
    }

    @Override
    public Ruta buscarPorId(Integer id) throws SQLException {
        String sql = SELECT + " WHERE id = ?";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return convertir(rs);
                }
            }
        }
        return null;
    }

    @Override
    public Ruta buscarPorOrigenDestino(String origen, String destino) throws SQLException {
        // LOWER(...) para que "Lima" y "lima" cuenten como lo mismo.
        String sql = SELECT + " WHERE LOWER(origen) = LOWER(?) AND LOWER(destino) = LOWER(?)";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, origen);
            ps.setString(2, destino);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return convertir(rs);
                }
            }
        }
        return null;
    }

    @Override
    public Ruta insertar(Ruta ruta) throws SQLException {
        String sql = "INSERT INTO ruta (origen, destino, precio_base, duracion_estimada) VALUES (?, ?, ?, ?)";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setString(1, ruta.getOrigen());
            ps.setString(2, ruta.getDestino());
            ps.setBigDecimal(3, ruta.getPrecioBase());
            ps.setString(4, ruta.getDuracionEstimada());
            ps.executeUpdate();

            try (ResultSet claves = ps.getGeneratedKeys()) {
                if (claves.next()) {
                    ruta.setId(claves.getInt("id"));
                }
            }
        }
        return ruta;
    }

    @Override
    public void actualizar(Ruta ruta) throws SQLException {
        String sql = "UPDATE ruta SET origen = ?, destino = ?, precio_base = ?, duracion_estimada = ? WHERE id = ?";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, ruta.getOrigen());
            ps.setString(2, ruta.getDestino());
            ps.setBigDecimal(3, ruta.getPrecioBase());
            ps.setString(4, ruta.getDuracionEstimada());
            ps.setInt(5, ruta.getId());
            ps.executeUpdate();
        }
    }

    @Override
    public void eliminar(Integer id) throws SQLException {
        String sql = "DELETE FROM ruta WHERE id = ?";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }

    private Ruta convertir(ResultSet rs) throws SQLException {
        return new Ruta(
                rs.getInt("id"),
                rs.getString("origen"),
                rs.getString("destino"),
                rs.getBigDecimal("precio_base"),
                rs.getString("duracion_estimada"));
    }
}
