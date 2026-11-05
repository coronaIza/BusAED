package com.agencia.buses.dao;

import com.agencia.buses.config.DatabaseConfig;
import com.agencia.buses.modelo.Viaje;
import org.springframework.stereotype.Repository;

import java.sql.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;

// Solo SQL (JDBC) sobre la tabla "viaje". Ninguna regla de negocio aquí.
@Repository
public class ViajeDAO implements IViajeDAO {

    // Consulta base con JOIN: así cada viaje trae origen/destino, placa del bus y nombre del chofer.
    private static final String SELECT =
            "SELECT v.id, v.id_ruta, v.id_bus, v.id_chofer, v.fecha_salida, v.hora_salida, v.estado, "
          + "       r.origen, r.destino, b.placa, c.nombre || ' ' || c.apellidos AS chofer "
          + "FROM viaje v "
          + "JOIN ruta r   ON r.id = v.id_ruta "
          + "JOIN bus b    ON b.id = v.id_bus "
          + "JOIN chofer c ON c.id = v.id_chofer ";

    private final DatabaseConfig db;

    public ViajeDAO(DatabaseConfig db) {
        this.db = db;
    }

    @Override
    public ArrayList<Viaje> listar() throws SQLException {
        ArrayList<Viaje> viajes = new ArrayList<>();
        String sql = SELECT + "ORDER BY v.fecha_salida, v.hora_salida";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                viajes.add(convertir(rs));
            }
        }
        return viajes;
    }

    @Override
    public ArrayList<Viaje> listarPorChofer(Integer idChofer) throws SQLException {
        ArrayList<Viaje> viajes = new ArrayList<>();
        String sql = SELECT + "WHERE v.id_chofer = ? ORDER BY v.fecha_salida, v.hora_salida";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idChofer);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    viajes.add(convertir(rs));
                }
            }
        }
        return viajes;
    }

    @Override
    public Viaje buscarPorId(Integer id) throws SQLException {
        String sql = SELECT + "WHERE v.id = ?";

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
    public Viaje insertar(Viaje viaje) throws SQLException {
        String sql = "INSERT INTO viaje (id_ruta, id_bus, id_chofer, fecha_salida, hora_salida, estado) "
                   + "VALUES (?, ?, ?, ?, ?, ?)";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setInt(1, viaje.getIdRuta());
            ps.setInt(2, viaje.getIdBus());
            ps.setInt(3, viaje.getIdChofer());
            ps.setDate(4, Date.valueOf(viaje.getFechaSalida()));
            ps.setTime(5, Time.valueOf(viaje.getHoraSalida()));
            ps.setString(6, viaje.getEstado());
            ps.executeUpdate();

            try (ResultSet claves = ps.getGeneratedKeys()) {
                if (claves.next()) {
                    viaje.setId(claves.getInt("id"));
                }
            }
        }
        return viaje;
    }

    @Override
    public void actualizar(Viaje viaje) throws SQLException {
        String sql = "UPDATE viaje SET id_ruta = ?, id_bus = ?, id_chofer = ?, "
                   + "fecha_salida = ?, hora_salida = ? WHERE id = ?";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, viaje.getIdRuta());
            ps.setInt(2, viaje.getIdBus());
            ps.setInt(3, viaje.getIdChofer());
            ps.setDate(4, Date.valueOf(viaje.getFechaSalida()));
            ps.setTime(5, Time.valueOf(viaje.getHoraSalida()));
            ps.setInt(6, viaje.getId());
            ps.executeUpdate();
        }
    }

    @Override
    public void actualizarEstado(Integer id, String estado) throws SQLException {
        String sql = "UPDATE viaje SET estado = ? WHERE id = ?";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, estado);
            ps.setInt(2, id);
            ps.executeUpdate();
        }
    }

    @Override
    public void eliminar(Integer id) throws SQLException {
        String sql = "DELETE FROM viaje WHERE id = ?";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }

    @Override
    public boolean busOcupado(Integer idBus, LocalDate fecha, LocalTime hora, Integer excluirId) throws SQLException {
        return ocupado("id_bus", idBus, fecha, hora, excluirId);
    }

    @Override
    public boolean choferOcupado(Integer idChofer, LocalDate fecha, LocalTime hora, Integer excluirId) throws SQLException {
        return ocupado("id_chofer", idChofer, fecha, hora, excluirId);
    }

    // "columna" siempre es un texto fijo escrito por nosotros ("id_bus" o "id_chofer"),
    // nunca un dato del usuario; los valores sí van con "?" (PreparedStatement).
    private boolean ocupado(String columna, Integer idRecurso, LocalDate fecha, LocalTime hora,
                            Integer excluirId) throws SQLException {
        String sql = "SELECT COUNT(*) FROM viaje WHERE " + columna + " = ? "
                   + "AND fecha_salida = ? AND hora_salida = ? "
                   + "AND UPPER(estado) IN ('PROGRAMADO', 'EN CURSO') "
                   + "AND id <> ?";

        try (Connection con = db.getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idRecurso);
            ps.setDate(2, Date.valueOf(fecha));
            ps.setTime(3, Time.valueOf(hora));
            ps.setInt(4, excluirId == null ? 0 : excluirId); // 0 no existe como id: no excluye nada
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getInt(1) > 0;
            }
        }
    }

    private Viaje convertir(ResultSet rs) throws SQLException {
        Viaje v = new Viaje();
        v.setId(rs.getInt("id"));
        v.setIdRuta(rs.getInt("id_ruta"));
        v.setIdBus(rs.getInt("id_bus"));
        v.setIdChofer(rs.getInt("id_chofer"));
        v.setFechaSalida(rs.getDate("fecha_salida").toLocalDate());
        v.setHoraSalida(rs.getTime("hora_salida").toLocalTime());

        // En la BD puede estar en minúscula ('programado'); siempre lo devolvemos en mayúsculas.
        String estado = rs.getString("estado");
        v.setEstado(estado == null ? null : estado.toUpperCase());

        v.setOrigen(rs.getString("origen"));
        v.setDestino(rs.getString("destino"));
        v.setPlacaBus(rs.getString("placa"));
        v.setNombreChofer(rs.getString("chofer"));
        return v;
    }
}
