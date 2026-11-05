package com.agencia.buses.dao;

import com.agencia.buses.config.DatabaseConfig;
import com.agencia.buses.modelo.Chofer;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;

@Repository
public class ChoferDAO implements IChoferDAO {

    private static final String SELECT =
            "SELECT id, nombre, apellidos, licencia, telefono, id_usuario FROM chofer";

    private final DatabaseConfig db;

    public ChoferDAO(DatabaseConfig db) {
        this.db = db;
    }

    @Override
    public ArrayList<Chofer> listar() throws SQLException {
        ArrayList<Chofer> choferes = new ArrayList<>();
        String sql = SELECT + " ORDER BY apellidos, nombre";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                choferes.add(convertir(rs));
            }
        }
        return choferes;
    }

    @Override
    public Chofer buscarPorId(Integer id) throws SQLException {
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
    public Chofer buscarPorCorreo(String correo) throws SQLException {
        // JOIN con usuario: así sabemos qué chofer es la persona que inició sesión.
        String sql = "SELECT c.id, c.nombre, c.apellidos, c.licencia, c.telefono, c.id_usuario "
                   + "FROM chofer c JOIN usuario u ON u.id = c.id_usuario "
                   + "WHERE LOWER(u.email) = LOWER(?)";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, correo);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return convertir(rs);
                }
            }
        }
        return null;
    }

    private Chofer convertir(ResultSet rs) throws SQLException {
        Chofer chofer = new Chofer(
                rs.getInt("id"),
                rs.getString("nombre"),
                rs.getString("apellidos"),
                rs.getString("licencia"),
                rs.getString("telefono"));
        int idUsuario = rs.getInt("id_usuario");
        chofer.setIdUsuario(rs.wasNull() ? null : idUsuario); // id_usuario puede ser NULL
        return chofer;
    }
}
