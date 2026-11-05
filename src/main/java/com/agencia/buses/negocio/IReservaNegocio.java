package com.agencia.buses.negocio;

import java.sql.SQLException;
import java.util.List;
import java.util.Map;

import com.agencia.buses.modelo.Reserva;

public interface IReservaNegocio {

    List<Reserva> listarPorViaje(Integer idViaje) throws SQLException;

    List<Reserva> listarPorCliente(String correoCliente);

    Map<String, Object> consultarDisponibilidad(Integer idViaje) throws SQLException;

    Reserva registrar(Reserva reserva, String correoCliente) throws SQLException;

    Reserva cancelar(Integer idReserva, String correoCliente);
}
