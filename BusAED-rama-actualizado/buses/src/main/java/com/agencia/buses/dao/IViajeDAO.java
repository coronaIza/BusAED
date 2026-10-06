package com.agencia.buses.dao;

import com.agencia.buses.modelo.Viaje;

import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;

// Operaciones sobre la tabla "viaje" (con JOIN a ruta, bus y chofer para mostrar nombres).
public interface IViajeDAO {

    ArrayList<Viaje> listar() throws SQLException;

    // Hoja de ruta del chofer: solo sus viajes.
    ArrayList<Viaje> listarPorChofer(Integer idChofer) throws SQLException;

    Viaje buscarPorId(Integer id) throws SQLException;

    Viaje insertar(Viaje viaje) throws SQLException;

    // Cambia ruta, bus, chofer, fecha y hora (no el estado).
    void actualizar(Viaje viaje) throws SQLException;

    void actualizarEstado(Integer id, String estado) throws SQLException;

    void eliminar(Integer id) throws SQLException;

    // ¿El bus ya tiene OTRO viaje activo a esa misma fecha y hora? (excluirId = el viaje que se está editando, o null)
    boolean busOcupado(Integer idBus, LocalDate fecha, LocalTime hora, Integer excluirId) throws SQLException;

    // ¿El chofer ya tiene OTRO viaje activo a esa misma fecha y hora?
    boolean choferOcupado(Integer idChofer, LocalDate fecha, LocalTime hora, Integer excluirId) throws SQLException;
}
