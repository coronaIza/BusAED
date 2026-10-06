package com.agencia.buses.negocio;

import com.agencia.buses.modelo.Viaje;

import java.sql.SQLException;
import java.util.ArrayList;

public interface IViajeNegocio {

    ArrayList<Viaje> listar() throws SQLException;

    ArrayList<Viaje> listarPorChofer(Integer idChofer) throws SQLException;

    Viaje obtenerPorId(Integer id) throws SQLException;

    // Programar un viaje (asigna ruta, bus y chofer).
    Viaje registrar(Viaje viaje) throws SQLException;

    // Reprogramar o cambiar bus/chofer (solo mientras esté PROGRAMADO).
    Viaje actualizar(Integer id, Viaje viaje) throws SQLException;

    // Iniciar, finalizar o cancelar un viaje.
    Viaje cambiarEstado(Integer id, String nuevoEstado) throws SQLException;

    void eliminar(Integer id) throws SQLException;

    // ---- Funciones del CHOFER (siempre sobre el usuario que inició sesión) ----

    // Hoja de ruta: solo los viajes asignados al chofer que inició sesión.
    ArrayList<Viaje> listarMiHoja(String correo) throws SQLException;

    // El chofer solo puede iniciar (EN CURSO) o finalizar (FINALIZADO) SUS viajes.
    Viaje cambiarEstadoMiViaje(String correo, Integer idViaje, String nuevoEstado) throws SQLException;
}
